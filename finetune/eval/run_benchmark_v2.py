"""
Nexus Bots — Full Benchmark Runner v2
Evaluates: (1) Fine-tuned Qwen3-0.6B-FC  (2) Base Qwen3-0.6B  (3) Heuristic router
on the 100-row held-out test set (B1) with per-language breakdown (B4).

Usage:
    CUDA_VISIBLE_DEVICES=2 python3 eval/run_benchmark_v2.py

Output:
    research/results/b1_function_calling.csv / .md
    research/results/b4_multilingual.csv / .md
"""

import csv, json, re, sys, time, os
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import ADAPTER_DIR, BASE_MODEL, SYSTEM_PROMPT, TEST_PATH, RESULTS_DIR

# ── Load test data ────────────────────────────────────────────────────────────
rows = [json.loads(l) for l in open(TEST_PATH) if l.strip()]
print(f"Loaded {len(rows)} test rows")

# ── Load models ───────────────────────────────────────────────────────────────
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

print(f"\nLoading tokenizer from {BASE_MODEL}")
tok = AutoTokenizer.from_pretrained(BASE_MODEL)

print(f"Loading base model on cuda:0...")
base_model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, dtype=torch.float16, device_map="cuda:0")
base_model.eval()

print(f"Loading LoRA adapter from {ADAPTER_DIR}")
ft_model = PeftModel.from_pretrained(base_model, str(ADAPTER_DIR))
ft_model.eval()
print(f"Fine-tuned model on: {next(ft_model.parameters()).device}")

print(f"\nLoading base model (no adapter) on cuda:1...")
base_only = AutoModelForCausalLM.from_pretrained(BASE_MODEL, dtype=torch.float16, device_map="cuda:1")
base_only.eval()
print(f"Base model on: {next(base_only.parameters()).device}")

# ── Helpers ───────────────────────────────────────────────────────────────────
def parse_json(text):
    text = text.strip()
    text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()
    try: return json.loads(text)
    except: pass
    s, e = text.find("{"), text.rfind("}") + 1
    if s >= 0 and e > s:
        try: return json.loads(text[s:e])
        except: pass
    return {}

def extract_gold(row):
    for m in row.get("messages", []):
        if m["role"] == "assistant":
            obj = json.loads(m["content"])
            return obj["tool"], obj.get("arguments", {}), obj.get("ui_guide")
    return "", {}, None

def score_arg_f1(pred, gold):
    if not gold: return 1.0 if not pred else 0.0
    keys = set(gold) | set(pred)
    if not keys: return 1.0
    return sum(str(pred.get(k,"")).strip().lower() == str(gold.get(k,"")).strip().lower()
               for k in keys) / len(keys)

def _infer(model, q, ctx, enable_thinking=False):
    msgs = [{"role":"system","content":SYSTEM_PROMPT},
            {"role":"user","content":f"Query: {q}\nContext: {ctx}"}]
    text = tok.apply_chat_template(msgs, tokenize=False,
                                   add_generation_prompt=True, enable_thinking=enable_thinking)
    ids = tok(text, return_tensors="pt").to(model.device)
    t0 = time.perf_counter()
    with torch.no_grad():
        out = model.generate(**ids, max_new_tokens=120, do_sample=False,
                             pad_token_id=tok.eos_token_id)
    lat = (time.perf_counter() - t0) * 1000
    raw = tok.decode(out[0][ids["input_ids"].shape[1]:], skip_special_tokens=True)
    return parse_json(raw), lat

def infer_ft(q, ctx):
    return _infer(ft_model, q, ctx, enable_thinking=False)

def infer_base(q, ctx):
    # Base model not fine-tuned — use enable_thinking=False for fair comparison
    return _infer(base_only, q, ctx, enable_thinking=False)

# ── Heuristic router ──────────────────────────────────────────────────────────
CATS = ["Kitchen", "Home Cleaner", "Drone", "Humanoid"]
NAV = {
    r"\b(order|orders|my order|track|delivery)\b": ("navigate_to", {"page":"orders","params":{}}),
    r"\b(cart|basket|checkout)\b":                  ("navigate_to", {"page":"cart","params":{}}),
    r"\b(home|main|back)\b":                        ("navigate_to", {"page":"home","params":{}}),
    r"\b(catalog|browse|all product|list)\b":       ("navigate_to", {"page":"catalog","params":{}}),
    r"\b(support|help|ticket|complaint)\b":         ("navigate_to", {"page":"assistant","params":{}}),
}

def infer_heuristic(q, ctx_str):
    t0 = time.perf_counter()
    ql = q.lower()
    try: ctx = json.loads(ctx_str) if ctx_str else {}
    except: ctx = {}

    # Navigate patterns
    for pat, (tool, args) in NAV.items():
        if re.search(pat, ql):
            return {"tool":tool,"arguments":args,"ui_guide":None}, (time.perf_counter()-t0)*1000

    # Product ID in context → get/add
    if ctx.get("product_id") or re.search(r"\bproduct\s+\d+\b|\bid\s+\d+\b", ql):
        pid = ctx.get("product_id") or re.findall(r"\d+", ql)
        pid = pid[0] if isinstance(pid, list) and pid else pid
        if re.search(r"\b(add|cart|buy|purchase)\b", ql):
            return {"tool":"add_to_cart","arguments":{"product_id":int(pid) if str(pid).isdigit() else 1},"ui_guide":None}, (time.perf_counter()-t0)*1000
        return {"tool":"get_product","arguments":{"product_id":int(pid) if str(pid).isdigit() else 1},"ui_guide":None}, (time.perf_counter()-t0)*1000

    # Compare
    if re.search(r"\bcompare\b", ql):
        return {"tool":"compare_products","arguments":{"product_id_1":1,"product_id_2":2},"ui_guide":None}, (time.perf_counter()-t0)*1000

    # Recommend
    if re.search(r"\b(recommend|suggest|best|which one|budget)\b", ql):
        cat = next((c for c in CATS if c.lower() in ql), "")
        return {"tool":"recommend","arguments":{"need":q,"budget":1000,"category":cat},"ui_guide":None}, (time.perf_counter()-t0)*1000

    # Default: search
    cat = next((c for c in CATS if c.lower() in ql), "")
    return {"tool":"search_products","arguments":{"query":q,"category":cat},"ui_guide":None}, (time.perf_counter()-t0)*1000

# ── Evaluate one system ───────────────────────────────────────────────────────
def evaluate(label, infer_fn, rows):
    stats = defaultdict(lambda: {"ok":0,"f1":0.0,"guide_ok":0,"n":0,"lats":[]})
    total_ok = 0
    n = len(rows)
    for i, row in enumerate(rows):
        gold_tool, gold_args, gold_guide = extract_gold(row)
        lang = row.get("language", "en")
        user_msg = next(m["content"] for m in row["messages"] if m["role"]=="user")
        parts = user_msg.split("\nContext: ", 1)
        q   = parts[0].replace("Query: ", "")
        ctx = parts[1] if len(parts) > 1 else "{}"
        try:
            pred, lat = infer_fn(q, ctx)
            pt = pred.get("tool","")
            pa = pred.get("arguments",{})
            pg = pred.get("ui_guide")
        except Exception as ex:
            pt, pa, pg, lat = "", {}, None, 0.0
            print(f"  ERR row {i}: {ex}")
        ok = int(pt == gold_tool)
        total_ok += ok
        f1 = score_arg_f1(pa, gold_args)
        stats[lang]["ok"]       += ok
        stats[lang]["f1"]       += f1
        stats[lang]["guide_ok"] += int(pg == gold_guide)
        stats[lang]["n"]        += 1
        stats[lang]["lats"].append(lat)
        bar = "#" * ((i+1)*30//n) + "-" * (30-(i+1)*30//n)
        print(f"  [{bar}] {i+1:3d}/{n}  {'✓' if ok else '✗'}  "
              f"pred={pt or '(none)':22s}  gold={gold_tool:22s}  acc={total_ok/(i+1):.2f}", flush=True)
    print(f"\n  {label} DONE → tool_acc={total_ok/n:.4f}\n")
    return dict(stats)

# ── Run ───────────────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("=== Qwen3-0.6B-FC (fine-tuned, enable_thinking=False) ===")
print("="*60)
ft_stats = evaluate("Qwen3-0.6B-FC", infer_ft, rows)

print("\n" + "="*60)
print("=== Qwen3-0.6B BASE (no adapter, enable_thinking=False) ===")
print("="*60)
base_stats = evaluate("Qwen3-0.6B BASE", infer_base, rows)

print("\n" + "="*60)
print("=== Heuristic Router ===")
print("="*60)
heur_stats = evaluate("Heuristic", lambda q,ctx: infer_heuristic(q,ctx), rows)

# ── Summarise ─────────────────────────────────────────────────────────────────
def summarise(label, stats):
    ok  = sum(v["ok"]       for v in stats.values())
    f1  = sum(v["f1"]       for v in stats.values())
    gok = sum(v["guide_ok"] for v in stats.values())
    n   = sum(v["n"]        for v in stats.values())
    lats = sorted(l for v in stats.values() for l in v["lats"])
    p50 = lats[len(lats)//2] if lats else 0
    return {"system":label,
            "tool_acc":round(ok/n,4), "arg_f1":round(f1/n,4),
            "ui_guide_acc":round(gok/n,4), "p50_ms":round(p50,1), "count":n}

b1_rows = [
    summarise("Qwen3-0.6B-FC (ours)", ft_stats),
    summarise("Qwen3-0.6B BASE",       base_stats),
    summarise("Heuristic Router",      heur_stats),
]

print("\n=== B1 FINAL RESULTS ===")
print(f"{'System':<28} {'Tool Acc':>9} {'Arg F1':>8} {'UI Guide':>9} {'p50ms':>8} {'N':>5}")
print("-"*65)
for r in b1_rows:
    print(f"{r['system']:<28} {r['tool_acc']:>9.4f} {r['arg_f1']:>8.4f} "
          f"{r['ui_guide_acc']:>9.4f} {r['p50_ms']:>8.1f} {r['count']:>5}")

# ── B4 per-language ───────────────────────────────────────────────────────────
print("\n=== B4 PER-LANGUAGE ===")
for label, stats in [("Qwen3-0.6B-FC", ft_stats), ("Qwen3-0.6B BASE", base_stats), ("Heuristic", heur_stats)]:
    for lang, v in sorted(stats.items()):
        ta = round(v["ok"]/v["n"],4) if v["n"] else 0
        f1 = round(v["f1"]/v["n"],4) if v["n"] else 0
        print(f"  {label:<22} {lang.upper():>4}  tool={ta:.4f}  arg_f1={f1:.4f}  n={v['n']}")

# ── Save ──────────────────────────────────────────────────────────────────────
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

csv_path = RESULTS_DIR / "b1_function_calling.csv"
with open(csv_path, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["system","tool_acc","arg_f1","ui_guide_acc","p50_ms","count"])
    w.writeheader(); w.writerows(b1_rows)

md_path = RESULTS_DIR / "b1_function_calling.md"
with open(md_path, "w") as f:
    f.write("# B1 — Function-Calling Accuracy\n\n")
    f.write("| System | Tool Acc | Arg F1 | UI Guide Acc | p50 (ms) |\n")
    f.write("|--------|----------|--------|--------------|----------|\n")
    for r in b1_rows:
        f.write(f"| {r['system']} | {r['tool_acc']} | {r['arg_f1']} | {r['ui_guide_acc']} | {r['p50_ms']} |\n")

# B4 CSV
b4_rows = []
for label, stats in [("Qwen3-0.6B-FC (ours)", ft_stats), ("Qwen3-0.6B BASE", base_stats), ("Heuristic Router", heur_stats)]:
    for lang, v in sorted(stats.items()):
        if v["n"] == 0: continue
        b4_rows.append({"system":label, "language":lang.upper(),
                         "tool_acc":round(v["ok"]/v["n"],4),
                         "arg_f1":round(v["f1"]/v["n"],4),
                         "ui_guide_acc":round(v["guide_ok"]/v["n"],4), "n":v["n"]})

b4_csv = RESULTS_DIR / "b4_multilingual.csv"
with open(b4_csv, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["system","language","tool_acc","arg_f1","ui_guide_acc","n"])
    w.writeheader(); w.writerows(b4_rows)

b4_md = RESULTS_DIR / "b4_multilingual.md"
with open(b4_md, "w") as f:
    f.write("# B4 — Multilingual Function-Calling\n\n")
    f.write("| System | Language | Tool Acc | Arg F1 | UI Guide | N |\n")
    f.write("|--------|----------|----------|--------|----------|---|\n")
    for r in b4_rows:
        f.write(f"| {r['system']} | {r['language']} | {r['tool_acc']} | {r['arg_f1']} | {r['ui_guide_acc']} | {r['n']} |\n")

print(f"\nSaved → {csv_path}")
print(f"Saved → {b4_csv}")

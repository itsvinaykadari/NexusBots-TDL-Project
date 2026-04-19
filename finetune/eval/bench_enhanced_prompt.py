"""
Benchmark BASE Qwen3-0.6B with the ENHANCED system prompt (decision tree + 8 few-shot examples).

Compares 3 systems on the same 100-row test set:
  1. BASE + original SYSTEM_PROMPT       (= 0.60 baseline from previous run)
  2. BASE + ENHANCED_SYSTEM_PROMPT       (this is the new contender)
  3. Heuristic router                     (= 0.48 baseline)

Usage:
    CUDA_VISIBLE_DEVICES=0 python3 eval/bench_enhanced_prompt.py
"""

import csv, json, re, sys, time
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import BASE_MODEL, SYSTEM_PROMPT, TEST_PATH, RESULTS_DIR
from eval.enhanced_prompt import ENHANCED_SYSTEM_PROMPT

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

rows = [json.loads(l) for l in open(TEST_PATH) if l.strip()]
print(f"Loaded {len(rows)} test rows")

print(f"\nLoading tokenizer + base model on cuda:0")
tok = AutoTokenizer.from_pretrained(BASE_MODEL)
model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, dtype=torch.float16, device_map="cuda:0")
model.eval()


def parse_json(text):
    text = re.sub(r"<think>[\s\S]*?</think>", "", text.strip()).strip()
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
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

def infer(q, ctx, sysprompt):
    msgs = [{"role":"system","content":sysprompt},
            {"role":"user","content":f"Query: {q}\nContext: {ctx}"}]
    text = tok.apply_chat_template(msgs, tokenize=False,
                                   add_generation_prompt=True, enable_thinking=False)
    ids = tok(text, return_tensors="pt").to(model.device)
    t0 = time.perf_counter()
    with torch.no_grad():
        out = model.generate(**ids, max_new_tokens=160, do_sample=False,
                             pad_token_id=tok.eos_token_id)
    lat = (time.perf_counter() - t0) * 1000
    raw = tok.decode(out[0][ids["input_ids"].shape[1]:], skip_special_tokens=True)
    return parse_json(raw), lat


def evaluate(label, sysprompt):
    stats = defaultdict(lambda: {"ok":0,"f1":0.0,"guide_ok":0,"n":0,"lats":[]})
    total_ok = 0
    n = len(rows)
    fails = []
    for i, row in enumerate(rows):
        gold_tool, gold_args, gold_guide = extract_gold(row)
        lang = row.get("language", "en")
        user_msg = next(m["content"] for m in row["messages"] if m["role"]=="user")
        parts = user_msg.split("\nContext: ", 1)
        q   = parts[0].replace("Query: ", "")
        ctx = parts[1] if len(parts) > 1 else "{}"
        try:
            pred, lat = infer(q, ctx, sysprompt)
            pt = pred.get("tool","")
            pa = pred.get("arguments",{})
            pg = pred.get("ui_guide")
        except Exception as ex:
            pt, pa, pg, lat = "", {}, None, 0.0
        ok = int(pt == gold_tool)
        total_ok += ok
        if not ok:
            fails.append((i, q[:60], pt, gold_tool))
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
    return dict(stats), fails


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


print("\n" + "="*60)
print("=== BASE + ENHANCED PROMPT (few-shot decision tree) ===")
print("="*60)
enh_stats, enh_fails = evaluate("BASE+Enhanced", ENHANCED_SYSTEM_PROMPT)

print("\n" + "="*60)
print("=== BASE + ORIGINAL PROMPT (baseline) ===")
print("="*60)
base_stats, base_fails = evaluate("BASE+Original", SYSTEM_PROMPT)

results = [
    summarise("Qwen3-0.6B BASE + Enhanced Prompt", enh_stats),
    summarise("Qwen3-0.6B BASE + Original Prompt", base_stats),
]

print("\n=== FINAL RESULTS ===")
print(f"{'System':<40} {'Tool Acc':>9} {'Arg F1':>8} {'UI Guide':>9} {'p50ms':>8} {'N':>5}")
print("-"*85)
for r in results:
    print(f"{r['system']:<40} {r['tool_acc']:>9.4f} {r['arg_f1']:>8.4f} "
          f"{r['ui_guide_acc']:>9.4f} {r['p50_ms']:>8.1f} {r['count']:>5}")

print("\n=== PER-LANGUAGE ===")
for label, stats in [("Enhanced", enh_stats), ("Original", base_stats)]:
    for lang, v in sorted(stats.items()):
        ta = round(v["ok"]/v["n"],4) if v["n"] else 0
        f1 = round(v["f1"]/v["n"],4) if v["n"] else 0
        print(f"  {label:<10} {lang.upper():>4}  tool={ta:.4f}  arg_f1={f1:.4f}  n={v['n']}")

# Save
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
out_csv = RESULTS_DIR / "enhanced_prompt_results.csv"
with open(out_csv, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["system","tool_acc","arg_f1","ui_guide_acc","p50_ms","count"])
    w.writeheader(); w.writerows(results)
print(f"\nSaved → {out_csv}")

# Print enhanced-prompt failures for analysis
print(f"\n=== ENHANCED PROMPT FAILURES ({len(enh_fails)}) ===")
for i, q, pt, gt in enh_fails[:20]:
    print(f"  row {i+1:3d}: {q:60s}  pred={pt:20s} gold={gt}")

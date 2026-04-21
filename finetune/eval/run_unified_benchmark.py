import sys
from pathlib import Path

# Ensure local imports resolve when this script is run as a file path.
FINETUNE_ROOT = Path(__file__).resolve().parent.parent
if str(FINETUNE_ROOT) not in sys.path:
    sys.path.insert(0, str(FINETUNE_ROOT))

from eval.enhanced_prompt import ENHANCED_SYSTEM_PROMPT
from config import BASE_MODEL, SYSTEM_PROMPT, TEST_PATH, RESULTS_DIR
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import argparse
import csv
import json
import re
import time
from collections import defaultdict


def parse_json(text):
    text = text.strip()
    text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()
    try:
        return json.loads(text)
    except:
        pass
    s, e = text.find("{"), text.rfind("}") + 1
    if s >= 0 and e > s:
        try:
            return json.loads(text[s:e])
        except:
            pass
    return {}


def extract_gold(row):
    for m in row.get("messages", []):
        if m["role"] == "assistant":
            obj = json.loads(m["content"])
            return obj["tool"], obj.get("arguments", {}), obj.get("ui_guide")
    return "", {}, None


def score_arg_f1(pred, gold):
    if not gold:
        return 1.0 if not pred else 0.0
    keys = set(gold) | set(pred)
    if not keys:
        return 1.0
    return sum(str(pred.get(k, "")).strip().lower() == str(gold.get(k, "")).strip().lower()
               for k in keys) / len(keys)


def infer(model, tok, q, ctx, sysprompt, enable_thinking=False):
    msgs = [{"role": "system", "content": sysprompt},
            {"role": "user", "content": f"Query: {q}\nContext: {ctx}"}]
    text = tok.apply_chat_template(msgs, tokenize=False,
                                   add_generation_prompt=True, enable_thinking=enable_thinking)
    ids = tok(text, return_tensors="pt").to(model.device)
    t0 = time.perf_counter()
    with torch.no_grad():
        out = model.generate(**ids, max_new_tokens=160, do_sample=False,
                             pad_token_id=tok.eos_token_id)
    lat = (time.perf_counter() - t0) * 1000
    raw = tok.decode(out[0][ids["input_ids"].shape[1]:],
                     skip_special_tokens=True)
    return parse_json(raw), lat


def load_base_model(base_model_name, requested_device="auto"):
    """Load base model with CUDA-first strategy and automatic CPU fallback."""
    use_cuda = requested_device == "cuda" or (
        requested_device == "auto" and torch.cuda.is_available())

    if use_cuda:
        try:
            print("Loading base model on cuda:0...")
            model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                torch_dtype=torch.float16,
                low_cpu_mem_usage=True,
            )
            model = model.to("cuda:0")
            model.eval()
            return model, "cuda"
        except Exception as ex:
            print(f"CUDA load failed ({type(ex).__name__}): {ex}")
            print("Falling back to CPU. This is slower but should run on this machine.")

    print("Loading base model on cpu...")
    model = AutoModelForCausalLM.from_pretrained(
        base_model_name,
        torch_dtype=torch.float32,
        low_cpu_mem_usage=True,
    )
    model = model.to("cpu")
    model.eval()
    return model, "cpu"


# ── Heuristic router ──────────────────────────────────────────────────────────
CATS = ["Kitchen", "Home Cleaner", "Drone", "Humanoid"]
NAV = {
    r"\b(order|orders|my order|track|delivery)\b": ("navigate_to", {"page": "orders", "params": {}}),
    r"\b(cart|basket|checkout)\b":                  ("navigate_to", {"page": "cart", "params": {}}),
    r"\b(home|main|back)\b":                        ("navigate_to", {"page": "home", "params": {}}),
    r"\b(catalog|browse|all product|list)\b":       ("navigate_to", {"page": "catalog", "params": {}}),
    r"\b(support|help|ticket|complaint)\b":         ("navigate_to", {"page": "assistant", "params": {}}),
}


def infer_heuristic(q, ctx_str):
    t0 = time.perf_counter()
    ql = q.lower()
    try:
        ctx = json.loads(ctx_str) if ctx_str else {}
    except:
        ctx = {}

    for pat, (tool, args) in NAV.items():
        if re.search(pat, ql):
            return {"tool": tool, "arguments": args, "ui_guide": None}, (time.perf_counter()-t0)*1000

    if ctx.get("product_id") or re.search(r"\bproduct\s+\d+\b|\bid\s+\d+\b", ql):
        pid = ctx.get("product_id") or re.findall(r"\d+", ql)
        pid = pid[0] if isinstance(pid, list) and pid else pid
        if re.search(r"\b(add|cart|buy|purchase)\b", ql):
            return {"tool": "add_to_cart", "arguments": {"product_id": int(pid) if str(pid).isdigit() else 1}, "ui_guide": None}, (time.perf_counter()-t0)*1000
        return {"tool": "get_product", "arguments": {"product_id": int(pid) if str(pid).isdigit() else 1}, "ui_guide": None}, (time.perf_counter()-t0)*1000

    if re.search(r"\bcompare\b", ql):
        return {"tool": "compare_products", "arguments": {"product_id_1": 1, "product_id_2": 2}, "ui_guide": None}, (time.perf_counter()-t0)*1000

    if re.search(r"\b(recommend|suggest|best|which one|budget)\b", ql):
        cat = next((c for c in CATS if c.lower() in ql), "")
        return {"tool": "recommend", "arguments": {"need": q, "budget": 1000, "category": cat}, "ui_guide": None}, (time.perf_counter()-t0)*1000

    cat = next((c for c in CATS if c.lower() in ql), "")
    return {"tool": "search_products", "arguments": {"query": q, "category": cat}, "ui_guide": None}, (time.perf_counter()-t0)*1000

# ── Evaluate one system ───────────────────────────────────────────────────────


def evaluate(label, infer_fn, rows):
    stats = defaultdict(
        lambda: {"ok": 0, "f1": 0.0, "guide_ok": 0, "n": 0, "lats": []})
    total_ok = 0
    n = len(rows)
    for i, row in enumerate(rows):
        gold_tool, gold_args, gold_guide = extract_gold(row)
        lang = row.get("language", "en")
        user_msg = next(m["content"]
                        for m in row["messages"] if m["role"] == "user")
        parts = user_msg.split("\nContext: ", 1)
        q = parts[0].replace("Query: ", "")
        ctx = parts[1] if len(parts) > 1 else "{}"
        try:
            pred, lat = infer_fn(q, ctx)
            pt = pred.get("tool", "")
            pa = pred.get("arguments", {})
            pg = pred.get("ui_guide")
        except Exception as ex:
            pt, pa, pg, lat = "", {}, None, 0.0

        ok = int(pt == gold_tool)
        total_ok += ok
        f1 = score_arg_f1(pa, gold_args)
        stats[lang]["ok"] += ok
        stats[lang]["f1"] += f1
        stats[lang]["guide_ok"] += int(pg == gold_guide)
        stats[lang]["n"] += 1
        stats[lang]["lats"].append(lat)
        bar = "#" * ((i+1)*30//n) + "-" * (30-(i+1)*30//n)
        print(f"  [{bar}] {i+1:3d}/{n}  {'✓' if ok else '✗'}  "
              f"pred={pt or '(none)':22s}  gold={gold_tool:22s}  acc={total_ok/(i+1):.2f}", flush=True)
    print(f"\n  {label} DONE → tool_acc={total_ok/n:.4f}\n")
    return dict(stats)


def summarise(label, stats):
    ok = sum(v["ok"] for v in stats.values())
    f1 = sum(v["f1"] for v in stats.values())
    gok = sum(v["guide_ok"] for v in stats.values())
    n = sum(v["n"] for v in stats.values())
    lats = sorted(l for v in stats.values() for l in v["lats"])
    p50 = lats[len(lats)//2] if lats else 0
    if n == 0:
        return {
            "system": label,
            "tool_acc": 0.0,
            "arg_f1": 0.0,
            "ui_guide_acc": 0.0,
            "p50_ms": round(p50, 1),
            "count": 0,
        }
    return {"system": label,
            "tool_acc": round(ok/n, 4), "arg_f1": round(f1/n, 4),
            "ui_guide_acc": round(gok/n, 4), "p50_ms": round(p50, 1), "count": n}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--v1-model", type=str,
                        default="nexus-bots/qwen3-0_6b-fc-v1", help="HF Repo or local path for v1")
    parser.add_argument("--v2-model", type=str,
                        default="nexus-bots/qwen3-0_6b-fc-v2", help="HF Repo or local path for v2")
    parser.add_argument("--device", type=str, default="auto", choices=["auto", "cpu", "cuda"],
                        help="Where to run model inference. 'auto' tries CUDA then falls back to CPU.")
    args = parser.parse_args()

    rows = [json.loads(l) for l in open(TEST_PATH) if l.strip()]
    print(f"Loaded {len(rows)} test rows")

    print(f"\nLoading tokenizer from {BASE_MODEL}")
    tok = AutoTokenizer.from_pretrained(BASE_MODEL)

    base_model, device_used = load_base_model(
        BASE_MODEL, requested_device=args.device)
    print(f"Inference device: {device_used}")

    all_stats = {}

    # 1. BASE + Enhanced Prompt
    print("\n" + "="*60)
    print("=== Qwen3-0.6B BASE + Enhanced Prompt (production) ===")
    print("="*60)
    all_stats["Qwen3-0.6B BASE + Enhanced Prompt (production)"] = evaluate(
        "BASE+Enhanced", lambda q, ctx: infer(base_model,
                                              tok, q, ctx, ENHANCED_SYSTEM_PROMPT), rows
    )

    # 2. BASE + Original Prompt
    print("\n" + "="*60)
    print("=== Qwen3-0.6B BASE + Original Prompt ===")
    print("="*60)
    all_stats["Qwen3-0.6B BASE + Original Prompt"] = evaluate(
        "BASE+Original", lambda q, ctx: infer(base_model,
                                              tok, q, ctx, SYSTEM_PROMPT), rows
    )

    # 3. LoRA v1
    print("\n" + "="*60)
    print(f"=== Qwen3-0.6B-FC v1 (LoRA: {args.v1_model}) ===")
    print("="*60)
    try:
        ft_model_v1 = PeftModel.from_pretrained(base_model, args.v1_model)
        ft_model_v1.eval()
        all_stats["Qwen3-0.6B-FC v1 (LoRA)"] = evaluate(
            "LoRA v1", lambda q, ctx: infer(
                ft_model_v1, tok, q, ctx, SYSTEM_PROMPT), rows
        )
    except Exception as e:
        print(f"Could not load v1 model ({args.v1_model}): {e}")
        all_stats["Qwen3-0.6B-FC v1 (LoRA)"] = defaultdict(
            lambda: {"ok": 0, "f1": 0.0, "guide_ok": 0, "n": 1, "lats": [0]})

    # 4. LoRA v2 (Best of 3)
    print("\n" + "="*60)
    print(f"=== Qwen3-0.6B-FC v2 (LoRA: {args.v2_model}) ===")
    print("="*60)
    try:
        # First unload v1 adapter to load v2 on the same base model
        if hasattr(base_model, "disable_adapter"):
            base_model.disable_adapter()
        ft_model_v2 = PeftModel.from_pretrained(base_model, args.v2_model)
        ft_model_v2.eval()
        all_stats["Qwen3-0.6B-FC v2 (LoRA, best of 3)"] = evaluate(
            "LoRA v2", lambda q, ctx: infer(
                ft_model_v2, tok, q, ctx, SYSTEM_PROMPT), rows
        )
    except Exception as e:
        print(f"Could not load v2 model ({args.v2_model}): {e}")
        all_stats["Qwen3-0.6B-FC v2 (LoRA, best of 3)"] = defaultdict(
            lambda: {"ok": 0, "f1": 0.0, "guide_ok": 0, "n": 1, "lats": [0]})

    # 5. Heuristic Router
    print("\n" + "="*60)
    print("=== Heuristic Router ===")
    print("="*60)
    all_stats["Heuristic Router"] = evaluate(
        "Heuristic", lambda q, ctx: infer_heuristic(q, ctx), rows
    )

    # Summarise and print final table
    b1_rows = [summarise(label, stats) for label, stats in all_stats.items()]

    print("\n=== UNIFIED BENCHMARK RESULTS ===")
    print(f"{'System':<48} {'Tool Acc':>9} {'Arg F1':>8} {'UI Guide':>9} {'p50ms':>8} {'N':>5}")
    print("-" * 90)
    for r in b1_rows:
        print(f"{r['system']:<48} {r['tool_acc']:>9.4f} {r['arg_f1']:>8.4f} "
              f"{r['ui_guide_acc']:>9.4f} {r['p50_ms']:>8.1f} {r['count']:>5}")


if __name__ == "__main__":
    main()

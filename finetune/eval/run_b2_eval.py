#!/usr/bin/env python3
"""
Nexus Bots — B2 Base-Model Benchmark Runner

Loads Qwen3-0.6B (base, no fine-tune) and runs all 75 evaluation prompts.
Writes results to finetune/eval/b2_results.json  +  b2_results.md (human report).

Usage:
    cd /data1/cs24mtech14020/home/TDL/NexusBots-TDL-Project
    python3 finetune/eval/run_b2_eval.py

Environment:
    FC_MODEL_ID  — HF model ID   (default: Qwen/Qwen3-0.6B)
    FC_MODEL_PATH — local path  (takes priority over FC_MODEL_ID)
"""

import json
import os
import sys
import time
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
EVAL_DIR = Path(__file__).resolve().parent
RESULTS_JSON = EVAL_DIR / "b2_results.json"
RESULTS_MD   = EVAL_DIR / "b2_results.md"

# ── Import prompt suite ────────────────────────────────────────────────────────
sys.path.insert(0, str(EVAL_DIR))
from b2_eval_prompts import PROMPTS

# ── Model / system-prompt imports from fc_model.py ────────────────────────────
sys.path.insert(0, str(PROJECT_ROOT / "server" / "ai"))
import fc_model as fc

# ── Scoring helpers ────────────────────────────────────────────────────────────

def normalize_args(tool: str, args: dict) -> dict:
    """Normalize argument representation for loose comparison."""
    out = {}
    for k, v in args.items():
        if v is None:
            continue
        if isinstance(v, str) and v.lower() in ("null", "none", ""):
            continue
        out[k] = v
    return out


def score_prediction(pred: dict | None, expected: dict) -> dict:
    """
    Returns scoring breakdown:
      tool_ok      : bool — correct tool name
      args_ok      : bool — key arguments match (lenient: subset match for required keys)
      guide_ok     : bool — ui_guide matches (None treated as wildcard if expected is None)
      full_match   : bool — all three match
      parsed_ok    : bool — model output was valid JSON with a 'tool' key
    """
    if pred is None:
        return {"tool_ok": False, "args_ok": False, "guide_ok": False,
                "full_match": False, "parsed_ok": False}

    tool_ok  = (pred.get("tool") == expected["tool"])
    guide_ok = (pred.get("ui_guide") == expected.get("ui_guide"))

    # Argument scoring: check required keys only (extra keys are OK)
    pred_args = normalize_args(expected["tool"], pred.get("arguments", {}))
    exp_args  = normalize_args(expected["tool"], expected.get("arguments", {}))

    # For navigate_to, only check 'page'; params may vary
    if expected["tool"] == "navigate_to":
        args_ok = (pred_args.get("page") == exp_args.get("page"))
    elif expected["tool"] in ("search_products",):
        # category match is the important part; query text may vary
        args_ok = (pred_args.get("category") == exp_args.get("category"))
    else:
        # All expected keys must be present and match
        args_ok = all(pred_args.get(k) == v for k, v in exp_args.items() if k != "need")

    full_match = tool_ok and args_ok and guide_ok
    return {
        "tool_ok": tool_ok, "args_ok": args_ok, "guide_ok": guide_ok,
        "full_match": full_match, "parsed_ok": True,
    }


def run_single(prompt: dict) -> dict:
    """Run one prompt through the model and return the result row."""
    t0 = time.time()
    pred = fc.predict_tool_call(
        message=prompt["user_query"],
        language=prompt["lang"],
        context=prompt["context"],
    )
    latency = round((time.time() - t0) * 1000)

    scores = score_prediction(pred, prompt["expected"])
    return {
        "id":          prompt["id"],
        "lang":        prompt["lang"],
        "level":       prompt["level"],
        "intent":      prompt["intent"],
        "user_query":  prompt["user_query"],
        "expected":    prompt["expected"],
        "predicted":   pred,
        "scores":      scores,
        "latency_ms":  latency,
    }


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    model_id = os.getenv("FC_MODEL_PATH") or os.getenv("FC_MODEL_ID") or "Qwen/Qwen3-0.6B"
    os.environ.setdefault("FC_MODEL_ID", model_id)
    os.environ.setdefault("ENABLE_FC_MODEL", "1")

    print(f"\nNexus Bots — B2 Base-Model Evaluation")
    print(f"Model: {model_id}")
    print(f"Prompts: {len(PROMPTS)}")
    print("=" * 65)

    # Load model once
    print("Loading model…")
    ok = fc.load_model()
    if not ok:
        print(f"ERROR: Model failed to load — {fc._load_error}")
        sys.exit(1)
    print("Model loaded.\n")

    results = []
    pass_count = 0

    for i, prompt in enumerate(PROMPTS, 1):
        row = run_single(prompt)
        results.append(row)

        s = row["scores"]
        status = "✓" if s["full_match"] else ("T" if s["tool_ok"] else "✗")
        if s["full_match"]:
            pass_count += 1

        pred_tool = row["predicted"]["tool"] if row["predicted"] else "NONE"
        pred_guide = row["predicted"].get("ui_guide") if row["predicted"] else "-"
        exp_tool  = row["expected"]["tool"]
        exp_guide = row["expected"].get("ui_guide")

        tool_str  = f"{exp_tool}" + ("" if s["tool_ok"]  else f" ≠ {pred_tool}")
        guide_str = f"{exp_guide}" + ("" if s["guide_ok"] else f" ≠ {pred_guide}")

        print(
            f"[{i:02d}/{len(PROMPTS)}] {status} [{prompt['lang']}] {prompt['user_query'][:48]:<48}"
            f"  tool={'OK' if s['tool_ok'] else 'FAIL'}"
            f"  guide={'OK' if s['guide_ok'] else 'FAIL'}"
            f"  {row['latency_ms']}ms"
        )

    # ── Summary ───────────────────────────────────────────────────────────────
    total = len(results)
    tool_acc   = sum(r["scores"]["tool_ok"]    for r in results) / total
    args_acc   = sum(r["scores"]["args_ok"]    for r in results) / total
    guide_acc  = sum(r["scores"]["guide_ok"]   for r in results) / total
    full_acc   = sum(r["scores"]["full_match"] for r in results) / total
    parse_rate = sum(r["scores"]["parsed_ok"]  for r in results) / total

    print(f"\n{'='*65}")
    print(f"RESULTS — {total} prompts")
    print(f"  Tool accuracy  : {tool_acc:.1%}  ({sum(r['scores']['tool_ok']   for r in results)}/{total})")
    print(f"  Args accuracy  : {args_acc:.1%}  ({sum(r['scores']['args_ok']   for r in results)}/{total})")
    print(f"  Guide accuracy : {guide_acc:.1%}  ({sum(r['scores']['guide_ok']  for r in results)}/{total})")
    print(f"  Full match     : {full_acc:.1%}  ({sum(r['scores']['full_match'] for r in results)}/{total})")
    print(f"  Parse rate     : {parse_rate:.1%}")

    # ── By language ───────────────────────────────────────────────────────────
    for lang in ["en", "hi", "te"]:
        lr = [r for r in results if r["lang"] == lang]
        lt = sum(r["scores"]["tool_ok"] for r in lr)
        lf = sum(r["scores"]["full_match"] for r in lr)
        print(f"  [{lang}] tool={lt}/{len(lr)}  full={lf}/{len(lr)}")

    # ── By tool ───────────────────────────────────────────────────────────────
    tools = sorted(set(r["expected"]["tool"] for r in results))
    print()
    for t in tools:
        tr = [r for r in results if r["expected"]["tool"] == t]
        tt = sum(r["scores"]["tool_ok"] for r in tr)
        tf = sum(r["scores"]["full_match"] for r in tr)
        print(f"  {t:<20} tool={tt}/{len(tr)}  full={tf}/{len(tr)}")

    # ── Save JSON ──────────────────────────────────────────────────────────────
    summary = {
        "model": model_id,
        "total": total,
        "tool_accuracy": round(tool_acc, 4),
        "args_accuracy": round(args_acc, 4),
        "guide_accuracy": round(guide_acc, 4),
        "full_match_accuracy": round(full_acc, 4),
        "parse_rate": round(parse_rate, 4),
        "by_lang": {},
        "by_tool": {},
        "results": results,
    }
    for lang in ["en", "hi", "te"]:
        lr = [r for r in results if r["lang"] == lang]
        summary["by_lang"][lang] = {
            "total": len(lr),
            "tool_ok": sum(r["scores"]["tool_ok"] for r in lr),
            "full_match": sum(r["scores"]["full_match"] for r in lr),
        }
    for t in tools:
        tr = [r for r in results if r["expected"]["tool"] == t]
        summary["by_tool"][t] = {
            "total": len(tr),
            "tool_ok": sum(r["scores"]["tool_ok"] for r in tr),
            "full_match": sum(r["scores"]["full_match"] for r in tr),
        }

    with open(RESULTS_JSON, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"\nJSON saved → {RESULTS_JSON}")

    # ── Generate markdown report ───────────────────────────────────────────────
    generate_md_report(summary, results, RESULTS_MD)
    print(f"Report  saved → {RESULTS_MD}")


def generate_md_report(summary: dict, results: list, out_path: Path) -> None:
    lines = []
    lines.append("# B2 Base-Model Evaluation Report")
    lines.append(f"\nModel: `{summary['model']}`  |  Prompts: {summary['total']}\n")
    lines.append("## Accuracy Summary\n")
    lines.append("| Metric | Score |")
    lines.append("|--------|-------|")
    lines.append(f"| Tool accuracy   | {summary['tool_accuracy']:.1%} |")
    lines.append(f"| Args accuracy   | {summary['args_accuracy']:.1%} |")
    lines.append(f"| Guide accuracy  | {summary['guide_accuracy']:.1%} |")
    lines.append(f"| **Full match**  | **{summary['full_match_accuracy']:.1%}** |")
    lines.append(f"| Parse rate      | {summary['parse_rate']:.1%} |")

    lines.append("\n## By Language\n")
    lines.append("| Lang | Total | Tool OK | Full Match |")
    lines.append("|------|-------|---------|------------|")
    for lang, d in summary["by_lang"].items():
        lines.append(f"| {lang} | {d['total']} | {d['tool_ok']} ({d['tool_ok']/d['total']:.0%}) | {d['full_match']} ({d['full_match']/d['total']:.0%}) |")

    lines.append("\n## By Tool\n")
    lines.append("| Tool | Total | Tool OK | Full Match |")
    lines.append("|------|-------|---------|------------|")
    for tool, d in summary["by_tool"].items():
        lines.append(f"| {tool} | {d['total']} | {d['tool_ok']} ({d['tool_ok']/d['total']:.0%}) | {d['full_match']} ({d['full_match']/d['total']:.0%}) |")

    # Failures table
    failures = [r for r in results if not r["scores"]["full_match"]]
    lines.append(f"\n## All Failures ({len(failures)} / {summary['total']})\n")
    lines.append("| ID | Lang | Level | Query | Expected Tool | Got Tool | Expected Guide | Got Guide | Issues |")
    lines.append("|----|------|-------|-------|---------------|----------|----------------|-----------|--------|")
    for r in failures:
        pred = r["predicted"] or {}
        s = r["scores"]
        issues = []
        if not s["tool_ok"]:  issues.append("tool")
        if not s["args_ok"]:  issues.append("args")
        if not s["guide_ok"]: issues.append("guide")
        if not s["parsed_ok"]: issues.append("parse")
        q = r["user_query"].replace("|", "\\|")[:45]
        lines.append(
            f"| {r['id']} | {r['lang']} | {r['level']} | {q} "
            f"| {r['expected']['tool']} | {pred.get('tool','NONE')} "
            f"| {r['expected'].get('ui_guide')} | {pred.get('ui_guide')} "
            f"| {', '.join(issues)} |"
        )

    # Shortcomings analysis
    lines.append("\n## Shortcomings Analysis\n")
    lines.append(_analyze_shortcomings(results))

    out_path.write_text("\n".join(lines), encoding="utf-8")


def _analyze_shortcomings(results: list) -> str:
    from collections import Counter, defaultdict

    failures = [r for r in results if not r["scores"]["full_match"]]
    total_f = len(failures)
    if total_f == 0:
        return "No failures — model is perfect on this eval set."

    # Group by failure type
    tool_failures   = [r for r in failures if not r["scores"]["tool_ok"]]
    args_failures   = [r for r in failures if r["scores"]["tool_ok"] and not r["scores"]["args_ok"]]
    guide_failures  = [r for r in failures if r["scores"]["tool_ok"] and r["scores"]["args_ok"] and not r["scores"]["guide_ok"]]
    parse_failures  = [r for r in failures if not r["scores"]["parsed_ok"]]

    # Wrong tool mapping
    wrong_tool_map = Counter()
    for r in tool_failures:
        pred_tool = (r["predicted"] or {}).get("tool", "NONE")
        wrong_tool_map[f"{r['expected']['tool']} → {pred_tool}"] += 1

    # By language
    by_lang = Counter(r["lang"] for r in failures)

    # By intent
    by_intent = Counter(r["intent"] for r in failures)

    lines = []
    lines.append(f"**Total failures: {total_f} / {len(results)} ({total_f/len(results):.0%})**\n")
    lines.append(f"- Wrong tool: {len(tool_failures)} ({len(tool_failures)/len(results):.0%})")
    lines.append(f"- Correct tool, wrong args: {len(args_failures)} ({len(args_failures)/len(results):.0%})")
    lines.append(f"- Correct tool+args, wrong guide: {len(guide_failures)} ({len(guide_failures)/len(results):.0%})")
    lines.append(f"- Parse failures: {len(parse_failures)} ({len(parse_failures)/len(results):.0%})")
    lines.append(f"\n**Failures by language:** {dict(by_lang)}")
    lines.append(f"\n**Failures by intent:** {dict(by_intent)}")

    if wrong_tool_map:
        lines.append("\n**Most common wrong-tool mappings:**")
        for mapping, count in wrong_tool_map.most_common(10):
            lines.append(f"- `{mapping}` × {count}")

    lines.append("\n**Dataset recommendations:**")
    recs = []
    if len(tool_failures) > len(results) * 0.3:
        recs.append("HIGH PRIORITY: Model confuses tools frequently. Add more contrastive examples — same intent, different tools (e.g., 'add X to cart' vs 'show me cart').")
    if any("add_to_cart" in r["expected"]["tool"] for r in tool_failures):
        recs.append("add_to_cart: Model confuses with navigate_to or search_products. Add 20+ explicit add_to_cart examples per language.")
    if any("recommend" in r["expected"]["tool"] for r in tool_failures):
        recs.append("recommend: Model routes cheapest/budget queries to search_products. Add budget-keyword → recommend examples.")
    if any(r["lang"] in ("hi", "te") for r in tool_failures):
        recs.append("Multilingual: HI/TE romanized routing errors detected. Increase HI/TE share to 35%+ in training data.")
    if any("nav_support" in r["intent"] or "nav_new_ticket" in r["intent"] or "nav_view_tickets" in r["intent"] for r in tool_failures):
        recs.append("Support navigation: Model routes support/ticket queries to search_products. Add dedicated navigate_to(orders)+ui_guide examples for all 4 sub-intents.")
    if any("nav_orders" in r["intent"] for r in tool_failures):
        recs.append("Order tracking: 'mera order / naa order / where are my orders' should all → navigate_to(orders)+check_orders. Ensure romanized patterns in training data.")
    if len(guide_failures) > 3:
        recs.append("ui_guide accuracy is low. Add explicit guide-label examples in system prompt training and increase variety of guide-mapped queries.")
    if len(parse_failures) > 0:
        recs.append("CRITICAL: Model produces non-JSON output. Ensure training data uses exact JSON assistant messages with no <think> preamble.")

    if not recs:
        recs.append("No critical gaps found — minor improvements to args precision may help.")

    for rec in recs:
        lines.append(f"- {rec}")

    return "\n".join(lines)


if __name__ == "__main__":
    main()

"""
Nexus Bots — Benchmark B1 (Function-Calling Accuracy) + B4 (Multilingual).

Evaluates tool selection accuracy and argument correctness on the holdout test set.

Systems compared:
  1. Fine-tuned Qwen3-0.6B (ours)
  2. Heuristic router (from pipeline.py)
  3. GPT-4o zero-shot (optional, needs OPENAI_API_KEY)
  4. Claude Opus (optional, needs ANTHROPIC_API_KEY)
  5. Gemini 2.5 (optional, needs GOOGLE_API_KEY)

Usage:
    python eval/bench_function_calling.py                    # Our model + heuristic only
    python eval/bench_function_calling.py --all-models       # Include frontier models
    python eval/bench_function_calling.py --skip-ours        # Skip local model (no GPU)

Output:
    research/results/b1_function_calling.csv
    research/results/b1_function_calling.md
    research/results/b4_multilingual.csv
    research/results/b4_multilingual.md
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import (
    RESULTS_DIR,
    SYSTEM_PROMPT,
    TEST_PATH,
)


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def extract_gold(row: dict) -> tuple[str, dict, str | None]:
    """Extract gold tool_name, args, ui_guide from a v2 test row."""
    assistant_msg = None
    for msg in row.get("messages", []):
        if msg["role"] == "assistant":
            assistant_msg = msg["content"]
            break

    if assistant_msg:
        obj = json.loads(assistant_msg)
        return obj["tool"], obj["arguments"], obj.get("ui_guide")

    return row.get("tool_name", ""), {}, row.get("ui_guide")


def score_tool_accuracy(pred_tool: str, gold_tool: str) -> float:
    return 1.0 if pred_tool == gold_tool else 0.0


def score_arg_f1(pred_args: dict, gold_args: dict) -> float:
    """Per-key exact match average (F1-style)."""
    if not gold_args:
        return 1.0 if not pred_args else 0.0

    all_keys = set(gold_args.keys()) | set(pred_args.keys())
    if not all_keys:
        return 1.0

    matches = 0
    for key in all_keys:
        pred_val = pred_args.get(key)
        gold_val = gold_args.get(key)
        # Normalize: compare as strings for robustness
        if str(pred_val).strip().lower() == str(gold_val).strip().lower():
            matches += 1

    return matches / len(all_keys)


def score_ui_guide(pred_guide: str | None, gold_guide: str | None) -> float:
    return 1.0 if pred_guide == gold_guide else 0.0


def parse_json_from_text(text: str) -> dict:
    """Best-effort JSON extraction from model output."""
    text = text.strip()
    # Strip any <think>...</think> block (safety net for thinking mode leakage)
    text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass
    return {}


# ── System: Fine-tuned Qwen3-0.6B ───────────────────────────────────────────

def predict_finetuned(model, tokenizer, query: str, context_str: str) -> tuple[dict, float]:
    """Run inference with fine-tuned model. Returns (parsed_result, latency_ms)."""
    from unsloth import FastLanguageModel

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Query: {query}\nContext: {context_str}"},
    ]
    input_text = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True, enable_thinking=False
    )
    inputs = tokenizer(input_text, return_tensors="pt").to(model.device)

    start = time.perf_counter()
    outputs = model.generate(
        **inputs, max_new_tokens=200, temperature=0.0, do_sample=False,
        pad_token_id=tokenizer.eos_token_id,
    )
    latency = (time.perf_counter() - start) * 1000

    generated = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
    result = parse_json_from_text(generated)
    return result, latency


# ── System: Heuristic Router ─────────────────────────────────────────────────

def predict_heuristic(query: str, context: dict) -> tuple[dict, float]:
    """Simulate the heuristic router from pipeline.py."""
    start = time.perf_counter()

    query_lower = query.lower()
    tool = "search_products"
    args = {}

    # Navigate patterns
    nav_patterns = {
        r"\b(order|orders|my order|track|delivery)\b": ("navigate_to", {"page": "orders", "params": {}}),
        r"\b(cart|basket|checkout)\b": ("navigate_to", {"page": "cart", "params": {}}),
        r"\b(home|main page|start)\b": ("navigate_to", {"page": "home", "params": {}}),
        r"\b(catalog|browse|all products|shop)\b": ("navigate_to", {"page": "catalog", "params": {}}),
    }
    for pattern, (t, a) in nav_patterns.items():
        if re.search(pattern, query_lower):
            tool, args = t, a
            latency = (time.perf_counter() - start) * 1000
            return {"tool": tool, "arguments": args, "ui_guide": None}, latency

    # Add to cart
    if re.search(r"\b(add|put|cart)\b", query_lower):
        ids = re.findall(r"\b([1-9]|1[0-2])\b", query)
        product_id = int(ids[0]) if ids else 1
        tool, args = "add_to_cart", {"product_id": product_id}
    # Compare
    elif re.search(r"\b(compare|vs|versus|better)\b", query_lower):
        ids = re.findall(r"\b([1-9]|1[0-2])\b", query)
        id1 = int(ids[0]) if len(ids) > 0 else 1
        id2 = int(ids[1]) if len(ids) > 1 else 2
        tool, args = "compare_products", {"product_id_1": id1, "product_id_2": id2, "focus": "specs"}
    # Get product
    elif re.search(r"\b(detail|info|about|what is|tell me about)\b", query_lower):
        ids = re.findall(r"\b([1-9]|1[0-2])\b", query)
        product_id = int(ids[0]) if ids else 1
        tool, args = "get_product", {"product_id": product_id}
    # Recommend
    elif re.search(r"\b(recommend|suggest|best|budget|under|below)\b", query_lower):
        budget_match = re.search(r"(\d{3,5})", query)
        budget = int(budget_match.group(1)) if budget_match else 5000
        cats = ["Kitchen", "Home Cleaner", "Drone", "Humanoid"]
        category = ""
        for c in cats:
            if c.lower() in query_lower:
                category = c
                break
        tool, args = "recommend", {"need": query, "budget": budget, "category": category}
    # Default: search
    else:
        cats = ["Kitchen", "Home Cleaner", "Drone", "Humanoid"]
        category = ""
        for c in cats:
            if c.lower() in query_lower:
                category = c
                break
        tool, args = "search_products", {"query": query, "category": category}

    latency = (time.perf_counter() - start) * 1000
    return {"tool": tool, "arguments": args, "ui_guide": None}, latency


# ── System: Base Qwen3-0.6B (no fine-tune, via fc_model.py) ─────────────────

def predict_base_model(query: str, context_str: str) -> tuple[dict, float]:
    """Run inference with the BASE Qwen3-0.6B model using fc_model.py.
    This uses the same ChatML prompt as fine-tuning but with no LoRA adapter.
    The model is loaded once as a singleton (FC_MODEL_ID env var).
    """
    import sys
    import time
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "server" / "ai"))
    import fc_model as fc

    if fc._model is None:
        fc.load_model()

    start = time.perf_counter()
    try:
        context = json.loads(context_str) if context_str else {}
    except Exception:
        context = {}

    result = fc.predict_tool_call(query, "en", context)
    latency = (time.perf_counter() - start) * 1000

    if result is None:
        return {}, latency
    return {"tool": result.get("tool", ""), "arguments": result.get("arguments", {}), "ui_guide": result.get("ui_guide")}, latency


# ── System: GPT-4o zero-shot ─────────────────────────────────────────────────

def predict_gpt4o(query: str, context_str: str) -> tuple[dict, float]:
    """Call GPT-4o with same system prompt."""
    from openai import OpenAI
    client = OpenAI()

    start = time.perf_counter()
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Query: {query}\nContext: {context_str}"},
        ],
        temperature=0.0,
        max_tokens=256,
    )
    latency = (time.perf_counter() - start) * 1000
    text = response.choices[0].message.content or ""
    result = parse_json_from_text(text)
    return result, latency


# ── System: Claude zero-shot ─────────────────────────────────────────────────

def predict_claude(query: str, context_str: str) -> tuple[dict, float]:
    """Call Claude with same system prompt."""
    from anthropic import Anthropic
    client = Anthropic()

    start = time.perf_counter()
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": f"Query: {query}\nContext: {context_str}"},
        ],
    )
    latency = (time.perf_counter() - start) * 1000
    text = response.content[0].text if response.content else ""
    result = parse_json_from_text(text)
    return result, latency


# ── System: Gemini zero-shot ─────────────────────────────────────────────────

def predict_gemini(query: str, context_str: str) -> tuple[dict, float]:
    """Call Gemini with same system prompt."""
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    model = genai.GenerativeModel("gemini-2.5-flash")

    start = time.perf_counter()
    response = model.generate_content(
        f"{SYSTEM_PROMPT}\n\nQuery: {query}\nContext: {context_str}",
        generation_config=genai.GenerationConfig(temperature=0.0, max_output_tokens=256),
    )
    latency = (time.perf_counter() - start) * 1000
    text = response.text or ""
    result = parse_json_from_text(text)
    return result, latency


# ── Evaluation loop ──────────────────────────────────────────────────────────

def evaluate_system(
    system_name: str,
    predict_fn,
    test_rows: list[dict],
    needs_context_str: bool = True,
) -> dict:
    """Run evaluation for one system across all test rows."""
    results_by_lang = defaultdict(lambda: {
        "tool_correct": 0, "arg_f1_sum": 0.0, "ui_guide_correct": 0,
        "total": 0, "latencies": [],
    })

    for row in test_rows:
        gold_tool, gold_args, gold_guide = extract_gold(row)
        lang = row.get("language", "en")
        user_msg = ""
        for msg in row.get("messages", []):
            if msg["role"] == "user":
                user_msg = msg["content"]
                break

        # Extract query and context from user message
        parts = user_msg.split("\nContext: ", 1)
        query = parts[0].replace("Query: ", "")
        context_str = parts[1] if len(parts) > 1 else "{}"

        try:
            if needs_context_str:
                pred, latency = predict_fn(query, context_str)
            else:
                context = json.loads(context_str) if context_str else {}
                pred, latency = predict_fn(query, context)

            pred_tool = pred.get("tool", "")
            pred_args = pred.get("arguments", {})
            pred_guide = pred.get("ui_guide")
        except Exception as e:
            print(f"  Error on {row.get('id', '?')}: {e}")
            pred_tool, pred_args, pred_guide, latency = "", {}, None, 0.0

        bucket = results_by_lang[lang]
        bucket["tool_correct"] += score_tool_accuracy(pred_tool, gold_tool)
        bucket["arg_f1_sum"] += score_arg_f1(pred_args, gold_args)
        bucket["ui_guide_correct"] += score_ui_guide(pred_guide, gold_guide)
        bucket["total"] += 1
        bucket["latencies"].append(latency)

    # Aggregate
    summary = {}
    for lang, b in results_by_lang.items():
        n = b["total"]
        latencies = sorted(b["latencies"])
        p50 = latencies[len(latencies) // 2] if latencies else 0
        summary[lang] = {
            "tool_acc": round(b["tool_correct"] / n, 4) if n else 0,
            "arg_f1": round(b["arg_f1_sum"] / n, 4) if n else 0,
            "ui_guide_acc": round(b["ui_guide_correct"] / n, 4) if n else 0,
            "p50_latency_ms": round(p50, 1),
            "count": n,
        }

    # Overall
    total = sum(b["total"] for b in results_by_lang.values())
    all_latencies = sorted(
        lat for b in results_by_lang.values() for lat in b["latencies"]
    )
    summary["overall"] = {
        "tool_acc": round(
            sum(b["tool_correct"] for b in results_by_lang.values()) / total, 4
        ) if total else 0,
        "arg_f1": round(
            sum(b["arg_f1_sum"] for b in results_by_lang.values()) / total, 4
        ) if total else 0,
        "ui_guide_acc": round(
            sum(b["ui_guide_correct"] for b in results_by_lang.values()) / total, 4
        ) if total else 0,
        "p50_latency_ms": round(all_latencies[len(all_latencies) // 2], 1) if all_latencies else 0,
        "count": total,
    }

    return summary


def write_b1_results(all_results: dict, output_dir: Path):
    """Write B1 function-calling results as CSV + Markdown."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # CSV
    csv_path = output_dir / "b1_function_calling.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["System", "Tool Acc", "Arg F1", "UI Guide Acc", "p50 Latency (ms)", "Count"])
        for system_name, summary in all_results.items():
            o = summary.get("overall", {})
            writer.writerow([
                system_name,
                o.get("tool_acc", ""),
                o.get("arg_f1", ""),
                o.get("ui_guide_acc", ""),
                o.get("p50_latency_ms", ""),
                o.get("count", ""),
            ])

    # Markdown
    md_path = output_dir / "b1_function_calling.md"
    with open(md_path, "w") as f:
        f.write("# B1 — Function-Calling Accuracy\n\n")
        f.write("| System | Tool Acc | Arg F1 | UI Guide Acc | p50 Latency (ms) |\n")
        f.write("|--------|----------|--------|--------------|-------------------|\n")
        for system_name, summary in all_results.items():
            o = summary.get("overall", {})
            f.write(f"| {system_name} | {o.get('tool_acc', '-')} | {o.get('arg_f1', '-')} | {o.get('ui_guide_acc', '-')} | {o.get('p50_latency_ms', '-')} |\n")

    print(f"B1 results → {csv_path}")
    print(f"B1 table  → {md_path}")


def write_b4_results(all_results: dict, output_dir: Path):
    """Write B4 multilingual results as CSV + Markdown."""
    output_dir.mkdir(parents=True, exist_ok=True)

    languages = ["en", "hi", "te"]

    csv_path = output_dir / "b4_multilingual.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["System", "Language", "Tool Acc", "Arg F1", "Count"])
        for system_name, summary in all_results.items():
            for lang in languages:
                if lang in summary:
                    s = summary[lang]
                    writer.writerow([system_name, lang, s["tool_acc"], s["arg_f1"], s["count"]])

    md_path = output_dir / "b4_multilingual.md"
    with open(md_path, "w") as f:
        f.write("# B4 — Multilingual Function-Calling Accuracy\n\n")
        f.write("| System | Language | Tool Acc | Arg F1 | Count |\n")
        f.write("|--------|----------|----------|--------|-------|\n")
        for system_name, summary in all_results.items():
            for lang in languages:
                if lang in summary:
                    s = summary[lang]
                    f.write(f"| {system_name} | {lang.upper()} | {s['tool_acc']} | {s['arg_f1']} | {s['count']} |\n")

    print(f"B4 results → {csv_path}")
    print(f"B4 table  → {md_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--all-models", action="store_true", help="Include frontier models")
    parser.add_argument("--skip-ours", action="store_true", help="Skip fine-tuned model")
    parser.add_argument("--skip-base", action="store_true", help="Skip base model evaluation")
    parser.add_argument("--model-path", type=str, default=None, help="Path to fine-tuned model")
    args = parser.parse_args()

    if not TEST_PATH.exists():
        print(f"Test set not found: {TEST_PATH}")
        print("Run prepare_dataset.py first.")
        sys.exit(1)

    test_rows = load_jsonl(TEST_PATH)
    print(f"Loaded {len(test_rows)} test rows")

    all_results = {}

    # 1. Fine-tuned model
    if not args.skip_ours:
        print("\n=== Evaluating: Qwen3-0.6B-FC (ours) ===")
        try:
            from config import ADAPTER_DIR, MERGED_DIR, MAX_SEQ_LENGTH
            from unsloth import FastLanguageModel

            model_path = args.model_path
            if model_path is None:
                if MERGED_DIR.exists():
                    model_path = str(MERGED_DIR)
                elif ADAPTER_DIR.exists():
                    model_path = str(ADAPTER_DIR)

            if model_path and Path(model_path).exists():
                model, tokenizer = FastLanguageModel.from_pretrained(
                    model_name=model_path,
                    max_seq_length=MAX_SEQ_LENGTH,
                    dtype=None,
                    load_in_4bit=True,
                )
                FastLanguageModel.for_inference(model)

                def predict_ours(query, ctx_str):
                    return predict_finetuned(model, tokenizer, query, ctx_str)

                all_results["Qwen3-0.6B-FC (ours)"] = evaluate_system(
                    "Qwen3-0.6B-FC", predict_ours, test_rows
                )
                print(f"  Overall: {all_results['Qwen3-0.6B-FC (ours)']['overall']}")
            else:
                print("  Fine-tuned model not found, skipping.")
        except ImportError:
            print("  unsloth not installed, skipping fine-tuned model.")

    # 2. Heuristic
    print("\n=== Evaluating: Heuristic Router ===")
    all_results["Heuristic Router"] = evaluate_system(
        "Heuristic", predict_heuristic, test_rows, needs_context_str=False
    )
    print(f"  Overall: {all_results['Heuristic Router']['overall']}")

    # 3. Base Qwen3-0.6B (no fine-tune)
    if not args.skip_base:
        print("\n=== Evaluating: Qwen3-0.6B BASE (no fine-tune) ===")
        try:
            all_results["Qwen3-0.6B BASE"] = evaluate_system(
                "Qwen3-0.6B BASE", predict_base_model, test_rows
            )
            print(f"  Overall: {all_results['Qwen3-0.6B BASE']['overall']}")
        except Exception as e:
            print(f"  Base model eval failed: {e}")

    # 3-5. Frontier models (optional)
    if args.all_models:
        if os.getenv("OPENAI_API_KEY"):
            print("\n=== Evaluating: GPT-4o ===")
            all_results["GPT-4o zero-shot"] = evaluate_system(
                "GPT-4o", predict_gpt4o, test_rows
            )
            print(f"  Overall: {all_results['GPT-4o zero-shot']['overall']}")

        if os.getenv("ANTHROPIC_API_KEY"):
            print("\n=== Evaluating: Claude ===")
            all_results["Claude zero-shot"] = evaluate_system(
                "Claude", predict_claude, test_rows
            )
            print(f"  Overall: {all_results['Claude zero-shot']['overall']}")

        if os.getenv("GOOGLE_API_KEY"):
            print("\n=== Evaluating: Gemini 2.5 ===")
            all_results["Gemini 2.5 zero-shot"] = evaluate_system(
                "Gemini", predict_gemini, test_rows
            )
            print(f"  Overall: {all_results['Gemini 2.5 zero-shot']['overall']}")

    # Write results
    write_b1_results(all_results, RESULTS_DIR)
    write_b4_results(all_results, RESULTS_DIR)

    # Save raw JSON
    raw_path = RESULTS_DIR / "b1_b4_raw.json"
    with open(raw_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nRaw results → {raw_path}")


if __name__ == "__main__":
    main()

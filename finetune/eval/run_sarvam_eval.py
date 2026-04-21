"""
Nexus Bots — Sarvam-M function-calling benchmark.

Runs every row of finetune/data/test.jsonl against the Sarvam chat completions
API (model: sarvam-m) using each row's own system + user message. Logs every
request/response to JSONL and computes the same metrics used by
run_benchmark_v2.py (tool_acc, arg_f1, ui_guide_acc, p50 latency, plus a
per-language B4 breakdown).

Two evaluation modes (sarvam-m is a reasoning model):
  • thinking ON  — model emits <think>…</think>, then JSON (slow, high-quality)
  • thinking OFF — appends "/no_think" to the system prompt (Qwen3 convention
                    that sarvam-m inherits). Fast, matches how we call Qwen.

Usage:
    # API key resolution order:
    #   1) --api-key CLI flag
    #   2) SARVAM_API_KEY env var
    #   3) server/.env (auto-loaded)

    # Full run — BOTH modes back-to-back (recommended):
    python3 finetune/eval/run_sarvam_eval.py --thinking both

    # Single mode:
    python3 finetune/eval/run_sarvam_eval.py --thinking on
    python3 finetune/eval/run_sarvam_eval.py --thinking off

    # Smoke test (3 rows, no files written):
    python3 finetune/eval/run_sarvam_eval.py --thinking both --smoke

    # Misc flags:
    python3 finetune/eval/run_sarvam_eval.py --limit 20 --delay 0.5 \
                                             --model sarvam-m --api-key sk_...

Outputs (per mode, suffix = _think_on / _think_off):
    research/results/sarvam_raw_logs<suffix>.jsonl
    research/results/sarvam_function_calling<suffix>.csv / .md
    research/results/sarvam_multilingual<suffix>.csv / .md
    research/results/sarvam_comparison.md   (side-by-side, only in --thinking both)
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import TEST_PATH, RESULTS_DIR


# ── Env / helpers ────────────────────────────────────────────────────────────
def load_server_env() -> None:
    """Populate os.environ from server/.env if the var isn't already set."""
    env_path = Path(__file__).resolve().parents[2] / "server" / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


def strip_thinking(text: str) -> str:
    """Remove complete and unclosed <think>…</think> blocks."""
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.DOTALL)
    text = re.sub(r"<think>[\s\S]*$", "", text, flags=re.DOTALL)  # unclosed tail
    return text.strip()


def parse_json_lenient(text: str) -> dict:
    text = strip_thinking(text or "")
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    s, e = text.find("{"), text.rfind("}") + 1
    if s >= 0 and e > s:
        try:
            return json.loads(text[s:e])
        except Exception:
            pass
    return {}


def extract_gold(row: dict):
    for m in row.get("messages", []):
        if m["role"] == "assistant":
            obj = json.loads(m["content"])
            return obj.get("tool", ""), obj.get("arguments", {}), obj.get("ui_guide")
    return "", {}, None


def extract_prompt(row: dict):
    system = ""
    user = ""
    for m in row.get("messages", []):
        if m["role"] == "system" and not system:
            system = m["content"]
        elif m["role"] == "user" and not user:
            user = m["content"]
    return system, user


def score_arg_f1(pred: dict, gold: dict) -> float:
    if not gold:
        return 1.0 if not pred else 0.0
    pred = pred or {}
    keys = set(gold) | set(pred)
    if not keys:
        return 1.0
    return sum(
        str(pred.get(k, "")).strip().lower() == str(gold.get(k, "")).strip().lower()
        for k in keys
    ) / len(keys)


# ── Sarvam API call ──────────────────────────────────────────────────────────
def call_sarvam(*, api_key, endpoint, model, auth_header, system, user,
                max_tokens, timeout) -> tuple[dict, str, float, str | None]:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.1,
        "max_tokens": max_tokens,
    }
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Python/urllib"
    }
    if auth_header.lower() == "authorization":
        headers["Authorization"] = f"Bearer {api_key}"
    else:
        headers[auth_header] = api_key

    req = urllib.request.Request(endpoint, data=data, method="POST", headers=headers)
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            lat = (time.perf_counter() - t0) * 1000
            parsed_resp = json.loads(body)
    except urllib.error.HTTPError as ex:
        lat = (time.perf_counter() - t0) * 1000
        try:
            err_body = ex.read().decode("utf-8")
        except Exception:
            err_body = str(ex)
        return {}, "", lat, f"HTTP {ex.code}: {err_body[:400]}"
    except Exception as ex:
        lat = (time.perf_counter() - t0) * 1000
        return {}, "", lat, str(ex)

    raw_text = ""
    choices = parsed_resp.get("choices")
    if isinstance(choices, list) and choices:
        msg = choices[0].get("message") or {}
        raw_text = msg.get("content") or ""

    parsed = parse_json_lenient(raw_text)
    return parsed, raw_text, lat, None


# ── Single-mode run ──────────────────────────────────────────────────────────
def run_mode(*, mode: str, args, rows, api_key: str, out_dir: Path) -> dict:
    """mode ∈ {'on', 'off'}. Returns summary dict."""
    assert mode in ("on", "off")
    suffix = "_think_on" if mode == "on" else "_think_off"

    print("\n" + "=" * 70)
    print(f"=== Sarvam-M — thinking {mode.upper()}  "
          f"(max_tokens={args.max_tokens}, rows={len(rows)}) ===")
    print("=" * 70)

    raw_log_path = out_dir / f"sarvam_raw_logs{suffix}.jsonl"
    raw_log = None if args.smoke else open(raw_log_path, "w")

    stats = defaultdict(lambda: {"ok": 0, "f1": 0.0, "guide_ok": 0, "n": 0, "lats": []})
    total_ok = 0
    total_f1 = 0.0
    total_guide = 0
    api_errors = 0
    parse_errors = 0

    n = len(rows)
    for i, row in enumerate(rows):
        gold_tool, gold_args, gold_guide = extract_gold(row)
        system, user = extract_prompt(row)
        lang = row.get("language", "en")

        # sarvam-m inherits the Qwen3 "/no_think" convention to disable reasoning.
        if mode == "off":
            system = system + "\n\n/no_think"

        parsed, raw_text, lat, err = call_sarvam(
            api_key=api_key, endpoint=args.endpoint, model=args.model,
            auth_header=args.auth_header, system=system, user=user,
            max_tokens=args.max_tokens, timeout=args.timeout,
        )

        pt = parsed.get("tool", "") if parsed else ""
        pa = parsed.get("arguments", {}) if parsed else {}
        pg = parsed.get("ui_guide") if parsed else None

        if err:
            api_errors += 1
        elif not parsed:
            parse_errors += 1

        ok = int(pt == gold_tool)
        f1 = score_arg_f1(pa, gold_args)
        guide_ok = int(pg == gold_guide)

        total_ok += ok
        total_f1 += f1
        total_guide += guide_ok

        stats[lang]["ok"] += ok
        stats[lang]["f1"] += f1
        stats[lang]["guide_ok"] += guide_ok
        stats[lang]["n"] += 1
        stats[lang]["lats"].append(lat)

        if raw_log:
            raw_log.write(json.dumps({
                "idx": i, "id": row.get("id"), "language": lang,
                "thinking": mode,
                "gold": {"tool": gold_tool, "arguments": gold_args, "ui_guide": gold_guide},
                "pred": {"tool": pt, "arguments": pa, "ui_guide": pg},
                "raw_text": raw_text,
                "latency_ms": round(lat, 1),
                "error": err, "ok": ok,
                "arg_f1": round(f1, 4), "guide_ok": guide_ok,
            }, ensure_ascii=False) + "\n")
            raw_log.flush()

        bar = "#" * ((i + 1) * 30 // n) + "-" * (30 - (i + 1) * 30 // n)
        mark = "✓" if ok else "✗"
        err_tag = f"  ERR={err[:40]}" if err else ""
        print(f"  [{bar}] {i + 1:3d}/{n}  {mark}  pred={(pt or '(none)'):22s}  "
              f"gold={gold_tool:22s}  acc={total_ok / (i + 1):.2f}  "
              f"{lat:6.0f}ms{err_tag}", flush=True)

        if i + 1 < n and args.delay > 0:
            time.sleep(args.delay)

    if raw_log:
        raw_log.close()

    lats_all = sorted(l for v in stats.values() for l in v["lats"])
    p50 = lats_all[len(lats_all) // 2] if lats_all else 0
    summary = {
        "system": f"Sarvam ({args.model}) think={mode}",
        "thinking": mode,
        "tool_acc": round(total_ok / n, 4),
        "arg_f1": round(total_f1 / n, 4),
        "ui_guide_acc": round(total_guide / n, 4),
        "p50_ms": round(p50, 1),
        "count": n,
        "api_errors": api_errors,
        "parse_errors": parse_errors,
    }

    print(f"\n--- thinking {mode.upper()} summary ---")
    print(f"  tool_acc={summary['tool_acc']:.4f}  arg_f1={summary['arg_f1']:.4f}  "
          f"ui_guide={summary['ui_guide_acc']:.4f}  p50={summary['p50_ms']:.0f}ms  "
          f"api_err={api_errors}  parse_err={parse_errors}")

    print("  per-language:")
    b4_rows = []
    for lang, v in sorted(stats.items()):
        if v["n"] == 0:
            continue
        ta = round(v["ok"] / v["n"], 4)
        f1 = round(v["f1"] / v["n"], 4)
        ga = round(v["guide_ok"] / v["n"], 4)
        print(f"    {lang.upper():>4}  tool={ta:.4f}  arg_f1={f1:.4f}  "
              f"ui_guide={ga:.4f}  n={v['n']}")
        b4_rows.append({"system": summary["system"], "language": lang.upper(),
                        "tool_acc": ta, "arg_f1": f1, "ui_guide_acc": ga, "n": v["n"]})

    if args.smoke:
        return summary

    csv_path = out_dir / f"sarvam_function_calling{suffix}.csv"
    with open(csv_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(summary.keys()))
        w.writeheader(); w.writerow(summary)

    md_path = out_dir / f"sarvam_function_calling{suffix}.md"
    with open(md_path, "w") as f:
        f.write(f"# Sarvam — Function-Calling Accuracy (thinking={mode})\n\n")
        f.write(f"- Model: `{args.model}`\n- Endpoint: `{args.endpoint}`\n")
        f.write(f"- max_tokens: {args.max_tokens}\n- Rows: {summary['count']}\n")
        f.write(f"- API errors: {summary['api_errors']} | "
                f"Parse errors: {summary['parse_errors']}\n\n")
        f.write("| System | Tool Acc | Arg F1 | UI Guide Acc | p50 (ms) |\n")
        f.write("|--------|----------|--------|--------------|----------|\n")
        f.write(f"| {summary['system']} | {summary['tool_acc']} | {summary['arg_f1']} | "
                f"{summary['ui_guide_acc']} | {summary['p50_ms']} |\n")

    b4_csv = out_dir / f"sarvam_multilingual{suffix}.csv"
    with open(b4_csv, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["system", "language", "tool_acc",
                                           "arg_f1", "ui_guide_acc", "n"])
        w.writeheader(); w.writerows(b4_rows)

    b4_md = out_dir / f"sarvam_multilingual{suffix}.md"
    with open(b4_md, "w") as f:
        f.write(f"# Sarvam — Multilingual Function-Calling (thinking={mode})\n\n")
        f.write("| System | Language | Tool Acc | Arg F1 | UI Guide | N |\n")
        f.write("|--------|----------|----------|--------|----------|---|\n")
        for r in b4_rows:
            f.write(f"| {r['system']} | {r['language']} | {r['tool_acc']} | "
                    f"{r['arg_f1']} | {r['ui_guide_acc']} | {r['n']} |\n")

    print(f"  saved → {raw_log_path.name}, {csv_path.name}, {md_path.name}, "
          f"{b4_csv.name}, {b4_md.name}")
    return summary


# ── Main ─────────────────────────────────────────────────────────────────────
def main() -> int:
    load_server_env()

    ap = argparse.ArgumentParser()
    ap.add_argument("--api-key", default=None)
    ap.add_argument("--endpoint", default=os.getenv("SARVAM_CHAT_ENDPOINT",
                                                    "https://api.sarvam.ai/v1/chat/completions"))
    ap.add_argument("--model", default=os.getenv("SARVAM_MODEL", "sarvam-m"))
    ap.add_argument("--auth-header", default=os.getenv("SARVAM_AUTH_HEADER",
                                                       "api-subscription-key"))
    ap.add_argument("--timeout", type=int, default=int(os.getenv("SARVAM_TIMEOUT_SEC", "90")))
    ap.add_argument("--max-tokens", type=int, default=3000,
                    help="Output token ceiling. 3000 lets reasoning finish + emit JSON.")
    ap.add_argument("--thinking", choices=["on", "off", "both"], default="both",
                    help="Run with thinking on, off, or both modes sequentially")
    ap.add_argument("--limit", type=int, default=0, help="Only first N rows (0 = all)")
    ap.add_argument("--delay", type=float, default=0.5, help="Seconds between requests")
    ap.add_argument("--smoke", action="store_true",
                    help="Smoke test: limit=3, no files saved")
    ap.add_argument("--test-path", default=str(TEST_PATH))
    ap.add_argument("--out-dir", default=str(RESULTS_DIR))
    args = ap.parse_args()

    api_key = (args.api_key or os.getenv("SARVAM_API_KEY", "")).strip()
    if not api_key:
        print("ERROR: no Sarvam API key (set SARVAM_API_KEY or pass --api-key)",
              file=sys.stderr)
        return 2

    if args.smoke and args.limit == 0:
        args.limit = 3

    rows = [json.loads(l) for l in open(args.test_path) if l.strip()]
    if args.limit > 0:
        rows = rows[: args.limit]

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    modes = ["on", "off"] if args.thinking == "both" else [args.thinking]

    summaries = {}
    for mode in modes:
        summaries[mode] = run_mode(mode=mode, args=args, rows=rows,
                                   api_key=api_key, out_dir=out_dir)

    # Comparison report for --thinking both
    if len(summaries) == 2 and not args.smoke:
        cmp_md = out_dir / "sarvam_comparison.md"
        with open(cmp_md, "w") as f:
            f.write("# Sarvam — Thinking ON vs OFF\n\n")
            f.write(f"Model: `{args.model}`  |  Rows: {len(rows)}  |  "
                    f"max_tokens: {args.max_tokens}\n\n")
            f.write("| Mode | Tool Acc | Arg F1 | UI Guide | p50 (ms) | "
                    "API Err | Parse Err |\n")
            f.write("|------|----------|--------|----------|----------|"
                    "---------|-----------|\n")
            for m in ("on", "off"):
                s = summaries[m]
                f.write(f"| thinking={m} | {s['tool_acc']} | {s['arg_f1']} | "
                        f"{s['ui_guide_acc']} | {s['p50_ms']} | "
                        f"{s['api_errors']} | {s['parse_errors']} |\n")
        print(f"\nSaved comparison → {cmp_md}")

    print("\n=== DONE ===")
    for m, s in summaries.items():
        print(f"  thinking={m:<3}  tool_acc={s['tool_acc']:.4f}  "
              f"arg_f1={s['arg_f1']:.4f}  ui_guide={s['ui_guide_acc']:.4f}  "
              f"p50={s['p50_ms']:.0f}ms  parse_err={s['parse_errors']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

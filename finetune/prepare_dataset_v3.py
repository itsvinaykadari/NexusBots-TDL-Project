"""
Nexus Bots — Dataset Preparation v3

Merges original training data + augmented_v3 examples.
Keeps the existing test.jsonl FIXED (same 100 rows) for fair comparison.

Output:
  finetune/data/train_v3.jsonl   — merged training set
  finetune/data/test.jsonl       — unchanged (100-row holdout, same as before)
"""

import json
import random
from collections import Counter, defaultdict
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import (
    DATA_DIR, PROJECT_ROOT, SYSTEM_PROMPT, CATEGORY_TO_GUIDE,
    RANDOM_SEED, TEST_PATH,
)

AUG_V3_PATH = PROJECT_ROOT / "research" / "dataset" / "raw" / "function_calls_augmented_v3.jsonl"
TRAIN_V3_PATH = DATA_DIR / "train_v3.jsonl"

rng = random.Random(RANDOM_SEED)


def convert_aug_row(row: dict) -> dict:
    """Convert augmented_v3 raw row to ChatML format."""
    tool_name = row["function_call"]["name"]
    args = row["function_call"]["arguments"]
    ui_guide = row.get("ui_guide")

    user_content = f"Query: {row['user_query']}\nContext: {json.dumps(row['page_context'], ensure_ascii=False)}"
    assistant_json = {"tool": tool_name, "arguments": args, "ui_guide": ui_guide}

    return {
        "id": row["id"],
        "language": row["language"],
        "proficiency": row.get("proficiency", "intermediate"),
        "messages": [
            {"role": "system",    "content": SYSTEM_PROMPT},
            {"role": "user",      "content": user_content},
            {"role": "assistant", "content": json.dumps(assistant_json, ensure_ascii=False)},
        ],
        "tool_name": tool_name,
        "ui_guide": ui_guide,
        "metadata": row.get("metadata", {}),
    }


def write_jsonl(rows, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def print_stats(label, rows):
    tool_counts = Counter(r["tool_name"] for r in rows)
    lang_counts = Counter(r["language"] for r in rows)
    tl = defaultdict(Counter)
    for r in rows:
        tl[r["tool_name"]][r["language"]] += 1
    print(f"\n=== {label} ({len(rows)} rows) ===")
    print(f"By language: {dict(lang_counts)}")
    for t in sorted(tool_counts):
        lc = dict(tl[t])
        total = tool_counts[t]
        print(f"  {t:25s} total={total:4d}  {lc}")


# ── Load existing train.jsonl ────────────────────────────────────────────────
orig_train = [json.loads(l) for l in open(DATA_DIR / "train.jsonl") if l.strip()]
print(f"Loaded {len(orig_train)} existing training rows")

# ── Load + convert augmented v3 ──────────────────────────────────────────────
aug_rows_raw = [json.loads(l) for l in open(AUG_V3_PATH) if l.strip()]
aug_rows = [convert_aug_row(r) for r in aug_rows_raw]
print(f"Loaded {len(aug_rows)} augmented v3 rows")

# ── Merge ────────────────────────────────────────────────────────────────────
all_train = orig_train + aug_rows
rng.shuffle(all_train)

print_stats("Original train", orig_train)
print_stats("Augmented v3",   aug_rows)
print_stats("Combined train", all_train)

# ── Write ────────────────────────────────────────────────────────────────────
write_jsonl(all_train, TRAIN_V3_PATH)
print(f"\nWrote {len(all_train)} rows → {TRAIN_V3_PATH}")
print(f"Test set unchanged → {TEST_PATH} ({sum(1 for _ in open(TEST_PATH))} rows)")

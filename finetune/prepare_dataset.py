"""
Nexus Bots — Dataset preparation (raw v2 → ChatML v2).

1. Reads function_calls_raw_v2.jsonl (1000 rows from template_generator_v2)
2. Adds ui_guide field based on tool/args heuristic
3. Converts to Qwen3 ChatML format with JSON assistant output
4. Splits into stratified train/test (900/100)
5. Writes to finetune/data/
"""

import json
import random
from collections import defaultdict
from pathlib import Path

from config import (
    CATEGORY_TO_GUIDE,
    DATA_DIR,
    FULL_V2_PATH,
    RANDOM_SEED,
    SYSTEM_PROMPT,
    TEST_PATH,
    TEST_SIZE,
    TRAIN_PATH,
    PROJECT_ROOT,
)


def compute_ui_guide(tool_name: str, args: dict) -> str | None:
    """Derive ui_guide intent key from tool name and arguments."""
    if tool_name == "navigate_to":
        page = args.get("page", "")
        if page == "orders":
            return "check_orders"
        if page == "cart":
            return "update_cart"
        return None

    if tool_name == "compare_products":
        return "compare_products"

    if tool_name in ("search_products", "recommend"):
        category = args.get("category", "")
        return CATEGORY_TO_GUIDE.get(category)

    return None


RAW_V2_PATH = PROJECT_ROOT / "research" / "dataset" / "raw" / "function_calls_raw_v2.jsonl"
B2_LABELED_PATH = PROJECT_ROOT / "research" / "dataset" / "raw" / "function_calls_b2_labeled.jsonl"


def convert_row(row: dict) -> dict:
    """Convert a raw v2 row to ChatML-ready format."""
    fc = row.get("function_call", {})
    tool_name = fc.get("name", "")
    args = fc.get("arguments", {})
    # Prefer explicit ui_guide from raw data (covers support/location intents);
    # fall back to heuristic for older JS-generated rows that lack the field.
    if "ui_guide" in row:
        ui_guide = row["ui_guide"]
    else:
        ui_guide = compute_ui_guide(tool_name, args)

    # Build user message with query + context
    user_query = row.get("user_query", "")
    page_context = row.get("page_context", {})
    user_content = f"Query: {user_query}\nContext: {json.dumps(page_context, ensure_ascii=False)}"

    assistant_json = {
        "tool": tool_name,
        "arguments": args,
        "ui_guide": ui_guide,
    }

    return {
        "id": row.get("id", ""),
        "language": row.get("language", "en"),
        "proficiency": row.get("proficiency", "beginner"),
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
            {"role": "assistant", "content": json.dumps(assistant_json, ensure_ascii=False)},
        ],
        "tool_name": tool_name,
        "ui_guide": ui_guide,
        "metadata": row.get("metadata", {}),
    }


def stratified_split(rows: list[dict], test_size: int, seed: int) -> tuple[list[dict], list[dict]]:
    """Stratified split by language × tool_name, ensuring test has balanced representation."""
    rng = random.Random(seed)

    buckets: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        key = f"{row['language']}:{row['tool_name']}"
        buckets[key].append(row)

    test_rows: list[dict] = []
    train_rows: list[dict] = []

    total = len(rows)
    test_ratio = test_size / total

    for key, bucket in buckets.items():
        rng.shuffle(bucket)
        n_test = max(1, round(len(bucket) * test_ratio))
        test_rows.extend(bucket[:n_test])
        train_rows.extend(bucket[n_test:])

    # Trim/pad test to exact size
    rng.shuffle(test_rows)
    if len(test_rows) > test_size:
        overflow = test_rows[test_size:]
        test_rows = test_rows[:test_size]
        train_rows.extend(overflow)
    elif len(test_rows) < test_size:
        deficit = test_size - len(test_rows)
        rng.shuffle(train_rows)
        test_rows.extend(train_rows[:deficit])
        train_rows = train_rows[deficit:]

    rng.shuffle(train_rows)
    rng.shuffle(test_rows)
    return train_rows, test_rows


def write_jsonl(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def validate_v2(rows: list[dict]) -> dict:
    """Run quick validation counts on v2 dataset."""
    stats = {
        "total": len(rows),
        "by_language": defaultdict(int),
        "by_tool": defaultdict(int),
        "by_proficiency": defaultdict(int),
        "by_ui_guide": defaultdict(int),
        "ui_guide_null_count": 0,
    }
    for row in rows:
        stats["by_language"][row["language"]] += 1
        stats["by_tool"][row["tool_name"]] += 1
        stats["by_proficiency"][row["proficiency"]] += 1
        if row["ui_guide"]:
            stats["by_ui_guide"][row["ui_guide"]] += 1
        else:
            stats["ui_guide_null_count"] += 1
    return stats


def main():
    print(f"Reading raw v2 dataset from {RAW_V2_PATH}")
    if not RAW_V2_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {RAW_V2_PATH}")

    rows_raw = []
    with open(RAW_V2_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows_raw.append(json.loads(line))

    print(f"Loaded {len(rows_raw)} rows from raw v2 (template)")

    # Merge B2 real-world labeled sessions if available
    if B2_LABELED_PATH.exists():
        b2_rows = []
        with open(B2_LABELED_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    b2_rows.append(json.loads(line))
        print(f"Loaded {len(b2_rows)} rows from B2 labeled sessions")
        rows_raw = rows_raw + b2_rows
        print(f"Combined: {len(rows_raw)} rows total")
    else:
        print(f"No B2 labeled file found at {B2_LABELED_PATH} — using template data only")

    # Convert to ChatML v2
    rows_v2 = [convert_row(row) for row in rows_raw]

    # Validate
    stats = validate_v2(rows_v2)
    print(f"\n=== Dataset v2 Statistics ===")
    print(f"Total: {stats['total']}")
    print(f"By language: {dict(stats['by_language'])}")
    print(f"By tool: {dict(stats['by_tool'])}")
    print(f"By proficiency: {dict(stats['by_proficiency'])}")
    print(f"By ui_guide: {dict(stats['by_ui_guide'])}")
    print(f"ui_guide null: {stats['ui_guide_null_count']}")

    # Write full v2
    write_jsonl(rows_v2, FULL_V2_PATH)
    print(f"\nWrote full v2 → {FULL_V2_PATH}")

    # Stratified split
    train_rows, test_rows = stratified_split(rows_v2, TEST_SIZE, RANDOM_SEED)

    write_jsonl(train_rows, TRAIN_PATH)
    write_jsonl(test_rows, TEST_PATH)

    print(f"Train: {len(train_rows)} rows → {TRAIN_PATH}")
    print(f"Test:  {len(test_rows)} rows → {TEST_PATH}")

    # Validate splits
    train_stats = validate_v2(train_rows)
    test_stats = validate_v2(test_rows)
    print(f"\n=== Train Split ===")
    print(f"By language: {dict(train_stats['by_language'])}")
    print(f"By tool: {dict(train_stats['by_tool'])}")

    print(f"\n=== Test Split ===")
    print(f"By language: {dict(test_stats['by_language'])}")
    print(f"By tool: {dict(test_stats['by_tool'])}")

    # Save validation report
    report = {
        "full": {k: dict(v) if isinstance(v, defaultdict) else v for k, v in stats.items()},
        "train": {k: dict(v) if isinstance(v, defaultdict) else v for k, v in train_stats.items()},
        "test": {k: dict(v) if isinstance(v, defaultdict) else v for k, v in test_stats.items()},
    }
    report_path = DATA_DIR / "validation_report_v2.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nValidation report → {report_path}")


if __name__ == "__main__":
    main()

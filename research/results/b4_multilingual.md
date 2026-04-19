# B4 — Multilingual Function-Calling

Per-language slices of the B1 test set (EN 55, HI 27, TE 18). Test set fixed at `finetune/data/test.jsonl`.

## Headline result — BASE + Enhanced Prompt (production)

| System | Language | Tool Acc | Arg F1 | N |
|--------|----------|----------|--------|---|
| **Qwen3-0.6B BASE + Enhanced Prompt** | EN | **0.8364** | 0.6045 | 55 |
| **Qwen3-0.6B BASE + Enhanced Prompt** | HI | **0.6667** | 0.4043 | 27 |
| **Qwen3-0.6B BASE + Enhanced Prompt** | TE | **0.8333** | 0.5833 | 18 |

The enhanced prompt lifts every language above all prior systems. EN gains +22pp over the base/original prompt; TE gains +28pp. HI is the weakest of the three (the few-shots include one HI example; adding 2–3 more targeting "batao/jankari" → `get_product` and "kaun sa/sasta" → `recommend` is the obvious next iteration).

## Full comparison

| System | Language | Tool Acc | Arg F1 | UI Guide | N |
|--------|----------|----------|--------|----------|---|
| Qwen3-0.6B BASE + Enhanced Prompt | EN | 0.8364 | 0.6045 | — | 55 |
| Qwen3-0.6B BASE + Enhanced Prompt | HI | 0.6667 | 0.4043 | — | 27 |
| Qwen3-0.6B BASE + Enhanced Prompt | TE | 0.8333 | 0.5833 | — | 18 |
| Qwen3-0.6B BASE + Original Prompt | EN | 0.6182 | 0.4682 | 0.3273 | 55 |
| Qwen3-0.6B BASE + Original Prompt | HI | 0.5926 | 0.4846 | 0.3333 | 27 |
| Qwen3-0.6B BASE + Original Prompt | TE | 0.5556 | 0.3796 | 0.4444 | 18 |
| Qwen3-0.6B-FC v1 (LoRA) | EN | 0.4364 | 0.2909 | 0.2364 | 55 |
| Qwen3-0.6B-FC v1 (LoRA) | HI | 0.5926 | 0.3241 | 0.3333 | 27 |
| Qwen3-0.6B-FC v1 (LoRA) | TE | 0.4444 | 0.2222 | 0.3333 | 18 |
| Heuristic Router | EN | 0.4727 | 0.2855 | 0.2909 | 55 |
| Heuristic Router | HI | 0.3704 | 0.2494 | 0.2222 | 27 |
| Heuristic Router | TE | 0.6667 | 0.3472 | 0.2778 | 18 |

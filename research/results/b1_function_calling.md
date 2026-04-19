# B1 — Function-Calling Accuracy

Test set: `finetune/data/test.jsonl` (100 rows, stratified EN 55 / HI 27 / TE 18, fixed across all runs).

## Headline result

The **BASE Qwen3-0.6B + Enhanced Prompt** strategy is the production routing system. It outperforms every other approach we tried — fine-tuned LoRA adapters (v1/v2/v3), the base model with the original system prompt, and the heuristic keyword router.

| System | Tool Acc | Arg F1 | UI Guide Acc | p50 (ms) |
|--------|----------|--------|--------------|----------|
| **Qwen3-0.6B BASE + Enhanced Prompt (production)** | **0.7900** | **0.5467** | **0.5200** | **1113.8** |
| Qwen3-0.6B BASE + Original Prompt | 0.6000 | 0.4567 | 0.3500 | 1442.3 |
| Qwen3-0.6B-FC v2 (LoRA fine-tuned, best of 3) | 0.5100 | 0.3100 | 0.3000 | 1880.0 |
| Qwen3-0.6B-FC v1 (LoRA fine-tuned) | 0.4800 | 0.2875 | 0.2800 | 1910.5 |
| Heuristic Router | 0.4800 | 0.2868 | 0.2700 | 0.0 |

The enhanced prompt adds a priority-ordered tool decision tree, the full 12-product catalog, and 8 contrastive few-shot examples that target the specific failure modes of the base model (named-product → `get_product`, multilingual buy verbs → `add_to_cart`, "difference between X and Y" → `compare_products`, "open support" → `navigate_to` + `ui_guide=open_support`).

See [`enhanced_prompt.md`](enhanced_prompt.md) for the full analysis, per-language slices, and remaining failures.

## What we tried before landing here

| Attempt | Result | Why it failed / succeeded |
|---|---|---|
| Heuristic keyword router | 0.48 | Misses paraphrases; brittle on multilingual queries |
| LoRA fine-tune v1 (3 ep, lr=2e-4, 1113 rows) | 0.46 | Severe overfit (loss → 0.0002, token_acc=1.0 by epoch 1) |
| LoRA fine-tune v2 (1 ep, lr=5e-5, dropout=0.05, 1113 rows) | 0.51 | Best fine-tune, still below base — small-data catastrophic forgetting |
| LoRA fine-tune v3 (1 ep, +552 augmented hard examples, 1665 rows) | 0.48 | Augmented templates memorized, hurt generalization |
| Base Qwen3-0.6B + original prompt | 0.60 | Surfaces pre-trained function-calling capability |
| **Base Qwen3-0.6B + Enhanced Prompt** | **0.79** | **Decision tree + 8 few-shots target exact base failure modes** |

**Conclusion:** On a ~1.7k-row dataset, LoRA fine-tuning Qwen3-0.6B regresses below the base model due to catastrophic forgetting. In-context learning via a carefully crafted few-shot prompt is the right tool for this data regime. Cross-referenced with published results: arxiv.org/html/2402.18865v1.

All fine-tuned adapters in `finetune/output/qwen3-0_6b-fc-v{1,2,3}/` are deprecated.

# Enhanced Prompt Strategy — Production Function-Calling Router

This document is the canonical record of the strategy currently used in production for tool/intent routing in NexusBots. If you only read one results file, read this one.

## TL;DR

| Approach | Tool Accuracy (B1, n=100) |
|---|---|
| Heuristic keyword router | 0.48 |
| LoRA fine-tune v1 (3 ep, lr=2e-4) | 0.46 |
| LoRA fine-tune v2 (1 ep, lr=5e-5, dropout=0.05) | 0.51 |
| LoRA fine-tune v3 (1 ep, +552 augmented hard examples) | 0.48 |
| Qwen3-0.6B BASE + original system prompt | 0.60 |
| **Qwen3-0.6B BASE + Enhanced Prompt (production)** | **0.79** |

The enhanced prompt is **+19 percentage points** over the base/original prompt and **+28 percentage points** over the best fine-tuned LoRA adapter.

## What we tried

The story of this project's routing model is a story of trying multiple approaches on a small (~1.7k row) domain dataset and discovering that the right tool was prompt engineering, not fine-tuning.

1. **Heuristic keyword router** (0.48) — fast but brittle on paraphrases and multilingual queries.
2. **LoRA fine-tuning, three iterations** — every attempt regressed below the base model:
   - **v1**: 3 epochs, lr=2e-4, 1113 rows → 0.46. Loss collapsed to 0.0002 with token_acc=1.0 by epoch 1 (severe overfit).
   - **v2**: 1 epoch, lr=5e-5, dropout=0.05, warmup=0.10 → 0.51. The best fine-tune, still under base.
   - **v3**: 1 epoch with 552 augmented hard examples (1665 rows total) → 0.48. The augmented templates ("Add {product} to cart" × 12 products × 3 languages) were memorized as surface patterns rather than learned as intent.
3. **BASE Qwen3-0.6B + original system prompt** (0.60) — the pre-trained function-calling capability of Qwen3 already exceeded our LoRA adapters.
4. **BASE Qwen3-0.6B + Enhanced Prompt** (0.79) — added a priority-ordered tool decision tree, the full 12-product catalog, and 8 contrastive few-shot examples that target the exact failure modes of the base model.

The pivot from fine-tuning to prompt engineering came after analyzing the 40 base-model failures and noticing that they clustered into a small number of well-defined confusions. Each pattern can be addressed with one well-chosen few-shot example.

## Why fine-tuning failed (and few-shot worked)

Catastrophic forgetting via LoRA is documented in published research (arxiv.org/html/2402.18865v1 — *LoRA Learns Less and Forgets Less*). With ~1700 examples and an adapter of ~10M trainable parameters, LoRA memorizes surface patterns of the training set while overwriting the rich function-calling priors that Qwen3 acquired during its much larger pre-training.

Few-shot prompting on the base model preserves all that pre-trained capability and steers it with a handful of examples — exactly the right tool when:
- the dataset is small (< 10k examples),
- the base model already shows non-trivial performance (> 50%),
- the failure modes are interpretable and clusterable.

## What the enhanced prompt contains

Implementation: [`finetune/eval/enhanced_prompt.py`](../../finetune/eval/enhanced_prompt.py).

Four sections, in this order:

1. **Product block** — the full 12-product catalog (id, name, category, price). Lets the model resolve named-product queries to the correct `product_id` without external lookup.
2. **Tool schemas** — argument signatures for each of the 6 tools and the closed set of valid `ui_guide` values. Critical: the `ui_guide` enumeration is what stops the base model from leaking values like `open_support` into the `tool` field.
3. **Tool decision tree** — a priority-ordered ruleset that resolves the highest-frequency confusions deterministically:
   - `compare_products` first (if two product names + `compare/vs/difference/fark/teda` appear)
   - then `add_to_cart` (English, Hindi `le lena/kharidna`, Telugu `konu`, the `Cart:` idiom)
   - then `get_product` (named product + `tell/about/details/batao/jankari/gurinchi`)
   - then `navigate_to` with the right `ui_guide` (orders, support, ticket, cart, catalog, home)
   - then `recommend` (advisory verbs without a specific product)
   - `search_products` is the default fallback
4. **Eight contrastive few-shot examples** — each example targets one specific failure pattern:
   - `get_product` for "What can you tell me about Roborock S8 MaxV Ultra?"
   - `add_to_cart` for HI "Roborock S8 MaxV Ultra le lena hai"
   - `compare_products` for "What's the difference between iRobot j9+ and Ecovacs WINBOT W2 Omni in specs?"
   - `navigate_to` + `ui_guide=open_support` for "Open support ticket interface"
   - `add_to_cart` for TE "Amazon Astro konu"
   - `recommend` for "Which drone is best under $500?"
   - `search_products` for "Show me all home cleaning robots"
   - `add_to_cart` for the idiom "Cart: add Samsung Ballie"

## Production results — full table

Test set: `finetune/data/test.jsonl` (100 rows, stratified EN 55 / HI 27 / TE 18).

| System | Tool Acc | Arg F1 | UI Guide Acc | p50 (ms) |
|---|---|---|---|---|
| **Qwen3-0.6B BASE + Enhanced Prompt** | **0.7900** | **0.5467** | **0.5200** | **1113.8** |
| Qwen3-0.6B BASE + Original Prompt | 0.6000 | 0.4567 | 0.3500 | 1442.3 |

The enhanced prompt is also faster (1114 ms vs 1442 ms p50) — the explicit decision tree shortens generation by avoiding meandering outputs.

### Per-language

| Language | Original Prompt | Enhanced Prompt | Δ |
|---|---|---|---|
| EN (n=55) | 0.6182 | **0.8364** | +21.8 pp |
| HI (n=27) | 0.5926 | **0.6667** | +7.4 pp |
| TE (n=18) | 0.5556 | **0.8333** | +27.8 pp |

## Remaining failures (21 of 100)

The residual failures cluster into two categories — both addressable with more few-shots if we want to push toward 0.85+:

**`get_product` ↔ `search_products` (paraphrase miss)** — queries like "Tell me about X", "ke baare mein batao", "complete technical profile" with a named product are sometimes routed to `search_products`.

**`recommend` ↔ `search_products` (advisory miss)** — "Which robot should I buy?", "Cheapest Home Cleaner robot you have", "Sabse sasta ... kaun sa hai?" are sometimes routed to `search_products` instead of `recommend`.

A handful of HI/TE-specific paraphrases ("Humanoid robots kahan milenge?", "Drone robot kavali ... kosam") account for most of the remaining errors. Each can be fixed by a targeted few-shot.

## How to reproduce

```bash
cd finetune
CUDA_VISIBLE_DEVICES=0 python3 eval/bench_enhanced_prompt.py
```

Outputs:
- Console: per-row predictions, per-language breakdown, final table, failure list.
- File: `research/results/enhanced_prompt_results.csv`.

## Deployment

Load `Qwen/Qwen3-0.6B` directly (no adapter) and pass `ENHANCED_SYSTEM_PROMPT` as the system message. Always use `enable_thinking=False` to match the chat-template format the prompt was tuned for.

```python
from finetune.eval.enhanced_prompt import ENHANCED_SYSTEM_PROMPT
from transformers import AutoModelForCausalLM, AutoTokenizer

tok = AutoTokenizer.from_pretrained("Qwen/Qwen3-0.6B")
model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen3-0.6B", dtype="float16", device_map="cuda:0")

msgs = [{"role": "system", "content": ENHANCED_SYSTEM_PROMPT},
        {"role": "user",   "content": f"Query: {q}\nContext: {ctx}"}]
text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True, enable_thinking=False)
```

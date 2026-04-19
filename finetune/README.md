# Nexus Bots — Function-Calling Router for Qwen3-0.6B

> **Production strategy: BASE Qwen3-0.6B + Enhanced System Prompt** (no LoRA adapter).
> Achieves **0.79** tool accuracy on the 100-row B1 test set vs 0.60 for the same base model with the original prompt and 0.51 for the best LoRA fine-tune.
>
> See [`../research/results/enhanced_prompt.md`](../research/results/enhanced_prompt.md) for the full results and rationale.

## Agentic Architecture

NexusBots uses a **dual-model agentic pipeline**:

| Role | Model | Where |
|------|-------|--------|
| Tool/intent routing (small) | **Qwen3-0.6B BASE + Enhanced Prompt** | `server/ai/fc_model.py` + `eval/enhanced_prompt.py` |
| Natural language response (large) | **SARVAM-M** (API) | `server/ai/sarvam_client.py` |

**Flow:** User query → Qwen3-0.6B (with `ENHANCED_SYSTEM_PROMPT`) selects tool + ui_guide → tool executes → SARVAM-M generates response in user's language.

**UI Guidance** (`ui_guide` key) is a first-class agentic output — every applicable tool call must emit the correct guide key to trigger on-screen highlights in the frontend.

## Why we did not use a fine-tuned model

We explored fine-tuning Qwen3-0.6B with QLoRA across three iterations (v1/v2/v3 in `output/qwen3-0_6b-fc-v{1,2,3}/`). All three regressed below the base model:

| Run | Config | Tool Acc |
|---|---|---|
| LoRA v1 | 3 ep, lr=2e-4, 1113 rows | 0.46 |
| LoRA v2 | 1 ep, lr=5e-5, dropout=0.05 | 0.51 |
| LoRA v3 | 1 ep, +552 augmented hard examples | 0.48 |
| **BASE Qwen3-0.6B (no training)** | — | **0.60** |
| **BASE + Enhanced Prompt (production)** | 8 few-shots + decision tree | **0.79** |

Root cause: catastrophic forgetting on a small (~1.7k row) dataset — the LoRA adapter memorizes surface patterns and overwrites Qwen3's pre-trained function-calling priors. Documented behavior, see arxiv.org/html/2402.18865v1. Few-shot prompting on the base preserves those priors and steers them with 8 contrastive examples.

**The fine-tuning code in this directory is preserved for reproducibility and reporting only. The fine-tuned adapters are deprecated.**

## Overview

This directory contains:
- The **production routing prompt**: [`eval/enhanced_prompt.py`](eval/enhanced_prompt.py) (`ENHANCED_SYSTEM_PROMPT`).
- The **production benchmark**: [`eval/bench_enhanced_prompt.py`](eval/bench_enhanced_prompt.py).
- **Deprecated fine-tuning infrastructure** (Qwen3-0.6B + QLoRA via Unsloth): kept for the report's ablation table.

The model learns to:
1. Select the correct tool (6 tools) from user query + page context
2. Generate valid arguments (product IDs, categories, budgets, etc.)
3. Emit `ui_guide` intent keys for on-screen step-by-step highlights
4. Work on English and romanized Hindi/Telugu queries
5. Adapt to user proficiency (beginner/expert)

> **Note:** Qwen3-0.6B is English-only at inference time. Hindi and Telugu voice input is converted to **romanized Latin text** via the SARVAM STT API before reaching this model. SARVAM-M handles the final multilingual response generation.

## Directory Structure

```
finetune/
├── README.md                 # This file
├── config.py                 # Hyperparameters & paths
├── prepare_dataset.py        # v1 → v2 dataset (add ui_guide, Qwen format)
├── train.py                  # Main training script (Unsloth + QLoRA)
├── inference.py              # Load fine-tuned model + run inference
├── qwen35_finetune.ipynb     # Google Colab notebook (copy of train.py)
├── requirements.txt          # Python dependencies
├── data/                     # Generated dataset artifacts
│   ├── train.jsonl           # Training split (900 rows)
│   └── test.jsonl            # Holdout split (100 rows, stratified)
└── eval/
    ├── bench_function_calling.py  # B1 + B4 benchmarks
    └── bench_rag.py               # B2 benchmark
```

## Quick Start

### 1. Prepare Dataset
```bash
cd finetune
python prepare_dataset.py
```
This reads `research/dataset/final/function_calling_v1.jsonl`, adds `ui_guide` fields, formats for Qwen3 chat template, and splits into train/test.

### 2. Train (Local with GPU)
```bash
python train.py
```

### 3. Train (Google Colab)
Upload `qwen35_finetune.ipynb` to Colab, mount Drive, run all cells.

### 4. Inference
```bash
python inference.py --query "Show me drones under 50k" --context '{"current_page":"catalog"}'
```

### 5. Benchmarks
```bash
python eval/bench_function_calling.py   # B1 + B4
python eval/bench_rag.py                # B2
```

## Training Details

| Parameter | Value |
|-----------|-------|
| Base model | Qwen3-0.6B |
| Method | QLoRA (4-bit NF4) |
| Rank | 16 |
| Alpha | 32 |
| Target modules | q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj |
| Learning rate | 2e-4 |
| Epochs | 3 |
| Batch size | 4 |
| Grad accumulation | 4 (effective batch = 16) |
| Warmup ratio | 0.03 |
| LR scheduler | Cosine |
| Max seq length | 1024 |
| Dataset | 1000 rows (EN 500 / HI 250 / TE 250) |

## Dataset Format (v2 with ui_guide)

Each training example follows Qwen3 ChatML format:

**System prompt**: Tool schemas + instruction to output JSON with `tool`, `arguments`, `ui_guide`

**User message**: Query + page context

**Assistant response** (target):
```json
{"tool": "search_products", "arguments": {"query": "drones", "category": "Drone"}, "ui_guide": "find_drone"}
```

## UI Guide Intent Keys

| Key | Trigger |
|-----|---------|
| `check_orders` | navigate_to page=orders |
| `track_delivery` | navigate_to page=orders (with order context) |
| `update_cart` | navigate_to page=cart |
| `find_drone` | search/recommend category=Drone |
| `find_kitchen` | search/recommend category=Kitchen |
| `find_cleaner` | search/recommend category=Home Cleaner |
| `find_humanoid` | search/recommend category=Humanoid |
| `compare_products` | compare_products tool |

## Benchmarks

### B1 — Function-Calling Accuracy

**Production benchmark** (BASE + Enhanced Prompt vs BASE + Original Prompt):
```bash
CUDA_VISIBLE_DEVICES=0 python3 eval/bench_enhanced_prompt.py
```
Output → `research/results/enhanced_prompt_results.csv` and console tables.
Headline number: **tool_acc = 0.79**.

**Historical benchmark** (Fine-tuned LoRA vs Base vs Heuristic — kept for the report's ablation):
```bash
python eval/bench_function_calling.py              # local models only
python eval/bench_function_calling.py --all-models # include frontier models
```
Output → `research/results/b1_function_calling.{csv,md}`

### B2 — Base-Model Evaluation (75 hand-crafted prompts)
Evaluate base Qwen3-0.6B across all 6 tools × 3 languages at multiple complexity levels.

```bash
FC_MODEL_ID=Qwen/Qwen3-0.6B python3 eval/run_b2_eval.py
```

Output → `eval/b2_results.{json,md}`  
Last result (base model): **tool_acc=68%, full_match=16%**

### B4 — Multilingual Function-Calling
Per-language (EN/HI/TE) accuracy slices — produced alongside B1.

Output → `research/results/b4_multilingual.{csv,md}`

# Nexus Bots — Qwen3-0.6B Fine-Tuning for Domain-Specific Function Calling

## Overview

Fine-tune **Qwen3-0.6B** (released 2026-03-02, 119 languages incl. HI/TE) using **QLoRA via Unsloth** for domain-specific function calling in robotics e-commerce.

The model learns to:
1. Select the correct tool (6 tools) from user query + page context
2. Generate valid arguments (product IDs, categories, budgets, etc.)
3. Emit `ui_guide` intent keys for on-screen step-by-step highlights
4. Work across English, Hindi, and Telugu queries
5. Adapt to user proficiency (beginner/expert)

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
This reads `research/dataset/final/function_calling_v1.jsonl`, adds `ui_guide` fields, formats for Qwen3.5 chat template, and splits into train/test.

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

Each training example follows Qwen3.5 ChatML format:

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
Compare: Fine-tuned Qwen3-0.6B vs Heuristic vs GPT-4o vs Claude vs Gemini

### B2 — Context-Aware RAG
Compare: FAISS + context re-rank vs FAISS-only vs BM25

### B4 — Multilingual Function-Calling
Per-language (EN/HI/TE) accuracy slices

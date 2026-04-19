# Nexus Bots

**Compact Qwen3-0.6B Agentic Function Routing with Enhanced Prompting + UI Guidance for Multilingual Robotics Commerce**

> Course Project — Topics in Deep Learning (CS6420), IIT Hyderabad
> Team: Digvijaysing Rajput (CS24MTECH14020) · Vinay Kadari (CS24MTECH14008)

---

## Abstract

Agentic AI systems in e-commerce typically rely on large language model APIs for both intent routing and natural language response generation, resulting in high per-query cost and latency unsuitable for real-time commerce applications. We present Nexus Bots, a robotics commerce platform that decouples routing from response generation through a compound dual-model architecture: a compact local Qwen3-0.6B model handles all tool selection, argument extraction, and UI guidance signal generation, while SARVAM-M, a large cloud language model, generates contextually rich responses in the user's native language. The system supports voice and text input across English, Hindi, and Telugu — using SARVAM's speech-to-text API to normalize multilingual voice input into romanized text before local inference. We explored multiple strategies for the routing model — a heuristic keyword router, three QLoRA fine-tuned variants of Qwen3-0.6B, the base model with the original system prompt, and the base model with an **Enhanced System Prompt** combining a priority-ordered tool decision tree with eight contrastive few-shot examples. The Enhanced Prompt strategy achieved the best result at **0.79 tool accuracy** on a 100-row stratified test set, outperforming every fine-tuned variant (best 0.51) and the original-prompt baseline (0.60), while preserving Qwen3's pre-trained function-calling capability that small-data LoRA tuning was overwriting. We further introduce UI guidance as a first-class agentic output — semantic intent keys that trigger real-time on-screen navigation highlights in the frontend — and evaluate the system on tool-selection accuracy, argument correctness, UI guide accuracy, and per-language performance across English, Hindi, and Telugu.

---

## System Architecture

```
User Input (Text or Voice)
        │
        ├── Web Speech API STT → romanized text (HI/TE)
        │
        ▼
UserActivityContext
(currentPage, viewedProducts, cart, selectedCategory, currentProduct)
        │
        ▼
POST /api/ai/chat  →  ai.js (PythonWorker IPC)
        │
        ▼
pipeline.py
  ├── fc_model.py ──────── Qwen3-0.6B BASE + ENHANCED_SYSTEM_PROMPT (tool selection + ui_guide key)
  │       └── fallback ──► Heuristic router
  ├── execute_tool() ────► SQLite DB (12 robots)
  └── sarvam_client.py ─► SARVAM-M (multilingual natural language response)
        │
        ▼
AISidePanel.jsx ← response text + ui_guide key
UIGuideProvider.jsx ← startFlow(ui_guide) → element-anchored on-screen highlights
```

---

## Novelty

| Contribution | What it is | Why it matters |
|---|---|---|
| Compound dual-model routing | Qwen3-0.6B routes locally; SARVAM-M generates response via API | 5–15× cost reduction vs. full-LLM routing at scale |
| Enhanced-Prompt routing | Decision tree + 8 contrastive few-shot examples on the base model | +19pp over base, +28pp over best LoRA fine-tune — no training data scaling needed |
| UI guidance as agentic output | Model emits `ui_guide` key → frontend highlights exact UI element | AI-driven guided shopping, no hardcoded flows |
| Romanized multilingual routing | SARVAM STT → romanized Latin → English-only small model | Indian language support without 7B+ models locally |
| Empirical ablation across 5 routing strategies | Heuristic vs LoRA v1/v2/v3 vs base vs enhanced prompt | Documents catastrophic-forgetting failure mode of small-data LoRA on a small base |

---

## Product Catalog

12 real-world robots across 4 categories:

| Category | Products |
|---|---|
| **Kitchen** | Amazon Astro · Samsung Ballie · Enabot EBO X |
| **Home Cleaner** | iRobot Roomba j9+ · Roborock S8 MaxV Ultra · Ecovacs WINBOT W2 Omni |
| **Drone** | Ring Always Home Cam · DJI Matrice 30T · Aiper Surfer S1 |
| **Humanoid** | Miko 3 · Wonder Workshop Dash · LEGO Education Spike Prime |

---

## Function Calls (6 Tools)

| Function | Description |
|---|---|
| `search_products(query, category)` | Browse / filter catalog by keyword and category |
| `get_product(product_id)` | Fetch full specs for a single robot |
| `compare_products(id1, id2, focus)` | Side-by-side comparison with optional focus |
| `recommend(need, budget, category)` | Budget + need-based recommendation |
| `add_to_cart(product_id)` | Add a robot to cart |
| `navigate_to(page, params)` | Navigate to any page, trigger support flows |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Backend | Node.js + Express 5 |
| Database | SQLite (better-sqlite3), 12 robots |
| Tool Routing | Qwen3-0.6B BASE (ChatML, no LoRA) + `ENHANCED_SYSTEM_PROMPT` via `fc_model.py` |
| Fallback Router | Heuristic keyword matcher in `pipeline.py` |
| Response Generation | SARVAM-M API (EN/HI/TE, persona-adaptive) via `sarvam_client.py` |
| UI Guidance | Custom `UIGuideProvider` + Floating UI tooltips, element-anchored |
| Voice Input | Web Speech API (STT), SARVAM STT for romanization |
| Fine-tuning | Google Colab (T4) + Unsloth + QLoRA |
| Orchestration | Direct Python dispatch (pipeline.py ↔ ai.js via JSON-line IPC) |

---

## Project Structure

```
nexus-bots/
├── client/                   # React frontend (Vite + Tailwind)
│   └── src/
│       ├── components/       # AISidePanel, CartDrawer, Navbar, Footer
│       ├── context/          # UserActivityContext
│       ├── pages/            # Home, Catalog, RobotDetail, OrderHistory
│       └── ui-guide/         # UIGuideProvider, flows.json, guide-pulse.css
├── server/                   # Node.js + Express backend
│   ├── ai/                   # pipeline.py, sarvam_client.py, fc_model.py
│   ├── database/             # init.js, SQLite schema + 12 robot seed
│   ├── routes/               # products.js, chats.js, orders.js, ai.js
│   └── logs/                 # ai_sessions.jsonl (append-only)
├── finetune/                 # Routing model: prompt + (deprecated) fine-tuning infrastructure
│   ├── data/                 # train.jsonl (1113), test.jsonl (100, fixed)
│   ├── eval/
│   │   ├── enhanced_prompt.py        # PRODUCTION: ENHANCED_SYSTEM_PROMPT (decision tree + 8 few-shots)
│   │   ├── bench_enhanced_prompt.py  # PRODUCTION benchmark (base + enhanced vs base + original)
│   │   ├── bench_function_calling.py # Historical: fine-tuned vs base vs heuristic
│   │   └── run_benchmark_v2.py       # 3-way: ft + base + heuristic
│   ├── config.py             # Hyperparameters + original system prompt + catalog
│   ├── train.py / train_4gpu.py # DEPRECATED — kept for ablation reproducibility
│   └── prepare_dataset.py    # Raw v2 → ChatML → stratified split
├── research/
│   ├── dataset/              # Raw data, schemas, generation scripts
│   └── results/              # b1_function_calling.md, b4_multilingual.md
├── README.md
└── PLAN.md
```

---

## Getting Started

```bash
git clone <repo-url>
cd NexusBots-TDL-Project

# Backend
cd server && npm install
cp .env.example .env   # add SARVAM_API_KEY
node index.js          # port 5000

# Frontend (new terminal)
cd client && npm install && npm run dev   # port 5173
```

---

## Build Status

- [x] Phase 1 — Full UI: Home, /catalog/:slug, /robot/:id, /orders, Navbar, CartDrawer, AISidePanel, UIGuide system
- [x] Phase 2 — Backend: PipelineRuntime singleton, PythonWorker IPC, 6 tools, rate limiting, JSONL logging
- [x] Phase 3 — AI Integration: Qwen3-0.6B base model (ChatML), SARVAM-M response, fc_model.py, voice STT working
- [x] Phase 3b — Dataset: 1000-row function-calling dataset (EN/HI/TE romanized), B2 baseline run (68% tool acc)
- [x] Phase 4 — Routing model exploration: 3 LoRA variants + base + enhanced prompt benchmarked; **Enhanced Prompt = 0.79 tool acc** selected for production
- [x] Phase 5 — Final benchmarks captured (`research/results/enhanced_prompt.md`)

---

## Benchmarks

### B1 — Function-Calling Accuracy (test.jsonl, 100 rows, fixed)

| System | Tool Acc | Arg F1 | UI Guide Acc | p50 Latency (ms) |
|--------|----------|--------|--------------|------------------|
| **Qwen3-0.6B BASE + Enhanced Prompt (production)** | **0.79** | **0.5467** | **0.52** | **1113.8** |
| Qwen3-0.6B BASE + Original Prompt | 0.60 | 0.4567 | 0.35 | 1442.3 |
| Qwen3-0.6B-FC v2 (LoRA, best of 3) | 0.51 | 0.31 | 0.30 | 1880 |
| Qwen3-0.6B-FC v1 (LoRA) | 0.48 | 0.29 | 0.28 | 1910 |
| Heuristic Router | 0.48 | 0.29 | 0.27 | ~0 |

Full breakdown and methodology: [`research/results/enhanced_prompt.md`](research/results/enhanced_prompt.md) and [`research/results/b1_function_calling.md`](research/results/b1_function_calling.md).

### B2 — Base Model Evaluation (75 hand-crafted prompts, Qwen3-0.6B base + original prompt)

| Metric | EN | HI | TE | Overall |
|--------|----|----|----|---------| 
| Tool accuracy | 66% | 71% | 68% | **68%** |
| Full match | 16% | 21% | 11% | **16%** |
| Parse rate | — | — | — | **87%** |

### B4 — Multilingual Function-Calling

| System | EN Tool Acc | HI Tool Acc | TE Tool Acc |
|--------|-------------|-------------|-------------|
| **Qwen3-0.6B BASE + Enhanced Prompt** | **0.84** | **0.67** | **0.83** |
| Qwen3-0.6B BASE + Original Prompt | 0.62 | 0.59 | 0.56 |
| Qwen3-0.6B-FC v1 (LoRA) | 0.44 | 0.59 | 0.44 |
| Heuristic Router | 0.47 | 0.37 | 0.67 |

Full table: [`research/results/b4_multilingual.md`](research/results/b4_multilingual.md).

---

*Academic project — IIT Hyderabad, M.Tech, CS6420 Topics in Deep Learning, April 2026*

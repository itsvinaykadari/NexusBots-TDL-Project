# Nexus Bots

**Fine-Tuned Qwen3-0.6B Agentic Function Routing with UI Guidance for Multilingual Robotics Commerce**

> Course Project — Topics in Deep Learning (CS6420), IIT Hyderabad
> Team: Digvijaysing Rajput (CS24MTECH14020) · Vinay Kadari (CS24MTECH14008)

---

## Abstract

Agentic AI systems in e-commerce typically rely on large language model APIs for both intent routing and natural language response generation, resulting in high per-query cost and latency unsuitable for real-time commerce applications. We present Nexus Bots, a robotics commerce platform that decouples routing from response generation through a compound dual-model architecture: a fine-tuned Qwen3-0.6B model handles all tool selection, argument extraction, and UI guidance signal generation locally, while SARVAM-M, a large cloud language model, generates contextually rich responses in the user's native language. The system supports voice and text input across English, Hindi, and Telugu — using SARVAM's speech-to-text API to normalize multilingual voice input into romanized text before local inference. We fine-tune Qwen3-0.6B using QLoRA on a domain-specific dataset of 1,000 function-calling examples across 6 tools and 3 languages, and introduce UI guidance as a first-class agentic output — semantic intent keys that trigger real-time on-screen navigation highlights in the frontend. We benchmark the fine-tuned model against the base Qwen3-0.6B, a heuristic keyword router, and frontier models (GPT-4o, Claude, Gemini) on tool-selection accuracy, argument correctness, UI guide accuracy, and per-language performance across English, Hindi, and Telugu.

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
  ├── fc_model.py ──────── Qwen3-0.6B (tool selection + ui_guide key)
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
| UI guidance as agentic output | Model emits `ui_guide` key → frontend highlights exact UI element | AI-driven guided shopping, no hardcoded flows |
| Romanized multilingual routing | SARVAM STT → romanized Latin → English-only small model | Indian language support without 7B+ models locally |
| Fine-tuning ROI benchmarks | B1/B2/B4 compare fine-tuned vs base vs heuristic vs frontier | Quantifies domain adaptation value |

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
| Tool Routing | Qwen3-0.6B (ChatML, QLoRA fine-tuned) via `fc_model.py` |
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
├── finetune/                 # Fine-tuning infrastructure
│   ├── data/                 # train.jsonl (900), test.jsonl (100)
│   ├── eval/                 # bench_function_calling.py, run_b2_eval.py, b2_eval_prompts.py
│   ├── config.py             # Hyperparameters + system prompt + catalog
│   ├── train.py              # Unsloth + QLoRA training script
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
- [ ] Phase 4 — Fine-Tune: Qwen3-0.6B QLoRA adapter (Colab) — pending; B1 fine-tuned row empty
- [ ] Phase 5 — Final benchmarks + report numbers filled

---

## Benchmarks

### B1 — Function-Calling Accuracy (test.jsonl, 100 rows)

| System | Tool Acc | Arg F1 | UI Guide Acc | p50 Latency (ms) |
|--------|----------|--------|--------------|------------------|
| Qwen3-0.6B-FC fine-tuned (ours) | — | — | — | — |
| Qwen3-0.6B BASE | 0.61 | 0.45 | 0.26 | 1210 |
| Heuristic Router | 0.45 | 0.25 | 0.27 | ~0 |
| GPT-4o zero-shot | — | — | — | — |
| Claude zero-shot | — | — | — | — |
| Gemini 2.5 zero-shot | — | — | — | — |

### B2 — Base Model Evaluation (75 hand-crafted prompts, Qwen3-0.6B base)

| Metric | EN | HI | TE | Overall |
|--------|----|----|----|---------| 
| Tool accuracy | 66% | 71% | 68% | **68%** |
| Full match | 16% | 21% | 11% | **16%** |
| Parse rate | — | — | — | **87%** |

### B4 — Multilingual Function-Calling

| System | EN Tool Acc | HI Tool Acc | TE Tool Acc |
|--------|-------------|-------------|-------------|
| Qwen3-0.6B-FC (ours) | — | — | — |
| Qwen3-0.6B BASE | 0.62 | 0.63 | 0.56 |
| Heuristic Router | 0.47 | 0.33 | 0.56 |

---

*Academic project — IIT Hyderabad, M.Tech, CS6420 Topics in Deep Learning, April 2026*

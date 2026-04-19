# Nexus Bots — Project Plan

> **Course:** CS6420 Topics in Deep Learning, IIT Hyderabad
> **Team:** Digvijaysing Rajput (CS24MTECH14020) · Vinay Kadari (CS24MTECH14008)
> **Last updated:** 2026-04-19

---

## Project Title & Abstract

**Nexus Bots: Fine-Tuned Qwen3-0.6B Agentic Function Routing with UI Guidance for Multilingual Robotics Commerce**

> Agentic AI systems in e-commerce typically rely on large language model APIs for both intent routing and natural language response generation, resulting in high per-query cost and latency unsuitable for real-time commerce applications. We present Nexus Bots, a robotics commerce platform that decouples routing from response generation through a compound dual-model architecture: a fine-tuned Qwen3-0.6B model handles all tool selection, argument extraction, and UI guidance signal generation locally, while SARVAM-M, a large cloud language model, generates contextually rich responses in the user's native language. The system supports voice and text input across English, Hindi, and Telugu — using SARVAM's speech-to-text API to normalize multilingual voice input into romanized text before local inference. We fine-tune Qwen3-0.6B using QLoRA on a domain-specific dataset of 1,000 function-calling examples across 6 tools and 3 languages, and introduce UI guidance as a first-class agentic output — semantic intent keys that trigger real-time on-screen navigation highlights in the frontend. We benchmark the fine-tuned model against the base Qwen3-0.6B, a heuristic keyword router, and frontier models (GPT-4o, Claude, Gemini) on tool-selection accuracy, argument correctness, UI guide accuracy, and per-language performance across English, Hindi, and Telugu. Through this work, we aim to explore whether a lightweight domain-specific routing model paired with a large model for response generation can serve as a practical and cost-efficient alternative to single large-model deployments in agentic e-commerce systems.

---

## Quick Reference

### Run the Project

```bash
# Terminal 1 — Server
cd server && npm install
# Ensure server/.env has SARVAM_API_KEY and ENABLE_FC_MODEL=1
node index.js

# Terminal 2 — Client
cd client && npm install && npm run dev
# Open http://localhost:5173
```

### Environment Variables (`server/.env`)

```
PORT=5000
SARVAM_API_KEY=<key>
SARVAM_MODEL=sarvam-m
ENABLE_FC_MODEL=1
FC_MODEL_ID=Qwen/Qwen3-0.6B         # base; override with FC_MODEL_PATH after fine-tune
FC_MODEL_PATH=                       # set to local adapter path after Colab training
PYTHON_BIN=python3
```

### Key Files

| File | Purpose |
|------|---------|
| `server/ai/pipeline.py` | Core AI router — `decide_tool()` → `execute_tool()`. 6 tools. Dual-path: model → heuristic. Emits `ui_guide`. |
| `server/ai/fc_model.py` | Qwen3-0.6B inference. ChatML via `apply_chat_template()`. Returns `{tool, arguments, ui_guide}`. |
| `server/ai/sarvam_client.py` | SARVAM-M for natural language. Strips `<think>`. Adapts to proficiency (beginner/expert). Fallback on API failure. |
| `server/routes/ai.js` | Express route. `PythonWorker` persistent subprocess via JSON-line IPC. Rate limiter. JSONL logging. |
| `server/database/init.js` | SQLite schema + 12 robot seed data. |
| `client/src/components/AISidePanel.jsx` | AI chat panel. Voice via Web Speech API (STT). Sends full page context. |
| `client/src/ui-guide/UIGuideProvider.jsx` | Element-anchored guide system. `startFlow(key)` triggers multi-step highlights. Floating UI tooltips. |
| `client/src/ui-guide/flows.json` | 11 flows: check_orders, track_delivery, update_cart, find_{category}×4, compare_products, open_support, new_ticket, view_tickets. |
| `client/src/context/UserActivityContext.jsx` | Tracks: currentPage, viewedProducts, cart, searchQuery, selectedCategory, currentProduct. Sent with every AI request. |
| `finetune/config.py` | All hyperparameters + system prompt + product catalog. |
| `finetune/train.py` | Training script (Unsloth + QLoRA). |
| `finetune/prepare_dataset.py` | Raw v2 → ChatML v2 → stratified train/test split. |
| `finetune/eval/bench_function_calling.py` | B1 (tool accuracy) + B4 (multilingual) benchmark. |
| `finetune/eval/run_b2_eval.py` | B2 (base model, 75 prompts) benchmark runner. |
| `server/logs/ai_sessions.jsonl` | Append-only log of every AI request/response cycle. |

---

## Architecture

```
User Input (Text or Voice)
       │
       ├── Web Speech API (STT) → romanized text for HI/TE
       │
       ▼
UserActivityContext (currentPage, viewedProducts, cart, selectedCategory, currentProduct)
       │
       ▼
POST /api/ai/chat  →  ai.js (PythonWorker IPC)
       │
       ▼
pipeline.py
  ├── fc_model.py (Qwen3-0.6B — tool selection + ui_guide)
  │       └── fallback → heuristic router
  ├── execute_tool() → SQLite DB (12 robots)
  └── sarvam_client.py (SARVAM-M — multilingual natural language response)
       │
       ▼
AISidePanel.jsx  ←  response + ui_guide key
UIGuideProvider.jsx  ←  startFlow(ui_guide)  →  on-screen element highlights
```

---

## Data Model (Fixed — Do Not Change)

### 12 Products Across 4 Categories

| ID | Name | Category | Price |
|----|------|----------|-------|
| 1 | Amazon Astro | Kitchen | $1,599.99 |
| 2 | Samsung Ballie | Kitchen | $1,299.99 |
| 3 | Enabot EBO X | Kitchen | $599.99 |
| 4 | iRobot Roomba j9+ | Home Cleaner | $799.99 |
| 5 | Roborock S8 MaxV Ultra | Home Cleaner | $1,799.99 |
| 6 | Ecovacs WINBOT W2 Omni | Home Cleaner | $499.99 |
| 7 | Ring Always Home Cam | Drone | $249.99 |
| 8 | DJI Matrice 30T | Drone | $13,600.00 |
| 9 | Aiper Surfer S1 | Drone | $1,399.99 |
| 10 | Miko 3 | Humanoid | $249.99 |
| 11 | Wonder Workshop Dash | Humanoid | $149.99 |
| 12 | LEGO Education Spike Prime | Humanoid | $395.95 |

### Tools (6 — Final, No Changes)

| Tool | Intent |
|------|--------|
| `search_products(query, category)` | Browse / filter catalog |
| `get_product(product_id)` | Single product details by name or ID |
| `compare_products(id1, id2, focus)` | Side-by-side comparison |
| `recommend(need, budget, category)` | Budget + need-based selection |
| `add_to_cart(product_id)` | Add to cart |
| `navigate_to(page, params)` | All UI navigation — orders, support, cart, home, catalog, product page |

Support section lives inside `/orders` page — handled by `navigate_to(page=orders)` + `ui_guide = open_support / new_ticket / view_tickets`. No 7th tool needed.

### UI Guide Flows (11)

`check_orders` · `track_delivery` · `update_cart` · `find_kitchen` · `find_drone` · `find_home_cleaner` · `find_humanoid` · `compare_products` · `open_support` · `new_ticket` · `view_tickets`

Dynamic: `locate_robot:{id}` · `locate_path:{category}:{id}`

### Pages & Routes

| Route | Page |
|-------|------|
| `/` | Home — hero, category cards, flagship robots |
| `/catalog/kitchen` | Kitchen robots (IDs 1, 2, 3) |
| `/catalog/home-cleaner` | Home Cleaner robots (IDs 4, 5, 6) |
| `/catalog/drone` | Drone robots (IDs 7, 8, 9) |
| `/catalog/humanoid` | Humanoid robots (IDs 10, 11, 12) |
| `/robot/:id` | Robot detail page |
| `/orders` | Order history + Support tab |
| Cart | Side drawer (navigate_to page=cart triggers it) |

---

## What Is Already Done

- ✅ Express + SQLite backend, 12 robots / 4 categories
- ✅ React 19 + Vite + Tailwind — Home, /catalog/:slug, RobotDetail, OrderHistory
- ✅ `UserActivityContext` — tracks page, viewed, cart, search, category, currentProduct
- ✅ `pipeline.py` — 6 tools, dual-path decider (model → heuristic), PipelineRuntime singleton, worker mode
- ✅ `sarvam_client.py` — persona-adaptive (beginner/expert), EN/HI/TE, fallback, worker mode
- ✅ `fc_model.py` — Qwen3-0.6B ChatML inference, GPU fp16 when available
- ✅ `AISidePanel` — AI chat, voice via Web Speech API (STT working), context sending
- ✅ `UIGuideProvider` — element-anchored spotlight, Floating UI tooltips, auto-navigation, Escape to close
- ✅ `flows.json` — 11 flows wired
- ✅ `CartDrawer` — 3-step flow (cart → payment → success), posts to `/api/orders`
- ✅ `OrderHistory` — merged Orders + Support tabs, inline support forms, ticket management
- ✅ PythonWorker — persistent subprocess reuse, JSON-line IPC, rate limiting
- ✅ JSONL session logging at `server/logs/ai_sessions.jsonl`
- ✅ Dataset v2: 1000 rows (EN 500 / HI 250 / TE 250), train.jsonl (900) + test.jsonl (100)
- ✅ B2 benchmark run: base Qwen3-0.6B — tool_acc=68%, full_match=16% (75 prompts)
- ✅ B1/B4 benchmarks run: Heuristic Router + Base model results captured

## What Remains

- ⬜ **CRITICAL** — Fine-tune Qwen3-0.6B on Colab (QLoRA adapter) — B1 shows 0.0 (adapter not loaded)
- ⬜ Verify fine-tuned model end-to-end: `toolSource = "model"`, correct ui_guide, no hallucination
- ⬜ Run B1 + B4 with fine-tuned adapter to fill in final benchmark numbers
- ⬜ Verify UI guide routing: test 3+ flows end-to-end (navigate_to → ui_guide → highlight)
- ⬜ Multilingual routing verification: HI/TE romanized → correct tool + ui_guide
- ⬜ Persona adaptation check: beginner vs expert response difference via SARVAM

---

## Execution Plan

### PHASE A — Fine-Tune on Colab (Priority #1)

The fine-tuned model shows 0.0 accuracy in B1 — the adapter is either not trained or not placed correctly. This is the top priority.

**Step 1:** Upload `finetune/data/train.jsonl` to Google Drive.

**Step 2:** Open `finetune/train.py` in Colab (or `finetune/qwen35_finetune.ipynb`):
```bash
python train.py --colab --merge
```

Config in `finetune/config.py`:
- Model: `unsloth/Qwen3-0.6B`
- QLoRA: r=16, α=32, lr=2e-4, 3 epochs, bf16

**Step 3:** After training:
```bash
# Download LoRA adapter → place at:
models/nexus-fc-qwen3-0.6b/
# Set in server/.env:
FC_MODEL_PATH=../models/nexus-fc-qwen3-0.6b
# Restart server
```

**Step 4:** Re-run B1 + B4 benchmarks:
```bash
python finetune/eval/bench_function_calling.py
```

---

### PHASE B — Benchmark Verification

**B2 (already run):** `finetune/eval/b2_results.md` has full results (75 prompts, base model).

**B1 + B4 (re-run after fine-tune):**
```bash
python finetune/eval/bench_function_calling.py             # heuristic + base + fine-tuned
python finetune/eval/bench_function_calling.py --all-models  # + GPT-4o / Claude / Gemini
```
Output → `research/results/b1_function_calling.md`, `research/results/b4_multilingual.md`

---

### PHASE C — Verification & Demo Prep

**C1 — End-to-end curl test:**
```bash
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"show me drones under 1500","language":"en","context":{"currentPage":"home","viewedProducts":[],"cart":[]}}'

curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"drone kahan milega","language":"hi","context":{"currentPage":"home","viewedProducts":[],"cart":[]}}'
```
Confirm: `toolSource = "model"`, `ui_guide` present.

**C2 — UI guide flows:** Test at least 3 flows (check_orders, find_drone, compare_products).

**C3 — Voice test:** Speak in English and Hindi; verify STT captures and routes correctly (Chrome).

**C4 — Persona test:** Same query with beginner vs expert context; verify SARVAM response differs.

---

## Research Goals & Novelty

### What We Are Proving

1. **Compound dual-model routing is cost-efficient:** 0.6B fine-tuned model handles all tool selection locally; large model only generates the response. Reduces per-query AI cost significantly vs. full-LLM routing.
2. **Domain fine-tuning on 0.6B beats base model on function calling** — B1 proves this quantitatively across EN/HI/TE.
3. **Multilingual function-calling via romanization** — SARVAM STT normalizes HI/TE voice to romanized Latin; same English-only 0.6B model routes correctly (B4).
4. **UI guidance as a first-class agentic output** — model emits `ui_guide` intent key → frontend highlights the exact UI element. Dynamic, AI-driven, no hardcoded flows.
5. **Persona-adaptive generation** — proficiency auto-detection adapts SARVAM's response style (beginner = simple, expert = technical).

---

## Benchmark Tables (Current State)

### B1 — Function-Calling Accuracy

| System | Tool Acc | Arg F1 | UI Guide Acc | p50 Latency (ms) |
|--------|----------|--------|--------------|------------------|
| Qwen3-0.6B-FC fine-tuned (ours) | — | — | — | — |
| Qwen3-0.6B BASE | 0.61 | 0.45 | 0.26 | 1210 |
| Heuristic Router | 0.45 | 0.25 | 0.27 | ~0 |
| GPT-4o zero-shot | — | — | — | — |
| Claude zero-shot | — | — | — | — |
| Gemini 2.5 zero-shot | — | — | — | — |

*Fine-tuned row pending Colab training completion.*

### B2 — Base Model Evaluation (75 prompts, Qwen3-0.6B base)

| Metric | Score |
|--------|-------|
| Tool accuracy | 68.0% |
| Args accuracy | 49.3% |
| UI Guide accuracy | 30.7% |
| Full match | 16.0% |
| Parse rate | 86.7% |

| Language | Total | Tool OK | Full Match |
|----------|-------|---------|------------|
| EN | 32 | 21 (66%) | 5 (16%) |
| HI | 24 | 17 (71%) | 5 (21%) |
| TE | 19 | 13 (68%) | 2 (11%) |

### B4 — Multilingual Function-Calling

| System | Language | Tool Acc | Arg F1 | Count |
|--------|----------|----------|--------|-------|
| Qwen3-0.6B-FC (ours) | EN | — | — | 55 |
| Qwen3-0.6B-FC (ours) | HI | — | — | 27 |
| Qwen3-0.6B-FC (ours) | TE | — | — | 18 |
| Qwen3-0.6B BASE | EN | 0.62 | 0.46 | 55 |
| Qwen3-0.6B BASE | HI | 0.63 | 0.49 | 27 |
| Qwen3-0.6B BASE | TE | 0.56 | 0.36 | 18 |
| Heuristic Router | EN | 0.47 | 0.25 | 55 |
| Heuristic Router | HI | 0.33 | 0.21 | 27 |
| Heuristic Router | TE | 0.56 | 0.31 | 18 |

---

## Submission Checklist

- [x] System prompt with product catalog + UI structure in both `fc_model.py` and `finetune/config.py`
- [x] `research/dataset/raw/function_calls_raw_v2.jsonl` generated
- [x] `finetune/data/train.jsonl` + `test.jsonl` created (900 / 100 rows)
- [x] Voice input working (Chrome, STT via Web Speech API)
- [x] B2 benchmark run and results saved
- [x] B1/B4 benchmarks run (heuristic + base model results)
- [ ] Qwen3-0.6B LoRA adapter trained (Colab), downloaded, `FC_MODEL_PATH` set
- [ ] Fine-tuned model verified end-to-end via curl (EN + HI + TE), `toolSource = "model"`
- [ ] B1, B4 tables filled with fine-tuned model numbers
- [ ] Persona adaptation verified (beginner vs expert response comparison)
- [ ] Multilingual routing verified (HI/TE romanized → correct tool + ui_guide)
- [ ] UI guide working on 3+ flows end-to-end
- [ ] Demo video recorded
- [ ] Report / slides finalized with real benchmark numbers

---

## Locked Decisions (Do Not Revisit)

| Area | Choice |
|------|--------|
| Base model | Qwen3-0.6B |
| Fine-tune method | Unsloth + QLoRA, r=16, α=32, lr=2e-4, 3 epochs |
| Tool count | 6 tools — final |
| Languages | EN + Romanized Hindi + Romanized Telugu |
| Voice | STT only via Web Speech API (no TTS) |
| Orchestration | Direct Python dispatch — no LangChain |
| Dataset size | 1000 rows (900 train / 100 test) |
| UI guidance | Element-anchored CSS + Floating UI tooltip |
| Sales agent | ~~Out of scope~~ — dropped due to time constraints |
| Response model | SARVAM-M via API (sarvam_client.py) |

---

*IIT Hyderabad · M.Tech · CS6420 Topics in Deep Learning · April 2026*

# NexusBots — Final Project Plan

> **Course:** CS6420 Topics in Deep Learning, IIT Hyderabad
> **Team:** Digvijaysing Rajput (CS24MTECH14020) · Vinay Kadari (CS24MTECH14008)
> **Last updated:** 2026-04-19 · **Time remaining: ~12 hours**

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
FC_MODEL_ID=Qwen/Qwen3.5-0.8B         # base; override with FC_MODEL_PATH after fine-tune
FC_MODEL_PATH=                          # set to local adapter path after Colab training
ENABLE_SEMANTIC_RAG=1
RAG_EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
PYTHON_BIN=python3
```

### Key Files

| File | Purpose |
|------|---------|
| `server/ai/pipeline.py` | Core AI router — `decide_tool()` → `execute_tool()`. 6 tools. Dual-path: model → heuristic. Emits `ui_guide`. |
| `server/ai/fc_model.py` | Qwen3.5-0.8B inference. ChatML via `apply_chat_template()`. Returns `{tool, arguments, ui_guide}`. |
| `server/ai/sarvam_client.py` | Sarvam AI for natural language. Strips `<think>`. Adapts to proficiency (beginner/expert). |
| `server/routes/ai.js` | Express route. `PythonWorker` persistent subprocess via JSON-line IPC. Rate limiter. JSONL logging. |
| `server/database/init.js` | SQLite schema + 12 robot seed data. |
| `client/src/components/AISidePanel.jsx` | AI chat panel. Voice via Web Speech API. Sends full context. |
| `client/src/ui-guide/UIGuideProvider.jsx` | Element-anchored guide system. `startFlow(key)` triggers multi-step highlights. Floating UI tooltips. |
| `client/src/ui-guide/flows.json` | 11 flows: check_orders, track_delivery, update_cart, find_{category}×4, compare_products, open_support, new_ticket, view_tickets. |
| `client/src/context/UserActivityContext.jsx` | Tracks: currentPage, viewedProducts, cart, searchQuery, selectedCategory, currentProduct. Sent with every AI request. |
| `finetune/config.py` | All hyperparameters + system prompt + product catalog. |
| `finetune/train.py` | Training script (Unsloth + QLoRA). |
| `finetune/prepare_dataset.py` | Raw v2 → ChatML v2 → stratified train/test split. |
| `finetune/eval/bench_function_calling.py` | B1 (tool accuracy) + B4 (multilingual) benchmark. |
| `finetune/eval/bench_rag.py` | B2 (RAG re-ranking vs static) benchmark. |
| `server/logs/ai_sessions.jsonl` | Append-only log of every AI request/response cycle. |

### Architecture

```
Client (React 19 + Vite, port 5173)     Server (Express 5 + SQLite, port 5000)
        │                                           │
        ├── /api proxy ────────────────────────────►├── POST /api/ai/chat
        │                                           │   ├── ai.js → PythonWorker (pipeline.py)
        │                                           │   │   ├── fc_model.py (Qwen3.5-0.8B)
        │                                           │   │   ├── FAISS + context re-rank (RAG)
        │                                           │   │   └── heuristic fallback
        │                                           │   └── PythonWorker (sarvam_client.py)
        │                                           ├── GET /api/products
        │                                           ├── POST/GET /api/orders
        │                                           └── POST/GET /api/chats
        │
        ├── AISidePanel.jsx ──── AI chat + voice
        ├── UIGuideProvider.jsx ── element-anchored spotlight
        ├── CartDrawer.jsx ────── 3-step checkout flow
        ├── Navbar.jsx ──────────── mega-menu (click-only)
        └── Pages: Home, /catalog/:slug, /robot/:id, /orders
```

---

## Data Model (Fixed — Do Not Change)

### 12 Products Across 4 Categories

| ID | Name | Category | Price | Key Tags |
|----|------|----------|-------|----------|
| 1 | Amazon Astro | Kitchen | $1,599.99 | alexa, kitchen assistant, voice |
| 2 | Samsung Ballie | Kitchen | $1,299.99 | projector, rolling, smart appliances |
| 3 | Enabot EBO X | Kitchen | $599.99 | 4K camera, monitoring, remote |
| 4 | iRobot Roomba j9+ | Home Cleaner | $799.99 | vacuum, auto-empty, mapping |
| 5 | Roborock S8 MaxV Ultra | Home Cleaner | $1,799.99 | vacuum+mop, 10000Pa suction, dock |
| 6 | Ecovacs WINBOT W2 Omni | Home Cleaner | $499.99 | window cleaning, edge detection |
| 7 | Ring Always Home Cam | Drone | $249.99 | indoor patrol, security, cheapest drone |
| 8 | DJI Matrice 30T | Drone | $13,600.00 | thermal, enterprise, 48MP, inspection |
| 9 | Aiper Surfer S1 | Drone | $1,399.99 | pool cleaning, surface drone |
| 10 | Miko 3 | Humanoid | $249.99 | kids companion, age 5-12, learning |
| 11 | Wonder Workshop Dash | Humanoid | $149.99 | coding, STEM, cheapest humanoid |
| 12 | LEGO Education Spike Prime | Humanoid | $395.95 | classroom, python, build-and-program |

### Tools (6 — Final, No Changes)

| Tool | Intent |
|------|--------|
| `search_products(query, category)` | Browse / filter catalog |
| `get_product(product_id)` | Single product details by name or ID |
| `compare_products(id1, id2, focus)` | Side-by-side comparison |
| `recommend(need, budget, category)` | Budget + need-based selection |
| `add_to_cart(product_id)` | Add to cart |
| `navigate_to(page, params)` | All UI navigation — orders, support (via ui_guide), cart, home, catalog, product page |

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
- ✅ `pipeline.py` — 6 tools, dual-path decider, FAISS + context re-rank, PipelineRuntime singleton, worker mode
- ✅ `sarvam_client.py` — persona-adaptive (beginner/expert), EN/HI/TE, fallback, worker mode
- ✅ `fc_model.py` — Qwen3.5-0.8B ChatML inference, GPU fp16 when available
- ✅ `AISidePanel` — AI chat, voice via Web Speech API, context sending
- ✅ `UIGuideProvider` — element-anchored spotlight, Floating UI tooltips, auto-navigation, Escape to close
- ✅ `flows.json` — 11 flows wired
- ✅ `CartDrawer` — 3-step flow (cart → payment → success), posts to `/api/orders`
- ✅ `OrderHistory` — merged Orders + Support tabs, inline support forms, ticket management
- ✅ PythonWorker — persistent subprocess reuse, JSON-line IPC, rate limiting
- ✅ JSONL session logging at `server/logs/ai_sessions.jsonl`
- ✅ Admin auto-login (localStorage-based), "Admin" shown in Navbar
- ✅ All 12 products always in stock; new orders show as Delivered
- ✅ Category pages (`/catalog/:slug`) with editorial content
- ✅ Navbar mega-menu click-only; active state highlights catalog pages
- ✅ BUG-1 Fixed: UI guide scroll tracking (element-anchored, not overlay)
- ✅ BUG-2 Fixed: Guide pulse CSS — oklch glow animation, no zoom artifact
- ✅ BUG-3 Fixed: react-markdown renders AI responses correctly
- ✅ Home page category hover — image lightens, dark overlay reduces

---

## 12-Hour Execution Plan

> **Core goal:** Fine-tune Qwen3.5-0.8B, prove it beats base model, show multilingual + persona + voice working. Demo-ready by end.

---

### PHASE A — Immediate System Prompt Fix (Hour 0–1)

**Why first:** The base model hallucinates because it has no product knowledge. Adding the catalog to the system prompt fixes this NOW, before fine-tuning, and is also the correct training-time prompt.

**Task A1:** Update `server/ai/fc_model.py` and `finetune/config.py` — both must have identical `SYSTEM_PROMPT` that includes:

```python
PRODUCT_CATALOG_BLOCK = """
Product Catalog (12 robots, fixed):
ID  | Name                       | Category     | Price
1   | Amazon Astro               | Kitchen      | $1599.99
2   | Samsung Ballie             | Kitchen      | $1299.99
3   | Enabot EBO X               | Kitchen      | $599.99
4   | iRobot Roomba j9+          | Home Cleaner | $799.99
5   | Roborock S8 MaxV Ultra     | Home Cleaner | $1799.99
6   | Ecovacs WINBOT W2 Omni     | Home Cleaner | $499.99
7   | Ring Always Home Cam       | Drone        | $249.99   (cheapest drone)
8   | DJI Matrice 30T            | Drone        | $13600.00 (enterprise, thermal)
9   | Aiper Surfer S1            | Drone        | $1399.99  (pool drone)
10  | Miko 3                     | Humanoid     | $249.99   (kids, age 5-12)
11  | Wonder Workshop Dash       | Humanoid     | $149.99   (cheapest humanoid, coding)
12  | LEGO Education Spike Prime | Humanoid     | $395.95   (classroom, python)
"""

UI_STRUCTURE_BLOCK = """
App Structure:
- /catalog/kitchen → Kitchen robots (IDs 1-3)
- /catalog/home-cleaner → Home Cleaner robots (IDs 4-6)
- /catalog/drone → Drone robots (IDs 7-9)
- /catalog/humanoid → Humanoid robots (IDs 10-12)
- /robot/:id → Product detail
- /orders → Order history + Support tab (tickets, complaints)
- Cart: side drawer (navigate_to page=cart)

Rules:
- For product names, resolve ID from catalog above
- Support/ticket queries → navigate_to page=orders + ui_guide=open_support/new_ticket/view_tickets
- Location queries ("where is X", "kahan", "ekkada") → navigate_to page=catalog with product_id
- Out-of-scope queries (not about robots) → search_products query=robot
"""
```

**Verify:** Restart server, send "tell me about DJI Matrice" and "drone kahan milega" — both should now route correctly without hallucination.

---

### PHASE B — Dataset Generation (Hour 1–3)

**What to build:** `research/dataset/raw/function_calls_raw_v2.jsonl` (1020 rows)

Each row format (consumed by `finetune/prepare_dataset.py`):

```json
{
  "id": "v2_en_search_001",
  "user_query": "show me kitchen robots",
  "language": "en",
  "proficiency": "beginner",
  "page_context": {
    "currentPage": "home",
    "viewedProducts": [],
    "cart": [],
    "currentProduct": null,
    "searchQuery": "",
    "selectedCategory": ""
  },
  "function_call": {
    "name": "search_products",
    "arguments": {"query": "kitchen robots", "category": "Kitchen"}
  },
  "metadata": {"intent": "browse_category", "difficulty": "easy"}
}
```

**Target distribution (1020 rows):**

| Intent Group | Tool | EN | HI Romanized | TE Romanized | Total |
|---|---|---|---|---|---|
| Browse category | search_products | 70 | 35 | 25 | 130 |
| Search by product name | search_products | 50 | 25 | 15 | 90 |
| Get product details | get_product | 60 | 30 | 20 | 110 |
| Compare two robots | compare_products | 65 | 30 | 15 | 110 |
| Recommend by budget/need | recommend | 65 | 30 | 15 | 110 |
| Add to cart | add_to_cart | 50 | 25 | 15 | 90 |
| Navigate: orders/support | navigate_to | 70 | 35 | 25 | 130 |
| Navigate: cart/home | navigate_to | 40 | 20 | 10 | 70 |
| Navigate: location intent | navigate_to | 50 | 25 | 15 | 90 |
| Out-of-scope robustness | search_products | 25 | 10 | 5 | 40 |
| **Total** | | **545** | **265** | **160** | **970** |

**Critical Romanized HI/TE examples that must be covered:**

```
# Hindi (Romanized — English script, Hindi words)
"drone kahan milega"              → navigate_to(catalog, Drone) + locate_path
"mera order kahan hai"            → navigate_to(orders) + check_orders
"DJI Matrice ke baare mein batao" → get_product(8)
"sasta drone dikhao"              → recommend(budget=500, category=Drone)
"Miko 3 ko cart mein daalo"       → add_to_cart(10)
"kitchen ke robots dikhao"        → search_products(category=Kitchen)
"support chahiye mujhe"           → navigate_to(orders) + open_support
"Roomba aur Roborock compare karo"→ compare_products(4, 5, suction)

# Telugu (Romanized — English script, Telugu words)
"drone ekkada dorikutundi"        → navigate_to(catalog, Drone)
"naa order chupinchu"             → navigate_to(orders) + check_orders
"Miko 3 gurinchi cheppu"          → get_product(10)
"kitchen robots chupinchu"        → search_products(category=Kitchen)
"cheapest humanoid cheppu"        → recommend(budget=200, category=Humanoid)
"robot 8 ni cart lo petto"        → add_to_cart(8)
```

**Task B1:** Write `research/dataset/generator/template_generator_v2.py`
- Iterate over all (intent × tool × language × proficiency × product) combinations
- Fill product names/IDs/prices from the catalog table above
- Output to `research/dataset/raw/function_calls_raw_v2.jsonl`

**Task B2:** Run 50–70 real prompts through the live AI panel (mix EN/HI/TE)
- The logs appear in `server/logs/ai_sessions.jsonl`
- Use Claude to label each: "Given this message and context, what is the correct {tool, arguments, ui_guide}?"
- Human-verify 20% — these are the highest-quality real-world examples

**Task B3:** Run `finetune/prepare_dataset.py`
- Reads `research/dataset/raw/function_calls_raw_v2.jsonl`
- Converts to ChatML format
- Stratified split → `finetune/data/train.jsonl` (900) + `finetune/data/test.jsonl` (100)

---

### PHASE C — Fine-Tune on Colab (Hour 3–7, runs in parallel)

**Start this immediately after dataset is ready — it takes ~4 hours on free T4.**

**Task C1:** Upload `finetune/data/train.jsonl` and `finetune/data/test.jsonl` to Google Drive.

**Task C2:** Open `finetune/train.py` in Colab (or copy to a notebook), run with:
```bash
python train.py --colab --merge
```

Config already set in `finetune/config.py`:
- Model: `unsloth/Qwen3.5-0.8B`
- QLoRA: r=16, alpha=32, dropout=0
- Epochs: 3 (increase to 5 if loss hasn't plateaued)
- **Change lr from 2e-4 → 1e-4** (reduces instability on small datasets)
- Batch: 4, grad_accum: 4 → effective batch 16
- bf16 ✅

**Task C3:** After training completes:
- Download LoRA adapter from Drive to `models/nexus-fc-qwen35-0.8b/`
- Set `FC_MODEL_PATH=../models/nexus-fc-qwen35-0.8b` in `server/.env`
- Restart server — it auto-loads fine-tuned adapter

---

### PHASE D — Parallel Work While Colab Trains (Hour 3–7)

While Colab runs, do these in parallel:

**Task D1 — Multilingual Verification**
Test 20 queries covering all critical HI/TE romanized patterns. Verify `pipeline.py` routes them correctly. Fix any misrouting in `_sanitize_tool_call()` or `_heuristic_tool_call()`.

**Task D2 — Voice End-to-End Test**
- Open AI panel, click mic button
- Speak in English: "show me drone robots"
- Speak in Hindi: "drone dikhao"
- Verify STT captures it and routes correctly
- Document any browser compatibility issues (Chrome preferred)

**Task D3 — Persona Adaptation Verification**
Send the same question twice with different user profiles:
- Beginner: "what robot should I buy" → response should be simple, no jargon
- Expert: "compare payload and suction specs of products 4 and 5" → response should include technical details

Verify `sarvam_client.py` adapts correctly via `proficiency` field. Check `detect_proficiency()` in `pipeline.py` correctly classifies both.

**Task D4 — Optional: Sales Agent / Proactive Conversation**

If time permits, implement a lightweight proactive agent:

```jsx
// In UserActivityContext or AISidePanel
// After user views 3+ products without buying, trigger proactive message
useEffect(() => {
  if (viewedProducts.length >= 3 && cart.length === 0 && !proactiveShown) {
    setProactiveShown(true);
    // Dispatch event to open AI panel with a pre-filled message
    window.dispatchEvent(new CustomEvent('open-chat', {
      detail: { message: `I noticed you've been looking at ${viewedProducts[viewedProducts.length-1].name}. Want a recommendation?` }
    }));
  }
}, [viewedProducts]);
```

This uses existing `UserActivityContext` + `open-chat` event (already wired in `App.jsx`). No new backend needed.

**Task D5 — Optional: Real-Time Product Streaming**

For demo impressiveness, show typing indicator + stream-like reveal:
- The server already returns full response; add a character-by-character reveal animation in `AISidePanel.jsx` using `useState` + `setInterval` or CSS animation
- No actual streaming needed — visual effect is sufficient for demo

---

### PHASE E — Integration & Benchmarks (Hour 7–9)

**Task E1:** Verify fine-tuned model end-to-end
```bash
# Test 3 queries — EN, HI, TE
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"show me drones under 1500","language":"en","context":{"currentPage":"home","viewedProducts":[],"cart":[]}}'

curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"drone kahan milega","language":"hi","context":{"currentPage":"home","viewedProducts":[],"cart":[]}}'
```

Confirm: `toolSource = "model"` (not "heuristic"), `ui_guide` present, no hallucination.

**Task E2:** Run B1 + B4 benchmarks
```bash
cd finetune
python eval/bench_function_calling.py --all-models
# Outputs: research/results/b1_function_calling.md, b4_multilingual.md
```

**Task E3:** Run B2 benchmark
```bash
python eval/bench_rag.py
# Outputs: research/results/b2_rag.md
```

**Task E4:** Fill benchmark tables in README.md with real numbers.

---

### PHASE F — Demo & Submission (Hour 9–12)

**Task F1:** Record 3–5 minute demo video showing:
1. Home page (0:00) — hero, category cards
2. Category page (0:20) — click Drone → 3 robot bento
3. Robot detail page (0:40) — DJI Matrice flagship view
4. AI panel — English query → products shown (1:00)
5. AI panel — Hindi voice query "drone kahan milega" → UI guide highlights catalog (1:30)
6. AI panel — beginner vs expert response comparison (2:00)
7. Benchmark table walkthrough — show fine-tuned > base model numbers (2:30)
8. Cart checkout flow (3:00)

**Task F2:** 10-slide PDF presentation:
1. Problem statement (3 problems: routing cost, context-blind, one-size-fits-all)
2. Architecture diagram
3. Dataset (1020 rows, EN/HI/TE split, 6 tools, stratified)
4. Fine-tuning (Qwen3.5-0.8B, QLoRA, product-aware system prompt)
5. B1 — Function-Calling Accuracy table
6. B2 — Context-Aware RAG table
7. B4 — Multilingual table
8. Novelty summary (5 points)
9. Demo screenshots
10. Limitations + future work

**Task F3:** Final git commit
```bash
git add -A
git commit -m "feat: v1.0 submission — fine-tuned Qwen3.5-0.8B, multilingual dataset, full benchmarks"
git tag v1.0-submission
git push --tags
```

---

## Research Goals & Novelty

### What We Are Proving

1. **Domain-fine-tuned 0.8B matches frontier LLMs** at robotics function-calling — small model, specific domain, competitive accuracy (B1)
2. **Activity-aware RAG** (re-ranked by views, cart, current page) beats static semantic search (B2)
3. **Multilingual function-calling on a small model** — EN/HI/TE Romanized, same 0.8B (B4)
4. **Persona-adaptive generation** — auto-detected proficiency (beginner/expert) adapts Sarvam's response style
5. **LLM-driven UI guidance** — model emits `ui_guide` intent key → frontend highlights the exact UI element, no hardcoded flows

### Why The System Prompt Fix Matters for Research

The root cause of base model hallucination: it had no product knowledge. With the catalog embedded in the system prompt:
- Base model improves significantly (validates the system prompt design)
- Fine-tuned model improves further (validates fine-tuning on top of good prompting)
- This 2-step comparison (base → base+catalog → fine-tuned) is itself a finding worth documenting

---

## Dataset Design Details

### System Prompt (identical in fc_model.py and finetune/config.py)

The system prompt must include:
1. Tool schemas (already present)
2. Product catalog table (add this — see Phase A)
3. UI structure (add this — see Phase A)
4. ui_guide rules
5. Out-of-scope handling rule

### Proficiency Detection

`detect_proficiency()` in `pipeline.py` classifies queries as beginner/expert based on:
- Token count (≥18 tokens → +1)
- Technical terms: EN (`latency`, `payload`, `slam`, `thermal`) → +2 if ≥2 hits
- HI technical: `बैटरी`, `वारंटी`, `तुलना`, `स्पेक`, `कीमत`
- TE technical: `బ్యాటరీ`, `వారెంటీ`, `పోలిక`, `స్పెక్`, `ధర`
- Viewed ≥4 products → +1; cart ≥2 items → +1
- Score ≥3 → `expert`, else → `beginner`

The fine-tuning dataset should have ~50/50 beginner/expert split per language.

### Teacher Model for UI Guide Labeling

For log-based examples, use Claude as teacher:
```
Given this NexusBots query: "{message}"
Page context: {context}
Product catalog: [the 12 products with IDs and prices]
App structure: /catalog/drone has IDs 7-9, /orders has Support tab

What is the single correct function call? Output JSON:
{"tool": "...", "arguments": {...}, "ui_guide": "..."}
```

Valid `ui_guide` values: `check_orders`, `track_delivery`, `update_cart`, `find_kitchen`, `find_drone`, `find_home_cleaner`, `find_humanoid`, `compare_products`, `open_support`, `new_ticket`, `view_tickets`, `locate_robot:{id}`, `locate_path:{category}:{id}`, or `null`.

---

## Benchmark Tables (Fill During Phase E)

### B1 — Function-Calling Accuracy

| System | Tool Acc | Arg F1 | UI Guide Acc | p50 Latency |
|--------|----------|--------|--------------|-------------|
| Qwen3.5-0.8B-FC fine-tuned (ours) | — | — | — | — |
| Qwen3.5-0.8B base (zero-shot) | — | — | — | — |
| Heuristic router | — | — | — | ~1ms |
| GPT-4o zero-shot | — | — | — | — |
| Claude zero-shot | — | — | — | — |
| Gemini 2.5 zero-shot | — | — | — | — |

### B2 — Context-Aware RAG

| Method | Recall@3 | MRR |
|--------|----------|-----|
| FAISS + context re-rank (ours) | — | — |
| FAISS only (no re-rank) | — | — |
| BM25 baseline | — | — |

### B4 — Multilingual Function-Calling

| Language | Fine-tuned Acc | Base Model Acc | Heuristic Acc |
|----------|---------------|----------------|---------------|
| English | — | — | — |
| Hindi (Romanized) | — | — | — |
| Telugu (Romanized) | — | — | — |

---

## Optional Features (If Time Permits)

### OPT-1: Proactive Sales Agent

Trigger proactive AI message based on `UserActivityContext`:
- User views 3+ products without adding to cart → suggest comparison
- User on catalog page 60+ seconds → offer recommendation
- User returns to home after viewing a product → ask if they need help

Implementation: React `useEffect` watching `viewedProducts.length` + `open-chat` custom event (already wired in `App.jsx`).

### OPT-2: Real-Time Typing Effect

Add character-reveal animation in `AISidePanel.jsx` to make responses feel real-time:
```jsx
// Reveal response character by character
useEffect(() => {
  if (!newMessage) return;
  let i = 0;
  const timer = setInterval(() => {
    setDisplayed(prev => prev + newMessage[i++]);
    if (i >= newMessage.length) clearInterval(timer);
  }, 12);
  return () => clearInterval(timer);
}, [newMessage]);
```

### OPT-3: Model Source Badge

Show "Model" (green) or "Heuristic" (yellow) + "RAG" badge on each AI message. The server already returns `toolSource` and `ragEnabled` — wire them to `AISidePanel.jsx`.

---

## Known Security Issues (Fix If Time Allows)

| Issue | Location | Fix |
|-------|----------|-----|
| `.env` not in `.gitignore` | root `.gitignore` | Add `.env`, `.env.local` |
| Callback tickets endpoint returns all users' data | `server/routes/chats.js:84` | Filter by user ID |
| Payment form has zero validation | `client/src/components/CartDrawer.jsx:49` | Add format checks for card/expiry/CVV |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Colab T4 session expires mid-train | Medium | Checkpoint every 200 steps (already configured) |
| Fine-tuned model loses to heuristic on tool accuracy | Low-Med | Still reportable — negative result is a valid finding |
| Sarvam API flakes during demo | Medium | Fallback in `sarvam_client.py` already wired |
| Dataset too small → overfitting | Low | 900 train / 100 test; monitor eval loss; stop early if gap widens |
| Romanized HI/TE coverage too thin | Medium | Ensure ≥100 HI + 75 TE rows minimum before training |

---

## Submission Checklist

- [ ] System prompt updated with product catalog + UI structure in both `fc_model.py` and `finetune/config.py`
- [ ] `research/dataset/raw/function_calls_raw_v2.jsonl` generated (≥970 rows)
- [ ] `finetune/data/train.jsonl` + `test.jsonl` created by `prepare_dataset.py`
- [ ] Qwen3.5-0.8B LoRA adapter trained (Colab), downloaded, placed in `models/`
- [ ] Fine-tuned model verified end-to-end via curl (EN + HI + TE)
- [ ] B1, B2, B4 benchmark tables filled in `README.md`
- [ ] Voice input working (Chrome, STT via Web Speech API)
- [ ] Persona adaptation verified (beginner vs expert response comparison)
- [ ] Multilingual routing verified (HI/TE romanized → correct tool + ui_guide)
- [ ] UI guide working on 3+ flows end-to-end
- [ ] Demo video recorded (3–5 min)
- [ ] Slides PDF (10 slides)
- [ ] `git tag v1.0-submission` pushed

---

## Locked Decisions (Do Not Revisit)

| Area | Choice |
|------|--------|
| Base model | Qwen3.5-0.8B |
| Fine-tune method | Unsloth + QLoRA, r=16, α=32, lr=1e-4, 3 epochs |
| Tool count | 6 tools — final |
| Languages | EN + Romanized Hindi + Romanized Telugu |
| Voice | STT only via Web Speech API (no TTS for demo) |
| Orchestration | Direct Python dispatch — no LangChain |
| Dataset size | ~1000 rows (900 train / 100 test) |
| UI guidance | Element-anchored CSS + Floating UI tooltip (driver.js removed) |

---

*IIT Hyderabad · M.Tech · CS6420 Topics in Deep Learning · April 2026*

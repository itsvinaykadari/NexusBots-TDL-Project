# Nexus Bots — LLM Handout

> Concise project reference for any LLM agent working on this codebase. Read this first.

## What Is This

A robotics e-commerce web app with an AI assistant. Built for CS6420 (Topics in Deep Learning) at IIT Hyderabad, April 2026. Two team members: Digvijaysing Rajput, Vinay Kadari.

The AI assistant uses a Qwen3.5-0.8B model for function calling (tool routing) and Sarvam AI for natural language response generation. It supports English, Hindi, and Telugu.

## Architecture

```
Client (React 19 + Vite)        Server (Express 5 + SQLite)
port 5173                       port 5000
    │                               │
    ├── /api proxy ────────────────►├── /api/ai/chat (POST)
    │                               │   ├── ai.js spawns PythonWorker
    │                               │   ├── pipeline.py (tool routing)
    │                               │   │   ├── fc_model.py (Qwen3.5-0.8B)
    │                               │   │   ├── FAISS + re-ranking (RAG)
    │                               │   │   └── heuristic fallback
    │                               │   └── sarvam_client.py (NLG)
    │                               ├── /api/products (GET)
    │                               ├── /api/orders (POST, GET)
    │                               └── /api/chats (POST, GET)
    │
    ├── AISidePanel.jsx ──── AI chat UI
    ├── UIGuideProvider.jsx ── driver.js spotlight guidance
    ├── CartDrawer.jsx ────── checkout flow
    ├── Navbar.jsx ─────────── navigation + mega-menu
    └── Pages: Home, Catalog, RobotDetail, OrderHistory
```

## Key Files

| File | Purpose |
|------|---------|
| `server/ai/pipeline.py` | Core AI router. `PipelineRuntime` class with `decide_tool()` → `execute_tool()`. 6 tools: search_products, get_product, compare_products, recommend, add_to_cart, navigate_to. Dual-path: model → heuristic fallback. Emits `ui_guide` keys for 11 flows. |
| `server/ai/fc_model.py` | Qwen3.5-0.8B inference. ChatML format via `tokenizer.apply_chat_template()`. GPU fp16 when CUDA available. System prompt has all 6 tool schemas. Returns `{tool, arguments, ui_guide}`. |
| `server/ai/sarvam_client.py` | Calls Sarvam AI (`sarvam-m` model) for natural language. Strips `<think>` tags. Falls back to template text. Adapts to proficiency (beginner/expert). |
| `server/routes/ai.js` | Express route. `PythonWorker` class maintains persistent Python subprocess (JSON-line stdin/stdout). IP-based rate limiter. |
| `server/index.js` | Express server setup. Loads .env, mounts routes, serves static. |
| `server/database/init.js` | SQLite schema + seed data (12 robots, 4 categories). |
| `client/src/components/AISidePanel.jsx` | AI chat panel. Voice input via Web Speech API. Quick actions + capability cards. Sends context (page, cart, viewed products). |
| `client/src/ui-guide/UIGuideProvider.jsx` | driver.js spotlight system. `startFlow(key)` triggers multi-step on-screen guidance. Auto-navigates routes. |
| `client/src/ui-guide/flows.json` | 11 flows: check_orders, track_delivery, update_cart, find_drone, find_kitchen, find_home_cleaner, find_humanoid, compare_products, open_support, new_ticket, view_tickets. |
| `client/src/context/UserActivityContext.jsx` | Tracks: currentPage, viewedProducts, cart, searchQuery, selectedCategory, currentProduct. Sent with every AI request. |
| `client/src/data/robots.js` | Client-side product data (12 robots with images, specs, descriptions). |
| `finetune/` | Fine-tuning pipeline: config.py, train.py, prepare_dataset.py, eval/. Dataset: 1000 rows (EN/HI/TE). |

## Environment Variables (server/.env)

```
PORT=5000
SARVAM_API_KEY=<key>          # Required for NLG
SARVAM_MODEL=sarvam-m
ENABLE_FC_MODEL=1             # 1 = use Qwen3.5-0.8B, 0 = heuristic only
FC_MODEL_ID=Qwen/Qwen3.5-0.8B  # HuggingFace model ID
ENABLE_SEMANTIC_RAG=1         # 1 = FAISS + sentence-transformers
RAG_EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
PYTHON_BIN=python3
```

## AI Pipeline Flow

1. User sends message → `POST /api/ai/chat` with `{message, language, context}`
2. `ai.js` sends to `pipeline.py` worker via JSON stdin
3. `pipeline.py` runs `decide_tool()`:
   - Tries `fc_model.predict_tool_call()` first (Qwen3.5-0.8B inference)
   - Falls back to `_heuristic_tool_call()` if model unavailable
   - `_sanitize_tool_call()` validates and normalizes arguments
   - Post-model correction: fixes Hindi/Telugu order→cart misrouting
4. Executes the tool (search, compare, recommend, etc.)
5. Derives `ui_guide` key from tool + message context
6. Returns result to `ai.js`
7. `ai.js` sends to `sarvam_client.py` for natural language response
8. Combined result returned to client

## Data Model

- **12 robots** across 4 categories: Kitchen (3), Home Cleaner (3), Drone (3), Humanoid (3)
- **6 tools**: search_products, get_product, compare_products, recommend, add_to_cart, navigate_to
- **11 UI guide flows**: check_orders, track_delivery, update_cart, find_{category} × 4, compare_products, open_support, new_ticket, view_tickets
- **SQLite tables**: products, chats, chat_messages, orders, callback_requests

## Pages & Routes

| Route | Page | Key Components |
|-------|------|----------------|
| `/` | Home | ParticleNetwork hero, category cards, AI capabilities grid |
| `/catalog` | Catalog | Sticky category nav, editorial sections, search bar |
| `/robot/:id` | RobotDetail | Full-bleed hero, specs bento, compare band |
| `/orders` | OrderHistory | Orders tab + Support tab, ticket form |

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, driver.js, Lucide icons
- **Backend**: Express 5, better-sqlite3, dotenv
- **AI Model**: Qwen/Qwen3.5-0.8B (HuggingFace, ~1.75 GB, ChatML)
- **NLG**: Sarvam AI (sarvam-m model)
- **RAG**: sentence-transformers/all-MiniLM-L6-v2 + FAISS
- **Python**: 3.13+, PyTorch 2.11+cu130, transformers 5.4

## Known Issues (as of 2026-04-18)

1. **UI guide highlight doesn't track scroll** — driver.js overlay stays at initial position
2. **Markdown not rendered in chat** — `<p>{msg.content}</p>` shows raw markdown
3. **No model/RAG status indicator** — `toolSource` and `ragEnabled` not forwarded to client
4. **`.env` not in .gitignore** — API key gets committed
5. **Base model misroutes some Hindi queries** — fixed by post-model keyword correction, but fine-tuning will resolve properly
6. **No test infrastructure** — zero test files
7. **Server product images use Unsplash placeholders** — client has real images

## How to Modify

- **Add a new tool**: Define in `pipeline.py` (`TOOL_SCHEMAS`, `execute_tool()`), add to `fc_model.py` system prompt, add heuristic pattern in `_heuristic_tool_call()`
- **Add a new UI guide flow**: Add entry in `flows.json`, add `data-guide-id` attributes on target elements, add label in `UIGuideProvider.jsx`
- **Change the AI model**: Update `FC_MODEL_ID` in `.env`, ensure ChatML format compatibility in `fc_model.py`
- **Add a new product**: Insert in `server/database/init.js` seed data AND `client/src/data/robots.js`

## Build & Run

```bash
# Server
cd server && npm install && node index.js

# Client (separate terminal)
cd client && npm install && npm run dev

# Fine-tuning (Google Colab)
# Open finetune/qwen35_finetune.ipynb in Colab with T4 GPU
```

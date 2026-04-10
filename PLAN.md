# Nexus Bots — Project Plan

## Project Title

Nexus Bots: Domain-Specific Function Calling with Fine-Tuned Small LLMs and Context-Aware RAG for Persona-Adaptive Multilingual Robotics Commerce

## Abstract

We present Nexus Bots, a robotics commerce platform that investigates whether a fine-tuned small language model (~360M parameters) can match large models (GPT-4, Claude, Gemini) at domain-specific function calling — selecting the right tool and generating correct arguments for robotics e-commerce queries. The system combines three novel components: (1) a QLoRA-fine-tuned SmolLM2/Qwen2 model that maps user queries to structured function calls (search, compare, recommend, navigate), (2) context-aware RAG that re-ranks retrieved products using real-time user activity signals (browsing history, cart, current page), and (3) automatic user proficiency detection that adapts response complexity for beginners vs experts. Sarvam AI generates the final multilingual responses in English, Hindi, and Telugu, orchestrated by LangChain. We benchmark function-calling accuracy of our fine-tuned small model against GPT-4, Claude, and Gemini, evaluate context-aware vs standard retrieval, and test multilingual function-calling accuracy across three languages.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Function Calling | Fine-tuned SmolLM2/Qwen2 (QLoRA, ~360M params) |
| Retrieval | Sentence-transformers + FAISS (context-aware re-ranking) |
| Orchestration | LangChain |
| Reasoning/Response | Sarvam AI (multilingual: EN/HI/TE) |
| Voice | Web Speech API + TTS |
| Training | Google Colab (free T4) + HuggingFace + Unsloth |

## Architecture

```
User (ChatWidget / AI Assistant) — English, Hindi, Telugu
        │
        ├── [Voice] → Web Speech API → text
        │
        ▼
┌──────────────────────────────────────────┐
│  Page-Aware Activity Tracker             │  ← views, cart, search, current page,
│  (UserActivityContext)                   │     visible products, active filters
└──────────┬───────────────────────────────┘
           │ user context + query
           ▼
┌──────────────────────────────────────────┐
│  Fine-Tuned Small LLM (QLoRA)            │  ← SmolLM2/Qwen2 (~360M params)
│  Domain-specific function calling        │
│  Input: query + context                  │
│  Output: tool_name(arg1, arg2, ...)      │
└──────────┬───────────────────────────────┘
           │ function call
           ▼
┌──────────────────────────────────────────┐
│  LangChain Orchestrator                  │  ← Executes tool calls, manages flow
│  ├── execute function (DB lookup, etc.)  │
│  ├── Context-Aware RAG                   │  ← FAISS + re-rank by user activity
│  ├── User Proficiency Detector           │  ← beginner / expert
│  └── pack context for Sarvam            │
└──────────┬───────────────────────────────┘
           │ product data + context + proficiency
           ▼
┌──────────────────────────────────────────┐
│  Sarvam AI                               │  ← Multilingual reasoning (EN/HI/TE)
│  Generates persona-adaptive response     │
│  Beginner → simple, guiding language     │
│  Expert → technical, spec-heavy language │
└──────────┬───────────────────────────────┘
           │
           ├── [Voice] → TTS → speech output
           ▼
┌──────────────────────────────────────────┐
│  SQLite Database                         │
│  Products (22 real robots), Chat History │
└──────────────────────────────────────────┘
```

## Function Calls (What the Small LLM Learns)

| Function | Example Input | Example Output |
|---|---|---|
| search_products(query, category) | "Show me pool cleaners" | search_products("pool", "Home Cleaner") |
| get_product(id) | "Tell me about the Roomba" | get_product(5) |
| compare_products(id1, id2, focus) | "Roomba vs Roborock suction?" | compare_products(5, 6, "suction") |
| recommend(need, budget, category) | "Best robot for 6yr old under $300" | recommend("kids coding", 300, "Child") |
| add_to_cart(id) | "Add CyberDog to my cart" | add_to_cart(17) |
| navigate_to(page, params) | "Show me security robots" | navigate_to("catalog", {category: "Security"}) |
| get_support(issue, product_id) | "My Roomba won't charge" | get_support("not charging", 5) |

## Product Catalog (22 real-world robots, 6 categories)

| Category | Count | Products (Real Brands) |
|---|---|---|
| **Household** | 4 | Amazon Astro, Samsung Ballie, Enabot EBO X, Unitree Go2 Air |
| **Home Cleaner** | 4 | iRobot Roomba j9+, Roborock S8 MaxV Ultra, Ecovacs WINBOT W2, Aiper Surfer S1 |
| **Child** | 3 | Miko 3, Wonder Workshop Dash, LEGO Spike Prime |
| **Educational** | 4 | DJI RoboMaster S1, TurtleBot 4, Makeblock mBot2, Unitree Go2 EDU |
| **Security** | 3 | Ring Always Home Cam, Xiaomi CyberDog 2, DJI Matrice 30T |
| **Industrial** | 4 | Universal Robots UR10e, Boston Dynamics Stretch, FANUC CRX-25iA, ABB YuMi |

## Pages & Navigation

| Nav Item | Route | Description |
|---|---|---|
| Home | `/` | Hero section, featured robots, AI feature cards, stats |
| Products | `/catalog` | Full catalog with search, category filter, sorting |
| AI Assistant | `/assistant` | Combined chat + voice full-page experience |
| Support | `/support` | Support form with AI chatbot |
| — | (floating widget) | Bottom-right ChatWidget on ALL pages, context-aware |

## Research Benchmarks

### Benchmark 1: Function-Calling Accuracy (Core)
| Model | Tool Accuracy | Arg Correctness | Latency | Cost/1000 |
|---|---|---|---|---|
| Fine-tuned SmolLM2 (360M) | TBD | TBD | TBD | ~$0 |
| Zero-shot GPT-4 | TBD | TBD | ~800ms | ~$15 |
| Zero-shot Claude | TBD | TBD | ~600ms | ~$10 |
| Zero-shot Gemini | TBD | TBD | ~500ms | ~$5 |

### Benchmark 2: Context-Aware RAG
| Retrieval Method | Recall@3 | MRR | Notes |
|---|---|---|---|
| FAISS + activity re-ranking | TBD | TBD | Uses views, cart, page context |
| FAISS standard (query only) | TBD | TBD | Baseline |
| TF-IDF | TBD | TBD | Traditional baseline |
| BM25 | TBD | TBD | Traditional baseline |

### Benchmark 3: User Proficiency Detection
| Method | Accuracy | F1 |
|---|---|---|
| Trained classifier | TBD | TBD |
| Zero-shot LLM prompt | TBD | TBD |
| Keyword heuristic | TBD | TBD |

### Benchmark 4: Multilingual Function Calling
| Language | Tool Accuracy | Arg Correctness |
|---|---|---|
| English | TBD | TBD |
| Hindi (code-mixed) | TBD | TBD |
| Telugu (code-mixed) | TBD | TBD |

### Benchmark 5: Persona-Adapted Response Quality
| Proficiency | Helpfulness Score | Appropriateness |
|---|---|---|
| Beginner responses | TBD | TBD |
| Expert responses | TBD | TBD |
| One-size-fits-all baseline | TBD | TBD |

## Project Structure

```
nexus-bots/
├── client/                # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # Navbar, Footer, RobotCard, HeroSection, FeaturedRobots, ChatWidget
│   │   ├── context/       # UserActivityContext (views, cart, search, page tracking)
│   │   ├── pages/         # Home, Catalog, RobotDetail, AIAssistant, Support
│   │   ├── data/          # robots.js — 22 real-world robot products
│   │   └── styles/
│   └── public/
├── server/                # Node.js backend
│   ├── config/            # db.js (SQLite connection)
│   ├── database/          # schema.sql, seed.sql, init.js, nexusbots.db
│   ├── models/            # Product.js, Chat.js
│   ├── routes/            # products.js, chats.js, ai.js (new)
│   └── index.js           # Express server entry
├── research/              # Research component
│   ├── dataset/           # Function-calling dataset (EN + HI + TE)
│   ├── notebooks/         # Colab training notebooks
│   │   ├── function_calling_finetune.ipynb
│   │   ├── proficiency_classifier.ipynb
│   │   ├── rag_evaluation.ipynb
│   │   └── benchmarks.ipynb
│   ├── models/            # Saved fine-tuned model weights
│   └── results/           # Benchmark tables, charts, confusion matrices
├── Idea.md
├── PLAN.md
└── README.md
```

---

## BUILD PHASES (4 Phases)

---

### Phase 1 — UI + Backend Foundation ✅ DONE

Everything built and verified working.

**Frontend (Done):**
- [x] React 19 + Vite + Tailwind CSS setup
- [x] 22 real-world robot products from real companies
- [x] Home page — hero, featured robots, AI feature cards, stats
- [x] Catalog page — search, category filter, sorting
- [x] Robot Detail page — specs, related robots, add to cart
- [x] AI Assistant page — combined chat + voice with mode toggle
- [x] Support page — support form
- [x] Floating ChatWidget — bottom-right, text + voice input, context-aware
- [x] UserActivityContext — tracks views, cart, search, current page, category
- [x] Responsive layout, Navbar with mobile menu, Footer
- [x] Context-aware proactive bot messages (placeholder responses)

**Backend (Done):**
- [x] Express server with CORS
- [x] SQLite database (better-sqlite3)
- [x] Schema: products (with brand), chats, chat_messages
- [x] Seed: 22 real robots via init.js
- [x] Product API: GET /api/products (filter + search), GET /api/products/:id
- [x] Chat API: POST /api/chats, GET /api/chats/:id, POST /api/chats/:id/messages
- [x] Health: GET /api/health

**Status:** Frontend at localhost:5173, Backend at localhost:5000, all APIs verified.

---

### Phase 2 — Research Core (Dataset + Training)

This is where all the deep learning happens. Done entirely on Google Colab.

**2A. Function-Calling Dataset (1-2 days)**
- [ ] Define 7 tool schemas (search, get_product, compare, recommend, add_to_cart, navigate, get_support)
- [ ] Generate 800-1000 synthetic examples using GPT-4:
  - Input: user query + page context
  - Output: function_name(arg1, arg2, ...)
- [ ] Include English (~500), Hindi (~250), Telugu (~250) examples
- [ ] Include beginner and expert style queries
- [ ] Format in function-calling training format (messages + tool_calls)
- [ ] Manual review and cleanup

**2B. Fine-Tune Small LLM for Function Calling (2-3 days)**
- [ ] Choose base model: SmolLM2-360M or Qwen2-0.5B
- [ ] Set up Colab notebook with Unsloth + QLoRA
- [ ] Fine-tune on function-calling dataset
- [ ] Evaluate: tool-call accuracy, argument correctness
- [ ] Benchmark against zero-shot GPT-4, Claude, Gemini on same test set
- [ ] Generate results: accuracy table, confusion matrix, latency comparison

**2C. User Proficiency Classifier (1 day)**
- [ ] Generate labeled dataset: 300-400 queries labeled beginner/expert
- [ ] Train small classifier (can be a head on sentence-transformers or separate small model)
- [ ] Benchmark: trained vs zero-shot LLM vs keyword heuristic
- [ ] Generate results: accuracy, F1, example predictions

**2D. Context-Aware RAG (1-2 days)**
- [ ] Embed all 22 robot descriptions using sentence-transformers
- [ ] Build FAISS index
- [ ] Implement context-aware re-ranking:
  - Boost products in same category as currently viewed
  - Boost products user has browsed before
  - Boost products related to cart items
- [ ] Benchmark: standard FAISS vs context-aware vs TF-IDF vs BM25
- [ ] Generate results: Recall@3, MRR table

**Phase 2 deliverables:** Fine-tuned model weights, proficiency classifier, FAISS index, all benchmark tables.

---

### Phase 3 — Integration (LangChain + Sarvam + Full Pipeline)

Connect all trained components into a working system.

**3A. LangChain Pipeline (2-3 days)**
- [ ] Set up LangChain with tool definitions matching our 7 functions
- [ ] Load fine-tuned small LLM as the function-calling model
- [ ] Implement tool execution layer:
  - search_products → SQLite query
  - get_product → SQLite lookup
  - compare_products → fetch both + format
  - recommend → RAG retrieval + filter
  - add_to_cart → update context
  - navigate_to → return navigation instruction
  - get_support → format support request
- [ ] Wire up context-aware RAG in the retrieval tools
- [ ] Wire up proficiency detector in the response formatting

**3B. Sarvam Integration (1-2 days)**
- [ ] Connect Sarvam API for response generation
- [ ] Pass to Sarvam: tool results + product data + user proficiency + page context + language
- [ ] Test EN/HI/TE response generation
- [ ] Test beginner vs expert response adaptation

**3C. Connect Frontend (1-2 days)**
- [ ] New API endpoint: POST /api/ai/chat
  - Accepts: { message, language, context: { page, viewed, cart, search, filters, visibleProducts } }
  - Returns: { response, toolCalled, productsReferenced }
- [ ] Connect ChatWidget → /api/ai/chat
- [ ] Connect AI Assistant page → /api/ai/chat
- [ ] Pass UserActivityContext data with every request
- [ ] Store chat history in SQLite

**Phase 3 deliverables:** Working end-to-end pipeline. User talks → small LLM picks tool → LangChain executes → Sarvam responds.

---

### Phase 4 — Voice + Evaluation + Demo

**4A. Voice Integration (1 day)**
- [ ] Web Speech API for speech-to-text in ChatWidget + AI Assistant
- [ ] Route transcribed text through same /api/ai/chat pipeline
- [ ] TTS for Sarvam responses
- [ ] Test with EN/HI/TE voice input

**4B. Page-Aware Enhancement (1 day)**
- [ ] Extend UserActivityContext to capture visible products on screen
- [ ] Pass visible product list + active filters to the pipeline
- [ ] Test page-aware responses:
  - Catalog with filter → bot references visible products
  - Product detail → bot offers comparisons
  - Home → bot offers category guidance

**4C. Final Benchmarks & Evaluation (1-2 days)**
- [ ] Run all 5 benchmark tables with final numbers
- [ ] Generate confusion matrices for function-calling model
- [ ] Generate latency comparison charts
- [ ] Run persona-adapted response quality evaluation (LLM-as-judge)
- [ ] Compile multilingual results

**4D. Demo Preparation (1 day)**
- [ ] Build demo flow: show query → function call → RAG → Sarvam → response
- [ ] Prepare slides with benchmark tables and architecture diagrams
- [ ] Record backup demo video
- [ ] Clean up code and README

**Phase 4 deliverables:** Working voice, all benchmark results, demo-ready project.

---

## Time Estimate (Realistic)

| Phase | Duration | Status |
|---|---|---|
| Phase 1 — UI + Backend | Done | ✅ |
| Phase 2 — Research (dataset + training + RAG) | 5-8 days | Next |
| Phase 3 — Integration (LangChain + Sarvam + frontend) | 4-7 days | After Phase 2 |
| Phase 4 — Voice + Evaluation + Demo | 3-4 days | Final |
| **Total remaining** | **12-19 days** | |

## Priority Order (If Running Low on Time)

| Priority | What | Why |
|---|---|---|
| **Must have** | Phase 2B: Fine-tuned function-calling model + benchmarks | This IS the research. No model = no project. |
| **Must have** | Phase 2D: Context-aware RAG + benchmarks | Second research contribution. |
| **Must have** | Phase 3A-C: LangChain + Sarvam + frontend connection | Working demo needed. |
| **Should have** | Phase 2C: Proficiency classifier | Adds a benchmark table, small effort. |
| **Should have** | Phase 4A: Voice | Multimodal bonus. Quick to add. |
| **Nice to have** | Phase 4B: Page-aware enhancement | Cool UX, but not core DL. |
| **Nice to have** | Phase 4C-D: Full evaluation + demo polish | As much as time allows. |

## What NOT to Waste Time On

- Payment/order management — not relevant
- Email agent — zero DL value, dropped
- Training from scratch — QLoRA fine-tuning is the approach
- Complex UI animations — existing UI is sufficient
- Cloud deployment — local demo is fine
- More than 3 languages — EN + HI + TE is enough
- Over-engineering LangChain agents — keep tool execution simple

## Team

**Digvijaysing Rajput** (CS24MTECH14020), **Vinay Kadari** (CS24MTECH14008)

---

*Academic project — IIT Hyderabad, M.Tech, CS6420 Topics in Deep Learning*

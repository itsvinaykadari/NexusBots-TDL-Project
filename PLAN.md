# Nexus Bots — Project Plan

## Project Title

Nexus Bots: Fine-Tuned Intent Routing and RAG-Based Retrieval for Multilingual Multi-Agent Robotics Commerce

## Abstract

Multi-agent AI systems in e-commerce typically rely on large language model API calls for both intent routing and context retrieval, which can be slow and costly for real-time use. We present Nexus Bots, a robotics commerce platform that combines a fine-tuned DistilBERT intent classifier for agent routing with retrieval-augmented generation (RAG) using sentence-transformer embeddings for product-aware responses. The system routes user queries across chat, voice, and email channels to specialized LangChain agents including product assistant, sales, and support agents, while RAG retrieves relevant product context from a catalog of 22 real-world robots across 6 categories. We fine-tune DistilBERT on a domain-specific dataset of labeled e-commerce queries across 6 intent classes and benchmark it against zero-shot GPT, Gemini, and rule-based keyword matching on accuracy, F1, latency, and cost. We also compare RAG retrieval approaches (sentence-transformers vs TF-IDF vs BM25) on recall and relevance. Additionally, we evaluate whether routing to specialized agents produces better responses than a single monolithic chatbot. As a case study, we test multilingual intent classification on English, Hindi, and Telugu queries, and compare intent accuracy across text and voice input modalities.

## Tech Stack

| Layer        | Technology                             |
|--------------|----------------------------------------|
| Frontend     | React 19 + Vite + Tailwind CSS        |
| Backend      | Node.js + Express                      |
| Database     | SQLite (`better-sqlite3`)              |
| AI Routing   | Fine-tuned DistilBERT (HuggingFace)   |
| AI Retrieval | Sentence-transformers + FAISS          |
| AI Agents    | LangChain + OpenAI                     |
| Voice        | Web Speech API + TTS                   |
| Email        | Nodemailer + AI agent                  |
| Training     | Google Colab + HuggingFace Transformers|

## Architecture

```
User (Chat Widget / AI Assistant / Email)  — English, Hindi, Telugu
        │
        ├── [Voice] → Web Speech API → text transcript
        │
        ▼
┌──────────────────────────────────┐
│  Context-Aware Activity Tracker  │  ← Tracks views, cart, search, current product
└──────────┬───────────────────────┘
           │ user context
           ▼
┌──────────────────────────────────┐
│  Fine-Tuned Intent Classifier    │  ← DistilBERT (~5ms, local)
│  (product_query, comparison,     │
│   recommendation, purchase,      │
│   complaint, general)            │
└──────────┬───────────────────────┘
           │ intent label
           ▼
┌──────────────────────────────────┐
│  RAG Retrieval                   │  ← Sentence-transformers + FAISS
│  Top-3 relevant products         │
└──────────┬───────────────────────┘
           │ intent + product context + user activity
           ▼
┌──────────────────────────────────┐
│  LangChain Agent Router          │
├──────────┬───────────┬───────────┤
│ Product  │ Sales     │ Support   │
│ Agent    │ Agent     │ Agent     │
└──────────┴───────────┴───────────┘
           │
           ├── [Voice] → TTS → speech output
           ▼
┌──────────────────────────────────┐
│  SQLite                          │
│  Products, Chats, Emails         │
└──────────────────────────────────┘
```

## Project Structure

```
nexus-bots/
├── client/                # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # Navbar, Footer, RobotCard, HeroSection, FeaturedRobots, ChatWidget
│   │   ├── context/       # UserActivityContext (views, cart, search tracking)
│   │   ├── pages/         # Home, Catalog, RobotDetail, AIAssistant, Support
│   │   ├── data/          # robots.js — 22 real-world robot products
│   │   └── styles/
│   └── public/            # favicon, icons
├── server/                # Node.js backend
│   ├── config/            # db.js (SQLite connection)
│   ├── database/          # schema.sql, seed.sql, init.js, nexusbots.db
│   ├── models/            # Product.js, Chat.js
│   ├── routes/            # products.js, chats.js
│   └── index.js           # Express server entry
├── research/              # Research component (Phase 3+)
│   ├── dataset/           # Labeled intent dataset (EN + HI + TE)
│   ├── notebooks/         # Colab training notebooks
│   ├── models/            # Saved fine-tuned model
│   └── results/           # Benchmark tables and charts
├── Idea.md
├── PLAN.md
└── README.md
```

## Pages & Navigation

| Nav Item | Route | Description |
|---|---|---|
| Home | `/` | Hero section, featured robots, AI feature cards, stats |
| Products | `/catalog` | Full catalog with search, category filter, sorting |
| AI Assistant | `/assistant` | Combined chat + voice full-page experience |
| Support | `/support` | Email support form with AI agent |
| — | (floating widget) | Bottom-right chatbot available on ALL pages |

The floating ChatWidget is context-aware — it knows what product the user is viewing, what's in their cart, and what they've browsed, and can proactively offer help.

## Robot Product Catalog (22 real-world robots, 6 categories)

| Category | Count | Products (Real Brands) |
|---|---|---|
| **Household** | 4 | Amazon Astro, Samsung Ballie, Enabot EBO X, Unitree Go2 Air |
| **Home Cleaner** | 4 | iRobot Roomba j9+, Roborock S8 MaxV Ultra, Ecovacs WINBOT W2, Aiper Surfer S1 |
| **Child** | 3 | Miko 3, Wonder Workshop Dash, LEGO Spike Prime |
| **Educational** | 4 | DJI RoboMaster S1, TurtleBot 4, Makeblock mBot2, Unitree Go2 EDU |
| **Security** | 3 | Ring Always Home Cam, Xiaomi CyberDog 2, DJI Matrice 30T |
| **Industrial** | 4 | Universal Robots UR10e, Boston Dynamics Stretch, FANUC CRX-25iA, ABB YuMi |

All data uses real product names, real specifications, and real pricing from official sources.

## Context-Aware Bot Features

The system tracks user activity through React Context:
- **Viewed products** — what the user has clicked on
- **Cart contents** — what they've added to cart
- **Current product** — what they're looking at right now
- **Search queries** — what they've searched for
- **Category filter** — what category they're browsing

This context is passed to the AI agents so they can proactively help:
- *"I see you're looking at the Roomba j9+ — want to compare it with the Roborock S8?"*
- *"You have 2 items in your cart. Ready to checkout?"*
- *"You've been browsing Security robots — need a recommendation?"*

## Intent Classes

| Intent | Example (EN) | Example (HI) | Example (TE) | Routes To |
|---|---|---|---|---|
| `product_query` | "What sensors does CyberDog 2 have?" | "CyberDog 2 mein kaunse sensors hain?" | "CyberDog 2 lo em sensors untayi?" | Product Agent |
| `comparison` | "Roomba j9+ vs Roborock S8?" | "Roomba aur Roborock mein kya fark hai?" | "Roomba vs Roborock lo difference enti?" | Product Agent |
| `recommendation` | "Best robot for a 6 year old?" | "6 saal ke bacche ke liye kaunsa robot?" | "6 years pilladi ki best robot edi?" | Sales Agent |
| `purchase_intent` | "How do I order the UR10e?" | "UR10e kaise order karun?" | "UR10e ela order cheyali?" | Sales Agent |
| `complaint` | "My Roomba keeps getting stuck" | "Mera Roomba baar baar atakta hai" | "Na Roomba ikkukontondi" | Support Agent |
| `general` | "Hello, what is Nexus Bots?" | "Hello, Nexus Bots kya hai?" | "Hello, Nexus Bots enti?" | Product Agent |

## Research Benchmarks

### Benchmark 1: Intent Classification
| Method | Accuracy | F1 | Latency | Cost/1000 |
|---|---|---|---|---|
| Fine-tuned DistilBERT | TBD | TBD | ~5ms | $0 |
| Zero-shot GPT | TBD | TBD | ~800ms | ~$10 |
| Zero-shot Gemini | TBD | TBD | ~600ms | ~$5 |
| Rule-based keywords | TBD | TBD | ~1ms | $0 |

### Benchmark 2: Product Retrieval (RAG)
| Method | Recall@3 | MRR | Latency |
|---|---|---|---|
| Sentence-transformers + FAISS | TBD | TBD | TBD |
| TF-IDF | TBD | TBD | TBD |
| BM25 | TBD | TBD | TBD |

### Benchmark 3: Agent Quality
| Setup | Response Relevance | Factual Accuracy |
|---|---|---|
| Multi-agent (routed) | TBD | TBD |
| Single-agent (monolithic) | TBD | TBD |

### Benchmark 4: Multilingual (Bonus)
| Language | Intent Accuracy | F1 |
|---|---|---|
| English | TBD | TBD |
| Hindi (code-mixed) | TBD | TBD |
| Telugu (code-mixed) | TBD | TBD |

### Benchmark 5: Multimodal (Bonus)
| Input Modality | Intent Accuracy | Notes |
|---|---|---|
| Text (typed) | TBD | Direct text input |
| Voice (transcribed) | TBD | After Web Speech API transcription |

## Build Phases

### Phase 1 — UI Foundation ✅ DONE
- [x] React + Vite + Tailwind setup
- [x] Robot data (22 real-world robots, 6 categories)
- [x] Home page with hero, featured robots, AI feature cards, stats
- [x] Products/Catalog page with search, filter, sort
- [x] Robot detail page with specs, related robots, add to cart
- [x] AI Assistant page (combined chat + voice with mode toggle)
- [x] Support page (email form with AI support info)
- [x] Floating ChatWidget (bottom-right, context-aware, text + voice)
- [x] UserActivityContext (tracks views, cart, search, current product)
- [x] Responsive layout, Navbar with mobile menu, Footer
- [x] Context-aware proactive bot messages

### Phase 2 — Backend + Database ✅ DONE
- [x] Express server setup with CORS and error handling
- [x] SQLite database with better-sqlite3
- [x] Schema: products (with brand), chats, chat_messages, emails tables
- [x] Seed data: 22 real-world robots via init.js
- [x] Product API: GET /api/products (filter + search), GET /api/products/:id
- [x] Chat API: POST /api/chats, GET /api/chats/:id, POST /api/chats/:id/messages
- [x] Health check: GET /api/health

### Phase 3 — Intent Classification (Research Core)
- [ ] Generate synthetic dataset using GPT (800-1000 examples)
- [ ] Include English, Hindi, Telugu (code-mixed) examples
- [ ] Clean and validate dataset manually
- [ ] Fine-tune DistilBERT (or multilingual variant) on Google Colab
- [ ] Run benchmarks: fine-tuned vs GPT vs Gemini vs rule-based
- [ ] Run multilingual benchmark: accuracy per language
- [ ] Generate results: accuracy table, confusion matrix, latency chart

### Phase 4 — RAG Pipeline
- [ ] Embed all 22 robot descriptions using sentence-transformers
- [ ] Build FAISS index for similarity search
- [ ] Retrieve top-3 products per query
- [ ] Benchmark: sentence-transformers vs TF-IDF vs BM25
- [ ] Generate retrieval results: recall@3, MRR table

### Phase 5 — LangChain Multi-Agent System
- [ ] Set up LangChain with agent definitions
- [ ] Product Assistant agent (specs, search, info)
- [ ] Sales Assistant agent (recommendations, purchase guidance)
- [ ] Support agent (complaints, troubleshooting)
- [ ] Router connects intent classifier + RAG + user context → correct agent
- [ ] Run benchmark: multi-agent vs single-agent response quality

### Phase 6 — Full Integration
- [ ] Connect ChatWidget to backend → intent → RAG → agent pipeline
- [ ] Connect AI Assistant page to same pipeline
- [ ] Pass user activity context to agents for personalized responses
- [ ] Chat history stored in SQLite
- [ ] Support Hindi/Telugu input

### Phase 7 — Voice Interaction (Multimodal)
- [ ] Web Speech API for speech-to-text in ChatWidget + AI Assistant
- [ ] Route transcribed text through same pipeline
- [ ] Text-to-speech for agent responses
- [ ] Run benchmark: text vs voice-transcribed intent accuracy

### Phase 8 — Email Support
- [ ] Email form sends to backend
- [ ] Email agent generates formal response
- [ ] Nodemailer integration
- [ ] Email history tracking in SQLite

### Phase 9 — Polish & Demo
- [ ] Loading states and error handling
- [ ] Demo flow: show intent → RAG → agent routing in action
- [ ] Show all benchmark results in presentation
- [ ] Prepare evaluation slides with tables and charts

## Backend API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/products` | All products (supports `?category=` and `?search=`) |
| GET | `/api/products/:id` | Single product by ID (includes brand) |
| POST | `/api/chats` | Create new chat session |
| GET | `/api/chats/:id` | Get chat session with messages |
| POST | `/api/chats/:id/messages` | Add message to chat |

## Time Priority

| Priority | Phase | Why |
|---|---|---|
| **Critical** | Phase 3 (Intent Classification) | Research core — benchmarks needed for score |
| **Critical** | Phase 4 (RAG) | Second research component + better agent responses |
| **Critical** | Phase 5-6 (Agents + Integration) | Working demo with context-aware bot |
| **High** | Phase 7 (Voice) | Multimodal bonus marks |
| **Medium** | Phase 8 (Email) | Shows multi-channel capability |
| **Low** | Phase 9 (Polish) | Only after everything works |

## What NOT to waste time on

- Payment integration or order management
- Complex user authentication
- Training models from scratch — fine-tuning is the research story
- Fancy animations or over-designed UI
- Deploying to cloud — local demo is fine
- More than 3 languages — English + Hindi + Telugu is sufficient
- Emotion/sentiment detection — adds complexity without payoff

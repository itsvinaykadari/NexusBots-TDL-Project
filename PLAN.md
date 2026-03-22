# Nexus Bots — Project Plan

## Project Title

Nexus Bots: Fine-Tuned Intent Routing and RAG-Based Retrieval for Multilingual Multi-Agent Robotics Commerce

## Abstract

Multi-agent AI systems in e-commerce typically rely on large language model API calls for both intent routing and context retrieval, which can be slow and costly for real-time use. We present Nexus Bots, a robotics commerce platform that combines a fine-tuned DistilBERT intent classifier for agent routing with retrieval-augmented generation (RAG) using sentence-transformer embeddings for product-aware responses. The system routes user queries across chat, voice, and email channels to specialized LangChain agents including product assistant, sales, and support agents, while RAG retrieves relevant product context from a catalog of 22 robots across 6 categories. We fine-tune DistilBERT on a domain-specific dataset of labeled e-commerce queries across 6 intent classes and benchmark it against zero-shot GPT, Gemini, and rule-based keyword matching on accuracy, F1, latency, and cost. We also compare RAG retrieval approaches (sentence-transformers vs TF-IDF vs BM25) on recall and relevance. Additionally, we evaluate whether routing to specialized agents produces better responses than a single monolithic chatbot. As a case study, we test multilingual intent classification on English, Hindi, and Telugu queries, and compare intent accuracy across text and voice input modalities.

## Tech Stack

| Layer        | Technology                           |
|--------------|--------------------------------------|
| Frontend     | React 19 + Vite + Tailwind CSS      |
| Backend      | Node.js + Express                    |
| Database     | PostgreSQL                           |
| AI Routing   | Fine-tuned DistilBERT (HuggingFace) |
| AI Retrieval | Sentence-transformers + FAISS        |
| AI Agents    | LangChain + OpenAI                   |
| Voice        | Web Speech API + TTS                 |
| Email        | Nodemailer + AI agent                |
| Training     | Google Colab + HuggingFace Transformers |

## Architecture

```
User (Chat / Voice / Email)  — English, Hindi, Telugu
        │
        ├── [Voice] → Web Speech API → text transcript
        │
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
           │ intent + product context
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
│  PostgreSQL                      │
│  Products, Chats, Emails         │
└──────────────────────────────────┘
```

## Project Structure

```
nexus-bots/
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Navbar, Footer, RobotCard, HeroSection
│   │   ├── pages/         # Home, Catalog, RobotDetail, Chat, Voice, Support
│   │   ├── data/          # robots.js (22 products)
│   │   └── styles/
│   └── public/
├── server/                # Node.js backend
│   ├── routes/            # API routes
│   ├── controllers/       # Business logic
│   ├── models/            # DB models
│   ├── agents/            # LangChain agent definitions
│   └── services/          # AI, email, voice, RAG services
├── research/              # Research component
│   ├── dataset/           # Intent classification dataset (EN + HI + TE)
│   ├── notebooks/         # Training & evaluation notebooks (Colab)
│   ├── models/            # Saved fine-tuned model
│   └── results/           # Benchmark tables, charts, confusion matrices
├── database/              # SQL scripts, seeds
├── Idea.md
├── PLAN.md
└── README.md
```

## Robot Product Catalog (22 robots, 6 categories)

| Category | Robots | Distinct Strengths |
|---|---|---|
| **Household** (4) | HomeHub, Butler, Chef Mini, PetPal | Smart control, heavy carrier, precision cooking, pet monitoring |
| **Home Cleaner** (4) | CleanBot Pro, WindowWiz, PoolDive, AirPure | Strongest suction, glass specialist, underwater, mobile purifier |
| **Child** (3) | Buddy, CodePal, Tutor | Toddler-safe, learn coding, AI tutoring |
| **Educational** (4) | BuildKit, ROS Lab, CompeteBot, SimBot | School kit, university research, competitions, digital twin |
| **Security** (3) | WatchDog, EyeNet, SkyGuard | Outdoor patrol, indoor multi-hazard, aerial drone |
| **Industrial** (4) | LiftMax, ArmX6, SortFlow, InspectEye | 500kg payload, 0.02mm precision, 3000/hr sorting, AI quality control |

## Intent Classes

| Intent | Example (EN) | Example (HI) | Example (TE) | Routes To |
|---|---|---|---|---|
| `product_query` | "What sensors does WatchDog have?" | "WatchDog mein kaunse sensors hain?" | "WatchDog lo em sensors untayi?" | Product Agent |
| `comparison` | "CleanBot Pro vs AirPure?" | "CleanBot Pro aur AirPure mein kya fark hai?" | "CleanBot Pro vs AirPure lo difference enti?" | Product Agent |
| `recommendation` | "Best robot for a 5 year old?" | "5 saal ke bacche ke liye kaunsa robot?" | "5 years pilladi ki best robot edi?" | Sales Agent |
| `purchase_intent` | "How do I order LiftMax?" | "LiftMax kaise order karun?" | "LiftMax ela order cheyali?" | Sales Agent |
| `complaint` | "My Butler keeps bumping into walls" | "Mera Butler deewar se takrata rehta hai" | "Na Butler wall ki kottukontondi" | Support Agent |
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
- [x] Robot data (22 robots, 6 categories with distinct highlights)
- [x] Home page with hero, featured robots, stats
- [x] Catalog page with search, filter, sort
- [x] Robot detail page with specs and related robots
- [x] Chat, Voice, Support page UIs (placeholder)
- [x] Responsive layout, Navbar, Footer

### Phase 2 — Backend + Database
- [ ] Express server setup with API routes
- [ ] PostgreSQL schema (products, chats, emails, interactions)
- [ ] Seed database with robot data
- [ ] Product API endpoints
- [ ] Chat session API endpoints

### Phase 3 — Intent Classification (Research Core)
- [ ] Generate synthetic dataset using GPT (800-1000 examples)
- [ ] Include English, Hindi, Telugu (code-mixed) examples
- [ ] Clean and validate dataset manually
- [ ] Fine-tune DistilBERT (or multilingual DistilBERT) on Google Colab
- [ ] Run benchmarks: fine-tuned vs GPT vs Gemini vs rule-based
- [ ] Run multilingual benchmark: accuracy per language
- [ ] Generate results: accuracy table, confusion matrix, latency chart, learning curve

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
- [ ] Router connects intent classifier + RAG → correct agent with context
- [ ] Run benchmark: multi-agent vs single-agent response quality

### Phase 6 — Chat Integration
- [ ] Connect chat UI to backend
- [ ] User message → intent classifier → RAG → agent → response
- [ ] Chat history stored in PostgreSQL
- [ ] Show which agent handled the query (for demo)
- [ ] Support Hindi/Telugu input in chat

### Phase 7 — Voice Interaction (Multimodal)
- [ ] Web Speech API for speech-to-text
- [ ] Route transcribed text through same intent → RAG → agent pipeline
- [ ] Text-to-speech for agent responses
- [ ] Voice UI with mic button and status indicators
- [ ] Run benchmark: text vs voice-transcribed intent accuracy

### Phase 8 — Email Support
- [ ] Email form sends to backend
- [ ] Email agent generates formal response
- [ ] Nodemailer integration
- [ ] Email history tracking

### Phase 9 — Polish & Demo
- [ ] Loading states and error handling
- [ ] Demo flow: show intent classification + RAG + agent routing in action
- [ ] Show all benchmark results in presentation
- [ ] Prepare evaluation slides with tables and charts

## Time Priority

| Priority | Phase | Why |
|---|---|---|
| **Critical** | Phase 3 (Intent Classification) | Research core — benchmarks needed for score |
| **Critical** | Phase 4 (RAG) | Second research component + better agent responses |
| **Critical** | Phase 5-6 (Agents + Chat) | Working demo is essential |
| **High** | Phase 2 (Backend + DB) | Needed for everything to connect |
| **Medium** | Phase 7 (Voice) | Multimodal bonus marks |
| **Medium** | Phase 8 (Email) | Shows multi-channel capability |
| **Low** | Phase 9 (Polish) | Only after everything works |

## What NOT to waste time on

- Payment integration or order management
- Complex user authentication
- Training models from scratch — fine-tuning is the entire research story
- Fancy animations or over-designed UI
- Deploying to cloud — local demo is fine
- More than 3 languages — English + Hindi + Telugu is sufficient for bonus
- Emotion/sentiment detection — not needed, adds complexity without payoff

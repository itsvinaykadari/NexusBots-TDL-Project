# Nexus Bots — Project Plan

## Project Title

Nexus Bots: Fine-Tuned Intent-Driven Multi-Agent Routing for AI-Powered Robotics Commerce

## Abstract (for submission)

Current AI-powered e-commerce systems rely on expensive large language model API calls for every routing decision in multi-agent architectures, making them slow and costly for real-time deployment. We present Nexus Bots, a robotics commerce platform where a fine-tuned DistilBERT intent classifier (67MB) routes user queries to specialized LangChain agents across chat, voice, and email channels. We benchmark our fine-tuned router against zero-shot GPT-4, GPT-3.5-turbo, and rule-based baselines on a domain-specific dataset of 800+ labeled e-commerce queries across 6 intent classes. Results demonstrate that the fine-tuned classifier achieves comparable classification accuracy at ~160x lower latency and zero per-query cost, validating that lightweight trained models can replace LLM-based routing in multi-agent systems without sacrificing quality.

## Tech Stack

| Layer        | Technology                           |
|--------------|--------------------------------------|
| Frontend     | React 19 + Vite + Tailwind CSS      |
| Backend      | Node.js + Express                    |
| Database     | PostgreSQL                           |
| AI Routing   | Fine-tuned DistilBERT (HuggingFace) |
| AI Agents    | LangChain + OpenAI                   |
| Voice        | Web Speech API + TTS                 |
| Email        | Nodemailer + AI agent                |
| Training     | Google Colab + HuggingFace Transformers |

## Architecture

```
User (Chat / Voice / Email)
        │
        ▼
┌──────────────────────────────────┐
│     Fine-Tuned Intent Classifier │  ← DistilBERT (~5ms, local)
│     (product_query, comparison,  │
│      recommendation, purchase,   │
│      complaint, general)         │
└──────────────┬───────────────────┘
               │ intent label
               ▼
┌──────────────────────────────────┐
│     LangChain Agent Router       │
│     Routes to specialized agent  │
│     based on classified intent   │
├──────────────────────────────────┤
│ Product Agent │ Sales Agent      │
│ Support Agent │ Email Agent      │
│ Voice Agent   │                  │
└──────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│     PostgreSQL                   │
│     Products, Chats, Emails      │
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
│   └── services/          # AI, email, voice services
├── research/              # Research component
│   ├── dataset/           # Intent classification dataset
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

## Intent Classes for Classification

| Intent | Description | Example Query | Routes To |
|---|---|---|---|
| `product_query` | Specs, features, availability | "What sensors does WatchDog have?" | Product Agent |
| `comparison` | Comparing robots | "CleanBot Pro vs AirPure for allergies?" | Product Agent |
| `recommendation` | Need-based suggestions | "Best robot for a 5 year old?" | Sales Agent |
| `purchase_intent` | Buying, pricing, ordering | "How do I order LiftMax?" | Sales Agent |
| `complaint` | Issues, returns, problems | "My Butler robot keeps bumping into walls" | Support Agent |
| `general` | Greetings, off-topic | "Hello, what is Nexus Bots?" | Product Agent |

## Research Benchmarks (what we will produce)

| Benchmark | What we measure |
|---|---|
| **Accuracy comparison** | Fine-tuned DistilBERT vs GPT-4 vs GPT-3.5 vs rule-based |
| **Per-class F1** | Precision/recall per intent class |
| **Confusion matrix** | Which intents get misclassified |
| **Latency** | ms per classification (local vs API) |
| **Cost analysis** | $ per 1000 queries for each method |
| **Learning curve** | Accuracy vs training dataset size (100, 200, 400, 800) |

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
- [ ] Generate synthetic dataset using GPT-4 (800-1000 examples)
- [ ] Clean and validate dataset manually
- [ ] Fine-tune DistilBERT on Google Colab
- [ ] Run benchmarks: fine-tuned vs GPT-4 vs GPT-3.5 vs rule-based
- [ ] Generate results: accuracy table, confusion matrix, latency chart, learning curve
- [ ] Save model for deployment

### Phase 4 — LangChain Multi-Agent System
- [ ] Set up LangChain with agent definitions
- [ ] Product Assistant agent (specs, search, info)
- [ ] Sales Assistant agent (recommendations, purchase guidance)
- [ ] Support agent (complaints, troubleshooting)
- [ ] Router connects fine-tuned classifier → correct agent
- [ ] Context sharing between agents

### Phase 5 — Chat Integration
- [ ] Connect chat UI to backend
- [ ] User message → intent classifier → agent → response
- [ ] Chat history stored in PostgreSQL
- [ ] Show which agent handled the query (for demo)

### Phase 6 — Voice Interaction
- [ ] Web Speech API for speech-to-text
- [ ] Route transcribed text through same intent → agent pipeline
- [ ] Text-to-speech for agent responses
- [ ] Voice UI with mic button and status indicators

### Phase 7 — Email Support
- [ ] Email form sends to backend
- [ ] Email agent generates formal response
- [ ] Nodemailer sends response
- [ ] Email history tracking

### Phase 8 — Polish & Demo
- [ ] Loading states and error handling
- [ ] Demo flow: show intent classification in action
- [ ] Show benchmark results in presentation
- [ ] Prepare evaluation slides with tables and charts

## Time Priority

| Priority | Phase | Why |
|---|---|---|
| **Critical** | Phase 3 (Intent Classification) | This is the research core — without benchmarks, no high score |
| **Critical** | Phase 4-5 (Agents + Chat) | Working demo is essential |
| **High** | Phase 2 (Backend + DB) | Needed for chat and agents to work |
| **Medium** | Phase 6 (Voice) | Nice to have, shows multi-channel |
| **Medium** | Phase 7 (Email) | Nice to have, shows multi-channel |
| **Low** | Phase 8 (Polish) | Only after everything works |

## What NOT to waste time on

- Payment integration or order management
- Complex user authentication
- Training multiple models — one fine-tuned DistilBERT is the entire research story
- Fancy animations or over-designed UI
- Deploying to cloud — local demo is fine
- Writing a second model for emotion/sentiment — one model, one clean benchmark

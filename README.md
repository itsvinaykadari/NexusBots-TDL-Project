# Nexus Bots — Fine-Tuned Intent Routing and RAG-Based Retrieval for Multilingual Multi-Agent Robotics Commerce

> Course Project — Topics in Deep Learning (CS6420), IIT Hyderabad

## Abstract

Multi-agent AI systems in e-commerce typically rely on large language model API calls for both intent routing and context retrieval, which can be slow and costly for real-time use. We present Nexus Bots, a robotics commerce platform that combines a fine-tuned DistilBERT intent classifier for agent routing with retrieval-augmented generation (RAG) using sentence-transformer embeddings for product-aware responses. The system routes user queries across chat, voice, and email channels to specialized LangChain agents including product assistant, sales, and support agents, while RAG retrieves relevant product context from a catalog of 22 robots across 6 categories. We fine-tune DistilBERT on a domain-specific dataset of labeled e-commerce queries across 6 intent classes and benchmark it against zero-shot GPT, Gemini, and rule-based keyword matching on accuracy, F1, latency, and cost. We also compare RAG retrieval approaches (sentence-transformers vs TF-IDF vs BM25) on recall and relevance. Additionally, we evaluate whether routing to specialized agents produces better responses than a single monolithic chatbot. As a case study, we test multilingual intent classification on English, Hindi, and Telugu queries, and compare intent accuracy across text and voice input modalities.

## Architecture

```
User (Chat / Voice / Email)  — English, Hindi, Telugu
        │
        ├── [Voice] → Web Speech API → text
        │
        ▼
┌──────────────────────────────────┐
│  Fine-Tuned DistilBERT Classifier│  ← ~5ms, runs locally
│  (6 intent classes)              │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  RAG: Sentence-Transformers      │  ← FAISS top-3 retrieval
│  + FAISS Product Index           │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  LangChain Multi-Agent Router    │
├──────────┬───────────┬───────────┤
│ Product  │ Sales     │ Support   │
│ Agent    │ Agent     │ Agent     │
└──────────┴───────────┴───────────┘
               │
               ▼
┌──────────────────────────────────┐
│  PostgreSQL                      │
│  Products, Chats, Emails         │
└──────────────────────────────────┘
```

## Research Benchmarks

| # | Experiment | What we compare |
|---|---|---|
| 1 | Intent Classification | Fine-tuned DistilBERT vs GPT vs Gemini vs rule-based |
| 2 | Product Retrieval | Sentence-transformers vs TF-IDF vs BM25 |
| 3 | Agent Quality | Multi-agent (routed) vs single-agent (monolithic) |
| 4 | Multilingual (bonus) | English vs Hindi vs Telugu intent accuracy |
| 5 | Multimodal (bonus) | Text vs voice-transcribed intent accuracy |

## Product Catalog

22 robots across 6 categories, each with a distinct competitive advantage:

| Category | Robots | Specializations |
|---|---|---|
| **Household** | HomeHub, Butler, Chef Mini, PetPal | Smart control, heavy carrier, precision cooking, pet monitoring |
| **Home Cleaner** | CleanBot Pro, WindowWiz, PoolDive, AirPure | Strongest suction, glass cleaning, underwater, mobile purifier |
| **Child** | Buddy, CodePal, Tutor | Toddler-safe play, learn coding, AI homework help |
| **Educational** | BuildKit, ROS Lab, CompeteBot, SimBot | School lab kit, university research, competitions, digital twin |
| **Security** | WatchDog, EyeNet, SkyGuard | Outdoor patrol, indoor multi-hazard, aerial drone response |
| **Industrial** | LiftMax, ArmX6, SortFlow, InspectEye | 500kg payload, 0.02mm precision, 3000/hr sorting, AI quality control |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| AI Routing | Fine-tuned DistilBERT (HuggingFace) |
| AI Retrieval | Sentence-transformers + FAISS |
| AI Agents | LangChain + OpenAI |
| Voice | Web Speech API + TTS |
| Email | Nodemailer + AI agent |

## Project Structure

```
nexus-bots/
├── client/                # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # Navbar, Footer, RobotCard, HeroSection
│   │   ├── pages/         # Home, Catalog, RobotDetail, Chat, Voice, Support
│   │   ├── data/          # robots.js — 22 robot products
│   │   └── ...
├── server/                # Node.js backend
├── research/              # Intent classification + RAG training & benchmarks
│   ├── dataset/           # Labeled intent dataset (EN + HI + TE)
│   ├── notebooks/         # Colab training notebooks
│   ├── models/            # Saved fine-tuned model
│   └── results/           # Benchmark tables and charts
├── database/              # PostgreSQL scripts
├── Idea.md
├── PLAN.md
└── README.md
```

## Getting Started

```bash
git clone <repo-url>
cd "Nexus Bots TDL Project"

cd client
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Pages

- **Home** (`/`) — Hero section, top-rated robots, AI feature highlights, stats
- **Catalog** (`/catalog`) — Full robot grid with search, category filter, and sorting
- **Robot Detail** (`/robot/:id`) — Specs, description, highlight badge, related robots
- **Chat** (`/chat`) — AI chatbot with intent-classified routing (EN/HI/TE)
- **Voice** (`/voice`) — Voice interaction with speech-to-text and TTS
- **Support** (`/support`) — Email support form with AI-generated responses

## Build Status

- [x] Phase 1 — UI Foundation
- [ ] Phase 2 — Backend + Database
- [ ] Phase 3 — Intent Classification + Multilingual Benchmarks
- [ ] Phase 4 — RAG Pipeline + Retrieval Benchmarks
- [ ] Phase 5 — LangChain Multi-Agent System
- [ ] Phase 6 — Chat Integration
- [ ] Phase 7 — Voice Interaction (Multimodal)
- [ ] Phase 8 — Email Support
- [ ] Phase 9 — Polish & Demo

## Team

Digvijaysing Rajput (CS24MTECH14020), Vinay Kadari (CS24MTECH14008)

## License

Academic project — IIT Hyderabad, M.Tech, CS6420 Topics in Deep Learning.

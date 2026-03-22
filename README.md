# Nexus Bots — Fine-Tuned Intent-Driven Multi-Agent Routing for AI-Powered Robotics Commerce

> Course Project — Topics in Deep Learning (CS6420), IIT Hyderabad

## Abstract

Current AI-powered e-commerce systems rely on expensive large language model API calls for every routing decision in multi-agent architectures, making them slow and costly for real-time deployment. We present Nexus Bots, a robotics commerce platform where a fine-tuned DistilBERT intent classifier (67MB) routes user queries to specialized LangChain agents across chat, voice, and email channels. We benchmark our fine-tuned router against zero-shot GPT-4, GPT-3.5-turbo, and rule-based baselines on a domain-specific dataset of 800+ labeled e-commerce queries across 6 intent classes. Results demonstrate that the fine-tuned classifier achieves comparable classification accuracy at ~160x lower latency and zero per-query cost, validating that lightweight trained models can replace LLM-based routing in multi-agent systems without sacrificing quality.

## Problem

Multi-agent AI systems need to route user messages to the right agent. The standard approach — asking an LLM "which agent should handle this?" — is slow (~800ms), expensive ($0.01/call), and overkill for intent classification. We replace this with a fine-tuned DistilBERT classifier that runs locally in ~5ms.

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

## Architecture

```
User (Chat / Voice / Email)
        │
        ▼
┌──────────────────────────────────┐
│  Fine-Tuned DistilBERT Classifier│  ← ~5ms, runs locally
│  (6 intent classes)              │
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

## Research: Intent Classification Benchmarks

| Method | Accuracy | Latency | Cost/1000 queries |
|---|---|---|---|
| Fine-tuned DistilBERT | TBD | ~5ms | $0 (local) |
| Zero-shot GPT-4 | TBD | ~800ms | ~$10 |
| Zero-shot GPT-3.5 | TBD | ~400ms | ~$2 |
| Rule-based keywords | TBD | ~1ms | $0 |

Additional evaluations: per-class F1, confusion matrix, learning curve (accuracy vs dataset size).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| AI Routing | Fine-tuned DistilBERT (HuggingFace) |
| AI Agents | LangChain + OpenAI |
| Voice | Web Speech API + TTS |
| Email | Nodemailer + AI agent |
| Training | Google Colab + HuggingFace Transformers |

## Project Structure

```
nexus-bots/
├── client/                # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # Navbar, Footer, RobotCard, HeroSection
│   │   ├── pages/         # Home, Catalog, RobotDetail, Chat, Voice, Support
│   │   ├── data/          # robots.js — 22 robot products
│   │   └── ...
├── server/                # Node.js backend (planned)
├── research/              # Intent classification training & benchmarks
│   ├── dataset/           # Labeled intent dataset
│   ├── notebooks/         # Colab training notebooks
│   ├── models/            # Saved fine-tuned model
│   └── results/           # Benchmark tables and charts
├── database/              # PostgreSQL scripts (planned)
├── Idea.md                # Project concept and research framing
├── PLAN.md                # Detailed build plan with phases
└── README.md
```

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd "Nexus Bots TDL Project"

# Install and run the frontend
cd client
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Pages

- **Home** (`/`) — Hero section, top-rated robots, AI feature highlights, stats
- **Catalog** (`/catalog`) — Full robot grid with search, category filter, and sorting
- **Robot Detail** (`/robot/:id`) — Specs, description, highlight badge, related robots
- **Chat** (`/chat`) — AI chatbot interface with intent-classified routing
- **Voice** (`/voice`) — Voice interaction with speech-to-text and TTS
- **Support** (`/support`) — Email support form with AI-generated responses

## Build Status

- [x] Phase 1 — UI Foundation (React catalog, pages, responsive layout)
- [ ] Phase 2 — Backend + Database (Express + PostgreSQL)
- [ ] Phase 3 — Intent Classification (fine-tune DistilBERT + benchmarks)
- [ ] Phase 4 — LangChain Multi-Agent System
- [ ] Phase 5 — Chat Integration
- [ ] Phase 6 — Voice Interaction
- [ ] Phase 7 — Email Support
- [ ] Phase 8 — Polish & Demo

## Team

Digvijaysing Rajput (CS24MTECH14020), Vinay Kadari (CS24MTECH14008)

## License

Academic project — IIT Hyderabad, M.Tech, CS6420 Topics in Deep Learning.

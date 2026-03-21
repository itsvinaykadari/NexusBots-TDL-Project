# NexusBots — AI-Powered Robotics Commerce Platform

A full-stack AI-powered robotics e-commerce platform where users can browse robots, get product recommendations, and interact with intelligent agents through chat, voice, and email.

> College project for Technology-Driven Living (TDL) — IITH M.Tech

## What is NexusBots?

NexusBots is not just a product showcase website. It's an AI-driven interactive system where a user can:

- Browse a catalog of 22 robots across 6 real-world categories
- Click any robot to see full specs, pricing, and related products
- Chat with an AI assistant for product questions and recommendations
- Use voice interaction for hands-free support
- Send email inquiries processed by an AI support agent

Behind the scenes, **LangChain** orchestrates multiple specialized AI agents (product assistant, sales, support, email, voice, router) that work together to provide a unified experience.

## Product Catalog

| Category | Robots | Specializations |
|---|---|---|
| **Household** | HomeHub, Butler, Chef Mini, PetPal | Smart control, heavy carrier, precision cooking, pet monitoring |
| **Home Cleaner** | CleanBot Pro, WindowWiz, PoolDive, AirPure | Strongest suction, glass cleaning, underwater, mobile air purifier |
| **Child** | Buddy, CodePal, Tutor | Toddler-safe play, learn coding, AI homework help |
| **Educational** | BuildKit, ROS Lab, CompeteBot, SimBot | School lab kit, university research, competitions, digital twin |
| **Security** | WatchDog, EyeNet, SkyGuard | Outdoor patrol, indoor multi-hazard, aerial drone response |
| **Industrial** | LiftMax, ArmX6, SortFlow, InspectEye | 500kg payload, 0.02mm precision, 3000/hr sorting, AI quality control |

Each robot has a distinct competitive advantage within its category — no two robots overlap in purpose.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express *(planned)* |
| Database | PostgreSQL *(planned)* |
| AI/Agents | LangChain + OpenAI *(planned)* |
| Voice | Web Speech API *(planned)* |
| Email | Nodemailer + AI agent *(planned)* |

## Project Structure

```
nexus-bots/
├── client/                # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/    # Navbar, Footer, RobotCard, HeroSection, FeaturedRobots
│   │   ├── pages/         # Home, Catalog, RobotDetail, Chat, Voice, Support
│   │   ├── data/          # robots.js — all 22 robot products
│   │   └── ...
│   └── index.html
├── server/                # Node.js backend (planned)
├── database/              # PostgreSQL scripts (planned)
├── Idea.md                # Original project concept
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
- **Chat** (`/chat`) — AI chatbot interface with quick suggestion buttons
- **Voice** (`/voice`) — Voice interaction with mic button and animated UI
- **Support** (`/support`) — Email support form with category selection

## Architecture

```
┌─────────────────────────────────────────────┐
│              Product Layer                   │
│   Catalog, Detail Pages, Search/Filter      │
├─────────────────────────────────────────────┤
│            Interaction Layer                 │
│     Chat  │  Voice  │  Email Support        │
├─────────────────────────────────────────────┤
│           Intelligence Layer                 │
│   LangChain Multi-Agent Orchestration       │
│   Router → Product / Sales / Support Agent  │
├─────────────────────────────────────────────┤
│              Data Layer                      │
│   PostgreSQL: Products, Chats, Emails       │
└─────────────────────────────────────────────┘
```

## Build Status

- [x] Phase 1 — UI Foundation (React catalog, pages, responsive layout)
- [ ] Phase 2 — Chat Interface (connect to backend)
- [ ] Phase 3 — Backend + Database (Express + PostgreSQL)
- [ ] Phase 4 — LangChain Multi-Agent System
- [ ] Phase 5 — Voice Interaction
- [ ] Phase 6 — Email Support
- [ ] Phase 7 — Polish & Demo

## License

Academic project — IITH M.Tech TDL Course.

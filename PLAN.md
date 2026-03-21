# Nexus Bots - Project Plan

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React + Vite + Tailwind CSS         |
| Backend     | Node.js + Express                   |
| Database    | PostgreSQL                          |
| AI/Agents   | LangChain (Python or JS) + OpenAI   |
| Voice       | Web Speech API + Whisper/TTS        |
| Email       | Nodemailer + AI agent               |

## Project Structure

```
nexus-bots/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page-level components
│   │   ├── data/        # Static robot product data (JSON)
│   │   ├── assets/      # Images, icons
│   │   ├── hooks/       # Custom React hooks
│   │   ├── context/     # React context providers
│   │   └── styles/      # Global styles
│   └── public/
├── server/              # Node.js backend
│   ├── routes/          # API routes
│   ├── controllers/     # Business logic
│   ├── models/          # DB models
│   ├── agents/          # LangChain agent definitions
│   ├── services/        # AI, email, voice services
│   └── config/          # DB and app config
├── database/            # SQL scripts, seeds
├── Idea.md
└── PLAN.md
```

## Architecture (4 Layers)

1. **Product Layer** - Robot catalog, detail pages, search/filter
2. **Interaction Layer** - Chat widget, voice interface, email support panel
3. **Intelligence Layer** - LangChain multi-agent orchestration
4. **Data Layer** - PostgreSQL for products, interactions, chat history

## AI Agents (LangChain)

| Agent              | Role                                          |
|--------------------|-----------------------------------------------|
| Router Agent       | Classifies intent, routes to correct agent    |
| Product Assistant  | Answers product specs, comparisons, search    |
| Sales Assistant    | Recommends robots, upsells, guides purchase   |
| Support Agent      | Handles issues, troubleshooting, returns      |
| Email Agent        | Composes formal email responses               |
| Voice Agent        | Handles voice conversation flow               |

## Build Phases

### Phase 1 - UI Foundation (Done)
- [x] Project scaffolding (React + Vite + Tailwind)
- [x] Robot product data (22 robots across 6 categories)
- [x] Home page with hero section
- [x] Product catalog grid with robot cards
- [x] Product detail page with specs and related robots
- [x] Search, category filter, and sorting
- [x] Responsive layout
- [x] Navigation bar and footer
- [x] Chat, Voice, Support page UIs (placeholder responses)

### Phase 2 - Chat Interface
- [ ] Chat widget component (floating button + panel)
- [ ] Chat message UI (user/bot bubbles)
- [ ] Connect to backend chat API
- [ ] Basic chatbot responses (product queries)

### Phase 3 - Backend + Database
- [ ] Express server setup
- [ ] PostgreSQL schema (products, users, chats, emails)
- [ ] Product CRUD APIs
- [ ] Chat session APIs
- [ ] Seed database with robot data

### Phase 4 - LangChain Multi-Agent System
- [ ] LangChain setup with router agent
- [ ] Product assistant agent
- [ ] Sales assistant agent
- [ ] Support agent
- [ ] Agent coordination and context sharing

### Phase 5 - Voice Interaction
- [ ] Voice input via Web Speech API
- [ ] Speech-to-text processing
- [ ] AI response generation
- [ ] Text-to-speech output
- [ ] Voice UI panel in frontend

### Phase 6 - Email Support
- [ ] Email support form in UI
- [ ] Email agent for response generation
- [ ] Nodemailer integration
- [ ] Email history tracking

### Phase 7 - Polish & Demo
- [ ] Unified interaction flow
- [ ] Loading states and error handling
- [ ] Demo walkthrough preparation
- [ ] Final UI polish

## Robot Product Categories (6 categories, 3-4 each = 22 robots)

1. **Household** (4) — HomeHub (smart control), Butler (heavy carrier), Chef Mini (cooking), PetPal (pet care)
2. **Home Cleaner** (4) — CleanBot Pro (strongest suction), WindowWiz (glass specialist), PoolDive (underwater), AirPure (mobile purifier)
3. **Child** (3) — Buddy (toddler-safe play), CodePal (learn coding), Tutor (AI homework help)
4. **Educational** (4) — BuildKit (modular school kit), ROS Lab (university research), CompeteBot (competitions), SimBot (digital twin)
5. **Security** (3) — WatchDog (outdoor patrol), EyeNet (indoor multi-hazard), SkyGuard (aerial drone response)
6. **Industrial** (4) — LiftMax (500kg payload), ArmX6 (0.02mm precision), SortFlow (3000/hr speed), InspectEye (AI defect detection)

Each robot within a category has a distinct competitive advantage (highlight field) so they don't overlap.

# NexusBots — Frontend (Client)

React frontend for the NexusBots AI-powered robotics commerce platform.

## Stack

- **React 19** — UI framework
- **Vite** — Build tool with HMR
- **Tailwind CSS v4** — Utility-first styling (via `@tailwindcss/vite`)
- **React Router v7** — Client-side routing
- **Lucide React** — Icon library

## Setup

```bash
npm install
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build to dist/
npm run preview   # Preview production build
```

## Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | Home | Hero, featured robots, AI features, stats |
| `/catalog` | Catalog | Full grid with search, category filter, sort |
| `/robot/:id` | RobotDetail | Specs, highlight badge, related robots, actions |
| `/chat` | Chat | AI chatbot with message bubbles and suggestions |
| `/voice` | Voice | Voice interaction with mic UI (placeholder) |
| `/support` | Support | Email support form with categories |

## Components

| Component | Purpose |
|---|---|
| `Navbar` | Sticky nav with links, cart icon, mobile menu button |
| `Footer` | Site footer with product/service/company links |
| `HeroSection` | Landing hero with gradient effects and CTA buttons |
| `FeaturedRobots` | Top-rated robots grid (auto-filtered by rating) |
| `RobotCard` | Product card with image, price, rating, highlight badge |

## Data

Robot product data lives in `src/data/robots.js` — 22 robots across 6 categories. Each robot has:

- `id`, `name`, `category`, `price`, `image`
- `shortDesc` — one-liner for cards
- `description` — full detail text
- `specs` — key-value technical specifications
- `highlight` — unique competitive advantage badge (e.g. "Heaviest Payload")
- `tags`, `rating`, `inStock`

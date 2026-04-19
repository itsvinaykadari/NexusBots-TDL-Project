# Nexus Bots — Frontend (Client)

React frontend for the Nexus Bots AI-powered robotics commerce platform.

## Stack

- **React 19** — UI framework
- **Vite** — Build tool with HMR
- **Tailwind CSS v4** — Utility-first styling (via `@tailwindcss/vite`)
- **React Router v7** — Client-side routing
- **Floating UI** — Element-anchored tooltip positioning for UI guidance
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
| `/` | Home | Hero, category cards, flagship robots |
| `/catalog/kitchen` | Catalog (Kitchen) | 3 kitchen robots with editorial content |
| `/catalog/home-cleaner` | Catalog (Home Cleaner) | 3 home cleaner robots |
| `/catalog/drone` | Catalog (Drone) | 3 drone robots |
| `/catalog/humanoid` | Catalog (Humanoid) | 3 humanoid / STEM robots |
| `/robot/:id` | RobotDetail | Full specs, highlight badge, add-to-cart |
| `/orders` | OrderHistory | Order history + Support tab (tickets, complaints) |

Cart is a **side drawer** — not a page. Triggered by `navigate_to(page=cart)` from AI or clicking the cart icon.

## Components

| Component | Purpose |
|---|---|
| `Navbar` | Sticky nav with mega-menu (click-only), cart badge, "Ask AI" button |
| `Footer` | Site footer |
| `AISidePanel` | Slide-out AI chat panel. Text + voice input. Sends full page context. Triggers UI guide flows. |
| `CartDrawer` | 3-step checkout: cart → payment → success. Posts to `/api/orders`. |
| `RobotShowcard` | Product card with image, price, rating, highlight badge |

## Context

| Context | Purpose |
|---|---|
| `UserActivityContext` | Tracks currentPage, viewedProducts, cart, searchQuery, selectedCategory, currentProduct. Sent with every AI request. |

## UI Guidance System

Located in `src/ui-guide/`:

| File | Purpose |
|---|---|
| `UIGuideProvider.jsx` | Context provider. `startFlow(key)` triggers a multi-step element-anchored guide. |
| `flows.json` | 11 pre-defined flows: `check_orders`, `track_delivery`, `update_cart`, `find_kitchen`, `find_drone`, `find_home_cleaner`, `find_humanoid`, `compare_products`, `open_support`, `new_ticket`, `view_tickets` |
| `guide-pulse.css` | CSS pulse + glow animation for highlighted elements |

The AI model emits a `ui_guide` key (e.g., `"find_drone"`) which `AISidePanel` passes to `UIGuideProvider.startFlow()`. The guide then element-anchors a Floating UI tooltip onto the relevant DOM element and auto-navigates across pages if needed.

## Voice Input

Voice is handled by the **Web Speech API** (browser STT, Chrome recommended). The transcribed text is sent as a regular message. For Hindi and Telugu, SARVAM STT (backend) normalizes to romanized Latin text before the AI model processes it.

## Data

Robot product data is seeded into SQLite from `server/database/init.js`. The frontend fetches from `/api/products`. There are exactly **12 robots across 4 categories**:

| Category | IDs | Products |
|---|---|---|
| Kitchen | 1–3 | Amazon Astro, Samsung Ballie, Enabot EBO X |
| Home Cleaner | 4–6 | iRobot Roomba j9+, Roborock S8 MaxV Ultra, Ecovacs WINBOT W2 Omni |
| Drone | 7–9 | Ring Always Home Cam, DJI Matrice 30T, Aiper Surfer S1 |
| Humanoid | 10–12 | Miko 3, Wonder Workshop Dash, LEGO Education Spike Prime |

# Remaining Tasks — Vinay Kadari (CS24MTECH14008)

> **Last updated:** 2026-04-18
> **Project:** Nexus Bots — CS6420 Topics in Deep Learning, IIT Hyderabad
> **Current state:** Phase 1 (UI), Phase 2 (Backend), Phase 3 (Model integration) are done. The base Qwen3.5-0.8B model is running. Sarvam AI is connected. All 11 UI guidance flows work.

---

## How to Run the Project

```bash
# Terminal 1 — Server
cd server
npm install
# Make sure .env has SARVAM_API_KEY and ENABLE_FC_MODEL=1
node index.js

# Terminal 2 — Client
cd client
npm install
npm run dev
# Open http://localhost:5173
```

The AI model loads on first chat request (~30s cold start, then instant).

---

## PRIORITY 1 — Known Bugs (Fix These First)

### BUG-1: UI Guide Highlight Does Not Track on Scroll

**What happens:** When the AI guides the user to a button (e.g., "Go to Orders"), driver.js highlights it. But if the user scrolls, the highlight overlay stays in its original position on screen — it does NOT move with the button. The button scrolls away but the spotlight/popover stays floating where it was.

**Where:**
- `client/src/ui-guide/UIGuideProvider.jsx` lines 70–102 — the `driver()` config has no scroll repositioning
- `client/src/ui-guide/guide-pulse.css` — `position: relative` on `.guide-pulse` doesn't help
- driver.js `highlight()` calculates position once and doesn't update

**What to fix:**
- Add a scroll event listener that calls `drv.refresh()` or re-calls `drv.highlight()` on scroll
- OR use driver.js `steps` mode with `onHighlightStarted` callback to re-anchor
- Test by: triggering "find kitchen robots" in AI chat, then scrolling the page while the highlight is active

### BUG-2: UI Guide Uses Hover Zoom Instead of Toggle/Blink

**What happens:** The guide-pulse CSS animation applies a `box-shadow` pulse effect, but on some elements the visual result looks like a hover zoom rather than a color-shift/blinking toggle. The intended behavior is a clear pulsing glow around the target button that is obvious to the user.

**Where:**
- `client/src/ui-guide/guide-pulse.css` — the entire file (21 lines)
- The `z-index: 9999` and `position: relative` may conflict with card hover transforms already on catalog cards

**What to fix:**
- Make the pulse more visually distinct — consider adding `outline-color` animation or a background color flash
- Remove `position: relative` from `.guide-pulse` (it breaks stacking context)
- Add `pointer-events: none` to the overlay so the user can still click through
- Test on: catalog category pills, navbar links, add-to-cart button, cart checkout button

### BUG-3: Markdown Not Rendered in AI Chat

**What happens:** When the AI sends back a response with markdown (bold text, bullet lists, code blocks, headers), it shows as raw text. For example `**Kitchen Robots**` shows literally as `**Kitchen Robots**` instead of **Kitchen Robots**.

**Where:**
- `client/src/components/AISidePanel.jsx` line 402 — `<p>{msg.content}</p>` renders plain text
- `client/package.json` — no markdown library installed

**What to fix:**
1. Install react-markdown: `cd client && npm install react-markdown`
2. In AISidePanel.jsx, replace `<p>{msg.content}</p>` with:
   ```jsx
   import ReactMarkdown from 'react-markdown';
   // ...
   <div className="prose prose-invert prose-sm max-w-none">
     <ReactMarkdown>{msg.content}</ReactMarkdown>
   </div>
   ```
3. Add basic prose styling so lists, bold, headers look good in the dark chat bubble

---

## PRIORITY 2 — Missing Features

### FEAT-1: Model Source / RAG Status Indicator

**What:** Users and developers have no way to know which AI approach was used for a response — was it the Qwen3.5-0.8B model or the heuristic fallback? Was semantic RAG active?

**Where:**
- `server/routes/ai.js` line 420 — response JSON is missing `toolSource` and `ragEnabled` fields (pipeline.py returns them but ai.js doesn't forward them)
- `client/src/components/AISidePanel.jsx` lines 155–178 — not capturing these fields
- Lines 405–420 — no badge/indicator in the chat UI

**What to fix:**
1. In `server/routes/ai.js`, add to the response JSON:
   ```js
   toolSource: pipelineResult?.toolSource || 'unknown',
   ragEnabled: pipelineResult?.ragEnabled || false,
   ```
2. In AISidePanel.jsx, capture these fields in the message object and show small badges:
   - "Model" (green) or "Heuristic" (yellow) badge
   - "RAG" badge when ragEnabled is true
3. This helps debugging and makes the demo more impressive

### FEAT-2: Clear Chat / Reset Button

**What:** There is no way to clear the AI chat history. Users must close and reopen the panel.

**Where:** `client/src/components/AISidePanel.jsx` — no reset action exists

**What to fix:** Add a small trash/reset icon button in the chat header that clears `aiMessages` state and shows the welcome screen again.

### FEAT-3: Server Warnings Display

**What:** The server sends back a `warnings` array (e.g., pipeline errors, Sarvam fallback messages), but the frontend ignores them completely.

**Where:**
- `server/routes/ai.js` line 431 returns `warnings: [...]`
- `client/src/components/AISidePanel.jsx` — doesn't read `data.warnings`

**What to fix:** If `warnings` array is non-empty, show a small yellow banner or inline note below the bot message so users know if something partially failed.

---

## PRIORITY 3 — Fine-Tuning & Benchmarks (Main Research Task)

### TASK-1: Fine-Tune Qwen3.5-0.8B

**What:** The model is currently running as base (unfinetuned). It works for basic English queries but struggles with Hindi/Telugu function calling. Fine-tuning will make it accurate.

**Where:** Everything is in the `finetune/` directory:
- `config.py` — hyperparameters (already set: Qwen3.5-0.8B, QLoRA r=16, α=32, lr=2e-4, 3 epochs)
- `train.py` — training script (Unsloth + QLoRA)
- `qwen35_finetune.ipynb` — Colab notebook (same as train.py)
- `data/train.jsonl` — 900 training examples
- `data/test.jsonl` — 100 test examples

**Steps:**
1. Open `qwen35_finetune.ipynb` in Google Colab (free T4 GPU)
2. Run all cells — it will fine-tune for ~4 hours
3. Download the LoRA adapter weights
4. Place adapter in `models/nexus-fc-qwen35-0.8b/` directory
5. Update `server/.env`: set `FC_MODEL_PATH=../models/nexus-fc-qwen35-0.8b`
6. The server will auto-load the fine-tuned adapter instead of base model

### TASK-2: Run Benchmarks

**What:** Fill the benchmark tables in README.md with real numbers.

**Where:**
- `finetune/eval/bench_function_calling.py` — B1 (tool accuracy) + B4 (multilingual accuracy)
- `finetune/eval/bench_rag.py` — B2 (RAG re-ranking vs static)

**Steps:**
1. After fine-tuning, run: `cd finetune && python eval/bench_function_calling.py`
2. Run: `python eval/bench_rag.py`
3. Update README.md benchmark tables with the numbers

### TASK-3: Demo Video + Slides

**What:** Record a 5-minute demo video showing all features working. Create slides for the TDL presentation.

---

## PRIORITY 4 — Code Quality & Security

### SEC-1: .env Not in .gitignore

**What:** The `.gitignore` file does NOT exclude `.env`. This means the Sarvam API key (`sk_9fit56rk_...`) will be committed to git.

**What to fix:** Add to root `.gitignore`:
```
.env
.env.local
.env.*.local
```

### SEC-2: Callback Tickets Endpoint Leaks All Users' Data

**What:** `GET /api/chats/support/callbacks` returns ALL support tickets from ALL users, not filtered by user.

**Where:** `server/routes/chats.js` line 84

**What to fix:** Add a user ID filter to the query. The client sends the user ID but the server ignores it.

### SEC-3: Payment Form Validation

**What:** The checkout form accepts any input for card number, expiry, CVV. No format checking at all.

**Where:** `client/src/components/CartDrawer.jsx` lines 49–56

**What to fix:**
- Card number: check 16 digits
- Expiry: check MM/YY format and not expired
- CVV: check 3–4 digits
- Email: add regex validation
- Note: No real payment processing needed (it's a demo), but basic format validation looks professional

### QA-1: Product Data Inconsistency

**What:** Client and server have different product images:
- Client (`client/src/data/robots.js`) uses real manufacturer images
- Server (`server/database/init.js`) uses generic Unsplash placeholder URLs

**What to fix:** Update the server seed data to match client's image URLs, or ensure the client always uses its own local data for images.

### QA-2: No Test Infrastructure

**What:** Zero test files exist. No test framework is set up.

**What to fix (if time allows):**
1. Server: `npm install --save-dev vitest` and add basic API endpoint tests
2. Client: Vitest + React Testing Library for component tests
3. At minimum: test the pipeline tool routing (search, compare, navigate, add_to_cart)

---

## PRIORITY 5 — Nice to Have (If Time Permits)

### UX-1: Error Messages Look Like Normal Chat

**What:** When the AI fails, the error message appears as a regular bot message. No visual distinction.

**Where:** `client/src/components/AISidePanel.jsx` lines 180–189

**What to fix:** Add a red/orange border or error icon to error messages so users know something went wrong.

### UX-2: No Delivery Tracking Timeline

**What:** Order history shows status text (Processing/Shipped/Delivered) but no visual timeline or progress steps.

**Where:** `client/src/pages/OrderHistory.jsx` — status is shown as a colored pill

**What to fix:** Add a simple 3-step progress indicator: Order Placed → Shipped → Delivered, with the current step highlighted.

### UX-3: Mobile AI Access

**What:** On mobile screens, there's no obvious way to open the AI chat panel. The "Ask AI" navbar link may be hidden in the hamburger menu.

**What to fix:** Add a floating action button (FAB) on mobile that opens the AI panel.

### UX-4: Escape Key to Close Panels

**What:** Cart drawer and AI panel don't close on Escape key press.

**What to fix:** Add `useEffect` with `keydown` listener for Escape in both CartDrawer and AISidePanel.

### UX-5: Accessibility Gaps

**What:** Some buttons lack `aria-label`, form inputs don't have linked `<label>` via `htmlFor`, no skip-to-content link.

**Where:** Navbar cart button, CartDrawer close button, various form fields.

---

## Quick Reference

| File | What It Does |
|------|-------------|
| `server/ai/pipeline.py` | Main AI routing — decides which tool to call |
| `server/ai/fc_model.py` | Qwen3.5-0.8B model inference (ChatML format) |
| `server/ai/sarvam_client.py` | Sarvam AI for natural language responses |
| `server/routes/ai.js` | Express route that runs pipeline + Sarvam |
| `client/src/components/AISidePanel.jsx` | The AI chat panel UI |
| `client/src/ui-guide/UIGuideProvider.jsx` | driver.js spotlight guidance system |
| `client/src/ui-guide/flows.json` | 11 flow definitions for UI guidance |
| `finetune/train.py` | Model fine-tuning script |
| `finetune/eval/bench_function_calling.py` | Benchmark B1 + B4 |
| `finetune/eval/bench_rag.py` | Benchmark B2 |

---

## Summary

| Priority | Count | Effort Estimate |
|----------|-------|-----------------|
| P1 — Bugs | 3 | ~3–4 hours |
| P2 — Missing Features | 3 | ~2–3 hours |
| P3 — Fine-Tune + Benchmarks | 3 | ~6–8 hours (Colab time) |
| P4 — Security & Quality | 5 | ~2–3 hours |
| P5 — Nice to Have | 5 | ~3–4 hours |

Start with P1 bugs (especially the markdown and guide tracking), then move to P3 fine-tuning since it takes the longest.

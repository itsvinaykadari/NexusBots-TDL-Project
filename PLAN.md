# Nexus Bots — 24-Hour Execution Plan (v2, LLM-Executable)

> **Date:** 2026-04-17 | **Deadline:** +24h | **Team:** Digvijaysing Rajput (CS24MTECH14020), Vinay Kadari (CS24MTECH14008)
> This plan supersedes all prior versions. Each task is written as a direct prompt for an LLM-assisted build.

---

## Locked Decisions (no further debate)

| Area | Choice | Reason |
|---|---|---|
| Base model | **Qwen3.5-0.8B** | Released 2026-03-02. 119 languages incl. HI/TE. Unsloth-supported. |
| Fine-tune method | **Unsloth + QLoRA**, r=16, alpha=32, lr=2e-4, 3 epochs | Free Colab T4 fits in 4 hrs |
| UI direction | **Vercel / Linear / Apple-grade**, rebuild in place | 12 premium products need editorial treatment, not Amazon grid |
| UI guidance lib | **driver.js** (MIT, 5 KB) + CSS `@keyframes` pulse | Zero-JS animation, LLM emits intent key only |
| Orchestration | Direct Python dispatch (no LangChain) | 6 fixed tools — LangChain adds latency, no upside |
| Voice | **STT only** via Web Speech API | TTS skipped for demo |
| Model plan cuts | No SmolLM, no Qwen2 ablation, no trained proficiency classifier | Ship one model well |

---

## Novelty (final, what we actually defend)

1. **Domain-fine-tuned 0.8B model matches frontier LLMs** on robotics function-calling (B1)
2. **Activity-aware re-ranking** boosts retrieval relevance over stateless semantic search (B2)
3. **Multilingual function calling** (EN/HI/TE) on a small model (B4)
4. **Persona-adaptive generation** from auto-detected proficiency
5. **LLM-driven UI guidance** — bot converts intent into on-screen step-by-step highlights

(Dual-path fallback, no-LangChain, heuristic baseline → moved to "System Design," not novelty.)

---

## Verified Baseline (already done — do not rebuild)

- ✅ Express + SQLite backend, 12 robots / 4 categories (Kitchen, Home Cleaner, Drone, Humanoid)
- ✅ React 19 + Vite + Tailwind scaffold with 4 pages (Home, Catalog, RobotDetail, OrderHistory) + active components
- ✅ `UserActivityContext` tracks page, viewed, cart, search, category, currentProduct
- ✅ `pipeline.py` — 6 tools, dual-path decider, FAISS+context re-rank, PipelineRuntime singleton, worker mode
- ✅ `sarvam_client.py` — persona-adaptive, EN/HI/TE, fallback wired, worker mode
- ✅ 1000-row function-calling dataset (EN 500 / HI 250 / TE 250, beginner 500 / expert 500), all strict checks pass
- ✅ `AISidePanel` hits `/api/ai/chat` with full context, triggers UI guidance via `startFlow()`
- ✅ STT via Web Speech API
- ✅ Premium UI: ParticleNetwork hero, bento layouts, editorial category sections, mega-menu navbar
- ✅ UI Guidance system: driver.js + 11 flows + guide-pulse.css + UIGuideProvider with auto-navigation
- ✅ CartDrawer: 3-step flow (cart → payment → success), posts to `/api/orders`
- ✅ OrderHistory: merged Orders + Support tabs, inline support forms, ticket management
- ✅ `ai.js` PythonWorker: persistent subprocess reuse via JSON-line IPC, rate limiting, Chat.addMessage try/catch
- ✅ P2.2 correctness fixes: budget extraction, Hindi/Telugu tokens, category fallback
- ✅ P2.3 ui_guide emission: check_orders, update_cart, compare_products, find_{category}
- ✅ Orphaned files removed: ChatWidget, AIAssistant, SupportTickets, HeroSection, FeaturedRobots, RobotCard

---

## Missing (the 24-hour scope)

| # | Item | Phase | Status |
|---|---|---|---|
| M1 | Grand Vercel-grade UI redesign (Home, Catalog, RobotDetail) | **P1** | ✅ Complete |
| M2 | UI guidance system (driver.js + intent-keyed flows) | **P1** | ✅ Complete |
| M3 | Performance fixes: PipelineRuntime singleton, subprocess reuse | **P2** | ✅ Complete |
| M4 | Correctness fixes: `_extract_ids`, `_extract_budget`, `detect_proficiency` HI/TE, category fallback | **P2** | ✅ Complete |
| M4b | Model integration: fc_model.py (ChatML), base Qwen3.5-0.8B on GPU, Sarvam API connected, semantic RAG enabled | **P3** | ✅ Complete |
| M5 | Fine-tuned Qwen3.5-0.8B weights (LoRA adapter + merged) | **P3** | Pending |
| M6 | Benchmarks B1, B2, B4 filled with real numbers | **P3** | Pending |
| M7 | Demo video + slides + README refresh | **P4** | Pending |

---

## Parallelization Model

- **Operator 1 (O1):** Phase 3 fine-tune (long-pole Colab) → runs Phase 3 benchmarks when weights ready
- **Operator 2 (O2):** Phase 1 UI → Phase 2 backend fixes → Phase 4 demo artifacts
- Both converge at Hour 20 for integration + rehearsal

---

# Phase 1 — UI (Hours 0-10) · Operator 2

**Goal:** The frontend looks like a premium robot-selling corporation, not a CS project. 12 products presented as flagship launches, not SKUs. UI guidance on every cross-page flow.

## P1.1 — Design tokens + global polish (1h)
**Prompt:** In `client/src/styles/tokens.css` create a token system:
- Colors in `oklch()`: surface, surface-elevated, text, text-muted, accent (electric violet), accent-glow
- Fluid type: `--text-hero: clamp(3rem, 1rem + 7vw, 8rem)`, same pattern for body/heading
- Spacing: `--space-section: clamp(4rem, 3rem + 5vw, 10rem)`
- Duration + `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`
Update `client/src/index.css` to import tokens. Replace hardcoded colors in existing components.

## P1.2 — Home (hero + category showcase) (2h)
**Prompt:** Rebuild `client/src/pages/Home.jsx`:
- Full-bleed hero: massive type (`--text-hero`), tagline "Robotics, delivered.", CTA button, isometric product silhouette on right (use existing robot image with `mix-blend-mode`)
- Below: 4 category tiles in **bento layout** (1 large + 3 medium), each linking to `/catalog?category=<Name>`. Tile = category name, robot count, representative image, hover scale 1.02 + shadow lift
- Below: "Flagship" section — feature 1 robot from each category as editorial cards with large imagery
- Scroll-triggered reveal via `IntersectionObserver` + `opacity`/`translate-y`
No carousels, no uniform grids.

## P1.3 — Catalog (category → 3 robots) (2h)
**Prompt:** Rebuild `client/src/pages/Catalog.jsx`:
- Sticky category nav bar at top: 4 pill buttons (Kitchen, Home Cleaner, Drone, Humanoid) + "All". Active pill has accent background + glow. Clicking smooth-scrolls to that section.
- Below: one `<section>` per category. Section heading = large category name + 1-line description + robot count.
- 3 robots per category displayed as **bento** (1 tall hero card + 2 smaller), NOT a uniform 3-col grid. Each card: image, name, price, 1-line tagline, "View →" CTA.
- Hover: card lifts, image scales 1.05, CTA arrow translates right.
- `data-guide-id="catalog-filter-<Name>"` on each category pill. `data-guide-id="catalog-card-<id>"` on each card.

## P1.4 — RobotDetail (flagship product page) (2h)
**Prompt:** Rebuild `client/src/pages/RobotDetail.jsx` as a product-launch page:
- Hero: full-bleed image left 60% / spec summary right 40%. Massive name + price, short tagline, "Add to Cart" primary CTA.
- Specs section: 4-column bento of key specs (battery, payload, category, availability) with large numbers + small labels.
- "Inside the <RobotName>" — narrative section with 2-3 long-form paragraphs + detail shots.
- "Compare" band at bottom: 3 horizontal cards of other robots in same category with "Compare →" CTA.
- Sticky bottom bar on mobile with "Add to Cart" + price.
- `data-guide-id="product-add-to-cart"`, `data-guide-id="product-compare"`.

## P1.5 — Navbar, CartDrawer, OrderHistory polish (1h)
**Prompt:** Update `Navbar.jsx`:
- Translucent backdrop-blur on scroll, `data-guide-id="nav-home|catalog|assistant|cart|orders"` on each link.
- Cart indicator shows count as a small circle on cart icon.
Update `CartDrawer.jsx`:
- Slide-in from right, backdrop blur, item cards with image + quantity stepper.
- `data-guide-id="cart-checkout"` on checkout button.
Update `OrderHistory.jsx`:
- Card per order with status pill, items summary, `data-guide-id="order-track-<id>"` on track button.

## P1.6 — UI Guidance system (2h, highest-impact novelty)
**Prompt:** Create `client/src/ui-guide/`:
- `flows.json` — 8 pre-defined flows:
  ```json
  {
    "check_orders":    ["nav-orders"],
    "track_delivery":  ["nav-orders", "order-track-latest"],
    "update_cart":     ["nav-cart", "cart-checkout"],
    "find_drone":      ["nav-catalog", "catalog-filter-Drone"],
    "find_kitchen":    ["nav-catalog", "catalog-filter-Kitchen"],
    "find_home_cleaner":    ["nav-catalog", "catalog-filter-Home Cleaner"],
    "find_humanoid":   ["nav-catalog", "catalog-filter-Humanoid"],
    "compare_products":["nav-catalog", "product-compare"]
  }
  ```
- `UIGuideProvider.jsx` — React context exposing `startFlow(key)`. Uses `driver.js` for spotlight/tooltip + adds a `.guide-pulse` class to current target for CSS pulse animation.
- CSS `@keyframes pulse` on `box-shadow` + `transform: scale(1.05)`, 1.2s infinite, compositor-only.
- Auto-advance: when user clicks target or route changes to expected page, pop next step from flow.
- `guide-pulse.css` — single keyframe using accent glow.
- Install: `cd client && npm install driver.js`.
- Wire `UIGuideProvider` at `App.jsx` root, below `UserActivityProvider`.

---

# Phase 2 — Backend Polish (Hours 8-14) · Operator 2 (after P1)

**Goal:** Pipeline is correct, fast, and emits `ui_guide` intent keys. No new features — fix what exists.

## P2.1 — PipelineRuntime singleton + subprocess reuse (1h)
**Prompt:** In `server/ai/pipeline.py`:
- Move `PipelineRuntime()` to a module-level lazy singleton (`_RUNTIME` with `_get_runtime()`).
- Index FAISS + encode corpus **once** at first call, never again.
- In `server/routes/ai.js`: replace per-request `spawn('python3', ...)` with a long-lived Python worker (`python3 -m server.ai.worker`) that reads JSON requests from stdin and writes responses to stdout. Start worker on Express boot.
- Rationale comment on singleton: "FAISS + encoder load is ~3s, keep warm."

## P2.2 — Correctness fixes (1h)
**Prompt:** In `server/ai/pipeline.py`:
- `_extract_ids()`: only capture 1-12 when preceded by `#|id|product|robot|compare|vs` keyword. Regex: `/(?:#|id|product|robot|compare|vs)[^\w]{0,3}([1-9]|1[0-2])\b/i`.
- `_extract_budget()`: only accept numbers near `₹|rs|rupees|budget|under|below|k` and ≥ 500. Reject years (1900-2100) and 5-6 digit pincodes.
- `detect_proficiency()`: add HI technical tokens (`स्पेक`, `बैटरी`, `कीमत`) and TE (`స్పెక్`, `బ్యాటరీ`, `ధర`) alongside English. Gate token check by detected language.
- Default category fallback: return empty (search all) instead of `"Kitchen"` in `_heuristic_tool_call` and `_sanitize_tool_call`.

## P2.3 — UI guide intent emission (1h)
**Prompt:** In `pipeline.py`:
- Add a new output field `ui_guide` on the tool-call JSON. Valid values: same keys as `client/src/ui-guide/flows.json`.
- Heuristic mapping: if tool == `navigate_to` + page == `orders` → `ui_guide: "check_orders"`; page == `cart` → `update_cart`; tool == `compare_products` → `compare_products`; tool == `search_products` + category present → `find_<category>`.
- Add `ui_guide` to the system prompt for the fine-tuned model (Phase 3 dataset update — see P3.2).
- In `ChatWidget.jsx` + `AIAssistant.jsx`: when response has `ui_guide`, call `useUIGuide().startFlow(key)`.

## P2.4 — Operational hardening (1h)
**Prompt:**
- Add `express-rate-limit` to `/api/ai/chat` (10 req / min / IP).
- Wrap `Chat.addMessage` in try/catch, log error, don't block response.
- Drop redundant auth headers in `sarvam_client.py` — keep only `api-subscription-key`.
- Create `server/.env.example` listing: `SARVAM_API_KEY`, `ENABLE_FC_MODEL`, `ENABLE_SEMANTIC_RAG`, `FC_MODEL_PATH`, `PORT`.

## P2.5 — Smoke test (30 min)
**Prompt:** `curl` test 6 queries covering every tool + language. Verify `ui_guide` field appears on `navigate_to` + `compare_products`. Verify first request latency after warmup is under 1.5s.

## P2.6 — README doc-drift fix (30 min)
**Prompt:** Update `README.md`:
- "22 robots / 6 categories" → "12 robots / 4 categories"
- Remove `get_support` tool, confirm 6 tools
- Drop Support page references from nav
- Replace benchmark TBDs with placeholder rows (Phase 3 fills real numbers)

---

# Phase 3 — Fine-Tune + Benchmarks (Hours 0-22) · Operator 1 (parallel to P1/P2)

**Goal:** Qwen3.5-0.8B LoRA adapter with measurable gains on B1, B2, B4.

## P3.1 — Colab setup (30 min)
**Prompt:** Create `research/notebooks/qwen35_0_8b_finetune.ipynb`:
- Install: `unsloth==latest transformers datasets peft trl`
- Load base: `unsloth/Qwen3.5-0.8B` (or HF `Qwen/Qwen3.5-0.8B` if Unsloth mirror not yet ready)
- 4-bit QLoRA, target modules: `q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj`
- Upload `research/dataset/final/function_calling_v1.jsonl` to Drive, mount, load via `datasets.load_dataset('json', ...)`

## P3.2 — Dataset `ui_guide` augmentation (30 min, can do locally before Colab)
**Prompt:** In `research/dataset/scripts/add_ui_guide.js`:
- Read `final/function_calling_v1.jsonl`
- For each row, compute `ui_guide` by same heuristic as P2.3 (`navigate_to→page` mapping, `compare_products→compare_products`, `search_products→find_<category>`)
- Add `ui_guide` to `assistant` response JSON. Save as `final/function_calling_v2.jsonl`.
- Validate: every row has `ui_guide` ∈ the 8 defined keys OR `null`.

## P3.3 — Training (4h)
**Prompt:** In the Colab notebook:
- Chat template: Qwen3.5 default (`<|im_start|>system ... <|im_end|>`).
- System prompt: tool schema JSON + "respond only with a single JSON object with keys `tool`, `args`, `ui_guide`."
- Train: 3 epochs, batch 4, grad accum 4, lr 2e-4, warmup 0.03, LR scheduler cosine.
- Checkpoint every 200 steps to Drive.
- Save LoRA adapter + merged fp16 to `research/models/qwen35-0_8b-fc-v1/`.
- Push adapter to HF Hub as `nexus-bots/qwen35-0_8b-fc-v1`.

## P3.4 — Local integration smoke test (30 min)
**Prompt:** On local box (if GPU) or via HF Inference API:
- Set `ENABLE_FC_MODEL=1`, `FC_MODEL_ID=nexus-bots/qwen35-0_8b-fc-v1` in `server/.env`.
- Hit `/api/ai/chat` with 3 queries (EN, HI, TE). Confirm valid JSON tool call + `ui_guide` field.

## P3.5 — Benchmark harness (3h, parallel to P3.3)
**Prompt:** Create `research/eval/`:

- **`bench_function_calling.py`** (B1 + B4):
  - Hold-out: 100 rows stratified by `language × tool`, seed=42
  - Score: `tool_accuracy`, `arg_f1` (per-key exact match avg), `latency_ms`
  - Systems: (1) our fine-tuned Qwen3.5-0.8B local, (2) heuristic `_heuristic_tool_call`, (3) GPT-4o zero-shot, (4) Claude Opus 4.7 zero-shot, (5) Gemini 2.5 zero-shot
  - Output: `research/results/b1_function_calling.csv` + `.md` table. Separate slice per language for B4.

- **`bench_rag.py`** (B2):
  - 50 recommend queries with gold product IDs (hand-label from dataset)
  - Systems: (1) FAISS + context re-rank (ours), (2) FAISS only (disable re-rank), (3) BM25 via `rank_bm25`
  - Metrics: Recall@3, MRR
  - Output: `research/results/b2_rag.csv` + `.md`

- Skip B3 (proficiency) and B5 (persona LLM-judge) for 24h scope.

## P3.6 — Run benchmarks + fill tables (2h)
**Prompt:** Run all three scripts after P3.3 completes. Paste result tables into `README.md` at benchmark section. Commit results under `research/results/`.

---

# Phase 4 — Demo + Submission (Hours 20-24) · Both

## P4.1 — Integration rehearsal (1h)
**Prompt:** Walk the demo path twice end-to-end:
1. EN: "show me drones under 50k" → tool call → RAG results → reply
2. HI romanized: "mera order kahan hai" → `ui_guide: check_orders` → on-screen guide pulses Navbar Orders
3. Product page → "compare with others" → `ui_guide: compare_products`
Fix any UI-guide targeting bugs.

## P4.2 — Demo video (1h)
**Prompt:** Record 3-minute screencast (OBS or equivalent):
- 0:00 landing hero
- 0:20 category showcase → click Drone → bento of 3
- 0:45 RobotDetail flagship
- 1:10 open ChatWidget, HI voice query, guide kicks in
- 1:40 persona demo (beginner vs expert back-to-back)
- 2:10 benchmark table walkthrough
- 2:50 outro

## P4.3 — Slides (1h)
**Prompt:** 10 slides PDF:
1. Problem
2. Architecture diagram
3. Dataset (1000 rows, splits, strict validation)
4. Model (Qwen3.5-0.8B, QLoRA, 3 epochs)
5. B1 Function-calling table
6. B2 RAG table
7. B4 Multilingual table
8. Novelty 5-point summary
9. Live demo screenshots
10. Limitations + future work

## P4.4 — Submission (1h)
**Prompt:**
- Update `README.md` with real benchmark numbers and final architecture.
- Run `graphify update .` — confirm `graphify-out/GRAPH_REPORT.md` reflects current code.
- `git add -A && git commit -m "feat: v1.0 submission"`, `git tag v1.0-submission`, `git push --tags`.

---

## Benchmark Tables (to fill during P3.6)

### B1 — Function-Calling Accuracy
| System | Tool Acc | Arg F1 | p50 Latency | $/1000 |
|---|---|---|---|---|
| Qwen3.5-0.8B-FC (ours) | — | — | — | ~$0 |
| Heuristic router | — | — | ~1 ms | $0 |
| GPT-4o zero-shot | — | — | — | — |
| Claude Opus 4.7 zero-shot | — | — | — | — |
| Gemini 2.5 zero-shot | — | — | — | — |

### B2 — Context-Aware RAG
| Method | Recall@3 | MRR |
|---|---|---|
| FAISS + context re-rank (ours) | — | — |
| FAISS only | — | — |
| BM25 | — | — |

### B4 — Multilingual Function-Calling (ours vs best frontier)
| Language | Qwen3.5-0.8B-FC Acc | Best Frontier Acc |
|---|---|---|
| English | — | — |
| Hindi | — | — |
| Telugu | — | — |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Qwen3.5-0.8B Unsloth mirror not ready | Low | Fall back to raw HF weights + manual PEFT |
| Colab T4 session expires mid-train | Medium | Checkpoint every 200 steps |
| driver.js conflicts with Tailwind | Low | Scope overrides to `.driver-*` with `@layer` |
| Fine-tuned model loses to heuristic on tool accuracy | Low-Med | Still reportable — negative result is a finding |
| Sarvam API flakes during demo | Medium | Fallback in `sarvam_client.py` already wired |

---

## Submission Checklist (end of hour 24)

- [ ] Qwen3.5-0.8B LoRA adapter on HF Hub + local merged copy
- [ ] B1, B2, B4 tables filled in `README.md`
- [ ] `ui_guide` system wired end-to-end on 3+ flows
- [ ] Demo video (3 min) recorded
- [ ] Slides (PDF, 10 slides)
- [ ] `graphify update .` run, `graphify-out/` reflects final code
- [ ] Git tag `v1.0-submission` pushed

---

*Academic project — IIT Hyderabad, M.Tech, CS6420 Topics in Deep Learning*

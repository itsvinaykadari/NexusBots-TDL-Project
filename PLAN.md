# Nexus Bots — 24-Hour Sprint Plan

> **Date:** 2026-04-17 | **Deadline:** 24 hours from now
> Revised from the multi-week plan after code audit. The codebase is further along than the previous plan claimed — most integration is already built. This plan focuses the remaining 24 hours on what is missing: the fine-tuned model, the benchmark numbers, and the demo.

---

## Verified State — What Is Actually Done (post-audit)

### ✅ Phase 1 — UI + Backend (DONE)
- React 19 + Vite + Tailwind frontend with Home, Catalog, RobotDetail, AIAssistant, Support, OrderHistory pages, CartDrawer, Navbar/Footer, floating [ChatWidget.jsx](client/src/components/ChatWidget.jsx).
- Express + SQLite backend with products, chats, orders routes.
- Strict dataset in [seed.sql](server/database/seed.sql): **12 robots, 4 categories** (Kitchen, Home Cleaner, Drone, Humanoid) — reduced from 22/6 for cleaner training.
- [UserActivityContext.jsx](client/src/context/UserActivityContext.jsx) tracks page, viewed, cart, search, category, currentProduct.

### ✅ Phase 2A — Function-Calling Dataset (DONE)
- [research/dataset/](research/dataset/) has generator, formatter, validator, review sampler scripts.
- Outputs: `raw/function_calls_raw_v1.jsonl`, `processed/function_calling_train_v1.jsonl`, `final/function_calling_v1.jsonl` — **1000 rows**.
- [validation_report_v1.json](research/dataset/processed/validation_report_v1.json): `invalid_count: 0`, strict checks pass.
- Splits met: EN 500 / HI 250 / TE 250; beginner 500 / expert 500; 6 tools evenly covered; all 12 product IDs seen; all 4 categories + 6 pages seen.

### ✅ Phase 2D — Context-Aware RAG (DONE, needs benchmark)
- [pipeline.py](server/ai/pipeline.py) → `RecommendationRanker`: FAISS + sentence-transformers (MiniLM), optional via `ENABLE_SEMANTIC_RAG=1`.
- Context re-ranking: boosts by `selectedCategory`, `currentProduct`, `viewedProducts`, `cart`, and budget proximity. Falls back to lexical scoring if FAISS stack absent.
- **Missing:** formal benchmark vs lexical/TF-IDF/BM25.

### ✅ Phase 3A — Pipeline Orchestrator (DONE, LangChain-free equivalent)
- [pipeline.py](server/ai/pipeline.py) implements all 6 tools end-to-end: `search_products`, `get_product`, `compare_products`, `recommend`, `add_to_cart`, `navigate_to`.
- Two-path decider: model-based via `ENABLE_FC_MODEL=1` + `FC_MODEL_PATH`/`FC_MODEL_ID` (HF transformers pipeline), with heuristic fallback.
- `_sanitize_tool_call` hardens model outputs against category/page/id drift.
- **Note:** we chose NOT to use LangChain (would add latency + indirection for 6 fixed tools). This is a considered simplification.

### ✅ Phase 3B — Sarvam Integration (DONE)
- [sarvam_client.py](server/ai/sarvam_client.py) calls Sarvam chat endpoint with persona-adaptive system prompt (beginner vs expert) and language-specific output (EN/HI/TE).
- Deterministic fallback text generator when API key missing or request fails.

### ✅ Phase 3C — Frontend Wired (DONE)
- [server/routes/ai.js](server/routes/ai.js): `POST /api/ai/chat` spawns Python pipeline → Sarvam → persists chat history.
- [ChatWidget.jsx](client/src/components/ChatWidget.jsx) and [AIAssistant.jsx](client/src/pages/AIAssistant.jsx) both hit `/api/ai/chat` with full UserActivityContext payload.

### ✅ Phase 4A — Voice (DONE for input)
- Web Speech API STT wired into ChatWidget + AIAssistant. TTS output not yet wired — **skip for 24h demo**.

### ✅ Phase 4B — Page-Aware Context (DONE)
- Frontend already sends `currentPage`, `viewedProducts`, `cart`, `currentProduct`, `searchQuery`, `selectedCategory` every request; pipeline normalizes and uses all of it.

---

## What Is Missing (the 24-hour scope)

| # | Item | Why it is missing | Blocker for demo? |
|---|---|---|---|
| M1 | **Fine-tuned SmolLM2-360M / Qwen2-0.5B weights** | No Colab notebook yet, no model artifact | **YES — this IS the research.** |
| M2 | **Function-calling benchmark** (ours vs heuristic vs GPT-4 / Claude / Gemini zero-shot) | No eval harness | YES — required numbers |
| M3 | **RAG benchmark** (FAISS+rerank vs FAISS vs TF-IDF vs BM25) | No eval script | YES — second contribution |
| M4 | **Proficiency benchmark** (heuristic vs zero-shot LLM) — using existing heuristic, no training | No eval script | NO — small table only |
| M5 | **Multilingual tool-call accuracy** (EN vs HI vs TE) | Needs M1 first | NO if M1 slips |
| M6 | **Demo slides + README benchmark tables + recorded demo** | Not started | YES |

---

## 24-Hour Schedule (two operators, parallelizable)

Assumes ~22 usable hours after buffer. Colab T4 free tier is the long pole.

### Block A — Hours 0-2 · Setup (both operators)
- [ ] Create `research/notebooks/function_calling_finetune.ipynb` with Unsloth + QLoRA template for SmolLM2-360M.
- [ ] Upload `research/dataset/final/function_calling_v1.jsonl` to Drive / HF.
- [ ] Smoke-test `ENABLE_SEMANTIC_RAG=1` locally (`pip install -r server/ai/requirements.txt` if needed), confirm `recommend` returns `ragEnabled: true`.
- [ ] Create `research/eval/` directory for benchmark scripts.

### Block B — Hours 2-10 · Fine-tune (Operator 1, long-running)
- [ ] Run QLoRA fine-tune on Colab T4 (SmolLM2-360M, 3 epochs, r=16, alpha=32, lr=2e-4). **Expect 2-4 hrs training.**
- [ ] Save LoRA adapter + merged model; push to HF Hub as `nexus-bots/smollm2-360m-fc-v1`.
- [ ] Download merged model locally to `research/models/smollm2-360m-fc-v1/`.
- [ ] Set `ENABLE_FC_MODEL=1` + `FC_MODEL_PATH=<local-path>` in `server/.env`; smoke-test via `/api/ai/chat`.

### Block C — Hours 2-6 · Eval harness (Operator 2, parallel with B)
- [ ] Hold out ~100 rows from `function_calling_v1.jsonl` as test set (seed + stratified by language × tool).
- [ ] `research/eval/bench_function_calling.py`: scores tool-accuracy + arg-F1 for (a) heuristic, (b) fine-tuned (once ready), (c) zero-shot GPT-4o, (d) zero-shot Claude Sonnet 4.6, (e) zero-shot Gemini. Parse-tolerant JSON extractor.
- [ ] `research/eval/bench_rag.py`: Recall@3 + MRR for 50 recommend queries across FAISS+rerank, FAISS, TF-IDF, BM25.
- [ ] `research/eval/bench_proficiency.py`: accuracy of heuristic vs zero-shot GPT-4o classifier on 100 labeled queries (pull from dataset `style` field).

### Block D — Hours 10-14 · Run benchmarks (Operator 1)
- [ ] Run B1 function-calling bench — 5 systems × 100 queries.
- [ ] Run B2 RAG bench — 4 retrievers × 50 queries.
- [ ] Run B3 proficiency bench — 2 systems × 100 queries.
- [ ] Run B4 multilingual slice of B1 (EN vs HI vs TE, same 100 queries).
- [ ] Save all results to `research/results/` as CSV + markdown tables.

### Block E — Hours 10-16 · Polish (Operator 2, parallel with D)
- [ ] Fix any pipeline bugs surfaced during smoke-test.
- [ ] Add confidence/toolSource indicator in ChatWidget (`model` vs `heuristic`) for demo visibility.
- [ ] Verify all 6 tools work end-to-end through the UI across EN/HI/TE.
- [ ] Add loading states and error toasts where missing.

### Block F — Hours 16-20 · Demo artifacts
- [ ] Slides (10-12): problem, architecture, 5 benchmark tables, demo screenshots, limitations, future work.
- [ ] Update [README.md](README.md): replace TBD rows with real numbers.
- [ ] Record 3-min demo video: EN query → tool call → RAG → response; HI query; proactive context-aware suggestion.

### Block G — Hours 20-24 · Buffer + submission
- [ ] Fix last bugs, verify submission checklist, final git push, tag `v1.0-submission`.
- [ ] Run `graphify update .` so the graph reflects final code.

---

## Revised Benchmark Tables (what we will actually produce)

### B1 — Function-Calling Accuracy (primary)
| System | Tool Accuracy | Arg F1 | Latency | $/1000 |
|---|---|---|---|---|
| SmolLM2-360M-FC (ours, QLoRA) | — | — | — | ~$0 |
| Heuristic router (baseline) | — | — | ~1 ms | $0 |
| Zero-shot GPT-4o | — | — | — | — |
| Zero-shot Claude Sonnet 4.6 | — | — | — | — |
| Zero-shot Gemini 2.5 | — | — | — | — |

### B2 — Context-Aware RAG
| Method | Recall@3 | MRR |
|---|---|---|
| FAISS + context re-rank (ours) | — | — |
| FAISS only | — | — |
| TF-IDF | — | — |
| BM25 | — | — |

### B3 — Proficiency Detection
| Method | Accuracy | F1 |
|---|---|---|
| Heuristic (in pipeline.py) | — | — |
| Zero-shot GPT-4o prompt | — | — |

### B4 — Multilingual Slice of B1
| Language | Tool Accuracy | Arg F1 |
|---|---|---|
| English | — | — |
| Hindi | — | — |
| Telugu | — | — |

### B5 — Persona Quality (deferred to written report)
LLM-as-judge score across 20 beginner + 20 expert prompts comparing Sarvam persona-adaptive vs one-size-fits-all. If time permits in Block F.

---

## Scope Cuts (explicit, to protect 24h deadline)

- ❌ **Trained proficiency classifier** — keep heuristic in `detect_proficiency()`, only benchmark it.
- ❌ **Qwen2-0.5B ablation** — ship only SmolLM2-360M. Qwen mention in "future work" in paper.
- ❌ **TTS output** — STT input is already wired; skip TTS for demo.
- ❌ **LangChain** — pipeline.py already replaces it. Frame as deliberate choice: "fixed tool set, avoided LangChain overhead."
- ❌ **Persona LLM-as-judge benchmark** — only if Block F finishes early.
- ❌ **Deployment** — local demo + recorded video only.

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Colab T4 session expires mid-train | Medium | Checkpoint every 200 steps; restart is OK |
| Fine-tuned model underperforms heuristic | Low-Med | Still reportable — heuristic-as-baseline is valid finding |
| Sarvam API flakes during demo | Medium | Fallback already wired in `sarvam_client.py` |
| GPT-4/Claude/Gemini API budget | Low | 100-query bench is cheap (~$1-2 total) |
| RAG deps (faiss-cpu, sentence-transformers) break on server | Medium | Lexical fallback already in place; can disable `ENABLE_SEMANTIC_RAG` |

---

## Novelty — What Sets This Apart

1. **Specialized small LLM matches large frontier models** on narrow-domain function calling — 360M params (QLoRA) vs GPT-4/Claude/Gemini zero-shot, on robotics e-commerce. If accuracy is comparable, that's the core claim: domain fine-tuning beats scale for structured tasks.
2. **Context-aware RAG re-ranking by live user activity** — not just query embedding. Re-ranker scores are boosted by `currentProduct`, `selectedCategory`, `viewedProducts`, `cart`, and budget proximity. Most published RAG treats retrieval as stateless.
3. **Multilingual function calling with code-mixed inputs** (EN/HI/TE) — underexplored; Indian-language tool-calling benchmarks barely exist.
4. **Dual-path decider with graceful fallback** — [pipeline.py](server/ai/pipeline.py) runs the fine-tuned model first, falls back to a deterministic heuristic router if the model is disabled/fails/produces invalid JSON. Production-safe.
5. **Heuristic baseline as a first-class system** — we benchmark against our own rule-based router, not just LLMs. Shows when ML is actually worth the weight.
6. **Deliberate choice to skip LangChain** — 6 fixed tools, direct Python dispatch. Lower latency, fewer moving parts, easier to reason about.
7. **Persona-adaptive generation driven by auto-detected proficiency** — `detect_proficiency()` uses message complexity + session activity (viewed count, cart size, technical tokens) to switch Sarvam system prompt between beginner and expert registers.

---

## Known Inaccuracies & Bugs (fix during Blocks E/F)

**Documentation drift:**
- [README.md](README.md) says "22 real robots" and lists 6 categories (Household, Educational, Security, Industrial, etc.) — actual DB is **12 robots, 4 categories** (Kitchen, Home Cleaner, Drone, Humanoid). Fix README tables + mermaid legend.
- README and old plan list 7 tools including `get_support` — pipeline only ships **6 tools** (get_support removed). Update everywhere.
- README Phase 1 checklist still references "Support page — support form" — verify whether support page is in scope for demo or drop from nav.

**Performance bugs (affect demo latency):**
- [pipeline.py](server/ai/pipeline.py) `run_pipeline()` instantiates `PipelineRuntime()` **per request** → reloads all products from SQLite and **rebuilds the FAISS index + re-encodes corpus** on every call. With `ENABLE_SEMANTIC_RAG=1` this is seconds of latency per message. **Fix:** module-level singleton, or pre-build index once at process start.
- `/api/ai/chat` spawns a fresh Python subprocess twice per message (pipeline + sarvam). Cold-start penalty. **Fix:** long-lived Python worker over stdin/stdout, or combine both scripts into one process.

**Correctness bugs:**
- `_extract_ids()` regex `\b([1-9]|1[0-2])\b` captures **any** 1-12 integer in the message, so "show me 12 options" parses 12 as a product ID. **Fix:** require a preceding token like `#`, `id`, `product`, or a `compare/vs` context.
- `_extract_budget()` accepts any number ≥ 50 — a year ("2025"), a pincode, or a quantity can be mis-read as budget. **Fix:** require currency symbol/keyword nearby, or cap range sensibly.
- `detect_proficiency()` checks only English technical tokens — a Hindi/Telugu expert message gets labeled beginner by default. **Fix:** add HI/TE technical vocabulary or gate the token check by detected language.
- Default category fallback `"Kitchen"` in `_heuristic_tool_call` / `_sanitize_tool_call` silently biases `search_products` and `recommend` when detection fails. **Fix:** allow empty category (search across all) rather than forcing Kitchen.

**Operational gaps:**
- No rate limiting on `/api/ai/chat` — spawns Python per request, trivial to DOS. Add express-rate-limit for the demo endpoint.
- `sarvam_client.py` sets three auth headers (`Authorization`, `x-api-key`, `api-key`) — strict servers can 400 on redundant auth. Confirm correct header for the Sarvam endpoint and drop the others.
- `Chat.addMessage` is called synchronously before and after the pipeline call; if SQLite locks, the request hangs. Wrap in try and don't block on persistence.
- `.env.example` not present in `server/` — `SARVAM_API_KEY`, `ENABLE_FC_MODEL`, `ENABLE_SEMANTIC_RAG`, `FC_MODEL_PATH` are undocumented for a teammate setting it up fresh.

**Graph freshness:**
- `graphify-out/` still reflects state from when it was first generated. Run `graphify update .` after Block E so the final graph matches shipped code.

---

## Submission Checklist (end of hour 24)

- [ ] Fine-tuned model weights on HF Hub + local copy
- [ ] 5 benchmark tables filled with real numbers in [README.md](README.md)
- [ ] Demo video recorded (3 min)
- [ ] Slides (PDF)
- [ ] Code pushed, tagged `v1.0-submission`
- [ ] graphify-out/ refreshed
- [ ] Team: **Digvijaysing Rajput** (CS24MTECH14020), **Vinay Kadari** (CS24MTECH14008)

---

*Academic project — IIT Hyderabad, M.Tech, CS6420 Topics in Deep Learning*

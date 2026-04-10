Nexus Bots

This is a college project for Topics in Deep Learning (CS6420) at IIT Hyderabad. It is an AI-powered robotics commerce platform that combines product browsing with intelligent, context-aware, persona-adaptive AI assistance through chat and voice channels.

The core research contribution is a fine-tuned small language model (SmolLM2/Qwen2, ~360M params) for domain-specific function calling that routes user queries and selects tools, paired with context-aware RAG that re-ranks retrieved products using real-time user activity signals, and a user proficiency detector that adapts response style for beginners vs experts. Sarvam AI handles multilingual reasoning and response generation in English, Hindi, and Telugu. LangChain orchestrates the full pipeline.

Problem Statement

Current AI-powered e-commerce systems face three problems:

1. Routing is expensive — Using LLMs for every routing decision costs ~$10/1000 queries and adds ~800ms latency. Simple intent routing doesn't need a 200B-parameter model.
2. Responses are context-blind — Chatbots don't know what page the user is on, what they've browsed, or what's in their cart. They respond generically.
3. One-size-fits-all communication — A tech expert and an elderly first-time user get the same response style, making the system unhelpful for both.

We address these by building:
- A fine-tuned small LLM (~360M params) for domain-specific function calling — it decides WHAT to do (which tool to call, with what arguments), replacing expensive LLM-based routing.
- Context-aware RAG that re-ranks retrieved products using user browsing history, cart contents, and current page context.
- A user proficiency detector (beginner/expert) that adapts how Sarvam generates the final response.
- LangChain orchestration connecting all components into a coherent pipeline.
- Sarvam AI for multilingual reasoning and response generation (EN/HI/TE).

Research Contribution

The research component answers four questions:

1. Can a fine-tuned 360M-parameter model match GPT-4/Claude/Gemini at domain-specific function calling (tool selection + argument generation) in robotics e-commerce?
2. Does context-aware RAG (re-ranked by user activity: views, cart, search, current page) improve retrieval relevance over standard semantic retrieval?
3. Can we reliably detect user technical proficiency from their query to adapt response style?
4. Does function-calling accuracy hold across English, Hindi, and Telugu queries?

Benchmarks:

1. Function-Calling Accuracy
   - Fine-tuned SmolLM2/Qwen2 vs zero-shot GPT-4 vs Claude vs Gemini
   - Metrics: tool-call accuracy, argument correctness, latency, cost per 1000 queries

2. Context-Aware RAG
   - Standard FAISS retrieval vs activity-aware re-ranked retrieval
   - Metrics: Recall@3, MRR, with/without user context

3. User Proficiency Detection
   - Trained classifier vs zero-shot LLM detection vs keyword heuristic
   - Metrics: accuracy, F1 on beginner/expert classification

4. Multilingual Function Calling
   - Same function-calling task tested on English, Hindi, Telugu
   - Metrics: tool-call accuracy per language, argument correctness per language

5. Persona-Adapted Response Quality
   - Expert-style vs beginner-style responses rated for helpfulness
   - Metrics: LLM-as-judge scoring or manual evaluation

System Overview

The platform has 22 real-world robot products from real companies (Amazon Astro, iRobot Roomba j9+, Boston Dynamics Stretch, DJI RoboMaster S1, etc.) across 6 categories (Household, Home Cleaner, Child, Educational, Security, Industrial).

Users interact through:
1. Floating ChatWidget — available on every page, context-aware, text + voice input
2. AI Assistant page — full-screen chat + voice experience with mode toggle
3. Support page — email-based support form

Both chat interfaces are page-aware and context-aware — they know what the user is viewing, what's in their cart, and what they've searched for.

Architecture

The system follows a 4-layer architecture:

1. Product Layer
   React frontend with robot catalog, detail pages, search, filtering, and cart.
   UserActivityContext tracks all user actions (views, cart, search, page, category).

2. Interaction Layer
   Floating ChatWidget (all pages) + AI Assistant page (dedicated experience).
   Voice input via Web Speech API, output via TTS.
   Page-aware: passes visible products, active filters, current page to the pipeline.
   Supports English, Hindi, and Telugu input.

3. Intelligence Layer
   - Fine-tuned Small LLM (SmolLM2/Qwen2, QLoRA): receives user query, decides which function/tool to call and with what arguments.
   - Context-Aware RAG (sentence-transformers + FAISS): retrieves relevant products, re-ranked by user activity signals.
   - User Proficiency Detector: classifies query as beginner or expert level.
   - LangChain Orchestration: connects function-calling model → RAG → Sarvam, manages tool execution and context passing.
   - Sarvam AI: receives tool results + product data + user proficiency level + page context, generates the final multilingual response.

4. Data Layer
   SQLite stores products (22 real robots with brand), chat history, and interaction records.

How It Works (Step by Step)

1. User types or speaks a query (e.g., "Compare Roomba and Roborock for pet hair")
2. Voice input is converted to text via Web Speech API (if voice)
3. UserActivityContext provides: current page, viewed products, cart, search history
4. Fine-tuned small LLM receives query + context → outputs: compare_products(id1=5, id2=6, focus="pet hair")
5. Our code executes the function call: fetches product 5 and 6 data from DB
6. RAG retrieves additional relevant products, re-ranked by user activity
7. Proficiency detector classifies query as beginner or expert
8. Everything is packed and sent to Sarvam: product data + user context + proficiency level + page info
9. Sarvam generates the final response in the user's language and proficiency level
10. Response displayed as text (and spoken via TTS if voice mode)

Function Calls (What the Small LLM Learns)

The fine-tuned model learns to call these domain-specific tools:

| Function | Description | Example Call |
|---|---|---|
| search_products(query, category) | Search/filter the catalog | search_products("pool cleaner", "Home Cleaner") |
| get_product(id) | Get detailed product info | get_product(8) |
| compare_products(id1, id2, focus) | Compare two products | compare_products(5, 6, "suction power") |
| recommend(need, budget, category) | Get recommendations | recommend("kids coding", 300, "Child") |
| add_to_cart(id) | Add product to cart | add_to_cart(10) |
| navigate_to(page, params) | Guide user to a page | navigate_to("catalog", {category: "Security"}) |
| get_support(issue, product_id) | Route to support | get_support("not charging", 5) |

This is what makes the small LLM fine-tuning a genuine DL research task — not just classification labels, but structured function calls with arguments.

User Proficiency Detection

The system detects whether a user is tech-savvy or a beginner from their query:

| Query | Detected Level |
|---|---|
| "What's the repeatability spec on the UR10e?" | expert |
| "Which robot can clean my house?" | beginner |
| "Does CyberDog 2 support ROS2 integration?" | expert |
| "I want something safe for my grandchild" | beginner |
| "Compare payload capacity of CRX-25iA vs UR10e" | expert |
| "What's a good robot for a 6 year old?" | beginner |

Sarvam adapts its response:
- Beginner: "This robot vacuum cleans your floors by itself. Just press start on the app!"
- Expert: "The Roborock S8 MaxV Ultra delivers 10,000Pa suction with ReactiveAI 2.0 using dual-camera 3D structured light for obstacle classification across 50+ categories."

Page-Aware Context

The bot knows what's on the user's screen:

- On /catalog with Security filter → "I see 3 security robots. The CyberDog 2 has 19 sensors and is great for patrol."
- On /robot/5 (Roomba) → "You're looking at the Roomba j9+. Want me to compare it with the Roborock S8?"
- On / (Home) → "Welcome! Are you looking for home cleaning, security, or something for your kids?"
- Has items in cart → "You have 2 items in your cart. Want to review them?"

Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Function Calling | Fine-tuned SmolLM2/Qwen2 (QLoRA, ~360M params) |
| Retrieval | Sentence-transformers + FAISS (context-aware re-ranking) |
| Orchestration | LangChain |
| Reasoning/Response | Sarvam AI (multilingual: EN/HI/TE) |
| Voice | Web Speech API + TTS |
| Training | Google Colab (free T4) + HuggingFace + Unsloth |

What Makes This Novel

1. Small LLM function calling — Fine-tuned 360M model for domain-specific tool use, benchmarked against GPT-4/Claude/Gemini. Research question: can small models do reliable function calling in narrow domains?
2. Context-aware RAG — Retrieval re-ranked by real-time user activity (views, cart, page), not just query similarity.
3. Persona-adaptive responses — Automatic proficiency detection adjusts response complexity.
4. Page-aware assistance — Bot is grounded in what the user actually sees on screen.
5. Multilingual function calling — Same tool-calling task evaluated across EN/HI/TE.
6. End-to-end benchmarks — 5 concrete benchmark tables comparing trained models against baselines.

What Should Be Avoided

- Payment/order logistics — not relevant to the research question.
- Training from scratch — fine-tuning with QLoRA is sufficient and practical.
- Email agent — engineering work with zero DL value.
- Overcomplicated agent behaviors — keep tools simple and reliable.
- Too many languages — 3 languages (EN + HI + TE) is enough.
- Deploying to cloud — local demo is fine.

Summary

Nexus Bots is an AI-powered robotics commerce platform where a fine-tuned small language model handles domain-specific function calling (tool selection + argument generation), context-aware RAG retrieves products re-ranked by user activity, and Sarvam AI generates persona-adaptive multilingual responses — all orchestrated by LangChain. The research contribution includes benchmarked comparisons of small-model vs large-model function calling, context-aware vs standard retrieval, trained vs heuristic proficiency detection, and multilingual tool-calling accuracy across English, Hindi, and Telugu.

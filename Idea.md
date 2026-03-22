Nexus Bots

This is a college project for Topics in Deep Learning (CS6420) at IIT Hyderabad. It is an AI-powered robotics commerce platform that combines product browsing with intelligent multi-agent interaction through chat, voice, and email channels.

The core research contribution is a fine-tuned intent classification model that routes user queries to specialized LangChain agents, paired with RAG-based product retrieval for context-aware responses, evaluated against zero-shot LLM baselines on accuracy, latency, and cost. The system also supports multilingual queries and multimodal interaction (text + voice) as a case study.

Problem Statement

Current AI-powered e-commerce systems either use a single monolithic chatbot for all user interactions or rely entirely on expensive large language model API calls for every decision, including simple routing and context retrieval. This creates three problems:

1. A single chatbot cannot specialize — it handles product questions, complaints, and purchase guidance with the same generic behavior, leading to poor user experience.
2. Using LLMs for intent routing is slow (~800ms per call) and costly, making real-time multi-agent systems impractical for deployment.
3. Without retrieval, agents hallucinate product details or give generic responses instead of grounded, catalog-aware answers.

We address these by building a multi-agent e-commerce system where:
- A fine-tuned DistilBERT intent classifier (67MB) replaces LLM-based routing.
- RAG with sentence-transformer embeddings retrieves relevant product context before the agent responds.
- Specialized agents handle different query types instead of one generic chatbot.

Research Contribution

The research component answers three questions:

1. Can a fine-tuned lightweight classifier replace zero-shot LLM routing in a multi-agent e-commerce system without sacrificing accuracy?
2. Does RAG-based product retrieval improve agent response quality over no-retrieval baselines?
3. Do specialized routed agents produce better responses than a single monolithic chatbot?

We fine-tune DistilBERT on a domain-specific intent classification dataset (800-1000 labeled examples across 6 intent classes) and benchmark it against:
- Zero-shot GPT
- Zero-shot Gemini
- Rule-based keyword matching

For retrieval, we compare:
- Sentence-transformer embeddings (FAISS)
- TF-IDF
- BM25

For agent quality, we compare:
- Multi-agent (routed by intent) vs single-agent (monolithic chatbot)

Evaluation metrics:
- Classification accuracy and macro F1 score
- Per-class precision, recall, and confusion matrix
- Inference latency (ms per query)
- Cost per 1000 queries
- Retrieval recall@3 and MRR
- Response quality comparison (multi-agent vs single-agent)
- Few-shot learning curve (accuracy vs training data size)

Multilingual and Multimodal Case Study (Bonus)

Multilingual:
The intent classifier is evaluated on queries in English, Hindi, and Telugu (code-mixed). This tests whether the fine-tuned model generalizes across languages commonly used by Indian e-commerce users. We include multilingual examples in the training dataset and benchmark cross-lingual intent classification accuracy.

Multimodal:
The system supports two input modalities — text (chat and email) and voice (Web Speech API). Both modalities feed into the same intent classification and RAG pipeline. The voice channel converts speech to text, classifies intent, retrieves product context, generates a response, and converts it back to speech via TTS. We evaluate whether intent classification accuracy differs across text vs voice-transcribed inputs.

System Overview

The platform has 22 robot products across 6 categories (Household, Home Cleaner, Child, Educational, Security, Industrial). Each robot within a category has a distinct competitive advantage — one is the fastest, another handles the heaviest payload, another is the most precise, etc. — like a real robotics company product line.

Users interact with the system through three channels:

1. Chat — text-based product questions, comparisons, recommendations, and support.
2. Voice — hands-free interaction using Web Speech API for input and TTS for output.
3. Email — formal support requests, issue reporting, and follow-ups.

All three channels feed into a shared intelligence layer where a fine-tuned intent classifier determines user intent, RAG retrieves relevant product context, and LangChain agents generate the response.

Architecture

The system follows a 4-layer architecture:

1. Product Layer
   React frontend with robot catalog, detail pages, search, and filtering.

2. Interaction Layer
   Chat widget, voice panel, and email support form — all connected to the same backend.
   Supports English, Hindi, and Telugu input.

3. Intelligence Layer
   - Fine-tuned DistilBERT intent classifier routes queries to the appropriate agent.
   - RAG pipeline (sentence-transformer + FAISS) retrieves relevant product context.
   - LangChain agents: Product Assistant, Sales Assistant, Support Agent, Email Agent, Voice Agent.
   - A coordinator agent manages context sharing between agents.

4. Data Layer
   PostgreSQL stores products, chat history, email logs, and interaction records.

Intent Classification (Research Core)

The intent classifier categorizes every user message into one of these classes:

- product_query — asking about specs, features, availability
- comparison — comparing two or more robots
- recommendation — asking for suggestions based on needs
- purchase_intent — wanting to buy, asking about pricing/ordering
- complaint — reporting issues, requesting returns
- general — greetings, off-topic, casual conversation

Examples in multiple languages:
- English: "What sensors does WatchDog have?" → product_query
- Hindi: "Bacchon ke liye kaunsa robot acha hai?" → recommendation
- Telugu: "Pool cleaning robot eppudu available avtundi?" → product_query

The classifier runs locally, returns results in ~5ms, and determines which LangChain agent handles the query.

Training approach:
- Generate synthetic training data using GPT-4 (domain-specific e-commerce queries about robots)
- Include English, Hindi, and Telugu (code-mixed) examples
- Manually review and clean the dataset
- Fine-tune distilbert-base-uncased (or multilingual variant) using HuggingFace Transformers
- Train on Google Colab (free tier sufficient)
- Evaluate with stratified k-fold cross-validation

RAG Pipeline (Research Component 2)

When a user asks a product-related question:
1. The query is embedded using a sentence-transformer model.
2. FAISS finds the top-3 most relevant robot descriptions by cosine similarity.
3. The retrieved product context is passed to the LangChain agent along with the user query.
4. The agent generates a grounded, product-aware response.

This ensures the agent never hallucinate specs or recommend non-existent products.

Tech Stack

| Layer        | Technology                           |
|--------------|--------------------------------------|
| Frontend     | React 19 + Vite + Tailwind CSS      |
| Backend      | Node.js + Express                    |
| Database     | PostgreSQL                           |
| AI Routing   | Fine-tuned DistilBERT (HuggingFace) |
| AI Retrieval | Sentence-transformers + FAISS        |
| AI Agents    | LangChain + OpenAI                   |
| Voice        | Web Speech API + TTS                 |
| Email        | Nodemailer + AI agent                |

What makes this project novel

1. Fine-tuned intent routing — replaces LLM-based routing with a trained classifier, benchmarked.
2. RAG-powered agents — product retrieval ensures grounded, accurate responses.
3. Multi-agent specialization — each agent has a distinct role, compared against single-agent baseline.
4. Multilingual support — intent classification tested on English, Hindi, and Telugu queries.
5. Multimodal interaction — text and voice inputs through the same pipeline, with accuracy comparison.
6. Benchmarked evaluation — concrete accuracy, retrieval, latency, and cost comparisons across multiple baselines.

Build Order

1. Build the robotics catalog UI (React frontend with all pages).
2. Set up backend with Express and PostgreSQL.
3. Generate intent classification dataset (English + Hindi + Telugu) and fine-tune DistilBERT.
4. Build RAG pipeline with sentence-transformers and FAISS.
5. Run benchmarks (intent: fine-tuned vs zero-shot vs rule-based; retrieval: embeddings vs TF-IDF vs BM25).
6. Build LangChain multi-agent system with router using fine-tuned model + RAG.
7. Add chat interface connected to agents.
8. Add voice interaction (speech-to-text → same pipeline → TTS).
9. Add email support.
10. Run multi-agent vs single-agent comparison.
11. Run multilingual and multimodal evaluations.
12. Polish demo and prepare results.

What should be avoided

- Full payment/order logistics — not relevant to the research question.
- Training from scratch — fine-tuning existing models is sufficient and reliable.
- Overcomplicated agent behaviors — agents should work reliably, not impressively.
- Too many languages — 3 languages (English + Hindi + Telugu) is enough for the multilingual case study.

Summary

Nexus Bots is an AI-powered robotics commerce platform where a fine-tuned DistilBERT intent classifier routes multilingual user queries to specialized LangChain agents, while RAG retrieves relevant product context for grounded responses, across text and voice channels. The research contribution includes benchmarked comparisons of fine-tuned vs zero-shot routing, embedding-based vs traditional retrieval, and multi-agent vs single-agent response quality, with a multilingual and multimodal case study covering English, Hindi, and Telugu.

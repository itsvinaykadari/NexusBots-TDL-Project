Nexus Bots

This is a college project for Topics in Deep Learning (CS6420) at IIT Hyderabad. It is an AI-powered robotics commerce platform that combines product browsing with intelligent multi-agent interaction through chat, voice, and email channels.

The core research contribution is a fine-tuned intent classification model that routes user queries to specialized LangChain agents, evaluated against zero-shot LLM baselines on accuracy, latency, and cost.

Problem Statement

Current AI-powered e-commerce systems either use a single monolithic chatbot for all user interactions or rely entirely on expensive large language model API calls for every decision, including simple routing. This creates two problems:

1. A single chatbot cannot specialize — it handles product questions, complaints, and purchase guidance with the same generic behavior, leading to poor user experience.
2. Using LLMs for intent routing is slow (~800ms per call) and costly, making real-time multi-agent systems impractical for deployment.

We address both problems by building a multi-agent e-commerce system where a lightweight fine-tuned intent classifier (DistilBERT, 67MB) replaces LLM-based routing, achieving comparable accuracy at significantly lower latency and zero inference cost.

Research Contribution

The research component of this project answers the question:

Can a fine-tuned lightweight classifier replace zero-shot LLM routing in a multi-agent e-commerce system without sacrificing accuracy?

We fine-tune DistilBERT on a domain-specific intent classification dataset (800-1000 labeled examples across 6-7 intent classes) and benchmark it against:

* Zero-shot GPT-4
* Zero-shot GPT-3.5-turbo
* Rule-based keyword matching

Evaluation metrics:

* Classification accuracy and macro F1 score
* Per-class precision, recall, and confusion matrix
* Inference latency (ms per query)
* Cost per 1000 queries
* Few-shot learning curve (accuracy vs training data size)

This produces concrete, reproducible benchmark tables that demonstrate the trade-offs between fine-tuned local models and LLM-based routing.

System Overview

The platform has 22 robot products across 6 categories (Household, Home Cleaner, Child, Educational, Security, Industrial). Each robot within a category has a distinct competitive advantage — one is the fastest, another handles the heaviest payload, another is the most precise, etc. — like a real robotics company product line.

Users interact with the system through three channels:

1. Chat — text-based product questions, comparisons, recommendations, and support.
2. Voice — hands-free interaction using Web Speech API for input and TTS for output.
3. Email — formal support requests, issue reporting, and follow-ups.

All three channels feed into a shared intelligence layer where a fine-tuned intent classifier determines user intent and a LangChain-based multi-agent system handles the response.

Architecture

The system follows a 4-layer architecture:

1. Product Layer
   React frontend with robot catalog, detail pages, search, and filtering.

2. Interaction Layer
   Chat widget, voice panel, and email support form — all connected to the same backend.

3. Intelligence Layer
   Fine-tuned DistilBERT intent classifier routes queries to the appropriate LangChain agent.
   Agents: Product Assistant, Sales Assistant, Support Agent, Email Agent, Voice Agent.
   A coordinator agent manages context sharing between agents.

4. Data Layer
   PostgreSQL stores products, chat history, email logs, and interaction records.

Intent Classification (Research Core)

The intent classifier is the key trained component. It categorizes every user message into one of these classes:

* product_query — asking about specs, features, availability
* comparison — comparing two or more robots
* recommendation — asking for suggestions based on needs
* purchase_intent — wanting to buy, asking about pricing/ordering
* complaint — reporting issues, requesting returns
* general — greetings, off-topic, casual conversation

The classifier runs locally, returns results in ~5ms, and determines which LangChain agent handles the query. This replaces the common pattern of using an LLM call just to decide where to route a message.

Training approach:
* Generate synthetic training data using GPT-4 (domain-specific e-commerce queries about robots)
* Manually review and clean the dataset
* Fine-tune distilbert-base-uncased using HuggingFace Transformers
* Train on Google Colab (free tier sufficient)
* Evaluate with stratified k-fold cross-validation

Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Frontend     | React 19 + Vite + Tailwind CSS    |
| Backend      | Node.js + Express                 |
| Database     | PostgreSQL                        |
| AI Routing   | Fine-tuned DistilBERT (HuggingFace) |
| AI Agents    | LangChain + OpenAI                |
| Voice        | Web Speech API + TTS              |
| Email        | Nodemailer + AI agent             |

What makes this project novel

1. Fine-tuned intent routing — most multi-agent demos use LLM for routing. We train a dedicated classifier and prove it works better for this use case.
2. Multi-agent specialization — each agent has a distinct role, not a single chatbot doing everything.
3. Multi-channel interaction — chat, voice, and email share the same intelligence layer.
4. Benchmarked evaluation — we provide concrete accuracy, latency, and cost comparisons, not just a working demo.
5. Realistic product domain — 22 differentiated robots across 6 categories, modeled like a real company catalog.

The novelty is not in any single component but in the combination: a working e-commerce system with trained routing, specialized agents, and proper benchmarks proving the approach works.

Build Order

1. Build the robotics catalog UI (React frontend with all pages).
2. Set up backend with Express and PostgreSQL.
3. Generate intent classification dataset and fine-tune DistilBERT.
4. Run benchmarks (fine-tuned vs zero-shot vs rule-based).
5. Build LangChain multi-agent system with router using the fine-tuned model.
6. Add chat interface connected to agents.
7. Add voice interaction.
8. Add email support.
9. Polish demo and prepare evaluation results.

What should be avoided

* Full payment/order logistics — not relevant to the research question.
* Training multiple models — one fine-tuned classifier is enough for the research story.
* Overcomplicated agent behaviors — agents should work reliably, not impressively.
* External dependencies that add risk — keep the stack simple and local where possible.

Summary

Nexus Bots is an AI-powered robotics commerce platform where a fine-tuned DistilBERT intent classifier routes user queries to specialized LangChain agents across chat, voice, and email channels. The research contribution is a benchmarked comparison showing that lightweight fine-tuned routing matches or exceeds zero-shot LLM routing at 160x lower latency and zero API cost, making multi-agent e-commerce systems practical for real deployment.

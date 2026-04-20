# NexusBots — Complete Architecture & Research Explained

---

## 1. What is the "Web Speed API"?

There is no tool actually called "Web Speed API" — that is just a **label in your architecture diagram** that means:

> *"Use a cloud API call over the internet (web) which is fast because you don't run the model yourself"*

In your project, that cloud API is the **Sarvam API** (`sarvam-m` model).

- Your local Qwen model runs on **your GPU** → slow to start, uses VRAM
- Sarvam API runs on **Sarvam's servers** → you just send HTTP POST, get response back in ~1-2 seconds
- "Web speed" = the response comes over the internet from someone else's GPU

So yes — **Web Speed API = Sarvam API** in your project.

---

## 2. What is `UserActivityContext`?

Think of it as the **browser's memory of what the user is doing**.

When a user is browsing your site, React needs to remember:

| What the user did | What gets stored |
|---|---|
| Viewed a robot product | `viewedProducts: [{id, name, category, timestamp}]` |
| Added something to cart | `cart: [{id, name, price, quantity}]` |
| Clicked on a product | `currentProduct: {id, name, category}` |
| Searched "drone" | `searchQuery: "drone"` |
| Filtered by "Kitchen" | `selectedCategory: "Kitchen"` |
| Currently on catalog page | `currentPage: "catalog"` |

**Why does AI need this?**

When you type *"recommend something"*, the AI doesn't know what you've been browsing. `UserActivityContext` packages all that info into a **context summary object** and sends it with every AI request. So the AI knows:

> *"The user just viewed product #5, has 2 things in cart, is currently on the catalog page filtered to Humanoid category."*

That's what arrives at the backend as the `context` field in the POST request body.

---

## 3. `POST /api/ai/chat` → What is PythonWorker IPC?

**IPC = Inter-Process Communication** — it means two separate programs talking to each other.

Your backend is written in **Node.js** (JavaScript). But your AI model (`fc_model.py`) is written in **Python**. These are two completely different processes. They can't call each other like normal functions.

**The naive approach (slow):**
Every time a user sends a message → Node spawns a new Python process → Python loads the model (takes 2-3 seconds) → returns result → Python process dies → repeat.

**Your approach — PythonWorker (fast):**

```
Node.js server starts
    ↓
Spawns ONE Python process (pipeline.py --worker mode)
    ↓
Python loads Qwen model ONCE into GPU memory
    ↓
Python prints: {"ready": true}
    ↓
Now it just waits, listening to stdin forever

When a user sends a message:
Node writes one JSON line → Python's stdin
Python reads it → runs model → writes one JSON line → stdout
Node reads stdout → sends response to user
```

It's like a **walkie-talkie** — both sides stay open and pass messages back and forth. The model stays loaded in GPU memory between messages. No loading delay per request.

The "JSON line protocol" means each message is a single line of JSON:

```json
{"message": "show me drones", "language": "en", "context": {...}}
```

Python replies:

```json
{"ok": true, "toolCalled": "search_products", "toolArgs": {...}, ...}
```

If Python crashes, Node falls back to spawning a one-shot process.

---

## 4. What is the Enhanced Prompt vs Original Prompt?

This is the **most important part** of your project.

### Original Prompt (what everyone starts with)

A simple instruction telling the model what tools exist:

```
You are a robotics e-commerce assistant.
Available tools: search_products, get_product, compare_products, recommend, add_to_cart, navigate_to
Return JSON: {"tool": "...", "arguments": {...}}
User message: "show me kitchen robots"
```

This is what the model gets with no extra guidance. The model has to figure out everything by itself.

**Problem:** A 0.6B model is very small. With just this, it got **60% tool accuracy** — it made the wrong choice 40% of the time.

---

### Enhanced Prompt (your production system)

The enhanced prompt adds **two powerful things**:

#### Part 1 — Decision Tree (Priority Rules)

Instead of just listing tools, you give the model an **explicit algorithm** to follow:

```
STEP 1: Does the message say "compare", "vs", "difference between", "versus"?
         → use compare_products

STEP 2: Does it say "add to cart", "buy", "le lena" (Hindi), "konu" (Telugu)?
         → use add_to_cart

STEP 3: Does it ask about one specific product by name or ID?
         → use get_product

STEP 4: Does it say "recommend", "best", "suggest", "which one should I"?
         → use recommend

STEP 5: Navigation intent (go to orders, open cart, show catalog)?
         → use navigate_to

STEP 6: Everything else
         → use search_products
```

This prevents the model from guessing. It now has a checklist to work through.

#### Part 2 — 8 Contrastive Few-Shot Examples

"Contrastive" means you show **similar-looking cases with different correct answers** so the model learns the boundary:

| Example | Input | Why tricky | Correct tool |
|---|---|---|---|
| 1 | "Tell me about Miko 3" | Sounds like search but it's asking for ONE specific product | `get_product` |
| 2 | Hindi: "le lena hai" (want to take/buy it) | Non-English buy signal | `add_to_cart` |
| 3 | "What is the difference between product 2 and 4?" | Has two IDs + difference word | `compare_products` |
| 4 | "Open support ticket" | Navigate action but needs a ui_guide key too | `navigate_to` + `ui_guide=open_support` |
| 5 | Telugu: "konu" (buy) | Telugu buy signal | `add_to_cart` |
| 6 | "Which drone can I get under ₹500?" | Has category + budget = recommend | `recommend` |
| 7 | "Show all home cleaning robots" | Browse a category = search | `search_products` |
| 8 | "Cart: add NexBot" | Unusual phrasing of add to cart | `add_to_cart` |

**Why this works better than fine-tuning:** The model already knows language from its pre-training. The enhanced prompt just gives it **the right decision-making framework** to apply that knowledge. Fine-tuning on 1113 examples actually *hurt* performance because 0.6B is too small — it forgot what it previously knew (catastrophic forgetting).

**Result:** Original prompt → 60% accuracy. Enhanced prompt → **79% accuracy (+19 points)**.

---

## 5. What is Tool Selection and `ui_guide` Key?

### Tool Selection

After the model reads the user's message + context, it must choose **which of 6 functions to call**:

| Tool | What it does |
|---|---|
| `search_products` | Search the catalog by keyword/category |
| `get_product` | Fetch full details of one specific product |
| `compare_products` | Compare two products side by side |
| `recommend` | Rank products by budget + need + context |
| `add_to_cart` | Prepare a product for cart insertion |
| `navigate_to` | Tell the UI to change the page |

The model outputs structured JSON, not free text:

```json
{"tool": "recommend", "arguments": {"need": "fast drone", "budget": 500, "category": "Drone"}}
```

### `ui_guide` Key

This is a **bonus output** your model produces alongside the tool selection. It tells the frontend **which visual walkthrough to show the user**.

For example:
- User asks: *"Where is the cheapest home cleaner?"*
- Tool selected: `navigate_to` (go to catalog page)
- `ui_guide`: `"locate_path:Home Cleaner:3"` (highlight nav → filter → product card #3)

The `ui_guide` value is a string key that maps to a pre-defined animation flow in the frontend. There are 11 possible values:

| Key | What it triggers |
|---|---|
| `check_orders` | Highlights the orders page |
| `track_delivery` | Highlights delivery tracking elements |
| `update_cart` | Highlights the cart drawer |
| `find_drone` / `find_kitchen` etc. | Highlights category filter |
| `compare_products` | Highlights the comparison UI |
| `open_support` | Highlights the support button |
| `locate_path:CATEGORY:ID` | Full guided walkthrough: nav → filter → product card |
| `locate_robot:ID` | Highlights one specific product card |

This makes your chatbot **visually guide the user** through the UI instead of just saying words.

---

## 6. What is the Heuristic Router?

### What is a Heuristic?

A **heuristic** is a rule-of-thumb shortcut — "if the message contains this word, do this action" — no AI involved, just pattern matching.

### What does your Heuristic Router do?

It's a Python function (`_heuristic_tool_call`) that reads the message and applies a series of **if/else keyword checks** to decide the tool:

```python
if "compare" or "vs" or "versus" in text:
    → compare_products

elif "add to cart" or "buy" or "purchase" in text:
    → add_to_cart

elif "recommend" or "best" or "suggest" in text:
    → extract budget, detect category
    → recommend

elif "go to" or "navigate" or "open" in text:
    → navigate_to

elif "detail" or "spec" or "price of" in text:
    → get_product

else:
    → search_products
```

It also does smart extraction:

- **Budget detection:** Regex that finds `₹500`, `$200`, `under 300`, `budget of 1000`
- **Product ID extraction:** Finds `#3`, `product 2`, `robot 7` in the text
- **Category detection:** `kitchen`, `drone`, `clean` → maps to category names
- **Named product lookup:** Tokenizes product names and matches against user message
- **Language hints:** Checks Hindi (`kahan hai`, `mera order`) and Telugu (`ఆర్డర్`) phrases

### When does it activate?

The heuristic is the **fallback** — it runs when:

1. Qwen model fails to load (GPU issue, missing package)
2. Qwen model returns invalid JSON that can't be parsed
3. Qwen model returns `None` (inference error)

The pipeline first tries the model. If that fails, it automatically falls to heuristic. The response's `toolSource` field tells you which path was used: `"model"` or `"heuristic"`.

**Accuracy:** The heuristic alone gets **48% tool accuracy** — basically only works for simple English phrases. The model (79%) is much better, especially for multilingual and complex queries.

---

## 7. Why `execute_tool()` Runs BEFORE Sarvam?

This might seem backwards, but it makes complete sense.

### The reason: Sarvam needs data to talk about

The Sarvam model is responsible for generating the **human-readable response** ("Here are 3 drones under ₹500..."). But Sarvam doesn't have access to your SQLite database. It's a cloud model — it has no idea what products you have.

So the pipeline is:

```
User: "recommend a cheap drone"
         ↓
Qwen decides: tool=recommend, budget=500, category=Drone
         ↓
execute_tool() → queries SQLite → gets actual products back
         ↓
{
  "recommendations": [
    {id: 7, name: "AirPatrol X", price: 299.99, rating: 4.2},
    {id: 9, name: "SkyDrifter", price: 449.95, rating: 3.8}
  ]
}
         ↓
This data is SENT to Sarvam as context
         ↓
Sarvam: "Great choices! The AirPatrol X at $299.99 is top-rated
         with a 4.2 score. The SkyDrifter at $449.95 offers
         longer range. Both fit your budget."
```

If you ran Sarvam first, it would have to invent product names and prices — that's called **hallucination**. By running the database query first and giving Sarvam real data, the response is grounded in truth.

---

## 8. Sarvam Response → AI Side Panel

After Sarvam returns text, `ai.js` packages everything into one response object and sends it back to the frontend:

```json
{
  "response": "Here are drones under ₹500...",
  "toolCalled": "recommend",
  "toolArgs": {...},
  "toolResult": { "recommendations": [...] },
  "productsReferenced": [7, 9],
  "ragEnabled": false,
  "ui_guide": "find_drone",
  "language": "en",
  "proficiency": "beginner"
}
```

The **AISidePanel** React component receives this and:

- Renders the text response (with markdown support)
- Shows product cards for IDs in `productsReferenced`
- Passes `ui_guide` to `UIGuideProvider` to trigger animations

---

## 9. How `UIGuideProvider` Works — Start to End

### What it is

`UIGuideProvider` is a **React context** that wraps your entire app. It watches for `ui_guide` signals from the AI and triggers animated highlight flows over your actual UI elements.

### What it needs to work

Every interactive UI element that can be highlighted must have a **`data-guide-id`** attribute in its HTML:

```jsx
<button data-guide-id="cart-button">Cart</button>
<div data-guide-id="product-card-7">AirPatrol X</div>
<select data-guide-id="category-filter">...</select>
```

### End-to-end flow

```
1. AI response arrives with ui_guide = "locate_path:Drone:7"

2. AISidePanel calls: startGuide("locate_path:Drone:7")

3. UIGuideProvider parses the key:
   - Type: "locate_path" → multi-step navigation guide
   - Category: "Drone"
   - ProductID: 7

4. UIGuideProvider builds a step sequence:
   Step 1 → data-guide-id="navbar-catalog"   (highlight nav link)
   Step 2 → data-guide-id="category-drone"   (highlight drone filter)
   Step 3 → data-guide-id="product-card-7"   (highlight the product)

5. Step 1 starts:
   - UIGuideProvider checks if element exists in current DOM
   - If not on catalog page → triggers React Router navigation first
   - Once page loads → document.querySelector('[data-guide-id="navbar-catalog"]')
   - Gets element's bounding rect (position on screen)
   - Renders floating tooltip + glowing pulse ring at that position
   - Tooltip says: "Click here to go to the catalog"

6. User clicks or presses Next:
   - Step 2 activates → same process for category filter
   - Tooltip: "Select the Drone category here"

7. Step 3 → product card highlighted
   - Tooltip: "Here is AirPatrol X"

8. Guide finishes or user presses Escape → guide exits
```

### For simple keys like `"compare_products"`

```
UIGuideProvider → looks up flows.json
→ finds: compare_products = [data-guide-id="compare-button"]
→ highlights that single element with tooltip
```

---

## 10. What Other Fine-Tuned Models Did You Test and Why You Shifted to Enhanced Prompt?

### Models You Tried

#### v1 — First LoRA Fine-tune (`Qwen3-0.6B-FC v1`)

- **Training:** QLoRA, r=16, 1113 examples, 1 epoch
- **Format:** Old prompt format (not ChatML)
- **Result:** 48% tool accuracy — **worse than the heuristic router**
- **Problem:** Model learned the training examples but couldn't generalize. Also the format wasn't aligned to how Qwen3 was pre-trained.

#### v2 — Improved LoRA (`Qwen3-0.6B-FC v2`)

- **Training:** Same QLoRA but switched to proper **ChatML format** (how Qwen3 was pre-trained)
- **Added:** Better data cleaning, stratified splits, UI guide labels in training data
- **Result:** 51% tool accuracy — slight improvement but still below expectations
- **Problem:** Still catastrophic forgetting. 0.6B is too small. When you fine-tune it on 1113 task-specific examples, it loses general reasoning ability needed to handle edge cases.

#### 4-GPU DDP Training (`train_4gpu.py`)

- Tried multi-GPU training with 4×A6000 GPUs using `torchrun`
- More compute, same architecture
- Did not significantly improve results — the problem isn't compute, it's model size

### Why Enhanced Prompt Won

The insight from your ablation study:

> **Fine-tuning a 0.6B model with 1113 examples causes catastrophic forgetting. The model forgets general function-calling ability it learned during pre-training.**

Instead of teaching the model new behaviors, the enhanced prompt **exploits what the model already knows** by giving it a clear decision framework. The base Qwen3-0.6B already knows English, Hindi, and Telugu. It already understands JSON. You just needed to tell it the rules explicitly.

**Final result:**

| Approach | Tool Accuracy |
|---|---|
| Heuristic only | 48% |
| LoRA v1 | 48% |
| LoRA v2 | 51% |
| Original prompt (base model) | 60% |
| **Enhanced prompt (base model)** | **79% ✓** |

---

## 11. What is Your Novelty in This Project?

Your project has **four genuine novelties:**

### 1. Decoupled Dual-Model Architecture

You separate **intent routing** (local, fast, small model) from **language generation** (cloud API). Most chatbots either run everything locally (slow, expensive) or everything in the cloud (privacy concerns, latency). You split the job:

- **Qwen3-0.6B:** *"What does the user want?"* — runs on your GPU, ~1.1 seconds
- **Sarvam-M:** *"How should I respond?"* — cloud API, supports 3 languages natively

### 2. Enhanced Prompt > Fine-Tuning for Sub-1B Models

You empirically showed that for 0.6B models with small datasets, **structured prompting (decision tree + contrastive few-shots) outperforms LoRA fine-tuning by 28 percentage points**. This is a research finding — it contradicts the assumption that fine-tuning always helps.

### 3. `ui_guide` as a First-Class AI Output

Most AI assistants return text. Your model returns **both** a tool call **and** a UI guide key. The AI doesn't just answer — it physically walks the user through the interface. This is novel for e-commerce chatbots.

### 4. Romanized Multilingual Routing Without a Multilingual Model

You use Sarvam STT to convert Hindi/Telugu speech → romanized Latin text → English-capable local model. This means your local 0.6B model handles multilingual queries without needing a 7B+ multilingual model. Cost: near zero. Accuracy: 67–83% per language.

---

## 12. The 5 Routing Strategies You Tested (Empirical Ablations)

An **ablation** means: remove or change one component at a time and measure what breaks. You tested 5 routing strategies against the same 100-row test set.

### Strategy 1: Pure Heuristic Router

- **What it is:** No model at all. Pure Python if/else keyword matching.
- **Result:** 48% tool accuracy, 29% arg F1
- **Where it failed:**
  - Any non-English input → completely missed
  - Ambiguous phrasing ("tell me about this" when viewing a product → should be `get_product` but heuristic chose `search_products`)
  - No `ui_guide` output at all (0.27 score)
- **Conclusion:** Works as a fallback but not good enough for production

### Strategy 2: Qwen3-0.6B Base + Original Simple Prompt

- **What it is:** Base model, minimal prompt (tool names + format only)
- **Result:** 60% tool accuracy, 45% arg F1
- **Where it failed:**
  - 9 cases: `search` instead of `get_product` (missed currentProduct context)
  - 8 cases: `search` instead of `compare` ("difference between X and Y" confused)
  - 7 cases: `search` instead of `navigate` ("open orders" → model searches instead)
  - 7 cases: `navigate` instead of `add_to_cart` (missed cart intent)
  - 5 cases: `navigate` instead of `recommend` ("which is best?" → goes to page instead)
- **Conclusion:** Decent baseline but confused by ambiguous phrasing

### Strategy 3: QLoRA Fine-tuned v1 (`Qwen3-0.6B-FC v1`)

- **What it is:** LoRA fine-tuning, r=16, 1113 examples, old prompt format
- **Result:** 48% tool accuracy — equal to heuristic
- **Where it failed:**
  - Old non-ChatML format caused token misalignment
  - Model memorized training examples but couldn't generalize
  - Hindi/Telugu accuracy actually dropped vs base model
- **Conclusion:** Fine-tuning in wrong format destroyed more than it helped

### Strategy 4: QLoRA Fine-tuned v2 (`Qwen3-0.6B-FC v2`)

- **What it is:** LoRA fine-tuning with proper ChatML format, cleaned data, stratified split
- **Result:** 51% tool accuracy, 31% arg F1
- **Where it failed:**
  - Better than v1 but still catastrophic forgetting on edge cases
  - Multilingual still weak (EN improved but HI/TE didn't improve proportionally)
  - `ui_guide` accuracy: 0.30 (model confuses when to emit it)
- **Conclusion:** Format fix helped but the fundamental size constraint remains

### Strategy 5: Base Model + Enhanced System Prompt ← PRODUCTION

- **What it is:** Base Qwen3-0.6B (no fine-tuning) + decision tree + 8 contrastive few-shots
- **Result:** 79% tool accuracy, 54% arg F1, 52% ui_guide accuracy
- **Why it worked:**
  - Decision tree eliminates ambiguity for common confusions
  - Contrastive examples cover all the failure modes found in Strategy 2
  - Model's pre-trained multilingual understanding is preserved (not overwritten)
  - 1.1 second latency (vs 1.9 seconds for fine-tuned, which needed more tokens to decode)
- **Conclusion:** This is your production system. Best accuracy, lowest latency, no training cost.

---

## 13. Benchmarks — What You Tested and What They Mean

### Test Set

**100 fixed held-out examples** (`finetune/data/test.jsonl`) — never used during training. Stratified across all 6 tools and 3 languages. Same test set for every strategy → fair comparison.

### Benchmark B1 — Function-Calling Accuracy (Main Benchmark)

| Metric | What it measures |
|---|---|
| **Tool Accuracy** | Did the model pick the correct tool? (e.g., `recommend` not `search_products`) |
| **Arg F1** | Are the arguments correct? F1 score between predicted and expected JSON keys+values |
| **UI Guide Accuracy** | Did the model output the right `ui_guide` key when one was expected? |
| **p50 Latency** | Median time (milliseconds) from message in → JSON out |

**Results:**

| System | Tool Acc | Arg F1 | UI Guide | Latency |
|---|---|---|---|---|
| Heuristic | 0.48 | 0.29 | 0.27 | ~0ms |
| LoRA v1 | 0.48 | 0.29 | 0.28 | 1910ms |
| LoRA v2 | 0.51 | 0.31 | 0.30 | 1880ms |
| Base + Original | 0.60 | 0.46 | 0.35 | 1442ms |
| **Base + Enhanced** | **0.79** | **0.55** | **0.52** | **1113ms** |

### Benchmark B2 — Baseline Quality (75 Hand-Crafted Prompts)

Before the 100-row test set was finalized, you tested the base model with 75 hand-crafted prompts to understand its raw capabilities:

| Metric | EN | HI | TE | Overall |
|---|---|---|---|---|
| Tool accuracy | 66% | 71% | 68% | **68%** |
| Full match (tool + args exactly right) | 16% | 21% | 11% | **16%** |
| Parse rate (valid JSON output) | 87% | 87% | 87% | **87%** |

**What this told you:** The base model is already reasonable (68%) and it can actually parse Hindi/Telugu. Full match being only 16% means the tool is right but the arguments are often wrong (wrong product ID, wrong budget extracted, etc.) → motivated the decision tree for argument extraction.

### Benchmark B4 — Multilingual Accuracy

Separate breakdown by language to see where each strategy struggles:

| System | EN | HI | TE |
|---|---|---|---|
| Heuristic | 0.47 | 0.37 | 0.67 |
| LoRA v1 | 0.44 | 0.59 | 0.44 |
| **Base + Enhanced** | **0.84** | **0.67** | **0.83** |

**Key insight:** Heuristic is surprisingly OK at Telugu (0.67) because Telugu product-related words are predictable. But terrible at Hindi (0.37) because Hindi has flexible word order. The enhanced prompt brings all three languages above 0.67.

### Benchmark B3 — RAG/Semantic Ranking (`bench_rag.py`)

This tested whether turning on `ENABLE_SEMANTIC_RAG=1` (sentence-transformers + FAISS for product ranking) improved recommendation quality vs. the lexical fallback.

**Conclusion:** For a 12-product catalog, semantic embeddings provided marginal improvement not worth the GPU memory cost — which is why `ENABLE_SEMANTIC_RAG=0` is the right setting for this project.

---

## Quick Reference Summary

```
User types message
       ↓
UserActivityContext packages cart + viewed + currentPage into context object
       ↓
POST /api/ai/chat — Node.js receives it
       ↓
PythonWorker IPC — sends JSON line to persistent Python subprocess
       ↓
pipeline.py — fc_model.py runs Qwen3-0.6B with Enhanced Prompt
  → Decision tree + 8 few-shot examples → picks 1 of 6 tools + ui_guide key
  → If model fails → heuristic keyword router takes over
       ↓
execute_tool() — queries SQLite for real product data
       ↓
sarvam_client.py — sends tool result + context to Sarvam API over internet
  → Sarvam-M generates human-readable response in EN/HI/TE
  → _strip_thinking_tags() removes <think>...</think> blocks
       ↓
Response sent back to React frontend
       ↓
AISidePanel renders text + product cards
UIGuideProvider reads ui_guide key → animates glowing highlights on UI elements
```

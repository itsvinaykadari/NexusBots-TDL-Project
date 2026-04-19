"""
Nexus Bots — Fine-tuning configuration for Qwen3-0.6B.

All hyperparameters, paths, and constants in one place.
"""

import os
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
FINETUNE_ROOT = Path(__file__).resolve().parent

DATASET_V1_PATH = PROJECT_ROOT / "research" / "dataset" / "final" / "function_calling_v1.jsonl"
TOOL_SCHEMAS_PATH = PROJECT_ROOT / "research" / "dataset" / "tool_schemas.json"
PRODUCT_CATALOG_PATH = PROJECT_ROOT / "research" / "dataset" / "product_catalog.json"

DATA_DIR = FINETUNE_ROOT / "data"
TRAIN_PATH = DATA_DIR / "train_v3.jsonl"
TEST_PATH = DATA_DIR / "test.jsonl"
FULL_V2_PATH = DATA_DIR / "function_calling_v2.jsonl"

OUTPUT_DIR = FINETUNE_ROOT / "output"
ADAPTER_DIR = OUTPUT_DIR / "qwen3-0_6b-fc-v3"
MERGED_DIR = OUTPUT_DIR / "qwen3-0_6b-fc-v3-merged"

RESULTS_DIR = PROJECT_ROOT / "research" / "results"

# ── Model ────────────────────────────────────────────────────────────────────
BASE_MODEL = os.getenv("BASE_MODEL", "Qwen/Qwen3-0.6B")  # HF model ID
# Unsloth mirror if available:
UNSLOTH_MODEL = os.getenv("UNSLOTH_MODEL", "unsloth/Qwen3-0.6B")

MAX_SEQ_LENGTH = 1024

# ── QLoRA ────────────────────────────────────────────────────────────────────
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
TARGET_MODULES = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
]

# ── Training ─────────────────────────────────────────────────────────────────
NUM_EPOCHS = 1
PER_DEVICE_BATCH_SIZE = 4
GRADIENT_ACCUMULATION_STEPS = 4  # effective batch = 16
LEARNING_RATE = 5e-5
WARMUP_RATIO = 0.1
# Warmup steps = ceil(WARMUP_RATIO × total_steps); total_steps ≈ (1113 / 16) × 1 ≈ 70
WARMUP_STEPS = max(1, int(WARMUP_RATIO * (1113 // (4 * 4)) * 1))  # ≈ 7
LR_SCHEDULER = "cosine"
WEIGHT_DECAY = 0.01
SAVE_STEPS = 200
LOGGING_STEPS = 10
FP16 = False
BF16 = True  # Qwen3 works well with bf16

# ── Dataset split ────────────────────────────────────────────────────────────
TEST_SIZE = 100  # holdout rows for evaluation
RANDOM_SEED = 42

# ── Tool schemas (compact, for system prompt) ───────────────────────────────
TOOL_SCHEMAS_COMPACT = [
    {
        "name": "search_products",
        "description": "Search products by query and optional category filter.",
        "parameters": {
            "query": "string (search text)",
            "category": "string? (Kitchen|Home Cleaner|Drone|Humanoid)",
        },
    },
    {
        "name": "get_product",
        "description": "Fetch full details for a single product.",
        "parameters": {"product_id": "integer (1-12)"},
    },
    {
        "name": "compare_products",
        "description": "Compare two products with an optional focus.",
        "parameters": {
            "product_id_1": "integer (1-12)",
            "product_id_2": "integer (1-12)",
            "focus": "string? (price|suction|battery|payload|safety|maintenance|camera|mobility|specs|warranty)",
        },
    },
    {
        "name": "recommend",
        "description": "Recommend products based on need, budget, and category.",
        "parameters": {
            "need": "string (user need description)",
            "budget": "integer (50-20000)",
            "category": "string? (Kitchen|Home Cleaner|Drone|Humanoid)",
        },
    },
    {
        "name": "add_to_cart",
        "description": "Add a product to cart.",
        "parameters": {"product_id": "integer (1-12)"},
    },
    {
        "name": "navigate_to",
        "description": "Navigate user to a page with optional params.",
        "parameters": {
            "page": "string (home|catalog|assistant|product|cart|orders)",
            "params": "object? (category, product_id, query, sort)",
        },
    },
]

# ── UI Guide keys ────────────────────────────────────────────────────────────
UI_GUIDE_KEYS = [
    "check_orders",
    "track_delivery",
    "update_cart",
    "find_drone",
    "find_kitchen",
    "find_home_cleaner",
    "find_humanoid",
    "compare_products",
    "open_support",
    "new_ticket",
    "view_tickets",
]

CATEGORY_TO_GUIDE = {
    "Drone": "find_drone",
    "Kitchen": "find_kitchen",
    "Home Cleaner": "find_home_cleaner",
    "Humanoid": "find_humanoid",
}

# ── System prompt template ───────────────────────────────────────────────────
import json

PRODUCT_CATALOG_BLOCK = """Product Catalog (12 robots, fixed):
ID  | Name                       | Category     | Price
1   | Amazon Astro               | Kitchen      | $1599.99
2   | Samsung Ballie             | Kitchen      | $1299.99
3   | Enabot EBO X               | Kitchen      | $599.99
4   | iRobot Roomba j9+          | Home Cleaner | $799.99
5   | Roborock S8 MaxV Ultra     | Home Cleaner | $1799.99
6   | Ecovacs WINBOT W2 Omni     | Home Cleaner | $499.99
7   | Ring Always Home Cam       | Drone        | $249.99   (cheapest drone)
8   | DJI Matrice 30T            | Drone        | $13600.00 (enterprise, thermal)
9   | Aiper Surfer S1            | Drone        | $1399.99  (pool drone)
10  | Miko 3                     | Humanoid     | $249.99   (kids, age 5-12)
11  | Wonder Workshop Dash       | Humanoid     | $149.99   (cheapest humanoid, coding)
12  | LEGO Education Spike Prime | Humanoid     | $395.95   (classroom, python)"""

UI_STRUCTURE_BLOCK = """App Structure:
- /catalog/kitchen → Kitchen robots (IDs 1-3)
- /catalog/home-cleaner → Home Cleaner robots (IDs 4-6)
- /catalog/drone → Drone robots (IDs 7-9)
- /catalog/humanoid → Humanoid robots (IDs 10-12)
- /robot/:id → Product detail
- /orders → Order history + Support tab (tickets, complaints)
- Cart: side drawer (navigate_to page=cart)

Rules:
- For product names, resolve ID from catalog above
- Support/ticket queries → navigate_to page=orders + ui_guide=open_support/new_ticket/view_tickets
- Location queries ("where is X", "kahan", "ekkada") → navigate_to page=catalog with product_id
- Out-of-scope queries (not about robots) → search_products query=robot"""

# SYSTEM_PROMPT: used for ChatML-based training (system/user/assistant messages).
# Identical to server/ai/fc_model.py SYSTEM_PROMPT — keep both in sync.
SYSTEM_PROMPT = f"""You are a robotics commerce assistant. Given a user query and page context, respond with exactly one JSON object selecting a tool call.

{PRODUCT_CATALOG_BLOCK}

{UI_STRUCTURE_BLOCK}

Available tools:
{json.dumps(TOOL_SCHEMAS_COMPACT, indent=2)}

Valid ui_guide values: {json.dumps(UI_GUIDE_KEYS)}

Respond ONLY with a JSON object:
{{"tool": "<tool_name>", "arguments": {{...}}, "ui_guide": "<key_or_null>"}}

Rules:
- Pick exactly one tool that best matches the user's intent.
- Arguments must be valid per the tool schema.
- ui_guide must be one of the valid keys or null.
- For search/recommend with a category, set ui_guide to the matching find_<category> key.
- For navigate_to page=orders, set ui_guide to "check_orders".
- For navigate_to page=cart, set ui_guide to "update_cart".
- For compare_products, set ui_guide to "compare_products".
- For support/ticket queries, set ui_guide to open_support/new_ticket/view_tickets.
- Otherwise set ui_guide to null.
- Queries may be in English (EN), romanized Hindi (HI), or romanized Telugu (TE). Always respond in JSON only — never in the query language.
- If the query has no category name, read selectedCategory from Context to determine the correct category."""


# PIPELINE_PROMPT_TEMPLATE: matches pipeline.py _build_function_prompt() EXACTLY.
# This is used when deploying into the existing pipeline which uses raw text
# prompting via transformers pipeline("text-generation"), NOT ChatML.
# The pipeline only expects {"tool": "...", "arguments": {...}} — no ui_guide.
PIPELINE_PROMPT_TEMPLATE = (
    "You are a robotics e-commerce function router. "
    "Return ONLY valid JSON with this shape: "
    '{{"tool":"<tool_name>","arguments":{{...}}}}. '
    "Allowed tools: search_products, get_product, compare_products, recommend, add_to_cart, navigate_to. "
    "Categories: Kitchen, Home Cleaner, Drone, Humanoid. "
    "Pages: home, catalog, assistant, product, cart, orders. "
    "Language: {language}. "
    "Context: {context}. "
    "User message: {message}"
)

# ── HuggingFace Hub ──────────────────────────────────────────────────────────
HF_REPO_ID = os.getenv("HF_REPO_ID", "nexus-bots/qwen3-0_6b-fc-v1")

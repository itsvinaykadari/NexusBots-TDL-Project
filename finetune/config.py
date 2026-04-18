"""
Nexus Bots — Fine-tuning configuration for Qwen3.5-0.8B.

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
TRAIN_PATH = DATA_DIR / "train.jsonl"
TEST_PATH = DATA_DIR / "test.jsonl"
FULL_V2_PATH = DATA_DIR / "function_calling_v2.jsonl"

OUTPUT_DIR = FINETUNE_ROOT / "output"
ADAPTER_DIR = OUTPUT_DIR / "qwen35-0_8b-fc-v1"
MERGED_DIR = OUTPUT_DIR / "qwen35-0_8b-fc-v1-merged"

RESULTS_DIR = PROJECT_ROOT / "research" / "results"

# ── Model ────────────────────────────────────────────────────────────────────
BASE_MODEL = os.getenv("BASE_MODEL", "Qwen/Qwen3.5-0.8B")  # HF model ID
# Unsloth mirror if available:
UNSLOTH_MODEL = os.getenv("UNSLOTH_MODEL", "unsloth/Qwen3.5-0.8B")

MAX_SEQ_LENGTH = 1024

# ── QLoRA ────────────────────────────────────────────────────────────────────
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.0
TARGET_MODULES = [
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
]

# ── Training ─────────────────────────────────────────────────────────────────
NUM_EPOCHS = 3
PER_DEVICE_BATCH_SIZE = 4
GRADIENT_ACCUMULATION_STEPS = 4  # effective batch = 16
LEARNING_RATE = 2e-4
WARMUP_RATIO = 0.03
LR_SCHEDULER = "cosine"
WEIGHT_DECAY = 0.01
SAVE_STEPS = 200
LOGGING_STEPS = 10
FP16 = False
BF16 = True  # Qwen3.5 works well with bf16

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
    "find_cleaner",
    "find_humanoid",
    "compare_products",
]

CATEGORY_TO_GUIDE = {
    "Drone": "find_drone",
    "Kitchen": "find_kitchen",
    "Home Cleaner": "find_cleaner",
    "Humanoid": "find_humanoid",
}

# ── System prompt template ───────────────────────────────────────────────────
import json

# SYSTEM_PROMPT: used for ChatML-based training (system/user/assistant messages).
# This is our full-featured prompt with ui_guide.  The pipeline can be updated
# to use ChatML once Phase 2 integrates the fine-tuned model properly.
SYSTEM_PROMPT = f"""You are a robotics commerce assistant. Given a user query and page context, respond with exactly one JSON object selecting a tool call.

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
- Otherwise set ui_guide to null."""


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
HF_REPO_ID = os.getenv("HF_REPO_ID", "nexus-bots/qwen35-0_8b-fc-v1")

"""
Nexus Bots — Drop-in integration for fine-tuned model into pipeline.py.

This file replaces the _model_tool_call() and _load_fc_generator() functions
in server/ai/pipeline.py to use our fine-tuned Qwen3-0.6B with proper
ChatML formatting.

Phase 2 integration instructions:
1. Copy this file to server/ai/fc_model.py
2. In pipeline.py, replace _model_tool_call() with a call to this module
3. Set env vars: ENABLE_FC_MODEL=1, FC_MODEL_PATH=/path/to/adapter/or/merged

This ensures:
- Correct ChatML prompt format (system/user/assistant)
- Model outputs {"tool": "...", "arguments": {...}, "ui_guide": "..."}
- Pipeline only uses {"tool", "arguments"}, extra keys are safely ignored
- Falls back gracefully if model loading fails
"""

import json
import os
import re
from typing import Any, Dict, Optional

# ── Singleton state ──────────────────────────────────────────────────────────
_model = None
_tokenizer = None
_load_error: Optional[str] = None

# ── System prompt (matches what model was trained with) ──────────────────────
TOOL_SCHEMAS = [
    {"name": "search_products", "description": "Search products by query and optional category filter.", "parameters": {"query": "string (search text)", "category": "string? (Kitchen|Home Cleaner|Drone|Humanoid)"}},
    {"name": "get_product", "description": "Fetch full details for a single product.", "parameters": {"product_id": "integer (1-12)"}},
    {"name": "compare_products", "description": "Compare two products with an optional focus.", "parameters": {"product_id_1": "integer (1-12)", "product_id_2": "integer (1-12)", "focus": "string? (price|suction|battery|payload|safety|maintenance|camera|mobility|specs|warranty)"}},
    {"name": "recommend", "description": "Recommend products based on need, budget, and category.", "parameters": {"need": "string (user need description)", "budget": "integer (50-20000)", "category": "string? (Kitchen|Home Cleaner|Drone|Humanoid)"}},
    {"name": "add_to_cart", "description": "Add a product to cart.", "parameters": {"product_id": "integer (1-12)"}},
    {"name": "navigate_to", "description": "Navigate user to a page with optional params.", "parameters": {"page": "string (home|catalog|assistant|product|cart|orders)", "params": "object? (category, product_id, query, sort)"}},
]

UI_GUIDE_KEYS = ["check_orders", "track_delivery", "update_cart", "find_drone", "find_kitchen", "find_home_cleaner", "find_humanoid", "compare_products", "open_support", "new_ticket", "view_tickets"]

SYSTEM_PROMPT = (
    "You are a robotics commerce assistant. Given a user query and page context, "
    "respond with exactly one JSON object selecting a tool call.\n\n"
    f"Available tools:\n{json.dumps(TOOL_SCHEMAS, indent=2)}\n\n"
    f"Valid ui_guide values: {json.dumps(UI_GUIDE_KEYS)}\n\n"
    'Respond ONLY with a JSON object:\n'
    '{"tool": "<tool_name>", "arguments": {...}, "ui_guide": "<key_or_null>"}\n\n'
    "Rules:\n"
    "- Pick exactly one tool that best matches the user's intent.\n"
    "- Arguments must be valid per the tool schema.\n"
    "- ui_guide must be one of the valid keys or null.\n"
    "- For search/recommend with a category, set ui_guide to the matching find_<category> key.\n"
    '- For navigate_to page=orders, set ui_guide to "check_orders".\n'
    '- For navigate_to page=cart, set ui_guide to "update_cart".\n'
    '- For compare_products, set ui_guide to "compare_products".\n'
    "- Otherwise set ui_guide to null."
)

ALLOWED_TOOLS = {"search_products", "get_product", "compare_products", "recommend", "add_to_cart", "navigate_to"}


def load_model() -> bool:
    """Load the fine-tuned model. Returns True if successful."""
    global _model, _tokenizer, _load_error

    if _model is not None:
        return True
    if _load_error is not None:
        return False

    model_path = os.getenv("FC_MODEL_PATH") or os.getenv("FC_MODEL_ID")
    if not model_path:
        _load_error = "FC_MODEL_PATH or FC_MODEL_ID not set"
        return False

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        local_only = bool(os.getenv("FC_MODEL_PATH"))
        _tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=local_only)

        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32
        _model = AutoModelForCausalLM.from_pretrained(
            model_path, local_files_only=local_only,
            dtype=dtype,
        ).to(device)
        _model.eval()
        return True
    except Exception as e:
        _load_error = str(e)
        return False


def predict_tool_call(message: str, language: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Predict a tool call using the fine-tuned model with ChatML formatting.

    Returns {"tool": str, "arguments": dict} or None on failure.
    The pipeline's _sanitize_tool_call() handles validation downstream.
    """
    if not load_model():
        return None

    context_json = json.dumps(context, ensure_ascii=False)
    user_content = f"Query: {message}\nContext: {context_json}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    try:
        input_text = _tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = _tokenizer(input_text, return_tensors="pt")
        if hasattr(_model, "device"):
            inputs = {k: v.to(_model.device) for k, v in inputs.items()}

        outputs = _model.generate(
            **inputs,
            max_new_tokens=180,
            do_sample=False,
            temperature=0.0,
            pad_token_id=_tokenizer.eos_token_id,
        )

        generated_ids = outputs[0][inputs["input_ids"].shape[1]:]
        text = _tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

        parsed = _extract_json(text)
        if not isinstance(parsed, dict):
            return None

        tool = parsed.get("tool")
        if tool not in ALLOWED_TOOLS:
            return None

        arguments = parsed.get("arguments")
        if not isinstance(arguments, dict):
            arguments = {}

        result = {"tool": tool, "arguments": arguments}
        ui_guide = parsed.get("ui_guide")
        if isinstance(ui_guide, str) and ui_guide in UI_GUIDE_KEYS:
            result["ui_guide"] = ui_guide
        return result

    except Exception:
        return None


def _extract_json(text: str) -> Optional[dict]:
    """Extract first JSON object from text."""
    text = text.strip()
    if not text:
        return None

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    for match in re.findall(r"\{[^{}]*\}", text):
        try:
            parsed = json.loads(match)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            continue

    return None

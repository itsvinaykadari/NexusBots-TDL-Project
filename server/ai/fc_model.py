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
import sys
import time
from typing import Any, Dict, Optional


def _log(msg: str) -> None:
    """Write a timestamped diagnostic line to stderr (visible in server logs)."""
    print(f"[FC_MODEL] {msg}", file=sys.stderr, flush=True)

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
- Out-of-scope queries (not about robots) → search_products query=robot
- Queries may be in English (EN), romanized Hindi (HI), or romanized Telugu (TE). Always respond in JSON only.
- If the query has no category name, read selectedCategory from Context to determine the correct category."""

SYSTEM_PROMPT = (
    "You are a robotics commerce assistant. Given a user query and page context, "
    "respond with exactly one JSON object selecting a tool call.\n\n"
    f"{PRODUCT_CATALOG_BLOCK}\n\n"
    f"{UI_STRUCTURE_BLOCK}\n\n"
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
    '- For support/ticket queries, set ui_guide to open_support/new_ticket/view_tickets.\n'
    "- Otherwise set ui_guide to null.\n"
    "- Queries may be in English (EN), romanized Hindi (HI), or romanized Telugu (TE). Always respond in JSON only.\n"
    "- If the query has no category name, read selectedCategory from Context to determine the correct category."
)

ALLOWED_TOOLS = {"search_products", "get_product", "compare_products", "recommend", "add_to_cart", "navigate_to"}


def load_model() -> bool:
    """Load the model. Returns True if successful. All errors go to stderr."""
    global _model, _tokenizer, _load_error

    if _model is not None:
        return True
    if _load_error is not None:
        _log(f"Skipping load (cached error): {_load_error}")
        return False

    model_path = os.getenv("FC_MODEL_PATH") or os.getenv("FC_MODEL_ID")
    if not model_path:
        _load_error = "FC_MODEL_PATH or FC_MODEL_ID not set in environment"
        _log(f"ERROR: {_load_error}")
        return False

    _log(f"Loading model: {model_path!r}")
    _log(f"ENABLE_FC_MODEL={os.getenv('ENABLE_FC_MODEL', '(not set)')!r}")
    t0 = time.time()

    try:
        import torch
        _log(f"torch {torch.__version__} | CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            for i in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(i)
                mem_gb = props.total_memory / 1024**3
                _log(f"  GPU {i}: {props.name} | {mem_gb:.1f} GB VRAM")

        from transformers import AutoModelForCausalLM, AutoTokenizer

        local_only = bool(os.getenv("FC_MODEL_PATH"))
        _log(f"local_files_only={local_only} | loading tokenizer...")
        _tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=local_only)
        _log(f"Tokenizer loaded: vocab_size={_tokenizer.vocab_size}")

        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32
        _log(f"Loading model onto device={device!r} dtype={dtype} ...")
        _model = AutoModelForCausalLM.from_pretrained(
            model_path, local_files_only=local_only,
            dtype=dtype,               # transformers v5+ uses 'dtype', not 'torch_dtype'
        ).to(device)
        _model.eval()
        param_count = sum(p.numel() for p in _model.parameters()) / 1e6
        elapsed = time.time() - t0
        _log(f"Model ready: {param_count:.0f}M params on {device} | load took {elapsed:.1f}s")
        if device == "cuda":
            allocated_gb = torch.cuda.memory_allocated() / 1024**3
            reserved_gb = torch.cuda.memory_reserved() / 1024**3
            _log(f"VRAM after load: allocated={allocated_gb:.2f} GB | reserved={reserved_gb:.2f} GB")
        return True
    except Exception as e:
        _load_error = str(e)
        _log(f"ERROR loading model: {_load_error}")
        return False


def predict_tool_call(message: str, language: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Predict a tool call using the fine-tuned model with ChatML formatting.

    Returns {"tool": str, "arguments": dict} or None on failure.
    The pipeline's _sanitize_tool_call() handles validation downstream.
    """
    if not load_model():
        _log(f"predict_tool_call: model not loaded (_load_error={_load_error!r}) → returning None")
        return None

    context_json = json.dumps(context, ensure_ascii=False)
    user_content = f"Query: {message}\nContext: {context_json}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    _log(f"--- Inference START ---")
    _log(f"  language : {language!r}")
    _log(f"  query    : {message!r}")
    _log(f"  context  : {json.dumps(context, ensure_ascii=False)[:120]}")

    try:
        # Disable Qwen3 "thinking" mode — without this the model outputs a
        # <think>...</think> reasoning trace that fills all tokens before the
        # JSON, causing a parse fail and heuristic fallback every time.
        try:
            input_text = _tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True,
                enable_thinking=False,   # Qwen3-specific: skip chain-of-thought
            )
            _log("  thinking mode: DISABLED (enable_thinking=False)")
        except TypeError:
            # Older tokenizer config that doesn't understand enable_thinking
            input_text = _tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True,
            )
            _log("  thinking mode: tokenizer does not support enable_thinking flag")

        inputs = _tokenizer(input_text, return_tensors="pt")
        input_token_count = inputs["input_ids"].shape[1]
        _log(f"  input tokens : {input_token_count} | max_new_tokens: 300")

        if hasattr(_model, "device"):
            inputs = {k: v.to(_model.device) for k, v in inputs.items()}

        t0 = time.time()
        outputs = _model.generate(
            **inputs,
            max_new_tokens=300,
            do_sample=False,
            pad_token_id=_tokenizer.eos_token_id,
        )
        latency_ms = (time.time() - t0) * 1000

        generated_ids = outputs[0][inputs["input_ids"].shape[1]:]
        output_token_count = len(generated_ids)
        text = _tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

        _log(f"  output tokens: {output_token_count} | latency: {latency_ms:.0f}ms")
        _log(f"  raw output   : {text!r}")

        import torch
        if torch.cuda.is_available():
            alloc = torch.cuda.memory_allocated() / 1024**3
            _log(f"  VRAM used    : {alloc:.2f} GB")

        parsed = _extract_json(text)
        if not isinstance(parsed, dict):
            _log(f"  PARSE FAIL: could not extract JSON from output → returning None")
            return None

        tool = parsed.get("tool")
        if tool not in ALLOWED_TOOLS:
            _log(f"  INVALID TOOL: {tool!r} not in allowed set → returning None")
            return None

        arguments = parsed.get("arguments")
        if not isinstance(arguments, dict):
            arguments = {}

        result = {"tool": tool, "arguments": arguments}
        ui_guide = parsed.get("ui_guide")
        if isinstance(ui_guide, str) and ui_guide in UI_GUIDE_KEYS:
            result["ui_guide"] = ui_guide

        _log(f"  result       : tool={tool!r} args={arguments} ui_guide={result.get('ui_guide')!r}")
        _log(f"--- Inference END ---")
        return result

    except Exception as e:
        _log(f"  EXCEPTION during inference: {type(e).__name__}: {e}")
        return None


def _extract_json(text: str) -> Optional[dict]:
    """Extract first JSON object from text, stripping Qwen3 artifacts."""
    text = text.strip()
    if not text:
        return None

    # 1. Strip residual <think>...</think> blocks (safety net).
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE).strip()

    # 2. Strip markdown code fences — Qwen3 sometimes wraps output in ```json ... ```
    text = re.sub(r"^```(?:json)?\s*", "", text).strip()
    text = re.sub(r"\s*```\s*$", "", text).strip()

    # 3. Fast path: the whole text is valid JSON
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # 4. Find the outermost {...} (handles nested braces correctly)
    depth = 0
    start = -1
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start != -1:
                candidate = text[start:i + 1]
                try:
                    parsed = json.loads(candidate)
                    if isinstance(parsed, dict):
                        return parsed
                except Exception:
                    pass
                start = -1

    # 5. Last-resort: try every {...} substring (no nesting check)
    for match in re.findall(r"\{[^{}]*\}", text):
        try:
            parsed = json.loads(match)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            continue

    return None

# Phase 3 → Phase 2 Integration Guide

## What Phase 3 Produces

A fine-tuned Qwen3-0.6B model that, given a user query + page context, outputs:
```json
{"tool": "search_products", "arguments": {"query": "kitchen robots", "category": "Kitchen"}, "ui_guide": "find_kitchen"}
```

The pipeline only needs `tool` + `arguments`. The `ui_guide` field is extra — use it or ignore it.

## How to Integrate (3 changes)

### 1. Copy the model integration module

```bash
cp finetune/integration/fc_model.py server/ai/fc_model.py
```

### 2. Update pipeline.py `_model_tool_call()`

Replace the current method (which uses raw text prompting) with a call to `fc_model`:

```python
# In pipeline.py, replace _model_tool_call() body:

def _model_tool_call(self, message, language, context):
    from fc_model import predict_tool_call
    return predict_tool_call(message, language, context)
```

This correctly uses ChatML format (`tokenizer.apply_chat_template()`) instead of raw text prompting, which is what the model was trained with.

### 3. Set environment variables

```bash
# Point to the merged model directory (after training):
export ENABLE_FC_MODEL=1
export FC_MODEL_PATH=/path/to/qwen3-0_6b-fc-v1-merged

# OR use HuggingFace model ID:
export ENABLE_FC_MODEL=1
export FC_MODEL_ID=nexus-bots/qwen3-0_6b-fc-v1
```

## What Still Works Without Integration

Even without these changes, the pipeline works via heuristic fallback. The fine-tuned model improves accuracy on:
- Multilingual queries (Hindi, Telugu)
- Ambiguous intents
- Complex tool argument extraction (budget parsing, category detection)
- Edge cases the heuristic misses

## Optional: ui_guide Support

If you want the frontend to highlight relevant UI elements:

### In pipeline.py `run_pipeline()`:
```python
# After line: tool_result = runtime.execute_tool(...)
# Add ui_guide extraction:
ui_guide = selected_tool.get("ui_guide")  # from model output, may be None
```

Then include it in the return dict:
```python
return {
    ...existing fields...,
    "uiGuide": ui_guide,  # new field
}
```

### In routes/ai.js response:
```javascript
// Add to the response object:
uiGuide: pipelineResult.uiGuide || null,
```

### In frontend (ChatWidget / AIAssistant):
Use `data.uiGuide` to highlight buttons, scroll to sections, or trigger navigation.

## Compatibility Matrix

| Aspect | Matches pipeline.py? | Evidence |
|--------|---------------------|----------|
| Tool names (6) | ✅ YES | search_products, get_product, compare_products, recommend, add_to_cart, navigate_to |
| `"arguments"` key | ✅ YES | pipeline.py line 652: `parsed.get("arguments")` |
| Argument schemas | ✅ YES | All fields match `_sanitize_tool_call()` validation |
| Product IDs 1-12 | ✅ YES | Match database + frontend data |
| Categories (4) | ✅ YES | Kitchen, Home Cleaner, Drone, Humanoid |
| Pages (6) | ✅ YES | home, catalog, assistant, product, cart, orders |
| Focus options (10) | ✅ YES | Match `ALLOWED_FOCUS` set |
| Language codes | ✅ YES | en, hi, te |

## Known Gaps (Phase 2 side)

| Gap | What's needed | Priority |
|-----|--------------|----------|
| `navigate_to` not consumed by frontend | Frontend needs to process `toolCalled: "navigate_to"` and actually navigate | HIGH |
| `cart` has no route | Cart is a drawer, not a page. `navigate_to(page="cart")` should open the drawer | MEDIUM |
| Frontend page tracks "robot" not "product" | Context sends `currentPage: "robot"` but pipeline/model expects "product" | LOW (pipeline handles both) |

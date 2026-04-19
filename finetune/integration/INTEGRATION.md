# Fine-Tuned Model Integration Guide

## What the Fine-Tuned Model Produces

Given a user query + page context, Qwen3-0.6B-FC outputs:
```json
{"tool": "search_products", "arguments": {"query": "kitchen robots", "category": "Kitchen"}, "ui_guide": "find_kitchen"}
```

The pipeline uses `tool` + `arguments` for execution. The `ui_guide` field flows to the frontend to trigger element-anchored navigation highlights.

## Current Integration Status

`fc_model.py` is already deployed at `server/ai/fc_model.py` and wired into `pipeline.py`. The base `Qwen/Qwen3-0.6B` model is loading correctly.

**Pending:** Replace base model with the fine-tuned LoRA adapter after Colab training completes.

## How to Switch to the Fine-Tuned Adapter

### 1. After Colab training, download the adapter to:
```
finetune/output/qwen3-0_6b-fc-v1/          ← LoRA adapter
finetune/output/qwen3-0_6b-fc-v1-merged/   ← merged (preferred)
```

### 2. Set in `server/.env`:
```bash
ENABLE_FC_MODEL=1
FC_MODEL_PATH=/absolute/path/to/finetune/output/qwen3-0_6b-fc-v1-merged
```

### 3. Restart the server:
```bash
node server/index.js
```

The `fc_model.py` `load_model()` function reads `FC_MODEL_PATH` first, `FC_MODEL_ID` second. With `FC_MODEL_PATH` set, it uses `local_files_only=True` and skips HuggingFace Hub.

### 4. Verify integration:
```bash
curl -X POST http://localhost:5000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"drone kahan milega","language":"hi","context":{"currentPage":"home","viewedProducts":[],"cart":[]}}'
```
Expected response should contain `"toolSource":"model"` and a valid `ui_guide`.

---

## System Prompt Sync

The system prompt in `fc_model.py` (`SYSTEM_PROMPT`) and `finetune/config.py` (`SYSTEM_PROMPT`) must stay **identical**. Both include:
1. Product catalog (12 robots, IDs 1-12, prices)
2. App structure (/catalog/:slug, /robot/:id, /orders, cart drawer)
3. Tool schemas (6 tools)
4. UI guide rules and valid keys
5. Romanized HI/TE language handling rule

---

## Compatibility Matrix

| Aspect | Status |
|--------|--------|
| Tool names (6) | ✅ Matches pipeline.py |
| `"arguments"` key | ✅ Matches `_sanitize_tool_call()` |
| Product IDs 1–12 | ✅ Matches DB + frontend |
| Categories (4) | ✅ Kitchen, Home Cleaner, Drone, Humanoid |
| Pages (6) | ✅ home, catalog, assistant, product, cart, orders |
| Language codes | ✅ en, hi, te |
| ui_guide keys (11) | ✅ Matches `flows.json` in frontend |

---

## ui_guide → Frontend Flow

```
fc_model.predict_tool_call()
    └── returns {"tool": ..., "arguments": ..., "ui_guide": "find_drone"}
            │
pipeline.py → includes ui_guide in response JSON
            │
ai.js → passes uiGuide field in HTTP response
            │
AISidePanel.jsx → calls UIGuideProvider.startFlow("find_drone")
            │
UIGuideProvider → reads flows.json, element-anchors tooltip, auto-navigates
```

All 11 guide keys are wired: `check_orders`, `track_delivery`, `update_cart`, `find_kitchen`, `find_drone`, `find_home_cleaner`, `find_humanoid`, `compare_products`, `open_support`, `new_ticket`, `view_tickets`.

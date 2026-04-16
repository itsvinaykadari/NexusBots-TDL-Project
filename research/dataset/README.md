# Phase 2A Dataset Workspace

This folder contains the complete Phase 2A pipeline for function-calling dataset creation.

## Structure

- `tool_schemas.json` - source-of-truth schemas for 6 tools.
- `product_catalog.json` - 12-product catalog used for argument generation.
- `raw/` - synthetic raw examples with context and canonical function call.
- `processed/` - converted training records (`messages` + `tool_calls`).
- `review/` - sampled records for manual QA and cleanup logs.
- `final/` - versioned dataset for fine-tuning.
- `scripts/` - generation, formatting, validation, and review scripts.
- `prompts/` - GPT-4 prompt pack for higher-quality natural generations.

## Quick Start

Run from project root:

```bash
node research/dataset/scripts/generate_template_dataset.js
node research/dataset/scripts/format_training_jsonl.js
node research/dataset/scripts/validate_dataset.js
node research/dataset/scripts/sample_review_set.js
```

Generated outputs:

- `research/dataset/raw/function_calls_raw_v1.jsonl`
- `research/dataset/processed/function_calling_train_v1.jsonl`
- `research/dataset/processed/validation_report_v1.json`
- `research/dataset/review/manual_review_sample_v1.jsonl`
- `research/dataset/final/function_calling_v1.jsonl`

## Notes

- Current ontology is fixed to 4 categories: Kitchen, Home Cleaner, Drone, Humanoid.
- Current tool set is 6 tools (support tool removed).
- Product id range is restricted to 1..12 across schema, generation, and validation.
- This pipeline creates the target split: EN 500, HI 250, TE 250.
- Proficiency split is balanced per language: beginner/expert.
- Queries are romanized for HI/TE to keep plain UTF-8-safe text and avoid script encoding issues in early iterations.
- For production-quality linguistic diversity, use `prompts/gpt4_generation_prompt.md` with GPT-4 and then pass results through the same formatter and validator.
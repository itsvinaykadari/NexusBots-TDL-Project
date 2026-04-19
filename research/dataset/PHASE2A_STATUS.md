# Phase 2A Status

## Completed in this implementation

- [x] Define 7 tool schemas in machine-readable form (`tool_schemas.json`).
- [x] Create dataset folder structure (`raw`, `processed`, `review`, `final`).
- [x] Build synthetic generator pipeline to create 1000 examples with target split.
- [x] Convert examples to training format (`messages` + `tool_calls`).
- [x] Add validator for schema and split checks.
- [x] Add manual review sampler and checklist.
- [x] Produce versioned final dataset artifact (`function_calling_v1.jsonl`).

## Remaining to fully match research target

- [ ] Generate a second-pass higher-diversity set with GPT-4 prompt pack.
- [ ] Human review and correction of sampled records.
- [ ] Freeze cleaned release as `function_calling_v1_clean.jsonl`.
- [x] Test split and holdout benchmark set — done (`finetune/data/test.jsonl`, 100 rows stratified).

## Current practical completion estimate

- Phase 2A implementation readiness: ~90%
- Phase 2A research-grade quality (after GPT-4 + manual cleanup): ~100%

## Scope note (2026-04-19)

Sales agent functionality is **out of scope** due to time constraints. The dataset covers 6 tools only (search, get_product, compare, recommend, add_to_cart, navigate_to). No sales-agent tool entries should be added.

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
- [ ] Optional: add test split and holdout benchmark set.

## Current practical completion estimate

- Phase 2A implementation readiness: ~85%
- Phase 2A research-grade quality (after GPT-4 + manual cleanup): ~100%

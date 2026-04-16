# Manual Review Checklist (Phase 2A)

Review at least 10-15% per language and every auto-flagged row.

## Checks per sample

- Query intent aligns with exactly one tool.
- Tool name is correct for the user query.
- Argument values are valid and realistic.
- Category value is one of allowed enums.
- Product ids are valid (1..22) and context-consistent.
- Budget values are realistic for robotics commerce.
- Language quality is natural enough for training.
- Proficiency style matches label (beginner vs expert).
- Page context is coherent with query and call.

## Common fixes

- Replace wrong category labels.
- Correct product ids and compare pair duplicates.
- Fix malformed argument JSON.
- Rewrite ambiguous multi-intent queries to single intent.
- Improve code-mixed wording for HI/TE samples.

## Sign-off

- Reviewer:
- Date:
- Reviewed count:
- Fixed count:
- Rejected count:

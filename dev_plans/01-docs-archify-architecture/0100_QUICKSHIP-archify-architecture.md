# QUICKSHIP — Archify Nexus Bots architecture diagram

```yaml
ship_status: shipped
invoked_from: quickship
branch: feat/archify-nexusbots-architecture
```

## Intent

Add a repository-backed Archify architecture candidate and finalized interactive HTML for Nexus Bots, so the dual-model runtime (React SPA → Express → Python pipeline / Qwen router → SQLite + Sarvam) is documented with source evidence. Approach: ship generated Archify artifacts only; no application code changes.

## Files changed

- `candidate.json` — Archify architecture candidate (schema v1)
- `nexusbots-architecture.html` — finalized interactive diagram (showcase quality)
- `nexusbots-architecture.finalize.json`
- `nexusbots-architecture.finalize-summary.json`
- `nexusbots-architecture.delivery.json`
- `nexusbots-architecture.browser-check.json`
- `dev_plans/01-docs-archify-architecture/0100_QUICKSHIP-archify-architecture.md`

## Verification output

```text
$ node .../archify/bin/archify.mjs validate architecture ./candidate.json --repo-root . --json
ok: true
candidate.sha256: d58b900079855c2ca2c7339c4f6021c13fd36070fc969317b75696199a4a86e5
candidateFrozen: true
checks: single_svg, finite_svg, orthogonal_arrows, label_route_clearance,
  relationship_crossings, relationship_corridors, container_border_runs,
  route_rhythm, legend_clearance — all ok: true
composition.status: pass

$ finalize-summary (pre-existing local run)
status: pass
quality: showcase
gates: validate=pass, deliver=pass, check=pass, browser-check=pass
```

Note: root `npm test` scripts are placeholders that exit 1 by design; no app/TS source changed, so Node eslint/tsc suites were not applicable for this artifact-only ship.

## Self-review checklist

| Check | Result |
|-------|--------|
| Architecture | Matches inspected runtime: SPA, Express AI IPC, pipeline, optional Qwen, SQLite, Sarvam, session log; static `robots.js` vs SQLite duality called out |
| Security | No secrets; `.env` values not read; only public paths and placeholders |
| Tests | Archify validate + finalize browser-check used as verification for diagram artifacts |
| AI Slop | Candidate uses fresh IDs and repo evidence; no generic web-app example reuse |
| Scope | Artifact files + quickship note only; no app source edits |

## Documentation

N/A — no living or traditional docs updated. Major triggers checked: no new user-facing product capability, no setup/runbook change, no PENDING_WORK delta, no ADR-worthy decision beyond shipping a diagram of existing architecture, no platform inventory impact.

## Overall status

Shipped on `feat/archify-nexusbots-architecture` — ready for PR review.

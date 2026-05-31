# Phase 3 Task 8: Regression Coverage and Manual QA

## Entry: 2026-05-31 Task 8

**Track:**
- Plan file: `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`
- Task: `Task 8: Add focused regression coverage and refresh manual QA paths`
- Dependencies reviewed:
  - `docs/implementation-logs/spec-sync-2026-05-31/phase-3-task-7-turn-and-result-routing.md`
  - `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/08-error-loading-and-navigation.md`, `docs/specs/09-testing-and-milestones.md`

**What was done:**
- Added `tests/app/specSyncRegression.test.mjs` as a cross-contract regression suite covering close-code policy, gameplay entry gating, delta sync semantics, and `mission-result`-only result routing.
- Documented manual verification paths in `docs/manual-qa/spec-sync-reflected-contract.md`, including per-section links to existing focused test files and a full `npm test` gate.
- Clarified in `mockMode.ts` that query-gated `/main` mock flows are pre-game only; gameplay and result flows require a live backend per the reflected contract.
- Human review: no additional feedback; spec-sync follow-up plan Phase 3 tasks 1–8 are complete from an implementation standpoint.

**Why it matters for the next worker:**
- Use `specSyncRegression.test.mjs` as the first check when changing close-code policy, `game-started` routing, delta editor sync, or result navigation so contract regressions surface in one place.
- Do not extend mock mode to simulate gameplay sockets; add live-backend or integration harness coverage instead.
- Preserve Task 7 invariants validated by the regression suite: `turnSubmissionPending` until `turn-changed`, marker reset on `turn-changed`, and no `/result` navigation from `game-state-updated` alone.

**Dependency impact:**
- Satisfies Task 8 acceptance criteria for reflected-contract regression coverage and updated manual QA instructions.
- Completes the `2026-05-31-spec-sync-follow-up-plan.md` implementation track; remaining work is live-backend E2E, build tooling fixes, and optional UI polish outside this plan.

**Files touched:**
- `tests/app/specSyncRegression.test.mjs`
- `docs/manual-qa/spec-sync-reflected-contract.md`
- `src/pages/MainPage/mockMode.ts`

**Commit:**
- `8421e5f0`

**Verification completed:**
- [x] `npm test` (210 passed, including 8 new spec-sync regression tests)
- [x] `npx tsc -p tsconfig.app.json`
- [x] Manual contract review: regression tests and manual QA checklist align with `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/08-error-loading-and-navigation.md`, `docs/specs/09-testing-and-milestones.md`
- [x] Human review: no additional feedback

**Not verified:**
- [ ] `npm run build` — not run; pre-existing `vite.config.ts` Node/`lib` typing issues noted in prior tasks
- [ ] End-to-end manual QA against a live backend (checklist documented in `docs/manual-qa/spec-sync-reflected-contract.md`)

**Design decisions:**
- Consolidated cross-cutting contract checks in one regression file instead of duplicating full scenarios already covered in `socketClosePolicy`, `realtimeEventReducers`, `turnProgression`, and `codeDelta` suites.
- Placed manual QA under `docs/manual-qa/` rather than expanding historical worker-1 mock log entries, so pre-game mock scope and live gameplay verification stay clearly separated.
- `start-ready` mock regression asserts HTTP `start-game` success does not change room status, reinforcing that only `game-started` with `enterGameScreen` gates `/play`.

**Deviations from spec:**
- None intentional.

**Trade-offs:**
- Regression file re-asserts some invariants already tested elsewhere; acceptable for a single “contract smoke” entry point and reviewer onboarding.
- Manual QA remains checklist-driven without a Playwright/MSW harness; deferred to future Phase 8-style tooling per existing project notes.

**Open questions:**
- [x] Any review changes required before logging? → No additional feedback (resolved).
- [ ] Should `/main` show a post-`4403`/`4404` notice after redirect? → Still deferred from Task 3.
- [ ] Should `game-state-updated` with `FINISHED` route without `mission-result`? → Still deferred; regression enforces `mission-result` as the navigation gate.

**Instructions for the next worker:**
- Run `npm test` before merging further realtime or gameplay changes; extend `specSyncRegression.test.mjs` when adding new reflected contract boundaries.
- For browser verification, follow `docs/manual-qa/spec-sync-reflected-contract.md` against a live backend.
- Spec-sync follow-up plan tasks 1–8 are done; treat `docs/plans/2026-05-31-spec-sync-follow-up-plan.md` checkpoint “Complete” as ready for final human review aside from live E2E and build fixes.

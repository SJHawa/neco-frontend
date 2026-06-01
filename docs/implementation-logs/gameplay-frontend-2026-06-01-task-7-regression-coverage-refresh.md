# Gameplay Frontend Fix Plan: Task 7 Regression Coverage Refresh

## Entry: 2026-06-01 Task 7

**Track:**
- Plan file: `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- Task: `Task 7: Add frontend regression coverage for the documented gameplay contract`
- Dependencies reviewed:
  - `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
  - `docs/implementation-logs/gameplay-frontend-2026-06-01-task-6-room-page-state-rendering.md`
  - `tests/app/realtimeEventReducers.test.mjs`
  - `tests/app/turnProgression.test.mjs`
  - `tests/app/specSyncRegression.test.mjs`
  - `tests/app/roomRealtimeAuthoritativeSync.test.mjs`
  - `tests/app/roomWaitingState.test.mjs`

**What was done:**
- Refreshed the gameplay regression suite so it reflects the current backend-first gameplay contract rather than stale delta-first assumptions.
- Updated `tests/app/specSyncRegression.test.mjs` in two main ways:
  - changed the suite intent from delta-centric gameplay regression to content-first gameplay regression
  - replaced the old low-level delta-only regression with a reducer-level `applyCodeUpdated()` regression that explicitly verifies the current `content`-based authoritative sync path
- Added an integrated turn progression regression in `tests/app/specSyncRegression.test.mjs` that exercises the documented frontend order:
  - submission pending state exists
  - `turn-evaluated` stores feedback, markers, and `SUBMITTED` status
  - `turn-changed` clears evaluation state, clears the lock, resets markers, and enables the next turn
- Confirmed that the other gameplay symptom areas are already covered by focused tests introduced across Tasks 3 through 6:
  - mission bootstrap from `game-started`
  - waiting-room participant preservation into gameplay
  - `content`-based authoritative file sync
  - backend-first partial `turn-changed` payload normalization
  - RoomPage mission/participant/evaluation display helpers

**Why it matters for the next worker:**
- The previously reported gameplay failures now map to concrete automated regressions instead of only manual QA notes.
- Future backend/frontend contract drift should be easier to detect because the regression suite now reflects the chosen backend-first runtime model more honestly.
- The plan can now close with stronger confidence that gameplay state handling is covered end-to-end at the reducer/view-model level.

**Dependency impact:**
- Completes Task 7 in `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`.
- Completes the overall gameplay frontend fix plan checkpoint.
- Leaves existing focused gameplay tests in place rather than replacing them with one broad, harder-to-debug end-to-end test.

**Files touched:**
- `tests/app/specSyncRegression.test.mjs`
- `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- `docs/implementation-logs/gameplay-frontend-2026-06-01-task-7-regression-coverage-refresh.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] Tests pass: `npm test`
- [x] Type check passes: `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`
- [x] Manual source review confirmed each known frontend symptom now maps to automated coverage or an explicit backend dependency note

**Not verified:**
- [ ] Live browser multiplayer QA against a running backend
- [ ] Visual/manual validation that every new UI copy path appears as expected in the browser

**Design decisions:**
- Kept the regression refresh mostly in `specSyncRegression.test.mjs` because that file already acts as the high-signal contract suite for gameplay routing and reflected realtime behavior.
- Preferred reducer-level and view-model-level assertions over brittle page snapshot-style tests.
- Preserved existing focused `roomRealtimeAuthoritativeSync` coverage and used Task 7 to update the higher-level contract framing around it instead of duplicating the same assertions elsewhere.

**Deviations from spec:**
- No new behavioral deviations were introduced. The tests were updated to match the already chosen backend-first, `content`-canonical runtime contract.

**Trade-offs:**
- The refreshed regression suite gives strong confidence in frontend state handling, but it still does not replace real multi-user browser QA for websocket timing issues.
- Keeping coverage at reducer/view-model level makes failures easier to diagnose, though it means DOM-level rendering integration is still covered only indirectly for most gameplay cases.

**Open questions:**
- [ ] Should a later pass add one browser-driven smoke test for the `/main` -> `/rooms/:id/play` gameplay transition now that the reducer contract is stable?
- [ ] If the backend contract changes back toward richer `turnState` or different sync payloads, should `specSyncRegression.test.mjs` stay backend-first or split into current-vs-target suites?

**Instructions for the next worker:**
- Treat `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md` as complete for the current frontend gameplay fix track.
- If new gameplay bugs appear, start from the focused suites:
  - `tests/app/realtimeEventReducers.test.mjs`
  - `tests/app/turnProgression.test.mjs`
  - `tests/app/roomRealtimeAuthoritativeSync.test.mjs`
  - `tests/app/specSyncRegression.test.mjs`
- Prefer adding the next regression as close as possible to the failing reducer or view-model contract rather than broadening the UI surface first.

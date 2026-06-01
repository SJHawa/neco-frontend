# Gameplay Frontend Fix Plan: Task 3 Bootstrap And Editor State

## Entry: 2026-06-01 Task 3

**Track:**
- Plan file: `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- Task: `Task 3: Fix gameplay reducer bootstrapping for mission and editor state`
- Dependencies reviewed:
  - `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
  - `docs/implementation-logs/gameplay-frontend-2026-06-01-task-2-shared-types-alignment.md`
  - `src/features/realtime/realtimeEventReducers.ts`
  - `src/features/editor/authoritativeEditorSync.ts`
  - `src/features/editor/editorTurnBaseline.ts`
  - `tests/app/realtimeEventReducers.test.mjs`
  - `tests/app/editorTurnBaseline.test.mjs`

**What was done:**
- Updated `bootstrapEditorFromMission()` in `src/features/realtime/realtimeEventReducers.ts` so gameplay bootstrap now seeds editor state from `missionState.projectStructure.files[].content` when the backend provides inline file content.
- Changed the gameplay bootstrap flow to build two aligned editor views at game start:
  - `files` now start with server-provided inline content when present
  - `authoritativeFiles` now captures those same server-provided contents immediately
- Preserved the previous fallback behavior for missions whose files do not carry inline `content`. In that case, the editor still bootstraps with empty working buffers and an empty authoritative snapshot.
- Because `applyGameStarted()` still passes the bootstrapped editor through `onEditorTurnIdChanged()`, the new content-seeded bootstrap now also produces the right turn baseline behavior automatically:
  - when inline content exists, the first turn baseline becomes ready immediately
  - when inline content is absent, the baseline remains unset until later authoritative sync arrives
- Added focused tests that cover both branches explicitly:
  - no inline content keeps the old empty-bootstrap behavior
  - inline content seeds working files, authoritative files, and the current turn baseline

**Why it matters for the next worker:**
- The frontend no longer throws away authoritative mission file content that already arrives in the initial `game-started` payload.
- Task 4 and Task 5 can now reason about gameplay editor state from a stable, server-seeded baseline instead of a synthetic empty state.
- This reduces one of the biggest front-end-side causes of “game started but the mission/editor feels blank or uninitialized.”

**Dependency impact:**
- Completes Task 3 in `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`.
- Unblocks Task 4 by making gameplay bootstrap less dependent on a later `code-updated` rescue event for initial editor correctness.
- Preserves current reducer ownership so no page-layer mission/editor bootstrap logic was added to `RoomPage`.

**Files touched:**
- `src/features/realtime/realtimeEventReducers.ts`
- `tests/app/realtimeEventReducers.test.mjs`
- `tests/app/editorTurnBaseline.test.mjs`
- `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- `docs/implementation-logs/gameplay-frontend-2026-06-01-task-3-bootstrap-and-editor-state.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/realtimeEventReducers.test.mjs tests/app/specSyncRegression.test.mjs`
- [x] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/realtimeEventReducers.test.mjs tests/app/editorTurnBaseline.test.mjs`
- [x] Type check passes: `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`
- [x] Manual source review confirmed the bootstrap path now follows the backend-first `content` model without changing page-layer orchestration

**Not verified:**
- [ ] Live browser QA against a reachable backend
- [ ] Runtime capture that the real backend `game-started` payload consistently includes inline `content` for the missions under test

**Design decisions:**
- Kept the fix local to reducer bootstrap instead of adding more page-level guards or post-bootstrap effects.
- Chose a dual-path bootstrap:
  - inline `content` present → seed authoritative state immediately
  - inline `content` absent → preserve the prior empty-buffer bootstrap and wait for later authoritative sync
- Reused the existing turn-baseline machinery rather than introducing a parallel “initial content” concept for gameplay start.

**Deviations from spec:**
- `docs/etc/api-spec.md` still shows `projectStructure.files` without inline `content` in the `game-started` example. This task intentionally followed the current backend-first contract, where inline `content` is available and should be consumed.

**Trade-offs:**
- The frontend now trusts inline `content` from `game-started` as authoritative when present, which improves correctness but increases dependence on that backend payload staying stable.
- Keeping the empty-buffer fallback preserves compatibility, but it also means some missions may still look sparse if the backend omits inline content and no later authoritative sync arrives.

**Open questions:**
- [ ] Should Task 5 surface a clearer UI state when a mission starts without inline content and without a follow-up authoritative sync?
- [ ] If backend missions always include inline `content` in practice, should a later cleanup remove the empty-bootstrap fallback entirely?

**Instructions for the next worker:**
- Start with Task 4 in `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`.
- Assume gameplay bootstrap can now produce either:
  - an immediately ready authoritative baseline when inline mission file content is present
  - an empty baseline that still expects later authoritative sync
- Do not duplicate mission bootstrap logic in `RoomPage`; keep follow-up fixes in shared realtime state and view-model layers.

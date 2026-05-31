# Phase 3 Task 7: Turn Progression and Result Routing

## Entry: 2026-05-31 Task 7

**Track:**
- Plan file: `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`
- Task: `Task 7: Implement turn progression, evaluation state, and result routing`
- Dependencies reviewed:
  - `docs/implementation-logs/spec-sync-2026-05-31/phase-3-task-6-hint-and-delta-editor-sync.md`
  - `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/08-error-loading-and-navigation.md`, `docs/specs/09-testing-and-milestones.md`

**What was done:**
- Added `buildTurnCodeSnapshot` and `submitTurn` to emit reflected `turn-submit` with mission project file paths and current `editor.files` content; flush pending `code-change` via `flushPending()` before submit.
- Introduced `game.turnSubmissionPending` to lock editor actions from submit through `turn-changed` (not cleared on `turn-evaluated`).
- Implemented `applyTurnEvaluated`, `applyTurnChanged`, and `applyMissionResult` reducers; bound `turn-evaluated`, `turn-changed`, and `mission-result` in `roomRealtimeEvents`.
- `turn-evaluated` stores `lastTurnEvaluation`, merges strike counts, and sets `editor.markers` from `detectedIssues`.
- `turn-changed` updates `turnState` / `missionState`, clears `lastTurnEvaluation`, clears `turnSubmissionPending`, resets `editor.markers`, and runs `onEditorTurnIdChanged` when `turnId` changes.
- `mission-result` stores in-memory `missionResult` and routes to `/rooms/:gameRoomId/result` via `navigateToResult` without a separate fetch.
- Wired `RoomPage` submit button, pending UX copy (`제출 처리 중...` / `턴 전환 대기 중...`), and evaluation panels from `lastTurnEvaluation`.
- Replaced `ResultPage` placeholder with store-driven mission outcome summary.
- Incorporated human review feedback: keep `turnSubmissionPending` through `turn-changed`; clear `editor.markers` on new turn.

**Why it matters for the next worker:**
- Task 8 should add focused regression coverage and manual QA paths without weakening turn-lock or marker-reset invariants.
- Editability after submit must continue to depend on `turnSubmissionPending` until `turn-changed`, not on `turn-evaluated` alone.
- Result routing is `mission-result`-driven only; do not add a separate result HTTP fetch for v1.
- Preserve Task 5–6 baseline rules: `onEditorTurnIdChanged` on `turnId` change only; do not reset `turnBaselineFiles` after seeding except via turn boundary.

**Dependency impact:**
- Satisfies Task 7 acceptance criteria for `turn-submit`, `turn-evaluated`, `turn-changed`, and `mission-result` on reflected realtime payloads.
- Unblocks Task 8 (regression tests and manual QA documentation refresh).

**Files touched:**
- `src/features/game-turn/buildTurnCodeSnapshot.ts`
- `src/features/game-turn/submitTurn.ts`
- `src/features/realtime/emitGameplayRealtimeEvent.ts`
- `src/features/realtime/realtimeEventReducers.ts`
- `src/features/realtime/realtimeNavigation.ts`
- `src/features/realtime/roomRealtimeEvents.ts`
- `src/features/editor/codeChangeEmitScheduler.ts`
- `src/features/editor/useGameplayCodeSync.ts`
- `src/pages/RoomPage/index.tsx`
- `src/pages/ResultPage/index.tsx`
- `src/pages/ResultPage/ResultPage.css`
- `src/shared/types/clientState.ts`
- `src/app/store/clientState.ts`
- `tests/app/gameTurn.test.mjs`
- `tests/app/turnProgression.test.mjs`

**Commit:**
- `ea67223`

**Verification completed:**
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/gameTurn.test.mjs tests/app/turnProgression.test.mjs tests/app/realtimeEventReducers.test.mjs tests/app/roomSocketLifecycle.test.mjs`
- [x] `npx tsc -p tsconfig.app.json`
- [x] Manual contract review against `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/08-error-loading-and-navigation.md`, `docs/specs/09-testing-and-milestones.md`
- [x] Human review feedback incorporated (submission lock until `turn-changed`, marker reset on `turn-changed`; no remaining blockers)

**Not verified:**
- [ ] `npm run build` — not run; prior tasks report pre-existing `vite.config.ts` Node/`lib` typing issues
- [ ] End-to-end manual QA against a live backend

**Design decisions:**
- Reused `turnSubmissionPending` for post-submit lock instead of a separate flag; cleared only on `turn-changed`, `mission-result`, and `game-started` bootstrap.
- `applyTurnEvaluated` does not clear `turnSubmissionPending` so submitters stay locked while `turnState.status` may still be `IN_PROGRESS` until the server emits `turn-changed`.
- `RoomPage` uses `isTurnActionLocked = isEditorReadOnly || turnSubmissionPending` so spec editability follows `turn-changed`, not evaluation arrival alone.
- `mission-result` is the sole navigation gate to `/result`; `game-state-updated` with `FINISHED` does not auto-route.

**Deviations from spec:**
- `submittedAt` / outbound timestamps use `Date.toISOString()` (same pattern as Task 6 `code-change`).
- Team chat on `RoomPage` remains a placeholder.
- `ResultPage` is a functional summary shell, not a full Figma-polished layout.

**Trade-offs:**
- Hard refresh on `/result` shows empty state when `missionResult` is not in memory; acceptable per v1 in-memory result contract.
- Evaluation UI still uses existing AI master tabs rather than a dedicated evaluation-only layout.

**Open questions:**
- [x] Should `turn-evaluated` clear submission pending? → No; keep lock until `turn-changed` (review resolved).
- [x] Should `turn-changed` clear evaluation markers? → Yes; `editor.markers = []` on new turn (review resolved).
- [ ] Should `game-state-updated` with `FINISHED` route without `mission-result`? → Deferred; `mission-result` remains primary per spec.

**Instructions for the next worker:**
- Read this entry, then start **Task 8** in `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`.
- Add regression coverage for close-code handling, gameplay entry, delta sync, and result routing where not already covered.
- Do not re-clear `turnSubmissionPending` on `turn-evaluated` or skip marker reset on `turn-changed`.

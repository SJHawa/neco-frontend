# Gameplay Frontend Fix Plan: Task 2 Shared Types Alignment

## Entry: 2026-06-01 Task 2

**Track:**
- Plan file: `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- Task: `Task 2: Align shared gameplay types with the backend-first gameplay payloads`
- Dependencies reviewed:
  - `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
  - `docs/implementation-logs/gameplay-frontend-2026-06-01-task-1-contract-audit.md`
  - `src/shared/types/domain.ts`
  - `src/shared/types/clientState.ts`
  - `src/features/realtime/realtimeEventReducers.ts`
  - `tests/app/specSyncRegression.test.mjs`
  - `tests/app/realtimeEventReducers.test.mjs`
  - `/Users/imhyeon/Documents/GitHub/backend/src/modules/realtime/service/realtime.interfaces.ts`

**What was done:**
- Updated shared gameplay types in `src/shared/types/domain.ts` to reflect the current backend-first realtime contract while keeping the existing frontend code path operational during follow-up tasks.
- Expanded `MissionProjectFile` so gameplay project files can represent backend-provided `content` and `fileUrl` in addition to `filePath`, `language`, and `readonly`.
- Expanded `MissionState` with `strikeCount` and kept mission copy fields optional so the RoomPage can represent partial runtime payloads without forcing fake placeholder data into the domain types.
- Changed realtime code-sync types to reflect the current `content`-based contract:
  - `CodeChangeEvent` now allows optional `userId`, `sessionId`, `occurredAt`, optional legacy `codeDelta`, and current `content`.
  - `CodeUpdatedEvent` now treats `codeDelta` as optional while keeping optional `content` for authoritative file sync.
- Added `TurnSubmitFilePayload` and widened `TurnSubmitEvent` so the shared type can represent both the current frontend submit shape and the backend runtime `files[]` shape during the transition.
- Expanded evaluation and progression types to match backend payload reality more closely:
  - `DetectedIssue.filePath` can now be `null`, with optional `lineNumber` and `caseName`.
  - `TurnEvaluationResult` can now carry backend fields such as `missionId`, `turnId`, `stepId`, `stepOrder`, `isMissionCleared`, `stepJudgingSummary`, `publicCaseResults`, and runtime-failure metadata in `executionSummary`.
  - `TurnChangedEvent` now allows backend-first optional fields such as `previousTurnId`, `currentTurnId`, `currentTurnUserId`, optional `missionState`, optional `turnState`, and `occurredAt`.
  - `GameStateUpdatedEvent` and `MissionResultEvent` now allow optional payload fields the backend may omit.
- Added small reducer guard fixes in `src/features/realtime/realtimeEventReducers.ts` so the widened optional event fields type-check cleanly without changing the current gameplay behavior:
  - guarded optional `codeDelta`
  - guarded missing `turnState` in `applyTurnChanged()`
  - guarded missing `gameState` in `applyMissionResult()`

**Why it matters for the next worker:**
- Task 3 can now update gameplay reducer bootstrapping against a shared type model that already knows about `content`-based file sync and optional backend payload fields.
- Later tasks no longer need to force fake completeness into gameplay events just to satisfy the type system.
- The domain layer now reflects the current backend contract more honestly, which reduces friction when changing realtime reducers and submit flows.

**Dependency impact:**
- Completes Task 2 in `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`.
- Unblocks Task 3 by giving reducer and editor bootstrap work a backend-aligned shared type foundation.
- Keeps the current RoomPage and gameplay tests passing while widening the contract surface for later tasks.

**Files touched:**
- `src/shared/types/domain.ts`
- `src/features/realtime/realtimeEventReducers.ts`
- `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- `docs/implementation-logs/gameplay-frontend-2026-06-01-task-2-shared-types-alignment.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] Manual comparison against the current backend realtime interfaces and the Task 1 audit notes
- [x] Type check passes: `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`
- [x] Tests pass: `npm test`
- [x] Focused regression tests pass:
  - `tests/app/specSyncRegression.test.mjs`
  - `tests/app/realtimeEventReducers.test.mjs`

**Not verified:**
- [ ] Live browser QA against a reachable backend
- [ ] Runtime capture of multi-user gameplay events after the widened types are consumed by later reducer changes

**Design decisions:**
- Chose widening over rewriting. The shared types were expanded to cover the backend-first contract without prematurely deleting still-used frontend fields that later tasks will retire more safely.
- Kept `codeDelta` optional instead of deleting it immediately so the type layer can represent both current runtime behavior and remaining legacy frontend assumptions during the transition.
- Limited runtime code changes to the smallest reducer guards needed for the widened types to type-check cleanly.

**Deviations from spec:**
- `docs/etc/api-spec.md` still describes a more `codeDelta`-centric flow than the current backend runtime. Task 2 intentionally followed the backend implementation first.
- `TurnSubmitEvent` now represents both the existing frontend submit shape and the backend runtime shape, which is broader than either contract in isolation.

**Trade-offs:**
- The widened types reduce short-term friction for implementation, but they also leave some legacy compatibility surface in place until later tasks simplify the runtime flow.
- Keeping both legacy and backend-first fields representable avoids immediate breakage, but it means later tasks must still choose which branch is the long-term frontend runtime path.

**Open questions:**
- [ ] In Task 3 or Task 5, do we want to begin pruning now-unused legacy realtime fields from the actual emit path, or wait until the gameplay flow is fully stable?
- [ ] When documentation is reconciled later, should `docs/etc/api-spec.md` be narrowed to the backend-first `content` model or split into current-vs-target contracts?

**Instructions for the next worker:**
- Start with Task 3 in `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`.
- Assume the shared domain layer now supports:
  - `content`-based code sync
  - optional mission copy
  - optional backend turn-progression fields
  - broader evaluation payloads
- Prefer consuming the backend-first fields already modeled here rather than introducing new ad hoc payload casts in reducers or page code.

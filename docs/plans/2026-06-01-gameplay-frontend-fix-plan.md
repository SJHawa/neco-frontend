# Implementation Plan: Gameplay Frontend Contract Fixes

## Overview
This plan covers the frontend-only work needed to align the gameplay flow with the currently implemented backend realtime contract, while using [`docs/etc/api-spec.md`](/Users/imhyeon/Documents/GitHub/frontend/docs/etc/api-spec.md) as a secondary comparison document for mismatches that need later documentation cleanup. The immediate goal is to stabilize the in-game experience after successful route entry into `/rooms/:gameRoomId/play`, with a specific focus on mission rendering, participant visibility, editability by current turn, and turn-evaluation display. This plan assumes the current backend implementation is the source of truth for payload shape and frontend behavior, especially for `content`-based realtime code sync.

## Architecture Decisions
- Treat realtime events as authoritative for gameplay state. `game-started`, `room-participants-updated`, `code-updated`, `turn-evaluated`, `turn-changed`, and `mission-result` should drive the gameplay store and UI rather than inferred local state.
- Preserve the existing route split. `/main` remains the waiting-room surface, and `/rooms/:gameRoomId/play` remains the gameplay surface. The work should strengthen the handoff between them instead of moving gameplay state ownership back into `/main`.
- Keep the fix scoped to frontend state ingestion and rendering. Where `docs/etc/api-spec.md` conflicts with the current backend implementation, follow the backend implementation first and record the documentation drift explicitly.
- Prefer reducer-level normalization over page-level conditionals. Shared realtime reducers and small view-model helpers should absorb the contract alignment so `RoomPage` remains mostly declarative.
- Treat `content`-based realtime code synchronization as canonical for the current implementation track. Do not force `codeDelta` semantics into the frontend plan until the backend contract changes and the docs are reconciled.

## Parallelization Guidance
- Must stay sequential:
  - gameplay contract audit against the spec
  - reducer and state-ingestion fixes
  - gameplay UI and editability fixes
  - regression coverage updates
- Can parallelize after Task 3 if needed:
  - one stream on RoomPage presentation cleanup
  - one stream on targeted gameplay regression tests
  - the contract boundary is the updated gameplay store shape plus realtime reducer behavior

## Task List

### Phase 1: Gameplay Contract Alignment

## Task 1: Audit gameplay state ingestion against the current backend contract

**Description:** Review the current frontend gameplay state path from realtime event receipt to RoomPage rendering, and pin each mismatch against the current backend contract so the following implementation tasks operate from one concrete frontend contract.

**Acceptance criteria:**
- [x] The plan owner identifies how `game-started`, `room-participants-updated`, `code-updated`, `turn-evaluated`, and `turn-changed` are currently consumed by the frontend.
- [x] Each of the known gameplay symptoms is mapped to either a frontend state-ingestion gap or a backend contract dependency.
- [x] The expected frontend behavior for mission metadata, participant rows, editability, and turn-evaluation display is restated in implementation terms from the chosen backend-first contract.

**Verification:**
- [x] Manual source review against the documented backend-facing contract notes and `docs/etc/api-spec.md`
- [x] Manual source review of:
  - `src/features/realtime/realtimeEventReducers.ts`
  - `src/features/realtime/roomRealtimeEvents.ts`
  - `src/pages/RoomPage/index.tsx`
- [x] Notes are explicit enough that a later implementation step can proceed without rediscovering the same mismatches

**Dependencies:** None

**Files likely touched:**
- `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- `docs/implementation-logs/*` if execution notes are recorded later

**Estimated scope:** XS: 1 file

## Task 2: Align shared gameplay types with the backend-first gameplay payloads

**Description:** Update the shared frontend gameplay domain types so they match the payloads currently emitted and accepted by the backend, especially around `MissionState`, participant state, turn evaluation, turn progression payloads, and `content`-based code sync.

**Acceptance criteria:**
- [x] `MissionState` can represent the gameplay mission fields currently used by the backend and RoomPage, including handling missing or partial mission copy where necessary.
- [x] `CodeUpdatedEvent`, `CodeChangeEvent`, `TurnEvaluatedEvent`, `TurnChangedEvent`, and related mission-step fields match the current backend payload shapes used by the UI.
- [x] Shared types do not force page code to rely on undocumented fields or obsolete local assumptions.

**Verification:**
- [x] Manual comparison against the current backend contract notes, with `docs/etc/api-spec.md` mismatches explicitly called out
- [x] Tests pass: `npm test`
- [x] Type check passes: `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`

**Dependencies:** Task 1

**Files likely touched:**
- `src/shared/types/domain.ts`
- `src/shared/types/clientState.ts`
- `tests/app/specSyncRegression.test.mjs`

**Estimated scope:** S: 1-2 files

### Checkpoint: After Tasks 1-2
- [ ] The frontend gameplay contract is written down and reflected in shared types
- [ ] The implementation can proceed without reinterpreting the API spec mid-change
- [ ] Human review confirms the plan is still scoped to frontend-only work

### Phase 2: Realtime State Ingestion

## Task 3: Fix gameplay reducer bootstrapping for mission and editor state

**Description:** Update gameplay reducers so `game-started` and related realtime events initialize mission metadata, file tabs, and authoritative editor state in a way that matches the backend-first frontend behavior instead of relying on empty placeholders.

**Acceptance criteria:**
- [x] `game-started` stores the mission payload needed to render the gameplay header and mission copy.
- [x] Gameplay editor bootstrapping uses the current `content`-based backend sync model instead of assuming `codeDelta`-driven initialization.
- [x] Reducer logic keeps gameplay state transitions centralized and avoids pushing contract fallbacks into `RoomPage`.

**Verification:**
- [x] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/realtimeEventReducers.test.mjs tests/app/specSyncRegression.test.mjs`
- [x] Type check passes: `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`
- [x] Manual check: the reducer behavior matches the current backend `game-started` and `code-updated` handling model, with spec drift noted where relevant

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/realtime/realtimeEventReducers.ts`
- `src/features/editor/authoritativeEditorSync.ts`
- `src/features/editor/editorTurnBaseline.ts`
- `tests/app/realtimeEventReducers.test.mjs`

**Estimated scope:** M: 3-5 files

## Task 4: Preserve and display authoritative participant state across waiting-room to gameplay transition

**Description:** Ensure the gameplay route uses the authoritative participant list consistently, including the handoff from waiting-room state into gameplay and later updates from `room-participants-updated`.

**Acceptance criteria:**
- [x] Gameplay participant rendering does not collapse to the owner only when the frontend already has broader waiting-room participant state.
- [x] `room-participants-updated` remains the authoritative participant sync event and updates both waiting-room and gameplay-facing state consistently.
- [x] RoomPage participant rows and waiting-room participant state stay compatible with `INVITED`, `JOINED`, `LEFT`, and `DENIED` membership semantics from the spec.

**Verification:**
- [x] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomWaitingState.test.mjs tests/app/realtimeEventReducers.test.mjs`
- [x] Type check passes: `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`
- [x] Manual check: participant ownership and current-turn highlighting still derive from store state only

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/realtime/realtimeEventReducers.ts`
- `src/features/room-waiting/roomWaitingState.ts`
- `src/pages/RoomPage/roomPageViewModel.ts`
- `tests/app/roomWaitingState.test.mjs`

**Estimated scope:** M: 3-5 files

## Task 5: Restore turn-based editability and evaluation-driven gameplay progression

**Description:** Tighten the frontend handling around `turn-changed`, editability, and post-submit evaluation state so the current player can edit at the correct time and the gameplay surface can show evaluation feedback predictably when the backend emits the current runtime events.

**Acceptance criteria:**
- [x] Editability is derived from authoritative `turnState.currentPlayerId` and `turnState.status` only, and flips correctly when `turn-changed` arrives.
- [x] Turn submission pending state, evaluation display state, and marker reset behavior follow the documented order: submit → evaluation → turn change.
- [x] RoomPage does not require a refresh or local workaround to become editable for the next current player once frontend state changes arrive.

**Verification:**
- [x] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/turnProgression.test.mjs tests/app/gameTurn.test.mjs tests/app/realtimeEventReducers.test.mjs`
- [x] Type check passes: `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`
- [x] Manual check: RoomPage read-only logic still respects mission-guide modal, timeout, realtime availability, and current-turn ownership

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/realtime/roomRealtimeEvents.ts`
- `src/features/realtime/realtimeEventReducers.ts`
- `src/pages/RoomPage/index.tsx`
- `src/pages/RoomPage/roomPageViewModel.ts`
- `tests/app/turnProgression.test.mjs`

**Estimated scope:** M: 3-5 files

### Checkpoint: After Tasks 3-5
- [ ] Gameplay state ingestion matches the documented frontend contract
- [ ] Mission metadata, participant rows, and editability are all driven by store state instead of placeholder assumptions
- [ ] Human review confirms remaining issues are backend-emission gaps, not frontend state bugs

### Phase 3: UI And Regression Hardening

## Task 6: Refresh RoomPage rendering around the corrected gameplay state

**Description:** Update the RoomPage presentation so it clearly reflects the corrected gameplay store state for mission copy, participant roster, turn ownership, and evaluation output without adding unrelated UI redesign.

**Acceptance criteria:**
- [x] Mission title and description render from authoritative gameplay state when present.
- [x] Participant list, current-turn labeling, and strike/timer display use the corrected shared state without extra ad hoc guards.
- [x] Evaluation feedback and issue markers surface correctly when `lastTurnEvaluation` is populated.

**Verification:**
- [x] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomPageViewModel.test.mjs tests/app/turnProgression.test.mjs`
- [x] Type check passes: `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`
- [x] Manual check: source review confirms RoomPage is mostly declarative over shared gameplay state

**Dependencies:** Task 5

**Files likely touched:**
- `src/pages/RoomPage/index.tsx`
- `src/pages/RoomPage/roomPageViewModel.ts`
- `src/pages/RoomPage/RoomPage.css`

**Estimated scope:** S: 1-2 files

## Task 7: Add frontend regression coverage for the documented gameplay contract

**Description:** Add or update focused regression tests so the chosen backend-first gameplay contract is exercised directly in frontend tests, especially for the previously failing mission, participant, content-sync, and turn-progression scenarios.

**Acceptance criteria:**
- [x] Regression tests cover mission bootstrapping from `game-started`.
- [x] Regression tests cover participant preservation and gameplay participant rendering assumptions.
- [x] Regression tests cover the current `content`-based code synchronization path explicitly.
- [x] Regression tests cover frontend reaction to `turn-evaluated` and `turn-changed` in the documented order.
- [x] Tests that still depend on stale transport or payload assumptions are updated or replaced.

**Verification:**
- [x] Tests pass: `npm test`
- [x] Type check passes: `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`
- [x] Manual check: each known frontend symptom maps to at least one focused automated assertion or an explicit backend dependency note

**Dependencies:** Task 6

**Files likely touched:**
- `tests/app/realtimeEventReducers.test.mjs`
- `tests/app/turnProgression.test.mjs`
- `tests/app/specSyncRegression.test.mjs`
- `tests/app/roomWaitingState.test.mjs`

**Estimated scope:** M: 3-5 files

## Checkpoint: Complete
- [x] Frontend gameplay state handling matches the current backend gameplay contract
- [x] Mission metadata, participant display, and editability no longer depend on placeholder gameplay assumptions
- [x] Regression coverage exists for the corrected frontend gameplay contract
- [x] Remaining known issues, if any, are clearly attributable to unresolved backend/documentation drift rather than frontend state handling

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| The frontend adds broad fallbacks that hide backend/documentation drift | High | Keep the backend implementation as source of truth for this track and record spec drift explicitly instead of normalizing everything away |
| Reducer fixes and RoomPage fixes diverge | High | Land shared type and reducer work before page-layer cleanup so the UI consumes one stable contract |
| Participant rendering still depends on timing between `/main` and `/play` | Medium | Treat waiting-room to gameplay handoff as a first-class acceptance criterion in Task 4 |
| Existing tests keep reflecting outdated assumptions and give false confidence | Medium | Make regression refresh a dedicated final task rather than incidental cleanup |

## Open Questions
- Should the frontend preserve waiting-room participant state into gameplay indefinitely until a newer `room-participants-updated` arrives, or only during the initial route transition?
- If the backend still omits some documented mission fields such as `title` and `description`, should the frontend temporarily show a contract-gap placeholder or block gameplay rendering more explicitly?
- When the team later revisits `docs/etc/api-spec.md`, should `content` remain canonical, or should that future documentation cleanup intentionally re-open the `codeDelta` migration decision?
- Do we want a small debug surface for realtime gameplay payload inspection during manual QA, or should contract validation remain test-only?

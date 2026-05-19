# Implementation Plan: Worker 2 Parallel Track

## Overview
Worker 2 owns the gameplay routes and realtime-heavy implementation after the common sequential checkpoint. This stream covers room socket lifecycle, gameplay state handling, Monaco/editor synchronization, hint loading, turn submission, and result routing.

## Start Condition
- Begin only after `docs/plans/common-sequential-plan.md` reaches the `Parallel Split Ready` checkpoint.
- Assume route guards, auth state, current-room initialization, AI chat session baseline, and shared state contracts already exist.

## Ownership Boundary
- Own:
  - `src/pages/RoomPage/*`
  - `src/pages/ResultPage/*`
  - `src/features/realtime/*`
  - `src/features/game-turn/*`
  - `src/features/editor/*`
  - `src/features/hint/*`
  - room-scoped gameplay state under `src/app/store/*` as needed
- Do not change `/main` chat and waiting-room UX unless a shared contract mismatch blocks gameplay entry.

## Task List

### Phase 6A: Route And Socket Foundation

## Task 1: Implement room route shell and socket lifecycle

**Description:** Build the gameplay route shell and room-scoped socket lifecycle, including connect, `join-room`, reuse within the same room, and terminated-session handling when the socket closes.

**Acceptance criteria:**
- [ ] Gameplay and result page shells exist for `/rooms/:gameRoomId/play` and `/rooms/:gameRoomId/result`.
- [ ] The socket opens only when the user has a joined room in `WAITING` or `IN_PROGRESS`, and emits `join-room` on new socket creation.
- [ ] Socket closure follows the terminated-session path instead of automatic reconnect-and-resume.

**Verification:**
- [ ] Planned unit test covers socket lifecycle reducer or controller behavior
- [ ] Planned integration test covers waiting-room to room-socket initialization and terminated-session handling
- [ ] Manual review confirms lifecycle rules from `docs/specs/01-architecture.md`

**Dependencies:** Common Task 6

**Files likely touched:**
- `src/features/realtime/*`
- `src/pages/RoomPage/*`
- `src/pages/ResultPage/*`
- `src/shared/socket/*`

**Estimated scope:** Medium: 3-5 files

## Task 2: Implement `game-started` handling and gameplay bootstrapping

**Description:** Consume the authoritative `game-started` event to enter gameplay, persist mission and game state, initialize timer context, and load initial editor file sources from mission metadata.

**Acceptance criteria:**
- [ ] The app routes to `/rooms/:gameRoomId/play` only when `game-started` indicates gameplay entry.
- [ ] `gameState` and `missionState` are stored from realtime payloads rather than inferred from HTTP start responses.
- [ ] Initial editor files are bootstrapped from `missionState.projectStructure.files[*].fileUrl` according to the resolved contract.

**Verification:**
- [ ] Planned integration test covers route transition after `game-started`
- [ ] Planned component or state test covers mission and game state persistence from the event payload
- [ ] Manual review confirms no gameplay bootstrap depends on Worker 1's start response UI

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/realtime/*`
- `src/features/editor/*`
- `src/features/game-turn/*`
- `src/pages/RoomPage/*`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Gameplay Entry
- [ ] Realtime `game-started` is the sole gate into gameplay routing
- [ ] Room page shells, socket setup, and initial gameplay state are stable
- [ ] Human review confirms the boundary with Worker 1's start-game request is intact

### Phase 6B: Core Gameplay UI

## Task 3: Implement gameplay header, timer, editability, and hint flow

**Description:** Render the gameplay screen primitives from authoritative state, including mission metadata, turn metadata, editability rules, countdown handling, and current-step hint fetching with client-side caching.

**Acceptance criteria:**
- [ ] The gameplay header renders mission, difficulty, language, turn, current player, remaining time, and strike state.
- [ ] Editability follows the exact current-player and `IN_PROGRESS` rule from `docs/specs/06-realtime-and-gameplay.md`.
- [ ] Hint fetching caches by `gameRoomMissionStepId` and stores hint usage in client state.

**Verification:**
- [ ] Planned unit tests cover editability and timer calculation rules
- [ ] Planned component tests cover game header, turn timer, and hint UI states
- [ ] Manual review confirms hint API behavior from `docs/specs/04-api-and-auth.md`

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/game-turn/*`
- `src/features/hint/*`
- `src/pages/RoomPage/*`
- `src/app/store/*`

**Estimated scope:** Medium: 3-5 files

## Task 4: Implement Monaco editor, file tabs, and code synchronization

**Description:** Add the editor surface for mission files, including file tab switching, local edit detection, debounced outbound code-change emission, and remote update application for other clients only.

**Acceptance criteria:**
- [ ] Monaco renders the active mission files with a switchable active file path.
- [ ] Local edits debounce outbound code-change events using whole-file content semantics.
- [ ] Remote `code-updated` events apply only when they come from a different client session.

**Verification:**
- [ ] Planned component test covers file-tab switching and read-only mode changes
- [ ] Planned integration test covers code change emission and remote update application
- [ ] Manual contract review confirms full-file synchronization semantics from `docs/specs/06-realtime-and-gameplay.md`

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/editor/*`
- `src/features/realtime/*`
- `src/pages/RoomPage/*`

**Estimated scope:** Medium: 3-5 files

### Phase 7: Turn And Result Flow

## Task 5: Implement turn submit, evaluation, and turn-change handling

**Description:** Complete the active turn flow by emitting turn submissions, holding a pending state until evaluation arrives, rendering evaluation results, and updating editability and timers when the turn changes.

**Acceptance criteria:**
- [ ] Turn submission emits the required snapshot payload and disables editing while submission is pending.
- [ ] `turn-evaluated` updates evaluation results, strikes, and issue markers in the gameplay UI.
- [ ] `turn-changed` updates current player, timer state, and editor read-only mode without requiring a reload.

**Verification:**
- [ ] Planned integration test covers submission pending, evaluation display, and next-turn transition
- [ ] Planned component tests cover turn indicator, timer, and evaluation panel states
- [ ] Manual review confirms local zero-time behavior waits for the server event before state transition

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/game-turn/*`
- `src/features/editor/*`
- `src/features/realtime/*`
- `src/pages/RoomPage/*`

**Estimated scope:** Medium: 3-5 files

## Task 6: Implement game-state updates, mission result handling, and result routing

**Description:** Finish the gameplay stream by processing broad game-state updates, persisting final mission results from realtime events, and routing to the result screen without relying on a separate result API.

**Acceptance criteria:**
- [ ] `game-state-updated` refreshes game status and prepares the UI for finished-state transitions.
- [ ] `mission-result` stores the final result payload in memory and routes to `/rooms/:gameRoomId/result`.
- [ ] The result page renders final mission outcome data without issuing a separate result fetch.

**Verification:**
- [ ] Planned integration test covers result routing after `mission-result`
- [ ] Planned component test covers mission-result panel rendering
- [ ] Manual review confirms result flow follows `docs/specs/06-realtime-and-gameplay.md`

**Dependencies:** Task 5

**Files likely touched:**
- `src/features/realtime/*`
- `src/pages/RoomPage/*`
- `src/pages/ResultPage/*`
- `src/app/store/*`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Worker 2 Complete
- [ ] Gameplay entry, room socket lifecycle, editor sync, turn flow, and result routing are complete
- [ ] No feature depends on reconnect-and-resume behavior
- [ ] Worker 1 and Worker 2 integration boundary is limited to current-room state and `game-started`

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Worker 2 changes shared room or realtime store shape mid-stream | High | Keep shared state additions backward-compatible with the common checkpoint contract |
| Editor synchronization diverges from backend payload semantics | High | Validate full-file content semantics before implementing local diff assumptions |
| Socket lifecycle and page lifecycle become tightly coupled | Medium | Encapsulate connection management in `features/realtime` and keep pages declarative |

## Open Questions
- Should file content fetching from `fileUrl` happen eagerly on `game-started`, or lazily per active tab if the spec stays silent?
- Is the result screen expected to remain accessible after a hard refresh, or is in-memory-only state acceptable for v1 as written?

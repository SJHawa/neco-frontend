# Implementation Plan: Worker 1 Parallel Track

## Overview
Worker 1 owns the `/main` route after the common sequential checkpoint. This stream covers AI chat interactions, command-result driven room flows, invitation actions surfaced through chat, and the waiting-room UI that remains on `/main` until realtime gameplay entry is confirmed.

## Start Condition
- Begin only after `docs/plans/common-sequential-plan.md` reaches the `Parallel Split Ready` checkpoint.
- Assume auth, current-room initialization, invitation loading, active AI chat session selection, and shared state contracts are already stable.

## Ownership Boundary
- Own:
  - `src/features/ai-chat/*`
  - `src/features/game-room/*` for `/main` waiting-room start behavior
  - `src/features/room-waiting/*`
  - `src/features/invitation/*` UI interactions on `/main`
  - `src/pages/MainPage/*`
- Do not expand into gameplay route implementation under `/rooms/:gameRoomId/*` unless a shared contract defect blocks this track.

## Task List

### Phase 4A: AI Chat Interaction

## Task 1: Implement AI chat message send and command branching

**Description:** Add the `/main` chat interaction loop so the user can send natural-language messages, receive assistant responses, and persist pending command state from the backend command-result contract.

**Acceptance criteria:**
- [ ] Message submission sends only the `message` field defined in `docs/specs/05-ai-chat-flow.md`.
- [ ] The client stores `pendingCommand`, `assistantMessage`, and chat history using the command-result contract from the response.
- [ ] Sending state, error state, and retry behavior align with `docs/specs/08-error-loading-and-navigation.md`.

**Verification:**
- [ ] Planned unit test covers command-result branching by `requestType` and `status`
- [ ] Planned component test covers chat input pending and error states
- [ ] Manual response-shape review confirms no removed `clientAction` field is reintroduced

**Dependencies:** Common Task 6

**Files likely touched:**
- `src/features/ai-chat/*`
- `src/entities/message/*`
- `src/pages/MainPage/*`

**Estimated scope:** Medium: 3-5 files

## Task 2: Implement ROOM_CREATE staged UI on `/main`

**Description:** Build the staged room-creation flow inside chat, including difficulty selection, mission-template selection, and waiting-room entry after successful room creation.

**Acceptance criteria:**
- [ ] `PENDING` room-create responses surface the difficulty-selection UI.
- [ ] `assistantMessage.metadata.templates` renders template-selection UI and confirmation sends a natural-language follow-up.
- [ ] Successful room creation updates current-room state and switches `/main` into waiting-room mode without route navigation.

**Verification:**
- [ ] Planned integration test covers no-room prompt, difficulty selection, template selection, and room-create success
- [ ] Planned component test covers staged UI rendering from command result and assistant metadata
- [ ] Manual review confirms room-create flow stays on `/main`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/ai-chat/*`
- `src/features/game-room/*`
- `src/pages/MainPage/*`

**Estimated scope:** Medium: 3-5 files

### Checkpoint: Chat Commands
- [ ] The user can create a room through AI chat and land in waiting-room mode on `/main`
- [ ] Command-result rendering is stable enough for invitation and game-start actions
- [ ] Human review confirms no gameplay-route coupling has leaked into this stream

### Phase 4B: Invitation And Waiting Room

## Task 3: Implement invitation accept and deny flows

**Description:** Connect invitation cards and chat-driven invitation outcomes so invited users can join or deny from `/main` while keeping invitation state synchronized with the current room and chat UI.

**Acceptance criteria:**
- [ ] `ROOM_JOIN` removes the invitation card and enters waiting-room state on `/main`.
- [ ] `USER_INVITE_DENY` removes the invitation card and optionally shows denial completion in chat.
- [ ] Invitation error cases map to retryable or terminal UI states according to the shared error policy.

**Verification:**
- [ ] Planned integration test covers invitation rendering and acceptance into waiting-room state
- [ ] Planned component test covers invitation card success and failure states
- [ ] Manual review confirms invitation removal rules from `docs/specs/05-ai-chat-flow.md`

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/invitation/*`
- `src/features/ai-chat/*`
- `src/pages/MainPage/*`

**Estimated scope:** Medium: 3-5 files

## Task 4: Implement waiting-room status, participant list, and start button

**Description:** Render the waiting-room UI on `/main`, including participant state, latest membership changes, owner-only start controls, and retryable loading/error states for room-scoped status.

**Acceptance criteria:**
- [ ] Waiting-room UI shows the room title, room status, participant counts, role, membership status, and participant list.
- [ ] The start button visibility and enabled state follow the exact owner and participant-count rules from `docs/specs/06-realtime-and-gameplay.md`.
- [ ] Participant changes are surfaced through status cards or chat-compatible summaries.

**Verification:**
- [ ] Planned component tests cover waiting-room status, participant list, and start-button states
- [ ] Planned integration test covers waiting-room initialization after room join or room create
- [ ] Manual review confirms the UI remains on `/main` for all waiting-room states

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/room-waiting/*`
- `src/features/game-room/*`
- `src/pages/MainPage/*`

**Estimated scope:** Medium: 3-5 files

## Task 5: Implement start-game request handling and `game-started` wait state

**Description:** Wire the owner start-game action so `/main` submits the start request, treats HTTP success only as request acceptance, and waits for the authoritative realtime event before entering gameplay.

**Acceptance criteria:**
- [ ] Start-game requests call `POST /game-rooms/{gameRoomId}/start` with the allowed request shape.
- [ ] The UI does not route to gameplay on HTTP success alone.
- [ ] `/main` shows a pending or acknowledged state until Worker 2's `game-started` handling moves the user into gameplay.

**Verification:**
- [ ] Planned integration test covers start request followed by deferred route transition
- [ ] Planned unit test covers button enablement logic and request-state handling
- [ ] Manual contract review confirms gameplay entry depends on realtime only

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/game-room/*`
- `src/features/room-waiting/*`
- `src/pages/MainPage/*`

**Estimated scope:** Small: 1-2 files

### Checkpoint: Worker 1 Complete
- [ ] `/main` supports AI-driven room creation, invitation handling, waiting-room rendering, and start-game requests
- [ ] HTTP success never bypasses the realtime gate into gameplay
- [ ] Worker 2 can integrate `game-started` routing without revisiting `/main` contracts

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Waiting-room UI and chat state compete for room ownership | High | Treat current-room state as shared source of truth and keep chat state presentation-only where possible |
| Start-game UX falsely implies gameplay already started | High | Explicitly model HTTP success as request acceptance and wait for realtime event |
| Invitation actions and AI chat messages drift from one another | Medium | Keep invitation completion reflected in both room state and chat-visible feedback rules |

## Open Questions
- Should participant change summaries live only in the waiting-room status area, or also append a system-style chat bubble?
- Does Worker 1 own the visual connection-status indicator on `/main`, or should that be added only when Worker 2 finalizes realtime state presentation?

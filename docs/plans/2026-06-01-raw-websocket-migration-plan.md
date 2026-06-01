# Implementation Plan: Raw WebSocket Realtime Migration

## Overview
This plan covers the frontend work needed to replace the current Socket.IO-based realtime layer with a raw WebSocket (`ws`) client. The immediate trigger is a protocol mismatch: the frontend currently uses `socket.io-client`, while the backend exposes a raw WebSocket server instead of a Socket.IO endpoint. Until that mismatch is resolved, `join-room` cannot be delivered and `game-started` cannot reach the client.

## Problem Statement
- The frontend realtime client in `src/shared/socket/socketClient.ts` currently assumes a Socket.IO server and default `/socket.io` handshake behavior.
- Live verification against the running backend shows that:
  - HTTP APIs are reachable and game-room creation works.
  - Socket.IO handshake paths such as `/socket.io/?EIO=4&transport=polling` return `404 NOT_FOUND`.
  - websocket-only Socket.IO connection attempts fail before `join-room` is emitted.
- As a result, the current implementation cannot join a room over realtime, so gameplay entry stays blocked even when `POST /game-rooms/{gameRoomId}/start` returns success.

## Goals
- Replace the low-level realtime transport with a raw WebSocket client while preserving the existing route ownership and store boundaries.
- Keep `join-room`, `room-participants-updated`, `game-started`, `game-state-updated`, `code-updated`, `turn-evaluated`, `turn-changed`, and `mission-result` as the product-level event vocabulary.
- Minimize churn outside the realtime feature layer by adapting the transport behind the existing lifecycle/controller surface where practical.

## Non-Goals
- Do not redesign waiting-room or gameplay product behavior.
- Do not add reconnect-and-resume semantics beyond what the current spec allows.
- Do not change HTTP contracts as part of this migration.

## Architecture Decisions
- Migrate the transport seam first, not the whole feature tree. `shared/socket/*` and `features/realtime/*` should absorb most of the change so `/main` and `RoomPage` can keep their current orchestration shape.
- Introduce an explicit raw message envelope at the socket boundary if the backend requires it. If backend frames are simple `{ event, data }` payloads, normalize them once inside `shared/socket`.
- Keep close-code handling in the lifecycle layer. Transport changes should not remove the current `4401` / `4403` / `4404` / `1000` policy behavior.
- Update the specs after the client contract is confirmed. Existing `docs/specs/*` still speak in Socket.IO terms and should not remain misleading after the migration lands.

## Parallelization Guidance
- Must stay sequential:
  - transport contract discovery and normalization
  - shared socket adapter replacement
  - lifecycle/controller adaptation
- Can parallelize after the raw transport seam is stable:
  - one stream on waiting-room/manual QA updates
  - one stream on gameplay event-path verification

## Task List

### Phase 1: Contract Discovery

## Task 1: Capture the raw WebSocket message contract

**Description:** Confirm the exact backend websocket URL, authentication handshake, outbound `join-room` frame shape, inbound event envelope, and close/error semantics before changing client code.

**Acceptance criteria:**
- [x] The backend websocket URL/path is documented precisely, including whether it differs from `VITE_SOCKET_URL`.
- [x] The authentication mechanism is known: query param, header, first message, subprotocol, or another handshake pattern.
- [x] The frame shape for outbound `join-room` and inbound gameplay events is documented with concrete examples.
- [x] Close/error behavior is documented well enough to map into the existing frontend close-policy model.

**Verification:**
- [x] Manual capture from the running backend using a minimal websocket client.
- [x] Notes added to `docs/implementation-logs/` or a companion contract note if needed.
- [ ] Human review confirms the captured contract is current.

**Dependencies:** None

**Files likely touched:**
- `docs/specs/01-architecture.md`
- `docs/specs/06-realtime-and-gameplay.md`
- `docs/etc/api-spec.md`
- `docs/implementation-logs/*`

**Estimated scope:** S: 1-3 files

## Task 2: Define the frontend raw WebSocket adapter boundary

**Description:** Decide how the frontend transport abstraction should represent a raw WebSocket while keeping the rest of the app insulated from protocol details.

**Acceptance criteria:**
- [x] A replacement interface is defined for `RealtimeSocket` that works for raw WebSocket semantics.
- [x] Event subscription, emit/send, connect, disconnect, and close-code handling responsibilities are clearly assigned between `shared/socket` and `features/realtime`.
- [x] The adapter design accounts for message parsing, event dispatch, and malformed-frame handling without leaking transport details into page code.

**Verification:**
- [x] Design review against `docs/specs/01-architecture.md` and `docs/specs/03-modules.md`
- [x] A small adapter sketch or typed interface diff is reviewed before implementation

**Dependencies:** Task 1

**Files likely touched:**
- `src/shared/socket/socketClient.ts`
- `src/features/realtime/roomSocketLifecycle.ts`
- `src/shared/types/clientState.ts`

**Estimated scope:** S: 1-3 files

### Phase 2: Transport Migration

## Task 3: Replace the Socket.IO client with a raw WebSocket client

**Description:** Implement the raw WebSocket transport in `shared/socket` and remove Socket.IO-specific handshake assumptions.

**Acceptance criteria:**
- [x] `src/shared/socket/socketClient.ts` no longer imports or depends on `socket.io-client`.
- [x] The raw WebSocket client can open the backend realtime endpoint using the confirmed handshake/authentication contract.
- [x] Incoming frames are parsed and dispatched through the shared adapter surface in a way the lifecycle layer can consume.
- [x] Outgoing messages can send `join-room` and other future events using the normalized adapter API.

**Verification:**
- [x] Focused tests cover message parsing, send behavior, and close/error propagation for the raw adapter.
- [ ] Targeted manual check confirms the raw socket can connect to the live backend endpoint.
- [x] `npx tsc -p tsconfig.app.json`

**Dependencies:** Task 2

**Files likely touched:**
- `src/shared/socket/socketClient.ts`
- `tests/app/roomSocketLifecycle.test.mjs`
- `package.json`
- `package-lock.json`

**Estimated scope:** M: 3-5 files

## Task 4: Adapt the room socket lifecycle to raw WebSocket semantics

**Description:** Update the lifecycle/controller layer so it handles raw WebSocket connection states, join timing, and close metadata without assuming Socket.IO callbacks or socket IDs.

**Acceptance criteria:**
- [x] `createRoomSocketLifecycleController()` works with the new raw socket adapter.
- [x] `join-room` is sent at the correct point in the raw connection lifecycle.
- [x] Lifecycle state still exposes `activeRoomId`, `connectionStatus`, `closeCode`, and `closeReasonCode`.
- [x] Existing application close-policy behavior stays intact for `4401`, `4403`, `4404`, and `1000`.

**Verification:**
- [x] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomSocketLifecycle.test.mjs tests/app/socketClosePolicy.test.mjs`
- [x] `npx tsc -p tsconfig.app.json`
- [x] Manual contract review against `docs/specs/01-architecture.md` and `docs/specs/08-error-loading-and-navigation.md`

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/realtime/roomSocketLifecycle.ts`
- `src/features/realtime/useRoomSocketLifecycle.ts`
- `src/features/realtime/socketClosePolicy.ts`
- `tests/app/roomSocketLifecycle.test.mjs`

**Estimated scope:** M: 3-5 files

### Phase 3: Event Flow Verification

## Task 5: Revalidate waiting-room join and gameplay-entry flows against the live backend

**Description:** Verify that `/main` can now join the room over raw WebSocket and receive the authoritative events needed for waiting-room updates and gameplay entry.

**Acceptance criteria:**
- [ ] A joined waiting-room client receives the expected initial participant or room-sync event from the backend.
- [ ] `POST /game-rooms/{gameRoomId}/start` followed by a valid backend emit results in the client receiving `game-started`.
- [ ] `/rooms/:gameRoomId/play` routing still depends on the authoritative event gate, not HTTP success alone.
- [ ] Any remaining mismatch between backend frame shape and frontend expectations is identified explicitly.

**Verification:**
- [ ] Live manual QA against the running backend
- [x] Regression tests still pass for gameplay-entry gating:
  - `tests/app/realtimeEventReducers.test.mjs`
  - `tests/app/specSyncRegression.test.mjs`
- [x] `npx tsc -p tsconfig.app.json`

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/realtime/roomRealtimeEvents.ts`
- `src/features/realtime/realtimeEventReducers.ts`
- `tests/app/realtimeEventReducers.test.mjs`
- `docs/manual-qa/spec-sync-reflected-contract.md`

**Estimated scope:** M: 3-5 files

## Task 6: Update specs, plans, and implementation logs to reflect raw WebSocket ownership

**Description:** Remove stale Socket.IO assumptions from the documentation set and record the migration details for future workers.

**Acceptance criteria:**
- [x] `docs/specs/01-architecture.md` no longer claims Socket.IO-specific behavior unless the backend contract still uses equivalent event semantics.
- [x] `docs/specs/06-realtime-and-gameplay.md` documents the raw WebSocket transport expectations and normalized event envelope.
- [x] Relevant implementation logs explain why the transport changed and what assumptions were preserved.
- [x] Plan references in `docs/plans/` no longer mislead future work about the realtime protocol.

**Verification:**
- [x] Manual doc review across `docs/specs/01-architecture.md`, `docs/specs/06-realtime-and-gameplay.md`, and `docs/etc/api-spec.md`
- [x] Final diff review confirms transport terminology is consistent

**Dependencies:** Task 5

**Files likely touched:**
- `docs/specs/01-architecture.md`
- `docs/specs/06-realtime-and-gameplay.md`
- `docs/etc/api-spec.md`
- `docs/implementation-logs/*`
- `docs/plans/*`

**Estimated scope:** S: 1-3 files

## Checkpoints

### Checkpoint: After Tasks 1-2
- [x] The backend raw websocket contract is known
- [x] The frontend adapter boundary is agreed before code churn begins

### Checkpoint: After Tasks 3-4
- [x] The client can connect over raw WebSocket
- [x] `join-room` can be sent without Socket.IO dependencies
- [x] Close-policy behavior remains intact

### Checkpoint: Complete
- [ ] Waiting-room and gameplay entry work against the live backend realtime protocol
- [ ] Socket.IO assumptions are removed from code and docs
- [ ] Regression coverage protects the migrated transport seam

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend frame shape differs from current `{eventName, payload}` assumptions | High | Capture the live contract first and normalize it once inside `shared/socket` |
| Raw websocket auth handshake is incompatible with current token flow | High | Confirm handshake details before implementation; keep `auth` and token storage unchanged unless backend requires a different mechanism |
| Lifecycle tests are too Socket.IO-shaped to catch raw-socket edge cases | Medium | Add adapter-level tests plus lifecycle regression tests before removing the old client |
| Documentation lags behind the migration and misleads later workers | Medium | Treat doc updates as part of the migration completion criteria, not optional cleanup |

## Open Questions
- What exact websocket URL/path should replace the current default `VITE_SOCKET_URL` usage?
- Does the backend expect the access token during the websocket handshake or inside the initial `join-room` frame only?
- Are inbound backend frames already event-tagged, or does the frontend need to infer event type from another field?
- Does the backend use websocket close codes directly for `4401`, `4403`, `4404`, and `1000`, or are some errors sent as messages before close?

# Raw WebSocket Migration: Task 2 Adapter Boundary

## Entry: 2026-06-01 Task 2

**Track:**
- Plan file: `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- Task: `Task 2: Define the frontend raw WebSocket adapter boundary`
- Dependencies reviewed:
  - `docs/implementation-logs/raw-websocket-2026-06-01-task-1-contract-discovery.md`
  - `docs/specs/01-architecture.md`
  - `docs/specs/03-modules.md`
  - `src/shared/socket/socketClient.ts`
  - `src/features/realtime/roomSocketLifecycle.ts`
  - `src/features/realtime/roomRealtimeEvents.ts`
  - `tests/app/roomSocketLifecycle.test.mjs`

**What was done:**
- Reviewed the current frontend seam between `shared/socket` and `features/realtime` to identify which parts are truly transport-specific and which parts are product-level orchestration.
- Defined a replacement adapter boundary that keeps product events (`join-room`, `game-started`, etc.) stable while removing Socket.IO assumptions from the transport layer.
- Chose to preserve the current high-level `RealtimeSocket` shape (`connect`, `disconnect`, `emit`, `on`, `off`) so `roomSocketLifecycle.ts` and `roomRealtimeEvents.ts` can migrate with minimal surface churn.
- Identified `socket.id` as the only transport-specific field currently leaking into higher layers. The boundary keeps `id` optional and treats it as best-effort runtime metadata rather than a required transport primitive.
- Assigned raw frame parsing and event demultiplexing to `shared/socket`, not to pages or reducers, so `features/realtime` can keep consuming event names and payloads rather than low-level websocket messages.

**Agreed adapter boundary:**
- `shared/socket/socketClient.ts` owns:
  - opening the raw websocket connection to the root endpoint
  - tracking websocket open/close/error lifecycle
  - parsing inbound JSON safely
  - ignoring malformed or unsupported inbound frames without crashing the page layer
  - converting inbound `{ event, data }` frames into event-name subscriptions
  - serializing outbound `emit(eventName, payload)` calls into:
```json
{
  "event": "event-name",
  "data": { "...": "payload" }
}
```
- `features/realtime/roomSocketLifecycle.ts` owns:
  - eligibility checks (`missing-auth`, `missing-room`, `room-mismatch`, `not-joined`, `unsupported-room-status`)
  - deciding when to create a socket
  - deciding when to send `join-room`
  - translating transport close/error state into frontend `connectionStatus`, `closeCode`, and `closeReasonCode`
  - preserving the current terminated-session latch and close-policy rules
- `features/realtime/roomRealtimeEvents.ts` owns:
  - product-level event binding by canonical names only
  - reducer dispatch for `room-participants-updated`, `game-started`, `game-state-updated`, `code-updated`, `turn-evaluated`, `turn-changed`, and `mission-result`
  - no raw JSON parsing and no websocket lifecycle concerns

**Proposed interface shape:**
```ts
export type SocketEventHandler = (...args: unknown[]) => void;

export type RealtimeSocket = {
  id?: string;
  connect: () => void;
  disconnect: () => void;
  emit: (eventName: string, payload: unknown) => void;
  on: (eventName: string, handler: SocketEventHandler) => void;
  off: (eventName: string, handler: SocketEventHandler) => void;
};

export type CreateRealtimeSocketOptions = {
  socketUrl: string;
};
```

**Important Task 2 decisions:**
- Remove `accessToken` from transport construction options.
  - Reason: Task 1 confirmed the backend does not authenticate during websocket connect.
  - Impact: token stays in `JoinRoomEvent` and is sent via `emit("join-room", payload)`.
- Keep `emit()` as the lifecycle-facing send primitive.
  - Reason: it preserves the existing controller API and maps cleanly onto raw websocket frames.
- Keep `on("connect")`, `on("disconnect")`, and `on("connect_error")` as synthetic adapter events.
  - Reason: the lifecycle controller and tests already depend on those transitions.
  - Implementation implication: raw websocket open/error/close must be normalized into these event names by the adapter.
- Do not move `{ event, data }` parsing into `roomRealtimeEvents.ts`.
  - Reason: doing so would leak transport protocol into feature code and make tests noisier.
- Treat `socket.id` as optional/adapter-generated only.
  - Reason: raw websocket has no server-issued socket id equivalent in the current discovered contract.
  - Impact: any features using `realtime.socketId` must tolerate `null` or a client-generated session identifier later in Task 3/4.

**Typed diff to carry into implementation:**
- Current:
```ts
export type CreateRealtimeSocketOptions = {
  accessToken: string;
  socketUrl: string;
};
```
- Proposed:
```ts
export type CreateRealtimeSocketOptions = {
  socketUrl: string;
};
```

**Why it matters for the next worker:**
- Task 3 can replace the underlying transport without forcing a simultaneous rewrite of `roomSocketLifecycle.ts` and `roomRealtimeEvents.ts`.
- The raw websocket adapter should synthesize lifecycle events to match the controller’s existing mental model instead of pushing native websocket event objects into feature code.
- `join-room` remains the first application message after connect, and `JoinRoomEvent` remains the place where `accessToken`, `gameRoomId`, and `userId` live.
- The `socketId` story must stay explicitly optional while migrating. The adapter boundary should not invent server guarantees the backend does not provide.

**Dependency impact:**
- Satisfies Task 2 of `docs/plans/2026-06-01-raw-websocket-migration-plan.md`.
- Unblocks Task 3 with a stable implementation direction:
  - preserve lifecycle API
  - remove transport auth options
  - normalize raw frames inside `shared/socket`

**Files touched:**
- `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- `docs/implementation-logs/raw-websocket-2026-06-01-task-2-adapter-boundary.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] Design review against `docs/specs/01-architecture.md` and `docs/specs/03-modules.md`
- [x] Current code review of `shared/socket`, `roomSocketLifecycle`, `roomRealtimeEvents`, and lifecycle tests
- [x] Adapter sketch reviewed against the live raw websocket contract captured in Task 1

**Not verified:**
- [ ] Runtime proof with the new adapter implementation
- [ ] End-to-end browser verification after Task 3/4 land

**Design decisions:**
- Preferred a compatibility-first adapter over a full lifecycle rewrite because the product event vocabulary and reducer boundaries are already stable.
- Chose to synthesize `connect` / `disconnect` / `connect_error` inside the adapter so existing lifecycle tests stay meaningful and migration risk remains local.
- Chose not to redesign `roomRealtimeEvents.ts` around raw frame envelopes because the transport seam belongs in `shared/socket`, not feature modules.

**Deviations from spec:**
- None intentional. This task only defines the frontend boundary needed to implement the raw websocket contract already discovered in Task 1.

**Trade-offs:**
- Preserving the old `RealtimeSocket` surface reduces migration cost, but it means the adapter must do extra normalization work instead of exposing native websocket semantics directly.
- Leaving `socket.id` optional keeps the boundary honest, but some later editor echo-suppression behavior may need a client-generated session identifier if server payloads still expect session correlation.

**Open questions:**
- [ ] Should the raw adapter assign a client-generated `id`/session token immediately on connect so downstream `socketId` consumers continue to have a stable identifier?
- [ ] If malformed inbound frames are encountered, should the adapter drop them silently or expose a debug-only hook for diagnostics?
- [ ] Should the adapter expose a dedicated `sendRaw` escape hatch for future non-event frames, or should the boundary stay event-only until a real backend use case appears?

**Instructions for the next worker:**
- Read this entry after Task 1, then start Task 3 in `docs/plans/2026-06-01-raw-websocket-migration-plan.md`.
- Keep the migration local to `shared/socket` first; only widen scope into `roomSocketLifecycle.ts` when the new transport actually needs it.
- Preserve the canonical event names and lifecycle semantics while removing:
  - `socket.io-client`
  - handshake-time auth options
  - `/socket.io` assumptions

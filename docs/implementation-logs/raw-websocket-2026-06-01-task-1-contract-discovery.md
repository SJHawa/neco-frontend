# Raw WebSocket Migration: Task 1 Contract Discovery

## Entry: 2026-06-01 Task 1

**Track:**
- Plan file: `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- Task: `Task 1: Capture the raw WebSocket message contract`
- Dependencies reviewed:
  - `docs/specs/01-architecture.md`
  - `docs/specs/06-realtime-and-gameplay.md`
  - `/Users/imhyeon/Documents/GitHub/backend/src/main.ts`
  - `/Users/imhyeon/Documents/GitHub/backend/src/modules/realtime/gateway/realtime.gateway.ts`
  - `/Users/imhyeon/Documents/GitHub/backend/src/modules/realtime/gateway/realtime.gateway.spec.ts`
  - `/Users/imhyeon/Documents/GitHub/backend/docs/etc/api-spec.md`

**What was done:**
- Verified that the running backend is not exposing a Socket.IO endpoint: `/socket.io/?EIO=4&transport=polling` returns `404 NOT_FOUND`, and Socket.IO websocket connection attempts fail before `join-room`.
- Confirmed from backend source that Nest is booted with `@nestjs/platform-ws` via `NecoWsAdapter`, not Socket.IO. The runtime adapter is registered in `/Users/imhyeon/Documents/GitHub/backend/src/main.ts`.
- Confirmed from backend gateway source and tests that the raw websocket URL is the server root path: clients connect to `ws://{host}:{port}` with no `/socket.io` suffix and no `/v1` prefix.
- Captured a live raw websocket join against the running backend using `ws` and an authenticated room owner token. The backend accepted the connection and returned a `room-participants-updated` message in the expected `{ event, data }` envelope.
- Captured live close-code behavior:
  - invalid token → `4401 AUTH_TOKEN_INVALID`
  - missing `gameRoomId` in `join-room` payload → `4404 GAME_ROOM_NOT_FOUND`
- Confirmed that realtime authentication is not part of the websocket handshake. The backend expects the access token inside the first `join-room` frame and resolves the authenticated user from that token, ignoring forged `userId` values in the client payload.

**Discovered contract:**
- WebSocket URL:
  - `ws://{VITE_SOCKET_URL host}:{VITE_SOCKET_URL port}`
  - with the current local backend this is `ws://127.0.0.1:8080` or `ws://localhost:8080`
  - no `/socket.io` path
  - no `/v1` prefix
- Handshake/authentication:
  - open raw websocket connection first
  - send auth in the first application message, not in the websocket upgrade
- Outbound frame envelope:
```json
{
  "event": "join-room",
  "data": {
    "accessToken": "jwt-access-token",
    "gameRoomId": "2771cf23-07c3-4c28-8001-410f35c1ce00",
    "userId": "client-supplied-user-id"
  }
}
```
- Important auth rule:
  - backend validates `accessToken`
  - backend derives the authoritative user from the token
  - `data.userId` is not trusted and may be ignored or overwritten by server-side auth resolution
- Inbound frame envelope:
```json
{
  "event": "room-participants-updated",
  "data": {
    "gameRoomId": "2771cf23-07c3-4c28-8001-410f35c1ce00",
    "participants": [
      {
        "userId": "7541fcd3-9481-4347-92d1-d96a05db70f5",
        "nickname": "codexowner1780284010",
        "role": "OWNER",
        "membershipStatus": "JOINED"
      }
    ],
    "changedParticipant": null,
    "gameState": {
      "status": "WAITING"
    },
    "missionState": null,
    "occurredAt": "2026-06-01T12:34:50.909+09:00"
  }
}
```
- Canonical gameplay event envelope shape from backend contract:
```json
{
  "event": "game-started",
  "data": {
    "gameRoomId": "room-001",
    "gameState": {
      "status": "IN_PROGRESS"
    },
    "missionState": {
      "missionId": "mission-001"
    },
    "uiHints": {
      "enterGameScreen": true,
      "showMissionGuideModal": true
    },
    "occurredAt": "2026-05-04T10:10:00+09:00"
  }
}
```
- Close/error semantics:
  - `4401 AUTH_TOKEN_INVALID` when token validation fails
  - `4403 FORBIDDEN_RESOURCE_ACCESS` when token is valid but membership is not `JOINED`
  - `4404 GAME_ROOM_NOT_FOUND` when the room is missing or `gameRoomId` is absent
  - unexpected join failures fall back to `1000` normal closure in gateway code

**Why it matters for the next worker:**
- `src/shared/socket/socketClient.ts` must stop assuming a Socket.IO handshake and default path. The next adapter should connect to the root websocket endpoint and send JSON `{ event, data }` frames.
- The current frontend `auth` field in Socket.IO connection options has no effect on this backend. The access token must be carried in the first `join-room` message instead.
- Lifecycle code can preserve the existing product-level event names (`join-room`, `room-participants-updated`, `game-started`, etc.), but it must own message-envelope parsing itself.
- `userId` remains useful as part of the product payload shape, but server-side auth already treats token identity as authoritative, so the client must not assume `userId` in the payload is security-critical.

**Dependency impact:**
- Satisfies Task 1 of `docs/plans/2026-06-01-raw-websocket-migration-plan.md`.
- Unblocks Task 2 because the transport boundary can now be designed around:
  - root-path raw websocket connect
  - JSON `{ event, data }` frames
  - join-time token auth inside the first message

**Files touched:**
- `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- `docs/implementation-logs/raw-websocket-2026-06-01-task-1-contract-discovery.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] Live HTTP probe confirmed Socket.IO paths are absent on the running backend (`/socket.io`, `/v1/socket.io`)
- [x] Live raw websocket probe to `ws://127.0.0.1:8080` opened successfully and returned a `room-participants-updated` message after `join-room`
- [x] Live raw websocket close capture confirmed `4401 AUTH_TOKEN_INVALID`
- [x] Live raw websocket close capture confirmed `4404 GAME_ROOM_NOT_FOUND` for missing `gameRoomId`
- [x] Source review confirmed runtime adapter registration and gateway message handling in backend source

**Not verified:**
- [ ] Live capture of `game-started` from the running backend
- [ ] Live capture of `4403 FORBIDDEN_RESOURCE_ACCESS`
- [ ] End-to-end frontend browser verification after the frontend socket layer is migrated

**Design decisions:**
- Treated backend gateway source plus gateway spec plus live probes as the authoritative contract bundle for this task, because the frontend repo’s existing specs still contain stale Socket.IO assumptions.
- Preserved the frontend’s product-level event vocabulary in the discovery note, since Task 2 should adapt the transport seam rather than rename app-level events.

**Deviations from spec:**
- Current frontend docs/specs in this repository still imply Socket.IO transport behavior. This task records the mismatch instead of silently rewriting all specs before Task 2 confirms the final adapter shape.

**Trade-offs:**
- Live verification focused on the connection path, auth handshake, envelope shape, and close codes. It did not force a full multi-user `game-started` capture because Task 1’s main risk was transport discovery, not gameplay orchestration.

**Open questions:**
- [ ] Does the backend ever expose the raw websocket on a dedicated path in non-local environments, or is root-path websocket guaranteed across environments?
- [ ] Should the frontend keep `userId` inside outbound `join-room` for parity with current domain types, or shrink the client payload once Task 2 revisits the adapter boundary?
- [ ] Does the backend send any non-event informational frames that need separate parsing rules, or are all application messages guaranteed to use `{ event, data }`?

**Instructions for the next worker:**
- Read this entry first, then start Task 2 in `docs/plans/2026-06-01-raw-websocket-migration-plan.md`.
- Replace Socket.IO assumptions with:
  - raw `WebSocket`
  - root endpoint
  - first-message auth via `join-room`
  - JSON `{ event, data }` envelope parsing
- Preserve existing close-code policy behavior and product-level event names while changing the transport seam.

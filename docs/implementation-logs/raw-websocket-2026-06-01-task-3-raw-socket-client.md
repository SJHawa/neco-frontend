# Raw WebSocket Migration: Task 3 Raw Socket Client

## Entry: 2026-06-01 Task 3

**Track:**
- Plan file: `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- Task: `Task 3: Replace the Socket.IO client with a raw WebSocket client`
- Dependencies reviewed:
  - `docs/implementation-logs/raw-websocket-2026-06-01-task-1-contract-discovery.md`
  - `docs/implementation-logs/raw-websocket-2026-06-01-task-2-adapter-boundary.md`
  - `src/shared/socket/socketClient.ts`
  - `src/features/realtime/roomSocketLifecycle.ts`
  - `tests/app/roomSocketLifecycle.test.mjs`

**What was done:**
- Replaced the Socket.IO transport in `src/shared/socket/socketClient.ts` with a raw browser `WebSocket` adapter.
- Removed handshake-time auth from socket construction and normalized outbound sends to JSON `{ event, data }` frames.
- Added adapter-level parsing and lifecycle normalization so higher layers still consume synthetic `connect`, `disconnect`, and `connect_error` events.
- Switched `roomSocketLifecycle.ts` to use the raw websocket adapter by default.
- Removed `socket.io-client` from `package.json` and pruned its lockfile entries.
- Added focused adapter tests for URL normalization, outbound frame serialization, inbound event dispatch, malformed-frame tolerance, and disconnect reason propagation.

**Why it matters for the next worker:**
- The transport seam is now raw websocket-compatible without requiring a page-layer rewrite.
- `join-room` still happens through the existing lifecycle/controller API, but auth now only travels in the message payload, not during socket construction.
- Task 4 can focus on lifecycle semantics and close-policy behavior instead of transport replacement.
- `socket.id` is now adapter-generated best-effort metadata, not a server-issued Socket.IO identifier.

**Dependency impact:**
- Satisfies Task 3 of `docs/plans/2026-06-01-raw-websocket-migration-plan.md`.
- Unblocks Task 4 by giving `roomSocketLifecycle.ts` a working raw websocket default transport.

**Files touched:**
- `src/shared/socket/socketClient.ts`
- `src/features/realtime/roomSocketLifecycle.ts`
- `tests/shared/socketClient.test.mjs`
- `package.json`
- `package-lock.json`
- `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- `docs/implementation-logs/raw-websocket-2026-06-01-task-3-raw-socket-client.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/shared/socketClient.test.mjs tests/app/roomSocketLifecycle.test.mjs tests/app/socketClosePolicy.test.mjs tests/app/specSyncRegression.test.mjs`
- [x] `npx tsc -p tsconfig.app.json`

**Not verified:**
- [ ] Live browser verification that `/main` joins the room against the running backend
- [ ] Live capture that a real backend `game-started` event reaches the browser through the new transport

**Design decisions:**
- Kept the existing `RealtimeSocket` surface and normalized native websocket events inside the adapter so the lifecycle controller did not need a broad rewrite.
- Converted `http://` and `https://` socket URLs to `ws://` and `wss://` inside the adapter to preserve current env var ergonomics.
- Treated malformed inbound frames as ignorable transport noise instead of surfacing them to page code.

**Deviations from spec:**
- None intentional for Task 3. This change aligns runtime behavior with the raw websocket contract captured in Task 1, while the broader spec docs are still pending Task 6 cleanup.

**Trade-offs:**
- Preserving the old high-level socket API kept the diff local, but it required the adapter to synthesize lifecycle events instead of exposing native websocket primitives directly.
- Client-generated `socket.id` preserves compatibility for current state shape, but it is not a server-correlated identifier and should not be treated as authoritative session identity.

**Open questions:**
- [ ] Should Task 4 keep exposing the client-generated `socket.id` in store state, or should that field become nullable where server identity matters?
- [ ] Do we want a debug-only hook for malformed inbound frames if live backend diagnostics become noisy?

**Instructions for the next worker:**
- Read this entry after Task 1 and Task 2, then continue with Task 4 in `docs/plans/2026-06-01-raw-websocket-migration-plan.md`.
- Preserve the raw adapter contract:
  - root websocket endpoint
  - first-message auth via `join-room`
  - JSON `{ event, data }` envelope
  - synthetic `connect` / `disconnect` / `connect_error` lifecycle events
- Focus the next change on lifecycle timing and close-policy validation, not on reworking `shared/socket` again unless a live backend mismatch is discovered.

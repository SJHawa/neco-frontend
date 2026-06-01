# Architecture

## Runtime Boundaries

The frontend calls HTTP APIs for authentication, initialization, and request-response actions. It uses a room-scoped realtime connection for synchronization after the user is attached to a room.

Key rule:

- HTTP responses are not always sufficient to determine the final UI state.
- Realtime events are authoritative for entering gameplay, synchronizing participants, and applying turn changes.

## Routing Model

```txt
/                         -> redirect to /main or /login based on auth state
/login                    -> login page
/signup                   -> signup page
/main                     -> AI chat driven main screen
/rooms/:gameRoomId/play   -> gameplay screen
/rooms/:gameRoomId/result -> result screen
```

Route protection:

- unauthenticated users go to `/login`
- authenticated users trying to access `/login` or `/signup` go to `/main`
- failed token refresh clears auth state and returns to `/login`
- gameplay entry depends on server events, not only on an HTTP start response

## Environment Assumptions

```env
VITE_API_BASE_URL=/v1
VITE_API_PROXY_TARGET=http://localhost:8080
VITE_SOCKET_URL=http://localhost:8080
```

- HTTP API base path is `/v1`
- local Vite development proxies `/v1` to `VITE_API_PROXY_TARGET`
- `VITE_SOCKET_URL` identifies the backend origin for realtime and is converted to a raw `ws://` or `wss://` connection at the server root path
- the frontend must not append `/socket.io` or `/v1` when opening the realtime connection
- production should use HTTPS and a TLS-protected realtime endpoint

## External Services

- backend HTTP API
- realtime gateway
- LLM provider used by the backend AI chat system

## Realtime Transport Contract

- the frontend connects with a raw browser `WebSocket`, not Socket.IO
- the realtime endpoint is the root websocket endpoint derived from `VITE_SOCKET_URL`
- websocket upgrade does not carry app auth; authentication happens in the first `join-room` application message
- outbound application messages are serialized as:

```json
{
  "event": "event-name",
  "data": {}
}
```

- inbound application messages use the same normalized `{ event, data }` envelope
- `shared/socket` owns frame parsing and event dispatch so feature modules consume canonical event names instead of raw websocket frames

## Connection Lifecycle

Open a room-scoped socket only when:

- a current room exists
- the user membership is `JOINED`
- the room status is `WAITING` or `IN_PROGRESS`

Lifecycle rules:

1. connect when the room-scoped screen becomes active
2. send `join-room` as the first application message whenever a new socket instance opens
3. reuse the existing connection across route transitions when the same room remains active
4. disconnect when the user leaves room-scoped UI or auth is cleared

Close handling:

- `4401` with reason `AUTH_TOKEN_INVALID`: clear auth state and route to `/login`
- `4403` with reason `FORBIDDEN_RESOURCE_ACCESS`: leave room-scoped UI and show a terminated-session path
- `4404` with reason `GAME_ROOM_NOT_FOUND`: leave room-scoped UI and show a terminated-session path
- `1000`: treat as an intentional close

## Reconnection Policy

The MVP does not support reconnect-and-resume.

- no automatic exponential backoff reconnection
- no silent room re-entry without a new invitation
- if the socket closes, show a terminated-session path instead of pretending the session recovered
- after an abnormal disconnect, the server marks the participant `LEFT`; gameplay resume without a new invitation is out of scope

## Security Assumptions

- all protected APIs require an access token
- the first `join-room` realtime message sends an access token and must run over TLS in production
- `userId` values sent by the client are not trusted by the server
- turn submission authorization must be validated on the server
- password hashing and token storage rules are backend-coordinated contracts

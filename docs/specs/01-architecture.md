# Architecture

## Runtime Boundaries

The frontend calls HTTP APIs for authentication, initialization, and request-response actions. It uses Socket.IO for room-scoped synchronization after the user is attached to a room.

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
- production should use HTTPS and a TLS-protected Socket.IO endpoint

## External Services

- backend HTTP API
- Socket.IO server
- LLM provider used by the backend AI chat system
- object storage URLs for initial editor files referenced by realtime mission payloads

## Connection Lifecycle

Open a room-scoped socket only when:

- a current room exists
- the user membership is `JOINED`
- the room status is `WAITING` or `IN_PROGRESS`

Lifecycle rules:

1. connect when the room-scoped screen becomes active
2. emit `join-room` whenever a new socket instance is created
3. reuse the existing connection across route transitions when the same room remains active
4. disconnect when the user leaves room-scoped UI or auth is cleared

## Reconnection Policy

The MVP does not support reconnect-and-resume.

- no automatic exponential backoff reconnection
- no silent room re-entry without a new invitation
- if the socket closes, show a terminated-session path instead of pretending the session recovered

## Security Assumptions

- all protected APIs require an access token
- the socket connection sends an access token and must run over TLS in production
- `userId` values sent by the client are not trusted by the server
- turn submission authorization must be validated on the server
- password hashing and token storage rules are backend-coordinated contracts

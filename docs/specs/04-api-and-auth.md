# API And Auth

## API Client Rules

```ts
export const apiClient = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});
```

Request rules:

- base URL is `/v1`
- default `Content-Type` is `application/json`
- all protected requests include `Authorization: Bearer {accessToken}`
- authentication-exempt APIs are the only exception
- request and response fields use `camelCase`
- timestamps are serialized as KST ISO 8601 strings

Response rules:

- return `data` when `error === null`
- throw a typed frontend error when `error !== null`
- if a response is `401` or `AUTH_TOKEN_EXPIRED`, attempt token refresh once
- on successful refresh, retry the original request once
- on refresh failure, log out and route to `/login`

Expected API modules:

- `authApi`
- `aiChatApi`
- `gameRoomApi`
- `participantApi`
- `hintApi`

## Auth State

```ts
export type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
};

export type AuthUser = {
  userId: string;
  loginId: string;
  nickname: string;
  email: string | null;
};
```

## Auth Requests

```ts
export type CheckNicknameResponse = {
  isAvailable: boolean;
};

export type SignupRequest = {
  loginId: string;
  nickname: string;
  passwordHash: string;
  email?: string | null;
};

export type SignupResponse = {
  userId: string;
  loginId: string;
  nickname: string;
  email: string | null;
  createdAt: string;
};

export type LoginRequest = {
  loginId: string;
  passwordHash: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type RefreshTokenResponse = {
  accessToken: string;
};
```

## Token Storage Contract

Resolved contract:

- access token: `sessionStorage`
- refresh token: `localStorage`

Additional auth contract:

- the client hashes the password with SHA-256 before sending it
- this behavior assumes HTTPS transport

## Main Page Initialization APIs

The main page hydrates from:

```txt
GET /game-rooms?userId={userId}
GET /game-room-participants?userId={userId}&membershipStatus=INVITED
GET /ai-chat-sessions?userId={userId}
```

Rules:

- if a request sends `userId`, it must match the authenticated user
- `GET /game-rooms` may return either a `WAITING` room or an `IN_PROGRESS` room for initialization
- if an active AI chat session exists, the frontend then loads its messages
- use `membershipStatus`, not `status`, when filtering invitation rows

## Hint API

```txt
GET /game-room-missions/{missionId}/hints?scope=current-step
```

```ts
export type HintResponse = {
  missionId: string;
  gameRoomMissionStepId: string | null;
  missionTemplateStepId: string;
  hintText: string | null;
};
```

Rules:

- show the hint associated with the current step
- store hint usage in client state
- cache by `gameRoomMissionStepId` to avoid duplicate requests

# Error, Loading, And Navigation

## Error Mapping

```ts
export const errorMessageMap: Record<string, string> = {
  VALIDATION_ERROR: "Please check your input.",
  UNAUTHORIZED: "Login is required.",
  FORBIDDEN_RESOURCE_ACCESS: "You do not have permission to access this resource.",
  INTERNAL_SERVER_ERROR: "A server error occurred.",
  AUTH_LOGIN_ID_CONFLICT: "This login ID is already in use.",
  AUTH_EMAIL_CONFLICT: "This email is already in use.",
  AUTH_NICKNAME_CONFLICT: "This nickname is already in use.",
  AUTH_INVALID_CREDENTIALS: "The login ID or password is invalid.",
  AUTH_TOKEN_INVALID: "Authentication data is invalid.",
  AUTH_TOKEN_EXPIRED: "Your session has expired.",
  AUTH_REFRESH_TOKEN_REVOKED: "Please log in again.",
  AI_CHAT_SESSION_NOT_FOUND: "The AI chat session was not found.",
  AI_CHAT_REQUEST_NOT_FOUND: "The AI request was not found.",
  AI_CHAT_COMMAND_NOT_SUPPORTED: "This command is not supported.",
  AI_CHAT_COMMAND_EXECUTION_FAILED: "The command could not be processed.",
  INVITATION_NOT_FOUND: "The invitation was not found.",
  INVITATION_ALREADY_PROCESSED: "This invitation was already processed.",
  ROOM_INVITE_FORBIDDEN: "You do not have permission to invite users.",
  USER_NOT_FOUND: "The user was not found.",
  USER_ALREADY_IN_ROOM: "The user is already in a room.",
  ROOM_NOT_FOUND: "The room was not found.",
  ROOM_ALREADY_JOINED: "You already joined this room.",
  ROOM_START_FORBIDDEN: "You do not have permission to start the game.",
  ROOM_START_CONDITION_NOT_MET: "The game start conditions are not satisfied.",
  GAME_ROOM_NOT_FOUND: "The game room was not found.",
  MISSION_NOT_FOUND: "The mission was not found.",
  TURN_NOT_FOUND: "The current turn was not found.",
  AI_HINT_NOT_AVAILABLE: "No hint is available for the current step.",
};
```

## Screen-Level Error Policy

- login and signup: show field-level or form-level errors
- main page: show errors in the AI assistant area or a toast
- waiting-room area: show retryable error states
- gameplay page: show turn evaluation errors in the result panel and system errors in a toast
- socket errors: show a top-level connection status indicator

## Realtime Close-Code Policy

```ts
export const socketClosePolicy = {
  4401: "clear auth state and route to /login",
  4403: "leave room-scoped UI and show a terminated-session message",
  4404: "leave room-scoped UI and show a terminated-session message",
  1000: "treat as an intentional close",
} as const;
```

## Loading And Empty States

Auth:

- disable submit during login
- show spinner while checking nickname availability
- map signup conflicts to the corresponding field

Main page:

- show a skeleton while initializing
- show chat skeletons while loading sessions or messages
- disable input or show a pending state while sending a message
- when there is no room and no invitation, show the AI-led room creation prompt

Waiting room:

- show a participant skeleton while loading
- show a retry action on failure
- surface participant changes in chat or status cards

Gameplay:

- show an editor skeleton while game state is loading
- show a session-closed recovery path when the socket disconnects
- keep a submission-pending state until `turn-evaluated`
- switch UI on `turn-changed`

## Navigation Rules

```txt
login success
  -> /main

signup success
  -> /login or /main

no current room and no invitation
  -> stay on /main and show the AI room-creation flow

room create success
  -> stay on /main and show the waiting-room state

room join success
  -> stay on /main and show the waiting-room state

current room status WAITING
  -> stay on /main and show the waiting-room state

current room status IN_PROGRESS
  -> prepare gameplay re-entry through the realtime connection

game-started with enterGameScreen
  -> /rooms/:gameRoomId/play

mission-result
  -> /rooms/:gameRoomId/result

auth refresh failed
  -> /login
```

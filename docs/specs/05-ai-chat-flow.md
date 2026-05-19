# AI Chat Flow

## Session Selection

`GET /ai-chat-sessions` returns an array. The frontend chooses the active session in this order:

1. an `ACTIVE` session associated with the current `gameRoomId`
2. the most recent `ACTIVE` session
3. otherwise no valid session

Resolved contract:

- the server automatically creates the AI chat session when `POST /auth/register` succeeds

## Message Submission

In v1.2, the message send body contains only:

```ts
export type SendAiChatMessageRequest = {
  message: string;
};
```

The removed `clientAction` field must not be reintroduced. Selection, confirmation, acceptance, and denial intents are sent as user messages.

## Command Result Contract

```ts
export type SendAiChatMessageResponse = {
  aiChatRequestId: string;
  requestType: AiChatRequestType;
  requestStatus: AiChatRequestStatus;
  userMessage?: AiChatMessage;
  assistantMessage?: AiChatMessage;
  commandResult: AiChatCommandResult | null;
};
```

The frontend updates UI based on:

- `requestType`
- `commandResult.status`
- `commandResult.apiPath`
- `commandResult.gameRoomId`
- `assistantMessage.metadata`

## ROOM_CREATE Flow

This is a two-step interaction before the room exists:

1. the user expresses room creation intent
2. the server asks for difficulty
3. the user selects a difficulty
4. the server returns mission template candidates
5. the user confirms a template
6. the server creates the room and the UI enters waiting-room mode

Rules:

- when `commandResult.status = PENDING`, show the difficulty-selection UI
- when `assistantMessage.metadata.templates` exists, show template-selection UI
- when `commandResult.status = SUCCESS` and `gameRoomId` exists, save the current room and show the waiting-room UI
- on failure, display the AI message failure path

Resolved contract:

- template confirmation is sent as a natural-language message, for example "I will use this template"

## Invitation Commands

`USER_INVITE`:

- show a success message using `participants` and `gameRoomId`
- participant state changes come from `room-participants-updated` or a room refresh

`ROOM_JOIN`:

- remove the invitation card
- enter the waiting-room state on `/main`

`USER_INVITE_DENY`:

- remove the invitation card
- optionally show the denial completion state in chat

## GAME_START Command

When `commandResult.status = SUCCESS` and `started = true`:

- treat the AI chat response as request acceptance only
- wait for the authoritative `game-started` realtime event before routing or rendering gameplay state

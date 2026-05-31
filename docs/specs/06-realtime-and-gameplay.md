# Realtime And Gameplay

## Waiting Room Display

The waiting-room UI lives inside `/main` and shows:

- room status
- room difficulty
- current participant count
- turn time limit
- max strike count
- minimum and maximum participant counts
- my role
- my membership status
- participant membership states
- recent participant change summary
- the start-game action for the owner

Start button rules:

```ts
const canShowStartButton = currentRoom.myRole === "OWNER";

const canClickStartButton =
  canShowStartButton &&
  currentRoom.status === "WAITING" &&
  currentRoom.joinedParticipantCount >= currentRoom.minParticipants;
```

## Start Game API

```txt
POST /game-rooms/{gameRoomId}/start
```

```ts
export type StartGameRequest = {
  missionTemplateId?: string;
};

export type StartGameResponse = {
  success: boolean;
};
```

Rules:

- do not build gameplay state from this response alone
- wait for `game-started`
- route to `/rooms/:gameRoomId/play` only when realtime `uiHints.enterGameScreen = true`

## Gameplay Screen

The gameplay page contains:

- game status header
- mission title and description
- difficulty and language
- current turn number
- current player
- remaining time
- strike count
- file tabs
- Monaco editor
- turn submit button
- hint button
- turn evaluation panel
- final mission result panel
- participant status panel

Resolved contract:

- `missionState.projectStructure.files` provides the editor file-tab metadata
- the shared API spec does not define a separate `fileUrl` bootstrap contract for editor content

## Editability Rule

```ts
const canEdit =
  gameState.turnState?.currentPlayerId === authUser.userId &&
  gameState.turnState.status === "IN_PROGRESS";
```

## Realtime Outbound Events

`join-room`

```ts
export type JoinRoomEvent = {
  accessToken: string;
  gameRoomId: string;
  userId: string;
};
```

`code-change`

```ts
export type CodeChangeEvent = {
  gameRoomId: string;
  userId: string;
  sessionId: string;
  filePath: string;
  codeDelta: Record<string, unknown>;
  occurredAt: string;
};
```

Resolved contract:

- realtime code synchronization uses delta payloads, not full-file snapshots
- CRDT/Yjs is out of scope for the MVP

`turn-submit`

```ts
export type TurnSubmitEvent = {
  gameRoomId: string;
  userId: string;
  turnId: string;
  codeSnapshot: CodeSnapshot;
  submittedAt: string;
};
```

## Realtime Inbound Events

`room-participants-updated`

- store participants
- show the latest membership change
- persist the included `gameState` and `missionState`
- keep the waiting-room UI when the room is still `WAITING`

`game-started`

- enter gameplay
- persist `gameState` and `missionState`
- apply mission guide UI hints
- build editor tabs from `missionState.projectStructure.files`
- initialize timer and current player

`code-updated`

- apply other participants' file changes
- do not duplicate local changes from the same client

`turn-evaluated`

- show the completed turn result
- update feedback, strikes, and detected issues
- treat `SUBMITTED` and `TIMEOUT` evaluations with the same display flow

`turn-changed`

- update the active player and timer
- switch the editor between writable and read-only modes

`game-state-updated`

- refresh game state
- update strike and mission UI, including `missionState` when present
- prepare result routing when status becomes `FINISHED`

`mission-result`

- display the final mission outcome
- route to `/rooms/:gameRoomId/result`
- treat in-memory event state as the primary source because there is no separate result API

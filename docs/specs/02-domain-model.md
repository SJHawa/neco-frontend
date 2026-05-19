# Domain Model

## Core Invariants

- A user can belong to at most one waiting room at a time.
- The frontend treats `GET /game-rooms` as a single-current-room query, not as a browseable room list.
- The pre-game flow remains on `/main`.
- Gameplay starts only after realtime confirmation.

## Common API Envelope

```ts
export type ApiMeta = {
  requestId: string;
};

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  data: T | null;
  meta: ApiMeta;
  error: ApiError | null;
};
```

The frontend client unwraps `data` when `error === null` and throws a typed application error otherwise.

## Shared Domain Types

```ts
export type AiChatSessionStatus = "ACTIVE" | "CLOSED" | "ERROR";

export type AiChatRequestType =
  | "ROOM_CREATE"
  | "USER_INVITE"
  | "ROOM_JOIN"
  | "USER_INVITE_DENY"
  | "GAME_START";

export type AiChatRequestStatus = "RECEIVED" | "COMPLETED" | "FAILED";

export type AiChatMessageSenderType = "USER" | "ASSISTANT" | "SYSTEM";

export type AiChatMessageType = "TEXT" | "COMMAND_RESULT" | "SYSTEM_NOTICE";

export type RoomCommandStatus = "PENDING" | "SUCCESS" | "FAILED";

export type GameRoomStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "JUDGING"
  | "ANALYZED"
  | "FINISHED";

export type MembershipStatus = "INVITED" | "JOINED" | "LEFT" | "DENIED";

export type ParticipantRole = "OWNER" | "PARTICIPANT";

export type TurnStatus =
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "TIMEOUT";

export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "TIMEOUT";

export type PresenceStatus = "ONLINE" | "OFFLINE" | "ACTIVE" | "IDLE";
```

## Current Room Model

```ts
export type CurrentGameRoom = {
  gameRoomId: string;
  title: string;
  status: GameRoomStatus;
  ownerUserId: string;
  myRole: ParticipantRole;
  myMembershipStatus: MembershipStatus;
  joinedParticipantCount: number;
  minParticipants: number;
  maxParticipants: number;
  createdAt: string;
  updatedAt: string;
};

export type CurrentGameRoomState = {
  currentRoom: CurrentGameRoom | null;
  duplicateRoomWarning: boolean;
};
```

Interpretation of `GET /game-rooms`:

- `0` rooms: no current room
- `1` room: the user has a current room
- `>1` rooms: abnormal state, prefer the most recently updated room and log the anomaly

## Invitation Model

```ts
export type GameRoomParticipant = {
  participantId: string;
  gameRoomId: string;
  gameRoomTitle: string;
  userId: string;
  nickname: string;
  role: ParticipantRole;
  status: MembershipStatus;
  roomStatus: GameRoomStatus;
  createdAt: string;
};
```

## AI Chat Models

```ts
export type AiChatSession = {
  aiChatSessionId: string;
  requesterUserId: string;
  gameRoomId: string | null;
  status: AiChatSessionStatus;
  provider: string;
  llmModel: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type AiChatMessage = {
  messageId: string;
  aiChatRequestId: string | null;
  senderType: AiChatMessageSenderType;
  messageType: AiChatMessageType;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AiChatCommandResult = {
  commandType: AiChatRequestType;
  status: RoomCommandStatus;
  apiPath: string | null;
  gameRoomId: string | null;
  title: string | null;
  participants: string[] | null;
  started: boolean | null;
};
```

## Waiting Room Model

```ts
export type RoomWaitingState = {
  currentRoom: CurrentGameRoom;
  participants: RoomWaitingParticipant[];
  changedParticipant: RoomWaitingParticipant | null;
};

export type RoomWaitingParticipant = {
  userId: string;
  nickname: string;
  role: ParticipantRole;
  membershipStatus: MembershipStatus;
};
```

## Gameplay Models

```ts
export type GameState = {
  status: GameRoomStatus;
  strikeCount: number;
  maxStrikeCount: number;
  turnState?: TurnState;
};

export type TurnState = {
  turnId: string;
  turnNumber: number;
  currentPlayerId: string;
  startedAt: string;
  deadlineAt: string;
  timeLimitSeconds: number;
  remainingTimeSeconds: number;
  status: TurnStatus;
};

export type MissionState = {
  missionId: string;
  missionTemplateId?: string;
  gameRoomMissionStepId?: string;
  missionTemplateStepId?: string;
  title?: string;
  description?: string;
  language?: string;
  difficulty?: string;
  status?: string;
};
```

## Editor Snapshot Model

```ts
export type CodeSnapshot = {
  files: CodeSnapshotFile[];
};

export type CodeSnapshotFile = {
  filePath: string;
  content: string;
};
```

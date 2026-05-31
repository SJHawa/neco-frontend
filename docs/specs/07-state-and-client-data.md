# State And Client Data

## Server State

TanStack Query manages:

- nickname availability check
- signup
- login
- token refresh
- current room query
- invitation query
- AI chat session query
- AI chat messages query
- AI chat message send
- start-game request
- hint query

## Client State

Zustand manages:

```ts
export type RootClientState = {
  auth: AuthState;
  aiChat: AiChatClientState;
  room: RoomClientState;
  game: GameClientState;
  editor: EditorClientState;
  realtime: RealtimeClientState;
};

export type AiChatClientState = {
  activeSessionId: string | null;
  messages: AiChatMessage[];
  pendingCommand: AiChatCommandResult | null;
};

export type RoomClientState = {
  currentRoom: CurrentGameRoom | null;
  invitations: GameRoomParticipant[];
  roomWaitingState: RoomWaitingState | null;
};

export type GameClientState = {
  gameState: GameState | null;
  missionState: MissionState | null;
  lastTurnEvaluation: TurnEvaluatedEvent["evaluationResult"] | null;
  missionResult: MissionResultEvent["missionResult"] | null;
};

export type EditorClientState = {
  files: Record<string, string>;
  activeFilePath: string | null;
  markers: DetectedIssue[];
};

export type RealtimeClientState = {
  connectionStatus: "idle" | "connecting" | "connected" | "closed" | "error" | "left";
  socketId: string | null;
  closeCode: number | null;
  closeReasonCode: string | null;
  participants: RoomWaitingParticipant[];
};
```

## Timer Rules

- compute remaining time from `deadlineAt`
- use `remainingTimeSeconds` only as the initial display value
- treat server turn state as authoritative
- restart the timer when `turn-changed` arrives
- when local time reaches zero, disable editing and wait for the server event

## Editor Synchronization

- detect local edits from Monaco model change events
- debounce outbound change emission
- send realtime edits as `codeDelta` payloads
- apply remote changes only when they originate from a different client
- treat the submitted snapshot as the authoritative saved content for the end of a turn

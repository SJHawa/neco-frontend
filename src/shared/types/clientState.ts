import type {
  AiChatCommandResult,
  AiChatMessage,
  AuthState,
  CurrentGameRoom,
  DetectedIssue,
  GameRoomParticipant,
  GameState,
  MissionResult,
  MissionState,
  RoomWaitingParticipant,
  RoomWaitingState,
  TurnEvaluationResult,
} from "./domain";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "closed"
  | "error"
  | "left";

export type AiChatClientState = {
  activeSessionId: string | null;
  messages: AiChatMessage[];
  pendingCommand: AiChatCommandResult | null;
  pendingRequestId: string | null;
};

export type RoomClientState = {
  currentRoom: CurrentGameRoom | null;
  duplicateRoomWarning: boolean;
  invitations: GameRoomParticipant[];
  roomWaitingState: RoomWaitingState | null;
};

export type GameClientState = {
  gameState: GameState | null;
  missionState: MissionState | null;
  showMissionGuideModal: boolean;
  lastTurnEvaluation: TurnEvaluationResult | null;
  missionResult: MissionResult | null;
};

export type EditorClientState = {
  files: Record<string, string>;
  activeFilePath: string | null;
  markers: DetectedIssue[];
};

export type RealtimeClientState = {
  activeRoomId: string | null;
  connectionStatus: ConnectionStatus;
  socketId: string | null;
  closeCode: number | null;
  closeReasonCode: string | null;
  participants: RoomWaitingParticipant[];
};

export type RootClientState = {
  auth: AuthState;
  aiChat: AiChatClientState;
  room: RoomClientState;
  game: GameClientState;
  editor: EditorClientState;
  realtime: RealtimeClientState;
};

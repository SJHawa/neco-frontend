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

export type TurnStatus = "IN_PROGRESS" | "SUBMITTED" | "TIMEOUT";

export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "TIMEOUT";

export type PresenceStatus = "ONLINE" | "OFFLINE" | "ACTIVE" | "IDLE";

export type AuthUser = {
  userId: string;
  loginId: string;
  nickname: string;
  email: string | null;
};

export type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
};

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

export type StartGameRequest = {
  missionTemplateId?: string;
};

export type StartGameResponse = {
  success: boolean;
};

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

export type SendAiChatMessageRequest = {
  message: string;
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

export type SendAiChatMessageResponse = {
  aiChatRequestId: string;
  requestType: AiChatRequestType;
  requestStatus: AiChatRequestStatus;
  userMessage?: AiChatMessage;
  assistantMessage?: AiChatMessage;
  commandResult: AiChatCommandResult | null;
};

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

export type CodeSnapshot = {
  files: CodeSnapshotFile[];
};

export type CodeSnapshotFile = {
  filePath: string;
  content: string;
};

export type HintResponse = {
  missionId: string;
  gameRoomMissionStepId: string;
  missionTemplateStepId: string;
  hintText: string;
};

export type DetectedIssue = {
  issueType: string;
  message: string;
  filePath: string;
  lineNumber: number;
};

export type TurnEvaluationResult = {
  isStepCleared: boolean;
  judgeStatus: string;
  strikeCount: number;
  remainingStrikeCount: number;
  feedbackMessage: string;
  detectedIssues: DetectedIssue[];
  executionSummary: {
    status: ExecutionStatus;
    exitCode: number;
    stdout: string;
    stderr: string;
  };
};

export type MissionResult = {
  missionId: string;
  isMissionCleared: boolean;
  judgeStatus: string;
  selectedInputs: unknown[][];
  expectedOutputs: unknown[][];
  actualOutputs: unknown[][];
  strikeCount: number;
  remainingStrikeCount: number;
  feedbackMessage: string;
  detectedIssues: DetectedIssue[];
};

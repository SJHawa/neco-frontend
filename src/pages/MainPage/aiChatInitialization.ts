import type {
  AiChatMessage,
  AiChatSession,
  CurrentGameRoom,
  GameRoomParticipant,
} from "../../shared/types/domain";
import { getUserFacingErrorMessage } from "../../shared/utils/appError";
import { selectActiveAiChatSession } from "../../features/ai-chat/aiChatSession";
import type { AiChatClientState } from "../../shared/types/clientState";

type QuerySnapshot<T> = {
  data: T | undefined;
  error: unknown | null;
  isPending: boolean;
};

export type MainPageAiChatView = {
  status: "loading" | "ready";
  activeSession: AiChatSession | null;
  messages: AiChatMessage[];
  sessionErrorMessage: string | null;
  messageErrorMessage: string | null;
  shouldShowEmptyPrompt: boolean;
};

type LoadAiChatSessionsOptions = {
  userId: string;
  getSessions: (userId: string) => Promise<AiChatSession[]>;
};

type LoadAiChatMessagesOptions = {
  aiChatSessionId: string;
  getMessages: (aiChatSessionId: string) => Promise<AiChatMessage[]>;
};

export async function loadAiChatSessions({
  userId,
  getSessions,
}: LoadAiChatSessionsOptions) {
  return getSessions(userId);
}

export async function loadAiChatMessages({
  aiChatSessionId,
  getMessages,
}: LoadAiChatMessagesOptions) {
  return getMessages(aiChatSessionId);
}

export function syncAiChatSessionSelection({
  previousState,
  activeSessionId,
}: {
  previousState: AiChatClientState;
  activeSessionId: string | null;
}) {
  if (previousState.activeSessionId === activeSessionId) {
    return previousState;
  }

  return {
    activeSessionId,
    messages: [],
    pendingCommand: null,
    pendingRequestId: null,
  };
}

export function syncAiChatMessages({
  previousState,
  activeSessionId,
  messages,
}: {
  previousState: AiChatClientState;
  activeSessionId: string | null;
  messages: AiChatMessage[];
}) {
  return {
    ...previousState,
    activeSessionId,
    messages,
  };
}

export function deriveMainPageAiChatView({
  currentRoom,
  invitations,
  sessionQuery,
  messageQuery,
}: {
  currentRoom: CurrentGameRoom | null;
  invitations: GameRoomParticipant[];
  sessionQuery: QuerySnapshot<AiChatSession[]>;
  messageQuery: QuerySnapshot<AiChatMessage[]>;
}): MainPageAiChatView {
  const activeSession = selectActiveAiChatSession({
    sessions: sessionQuery.data ?? [],
    currentRoomId: currentRoom?.gameRoomId ?? null,
  });
  const hasRoomOrInvitations = Boolean(currentRoom) || invitations.length > 0;

  if (!sessionQuery.data && sessionQuery.isPending) {
    return {
      status: "loading",
      activeSession: null,
      messages: [],
      sessionErrorMessage: null,
      messageErrorMessage: null,
      shouldShowEmptyPrompt: false,
    };
  }

  if (activeSession && !messageQuery.data && messageQuery.isPending) {
    return {
      status: "loading",
      activeSession,
      messages: [],
      sessionErrorMessage: null,
      messageErrorMessage: null,
      shouldShowEmptyPrompt: false,
    };
  }

  const messages = activeSession ? messageQuery.data ?? [] : [];
  const sessionErrorMessage =
    sessionQuery.error && !sessionQuery.data
      ? getUserFacingErrorMessage(sessionQuery.error)
      : null;
  const messageErrorMessage =
    activeSession && messageQuery.error && !messageQuery.data
      ? getUserFacingErrorMessage(messageQuery.error)
      : null;
  // Show the empty welcome prompt when:
  // - there is no current room or invitations, and
  // - there are no session/message errors, and
  // - either no active session exists OR an active session exists but has no messages yet.
  const shouldShowEmptyPrompt =
    !hasRoomOrInvitations &&
    !sessionErrorMessage &&
    !messageErrorMessage &&
    (!activeSession || (activeSession && messages.length === 0));

  return {
    status: "ready",
    activeSession,
    messages,
    sessionErrorMessage,
    messageErrorMessage,
    shouldShowEmptyPrompt,
  };
}

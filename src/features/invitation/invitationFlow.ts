import type { GameRoomParticipant, SendAiChatMessageResponse } from "../../shared/types/domain";
import { isAppError } from "../../shared/utils/appError";

export type InvitationActionType = "accept" | "deny";

const TERMINAL_INVITATION_ACTION_ERROR_CODES = new Set([
  "FORBIDDEN_RESOURCE_ACCESS",
  "GAME_ROOM_NOT_FOUND",
  "INVITATION_ALREADY_PROCESSED",
  "INVITATION_NOT_FOUND",
  "ROOM_ALREADY_JOINED",
  "ROOM_INVITE_FORBIDDEN",
  "ROOM_NOT_FOUND",
  "USER_ALREADY_IN_ROOM",
  "USER_NOT_FOUND",
]);

function extractParticipantIdFromApiPath(apiPath: string | null) {
  if (!apiPath) {
    return null;
  }

  const match = apiPath.match(/\/game-room-participants\/([^/]+)\/(?:join|deny)$/);

  return match?.[1] ?? null;
}

export function buildInvitationAcceptMessage(_invitation: GameRoomParticipant) {
  return "게임방 초대를 수락할게요.";
}

export function buildInvitationDenyMessage(_invitation: GameRoomParticipant) {
  return "게임방 초대는 거절할게요.";
}

export function resolveCompletedInvitationIds({
  invitations,
  response,
}: {
  invitations: GameRoomParticipant[];
  response: SendAiChatMessageResponse;
}) {
  if (
    (response.requestType !== "ROOM_JOIN" && response.requestType !== "USER_INVITE_DENY") ||
    response.commandResult?.status !== "SUCCESS"
  ) {
    return [];
  }

  const participantId = extractParticipantIdFromApiPath(response.commandResult.apiPath);

  if (participantId) {
    return invitations
      .filter((invitation) => invitation.participantId === participantId)
      .map((invitation) => invitation.participantId);
  }

  if (!response.commandResult.gameRoomId) {
    return [];
  }

  return invitations
    .filter((invitation) => invitation.gameRoomId === response.commandResult?.gameRoomId)
    .map((invitation) => invitation.participantId);
}

export function isRetryableInvitationActionError(error: unknown) {
  if (!isAppError(error)) {
    return true;
  }

  return !TERMINAL_INVITATION_ACTION_ERROR_CODES.has(error.code);
}

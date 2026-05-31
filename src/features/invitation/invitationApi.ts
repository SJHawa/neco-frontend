import { apiClient } from "../../shared/api/apiClient";
import type { GameRoomParticipant } from "../../shared/types/domain";

type InvitationApiClient = Pick<typeof apiClient, "get">;

type RawInvitationParticipant = Partial<GameRoomParticipant> & {
  id?: unknown;
  membershipStatus?: unknown;
  title?: unknown;
};

function isParticipantRole(value: unknown): value is GameRoomParticipant["role"] {
  return value === "OWNER" || value === "PARTICIPANT";
}

function isMembershipStatus(value: unknown): value is GameRoomParticipant["status"] {
  return value === "INVITED" || value === "JOINED" || value === "LEFT" || value === "DENIED";
}

function isGameRoomStatus(value: unknown): value is GameRoomParticipant["roomStatus"] {
  return (
    value === "WAITING" ||
    value === "IN_PROGRESS" ||
    value === "JUDGING" ||
    value === "ANALYZED" ||
    value === "FINISHED"
  );
}

function normalizeInvitationParticipant(
  participant: RawInvitationParticipant,
): GameRoomParticipant | null {
  const participantId =
    typeof participant.participantId === "string"
      ? participant.participantId
      : typeof participant.id === "string"
        ? participant.id
        : null;

  if (!participantId || typeof participant.gameRoomId !== "string") {
    return null;
  }

  const status = isMembershipStatus(participant.status)
    ? participant.status
    : isMembershipStatus(participant.membershipStatus)
      ? participant.membershipStatus
      : null;

  if (!status) {
    return null;
  }

  return {
    participantId,
    gameRoomId: participant.gameRoomId,
    gameRoomTitle:
      typeof participant.gameRoomTitle === "string"
        ? participant.gameRoomTitle
        : typeof participant.title === "string"
          ? participant.title
          : "초대받은 방",
    userId: typeof participant.userId === "string" ? participant.userId : "",
    nickname: typeof participant.nickname === "string" ? participant.nickname : "알 수 없는 사용자",
    role: isParticipantRole(participant.role) ? participant.role : "PARTICIPANT",
    status,
    roomStatus: isGameRoomStatus(participant.roomStatus) ? participant.roomStatus : "WAITING",
    createdAt: typeof participant.createdAt === "string" ? participant.createdAt : "",
  };
}

export function createInvitationApi(client: InvitationApiClient = apiClient) {
  return {
    async getInvitedParticipants(userId: string) {
      const response = await client.get<RawInvitationParticipant[]>(
        `/game-room-participants?userId=${encodeURIComponent(userId)}&membershipStatus=INVITED`,
      );

      return (response ?? [])
        .map(normalizeInvitationParticipant)
        .filter((participant): participant is GameRoomParticipant => participant !== null)
        .filter(
          (participant) =>
            participant.userId === userId && participant.status === "INVITED",
        );
    },
  };
}

export const invitationApi = createInvitationApi();

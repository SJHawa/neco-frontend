import { apiClient } from "../../shared/api/apiClient";
import type { GameRoomParticipant } from "../../shared/types/domain";

type RoomWaitingApiClient = Pick<typeof apiClient, "get">;

type RawRoomParticipant = Partial<GameRoomParticipant> & {
  id?: unknown;
};

function isGameRoomStatus(value: unknown): value is GameRoomParticipant["roomStatus"] {
  return (
    value === "WAITING" ||
    value === "IN_PROGRESS" ||
    value === "JUDGING" ||
    value === "ANALYZED" ||
    value === "FINISHED"
  );
}

function isParticipantRole(value: unknown): value is GameRoomParticipant["role"] {
  return value === "OWNER" || value === "PARTICIPANT";
}

function isMembershipStatus(
  value: unknown,
): value is GameRoomParticipant["membershipStatus"] {
  return value === "INVITED" || value === "JOINED" || value === "LEFT" || value === "DENIED";
}

function normalizeRoomParticipant(
  participant: RawRoomParticipant,
): GameRoomParticipant | null {
  const participantId =
    typeof participant.participantId === "string"
      ? participant.participantId
      : typeof participant.id === "string"
        ? participant.id
        : null;

  if (!participantId || typeof participant.gameRoomId !== "string" || typeof participant.userId !== "string") {
    return null;
  }

  if (!isMembershipStatus(participant.membershipStatus)) {
    return null;
  }

  return {
    participantId,
    gameRoomId: participant.gameRoomId,
    userId: participant.userId,
    nickname:
      typeof participant.nickname === "string"
        ? participant.nickname
        : isParticipantRole(participant.role) && participant.role === "OWNER"
          ? "방장"
          : "참가자",
    role: isParticipantRole(participant.role) ? participant.role : "PARTICIPANT",
    membershipStatus: participant.membershipStatus,
    roomStatus: isGameRoomStatus(participant.roomStatus) ? participant.roomStatus : "WAITING",
    createdAt: typeof participant.createdAt === "string" ? participant.createdAt : "",
  };
}

export function createRoomWaitingApi(client: RoomWaitingApiClient = apiClient) {
  return {
    async getParticipants(gameRoomId: string) {
      const response = await client.get<RawRoomParticipant[]>(
        `/game-room-participants?gameRoomId=${encodeURIComponent(gameRoomId)}`,
      );

      return (response ?? [])
        .map(normalizeRoomParticipant)
        .filter((participant): participant is GameRoomParticipant => participant !== null);
    },
  };
}

export const roomWaitingApi = createRoomWaitingApi();

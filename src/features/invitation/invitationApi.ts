import { apiClient } from "../../shared/api/apiClient";
import type { GameRoomParticipant } from "../../shared/types/domain";

type InvitationApiClient = Pick<typeof apiClient, "get">;

export function createInvitationApi(client: InvitationApiClient = apiClient) {
  return {
    async getInvitedParticipants(userId: string) {
      const response = await client.get<GameRoomParticipant[]>(
        `/game-room-participants?userId=${encodeURIComponent(userId)}&status=INVITED`,
      );

      return response ?? [];
    },
  };
}

export const invitationApi = createInvitationApi();

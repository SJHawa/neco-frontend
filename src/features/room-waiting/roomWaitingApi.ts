import { apiClient } from "../../shared/api/apiClient";
import type { GameRoomParticipant } from "../../shared/types/domain";

type RoomWaitingApiClient = Pick<typeof apiClient, "get">;

export function createRoomWaitingApi(client: RoomWaitingApiClient = apiClient) {
  return {
    async getParticipants(gameRoomId: string) {
      const response = await client.get<GameRoomParticipant[]>(
        `/game-room-participants?gameRoomId=${encodeURIComponent(gameRoomId)}`,
      );

      return response ?? [];
    },
  };
}

export const roomWaitingApi = createRoomWaitingApi();

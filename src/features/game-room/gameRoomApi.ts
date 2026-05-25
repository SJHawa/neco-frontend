import { apiClient } from "../../shared/api/apiClient";
import type { CurrentGameRoom } from "../../shared/types/domain";

type GameRoomApiClient = Pick<typeof apiClient, "get">;

export function createGameRoomApi(client: GameRoomApiClient = apiClient) {
  return {
    async getCurrentRooms(userId: string) {
      const response = await client.get<CurrentGameRoom[]>(
        `/game-rooms?userId=${encodeURIComponent(userId)}`,
      );

      return response ?? [];
    },
  };
}

export const gameRoomApi = createGameRoomApi();

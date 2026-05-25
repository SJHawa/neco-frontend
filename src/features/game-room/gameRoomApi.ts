import { apiClient } from "../../shared/api/apiClient";
import type {
  CurrentGameRoom,
  StartGameRequest,
  StartGameResponse,
} from "../../shared/types/domain";

type GameRoomApiClient = Pick<typeof apiClient, "get" | "post">;

export function createGameRoomApi(client: GameRoomApiClient = apiClient) {
  return {
    async getCurrentRooms(userId: string) {
      const response = await client.get<CurrentGameRoom[]>(
        `/game-rooms?userId=${encodeURIComponent(userId)}`,
      );

      return response ?? [];
    },
    async startGame(gameRoomId: string, request: StartGameRequest = {}) {
      const response = await client.post<StartGameResponse>(
        `/game-rooms/${encodeURIComponent(gameRoomId)}/start`,
        request,
      );

      return response ?? { success: false };
    },
  };
}

export const gameRoomApi = createGameRoomApi();

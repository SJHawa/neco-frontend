import { apiClient } from "../../shared/api/apiClient";
import type { TeamChatMessage } from "../../shared/types/domain";

export function listTeamChatMessages(gameRoomId: string) {
  return apiClient.get<TeamChatMessage[]>(
    `/game-rooms/${encodeURIComponent(gameRoomId)}/team-chat/messages`,
  );
}

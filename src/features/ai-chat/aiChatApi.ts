import { apiClient } from "../../shared/api/apiClient";
import type { AiChatMessage, AiChatSession } from "../../shared/types/domain";

type AiChatApiClient = Pick<typeof apiClient, "get">;

export function createAiChatApi(client: AiChatApiClient = apiClient) {
  return {
    async getSessions(userId: string) {
      const response = await client.get<AiChatSession[]>(
        `/ai-chat-sessions?userId=${encodeURIComponent(userId)}`,
      );

      return response ?? [];
    },

    async getMessages(aiChatSessionId: string) {
      const response = await client.get<AiChatMessage[]>(
        `/ai-chat-sessions/${encodeURIComponent(aiChatSessionId)}/messages`,
      );

      return response ?? [];
    },
  };
}

export const aiChatApi = createAiChatApi();

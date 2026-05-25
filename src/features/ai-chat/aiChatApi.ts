import { apiClient } from "../../shared/api/apiClient";
import type {
  AiChatMessage,
  AiChatSession,
  SendAiChatMessageRequest,
  SendAiChatMessageResponse,
} from "../../shared/types/domain";

type AiChatApiClient = Pick<typeof apiClient, "get" | "post">;

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

    async sendMessage(
      aiChatSessionId: string,
      request: SendAiChatMessageRequest,
    ) {
      const response = await client.post<SendAiChatMessageResponse>(
        `/ai-chat-sessions/${encodeURIComponent(aiChatSessionId)}/messages`,
        {
          message: request.message,
        },
      );

      if (!response) {
        throw new Error("AI chat message send returned an empty response.");
      }

      return response;
    },
  };
}

export const aiChatApi = createAiChatApi();

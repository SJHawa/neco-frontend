import { apiClient } from "../../shared/api/apiClient";
import type { HintResponse } from "../../shared/types/domain";

type HintApiClient = Pick<typeof apiClient, "get">;

export function createHintApi(client: HintApiClient = apiClient) {
  return {
    async fetchCurrentStepHint(missionId: string) {
      const response = await client.get<HintResponse>(
        `/game-room-missions/${encodeURIComponent(missionId)}/hints?scope=current-step`,
      );

      if (!response) {
        throw new Error("Hint response was empty.");
      }

      return response;
    },
  };
}

export const hintApi = createHintApi();

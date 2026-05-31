import type { HintResponse } from "../../shared/types/domain";

export function getHintCacheKey(hint: Pick<
  HintResponse,
  "gameRoomMissionStepId" | "missionTemplateStepId"
>) {
  if (hint.gameRoomMissionStepId) {
    return hint.gameRoomMissionStepId;
  }

  return `template:${hint.missionTemplateStepId}`;
}

export function resolveHintCacheKeyFromMission(input: {
  gameRoomMissionStepId?: string;
  missionTemplateStepId?: string;
}) {
  if (input.gameRoomMissionStepId) {
    return input.gameRoomMissionStepId;
  }

  if (input.missionTemplateStepId) {
    return `template:${input.missionTemplateStepId}`;
  }

  return null;
}

export function getCachedHint(
  hintsByStepId: Record<string, HintResponse>,
  cacheKey: string | null,
): HintResponse | undefined {
  if (!cacheKey) {
    return undefined;
  }

  if (!Object.prototype.hasOwnProperty.call(hintsByStepId, cacheKey)) {
    return undefined;
  }

  return hintsByStepId[cacheKey];
}

export function shouldRefetchHintOnOpen(
  hintsByStepId: Record<string, HintResponse>,
  cacheKey: string | null,
) {
  return getCachedHint(hintsByStepId, cacheKey) === undefined;
}

export function formatHintDisplayText(hintText: string | null | undefined) {
  if (hintText === null || hintText === undefined) {
    return "현재 단계에 사용할 수 있는 힌트가 없습니다.";
  }

  const trimmed = hintText.trim();

  return trimmed.length > 0 ? trimmed : "현재 단계에 사용할 수 있는 힌트가 없습니다.";
}

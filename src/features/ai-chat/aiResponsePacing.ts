export const AI_RESPONSE_DELAY_MIN_MS = 2900;
export const AI_RESPONSE_DELAY_MAX_MS = 4400;

export function getAiResponseDelayMs(
  message: string,
  random: () => number = Math.random,
) {
  const normalizedLength = Math.min(message.trim().length, 50);
  const readingTimeMs = normalizedLength * 10;
  const randomJitterMs = Math.floor(Math.max(0, Math.min(1, random())) * 1000);

  return Math.min(
    AI_RESPONSE_DELAY_MAX_MS,
    AI_RESPONSE_DELAY_MIN_MS + readingTimeMs + randomJitterMs,
  );
}

export function getRemainingAiResponseDelayMs({
  startedAt,
  now,
  targetDelayMs,
}: {
  startedAt: number;
  now: number;
  targetDelayMs: number;
}) {
  return Math.max(0, targetDelayMs - Math.max(0, now - startedAt));
}

export function getAiThinkingMessage(message: string) {
  const normalizedMessage = message.replace(/\s+/g, "").toLowerCase();

  if (normalizedMessage.includes("방") && normalizedMessage.includes("만들")) {
    return "알맞은 게임 방 설정을 확인하고 있어요";
  }

  if (normalizedMessage.includes("초대") || normalizedMessage.includes("친구")) {
    return "친구 초대 요청을 확인하고 있어요";
  }

  if (normalizedMessage.includes("시작")) {
    return "게임 시작 조건을 확인하고 있어요";
  }

  if (normalizedMessage.includes("삭제") || normalizedMessage.includes("없애")) {
    return "현재 게임 방 상태를 확인하고 있어요";
  }

  return "요청 내용을 이해하고 있어요";
}

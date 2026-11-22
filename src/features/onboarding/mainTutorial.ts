export const MAIN_TUTORIAL_STORAGE_PREFIX = "neconaeco:main-tutorial:v1";

export type MainTutorialStep = {
  id: "intro" | "ai-chat" | "practice" | "ranking";
  target: string;
  eyebrow: string;
  title: string;
  description: string;
};

export const MAIN_TUTORIAL_STEPS: readonly MainTutorialStep[] = [
  {
    id: "intro",
    target: '[data-tutorial="intro"]',
    eyebrow: "네코내코 한눈에 보기",
    title: "팀과 함께 완성하는 코딩 릴레이예요",
    description:
      "친구들과 순서대로 코드를 이어 작성하며 하나의 미션을 해결해요. 왼쪽 안내에서 전체 흐름을 언제든 확인할 수 있어요.",
  },
  {
    id: "ai-chat",
    target: '[data-tutorial="ai-chat"]',
    eyebrow: "1. 게임 준비",
    title: "AI 마스터에게 자연스럽게 말해보세요",
    description:
      "‘방 만들어줘’라고 입력하면 AI가 난이도와 미션 선택을 도와줘요. 방을 만든 뒤 친구 초대와 게임 시작도 채팅으로 요청할 수 있어요.",
  },
  {
    id: "practice",
    target: '[data-tutorial="practice"]',
    eyebrow: "2. 혼자 체험하기",
    title: "팀 게임 전에 개인 연습을 할 수 있어요",
    description:
      "에디터와 제출 방식을 먼저 익히고 싶다면 개인 연습을 시작해보세요. 실제 게임과 비슷한 흐름으로 부담 없이 체험할 수 있어요.",
  },
  {
    id: "ranking",
    target: '[data-tutorial="ranking"]',
    eyebrow: "3. 기록 확인하기",
    title: "게임이 끝나면 랭킹에서 기록을 확인해요",
    description:
      "팀 게임 결과와 기여도를 바탕으로 쌓인 기록을 확인할 수 있어요. 이제 네코내코를 시작할 준비가 끝났어요!",
  },
] as const;

export function getMainTutorialStorageKey(userId: string) {
  return `${MAIN_TUTORIAL_STORAGE_PREFIX}:${userId}`;
}

export function shouldStartMainTutorial(storage: Pick<Storage, "getItem">, userId: string) {
  return storage.getItem(getMainTutorialStorageKey(userId)) !== "done";
}

export function markMainTutorialDone(storage: Pick<Storage, "setItem">, userId: string) {
  storage.setItem(getMainTutorialStorageKey(userId), "done");
}

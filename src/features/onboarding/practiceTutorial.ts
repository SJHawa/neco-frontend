export const PRACTICE_TUTORIAL_STORAGE_PREFIX =
  "neconaeco:practice-tutorial:v1";

export type PracticeTutorialStep = {
  id: "mission" | "editor" | "progress" | "ai-master" | "items";
  target: string;
  eyebrow: string;
  title: string;
  description: string;
};

export const PRACTICE_TUTORIAL_STEPS: readonly PracticeTutorialStep[] = [
  {
    id: "mission",
    target: '[data-practice-tutorial="mission"]',
    eyebrow: "1. 미션 확인",
    title: "먼저 이번 연습의 목표를 확인하세요",
    description:
      "미션 제목과 설명, 현재 단계에서 구현해야 할 내용을 확인할 수 있어요.",
  },
  {
    id: "editor",
    target: '[data-practice-tutorial="editor"]',
    eyebrow: "2. 코드 작성",
    title: "편집기에서 단계별 코드를 작성하세요",
    description:
      "현재 파일을 편집하고 제출하기를 누르면 작성한 코드가 평가돼요. 초기화 버튼으로 마지막 기준 코드로 돌아갈 수 있어요.",
  },
  {
    id: "progress",
    target: '[data-practice-tutorial="progress"]',
    eyebrow: "3. 진행도 확인",
    title: "완료한 단계와 다음 목표를 확인하세요",
    description:
      "현재 진행 중인 단계, 완료된 단계, 아직 잠긴 단계를 한눈에 볼 수 있어요.",
  },
  {
    id: "ai-master",
    target: '[data-practice-tutorial="ai-master"]',
    eyebrow: "4. AI 피드백",
    title: "제출 결과와 힌트를 여기서 확인하세요",
    description:
      "코드 분석과 오류 피드백을 확인하고, 막혔을 때는 힌트를 열어 다음 방향을 찾을 수 있어요.",
  },
  {
    id: "items",
    target: '[data-practice-tutorial="items"]',
    eyebrow: "5. 연습 아이템",
    title: "해금한 아이템을 필요한 순간에 사용하세요",
    description:
      "미션을 달성하면 아이템이 열려요. 시간 추가처럼 현재 턴에 도움이 되는 효과를 사용할 수 있어요.",
  },
] as const;

export function getPracticeTutorialStorageKey(userId: string) {
  return `${PRACTICE_TUTORIAL_STORAGE_PREFIX}:${userId}`;
}

export function shouldStartPracticeTutorial(
  storage: Pick<Storage, "getItem">,
  userId: string,
) {
  return storage.getItem(getPracticeTutorialStorageKey(userId)) !== "done";
}

export function markPracticeTutorialDone(
  storage: Pick<Storage, "setItem">,
  userId: string,
) {
  storage.setItem(getPracticeTutorialStorageKey(userId), "done");
}

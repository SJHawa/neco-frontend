import type {
  GameState,
  MissionState,
  MissionStep,
  RoomWaitingParticipant,
  TurnEvaluationResult,
  TurnState,
} from "../../shared/types/domain";

/**
 * Legacy single-tab edit helper retained for callers outside the RoomPage.
 * The gameplay editor itself now uses applyEditorIndentKey for Python-aware indentation.
 */
export function insertTabAtSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  tab = "\t",
) {
  const nextValue =
    value.slice(0, selectionStart) + tab + value.slice(selectionEnd);

  return {
    value: nextValue,
    selectionStart: selectionStart + tab.length,
    selectionEnd: selectionStart + tab.length,
  };
}

export type MissionFileTab = {
  filePath: string;
  fileName: string;
  language: string;
  readonly: boolean;
};

export type RoomParticipantRow = {
  userId: string;
  nickname: string;
  isCurrentUser: boolean;
  isCurrentTurn: boolean;
  roleLabel: string | null;
};

export type StrikeHeartDisplay = {
  remaining: number;
  lost: number;
};

export type MissionDisplayCopy = {
  title: string;
  description: string;
};

export type MissionProgressStep = {
  key: string;
  stepOrder: number;
  title: string;
  description: string;
  status: MissionStep["status"] | MissionState["currentStepStatus"];
  isActive: boolean;
};

export type EvaluationDisplayCopy = {
  statusLabel: string;
  analysisNotice: string;
  feedbackMessage: string;
  errorMessage: string;
};

export function getMissionFileName(filePath: string) {
  const segments = filePath.split("/");
  return segments[segments.length - 1] || filePath;
}

export function buildMissionFileTabs(
  missionState: MissionState | null,
  editorFiles: Record<string, string>,
): MissionFileTab[] {
  const projectFiles = missionState?.projectStructure?.files ?? [];

  if (projectFiles.length > 0) {
    return projectFiles.map((file) => ({
      filePath: file.filePath,
      fileName: getMissionFileName(file.filePath),
      language: file.language,
      readonly: file.readonly,
    }));
  }

  return Object.keys(editorFiles).map((filePath) => ({
    filePath,
    fileName: getMissionFileName(filePath),
    language: missionState?.language ?? "text",
    readonly: false,
  }));
}

export function resolveActiveFilePath(
  activeFilePath: string | null,
  tabs: MissionFileTab[],
) {
  if (activeFilePath && tabs.some((tab) => tab.filePath === activeFilePath)) {
    return activeFilePath;
  }

  return tabs[0]?.filePath ?? null;
}

export function findMissionFileTab(
  tabs: MissionFileTab[],
  filePath: string | null | undefined,
) {
  if (!filePath) {
    return undefined;
  }

  return tabs.find((tab) => tab.filePath === filePath);
}

export function canMutateMissionFile(
  canEditTurn: boolean,
  tab: MissionFileTab | undefined,
) {
  if (!canEditTurn || !tab) {
    return false;
  }

  return !tab.readonly;
}

export function isEditorContentReadOnly(input: {
  canEditTurn: boolean;
  tab: MissionFileTab | undefined;
  isTurnExpired: boolean;
  isMissionGuideOpen: boolean;
  isRealtimeUnavailable: boolean;
}) {
  if (
    input.isRealtimeUnavailable ||
    input.isMissionGuideOpen ||
    input.isTurnExpired ||
    !input.canEditTurn
  ) {
    return true;
  }

  return Boolean(input.tab?.readonly);
}

export function canEditGameplay(
  authUserId: string | null | undefined,
  gameState: GameState | null,
) {
  const turnState = gameState?.turnState;

  if (!authUserId || !turnState) {
    return false;
  }

  return (
    turnState.currentPlayerId === authUserId &&
    turnState.status === "IN_PROGRESS"
  );
}

export function computeRemainingSeconds(
  deadlineAt: string | undefined,
  now = Date.now(),
  extraMilliseconds = 0,
) {
  if (!deadlineAt) {
    return 0;
  }

  const deadlineMs = Date.parse(deadlineAt);

  if (Number.isNaN(deadlineMs)) {
    return 0;
  }

  return Math.max(0, Math.ceil((deadlineMs + extraMilliseconds - now) / 1000));
}

export function getTurnRemainingSeconds(
  turnState: Pick<TurnState, "status" | "deadlineAt" | "timeLimitSeconds"> | null | undefined,
  now = Date.now(),
) {
  if (turnState?.status === "READY") {
    return Math.max(0, turnState.timeLimitSeconds ?? 0);
  }

  return computeRemainingSeconds(turnState?.deadlineAt, now);
}

export function shouldStartPracticeTurn(input: {
  isPracticeMode: boolean;
  authUserId: string | null | undefined;
  turnState: Pick<TurnState, "status" | "currentPlayerId"> | null | undefined;
  isMissionGuideOpen: boolean;
  isRealtimeUnavailable: boolean;
}) {
  return (
    input.isPracticeMode &&
    Boolean(input.authUserId) &&
    input.turnState?.status === "READY" &&
    input.turnState.currentPlayerId === input.authUserId &&
    !input.isMissionGuideOpen &&
    !input.isRealtimeUnavailable
  );
}

export function formatTurnTimerText(remainingSeconds: number) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return `${String(minutes).padStart(2, "0")} : ${String(seconds).padStart(2, "0")}`;
}

export function buildStrikeHeartDisplay(
  strikeCount: number | undefined,
  maxStrikeCount: number | undefined,
): StrikeHeartDisplay {
  const max = Math.max(0, maxStrikeCount ?? 0);
  const used = Math.min(Math.max(0, strikeCount ?? 0), max);
  const remaining = Math.max(0, max - used);

  return {
    remaining,
    lost: used,
  };
}

export function getLanguageDisplayLabel(language: string | undefined) {
  if (!language) {
    return null;
  }

  const normalized = language.trim().toLowerCase();

  if (normalized === "python") {
    return "🐍 Python";
  }

  return language;
}

export function buildParticipantRows(
  participants: RoomWaitingParticipant[],
  currentPlayerId: string | undefined,
  authUserId: string | null | undefined,
): RoomParticipantRow[] {
  return participants
    .filter((participant) => participant.membershipStatus === "JOINED")
    .map((participant) => ({
      userId: participant.userId,
      nickname: participant.nickname,
      isCurrentUser: participant.userId === authUserId,
      isCurrentTurn: participant.userId === currentPlayerId,
      roleLabel: participant.role === "OWNER" ? "방장" : null,
    }));
}

export function getParticipantAvatarIndex(
  userId: string,
  participantUserIds: string[],
  avatarCount: number,
) {
  if (avatarCount <= 0) return 0;

  const stableUserIds = [...new Set(participantUserIds)].sort();
  const participantIndex = stableUserIds.indexOf(userId);
  if (participantIndex >= 0) {
    return participantIndex % avatarCount;
  }

  return (
    [...userId].reduce((total, character) => total + character.charCodeAt(0), 0) %
    avatarCount
  );
}

export function getMissionDisplayCopy(
  missionState: MissionState | null,
): MissionDisplayCopy {
  const title = missionState?.title?.trim();
  const description = missionState?.description?.trim();

  return {
    title: title || "미션 정보를 불러오는 중입니다.",
    description:
      description ||
      (missionState
        ? "미션 설명이 아직 도착하지 않았습니다."
        : "실시간 미션 데이터가 연결되면 설명이 표시됩니다."),
  };
}

export function buildMissionProgressSteps(
  missionState: MissionState | null,
): MissionProgressStep[] {
  const listedSteps = missionState?.steps ?? [];

  if (listedSteps.length > 0) {
    return [...listedSteps]
      .sort((left, right) => left.stepOrder - right.stepOrder)
      .map((step) => ({
      key: step.gameRoomMissionStepId || `${step.stepOrder}`,
      stepOrder: step.stepOrder,
      title: step.title || `Step ${step.stepOrder}`,
      description: step.description || "Step description is not available yet.",
      status: step.status,
      isActive: step.gameRoomMissionStepId === missionState?.gameRoomMissionStepId,
      }));
  }

  if (!missionState) {
    return [];
  }

  return [
    {
      key: missionState.currentStepId ?? missionState.missionId,
      stepOrder: missionState.stepOrder ?? 1,
      title: missionState.stepTitle?.trim() || missionState.title?.trim() || "Current step",
      description:
        missionState.stepDescription?.trim() ||
        missionState.description?.trim() ||
        "Step description is not available yet.",
      status: missionState.currentStepStatus,
      isActive: true,
    },
  ];
}

export function getCurrentTurnParticipantLabel(
  participantRows: RoomParticipantRow[],
) {
  const currentTurnParticipant = participantRows.find(
    (participant) => participant.isCurrentTurn,
  );

  if (!currentTurnParticipant) {
    return "현재 턴 정보를 기다리는 중";
  }

  return currentTurnParticipant.isCurrentUser
    ? "현재 턴: 나"
    : `현재 턴: ${currentTurnParticipant.nickname}`;
}

export function getEvaluationDisplayCopy(input: {
  evaluation: TurnEvaluationResult | null;
  turnSubmissionPending: boolean;
}): EvaluationDisplayCopy {
  const evaluation = input.evaluation;
  const feedbackMessage = evaluation?.feedbackMessage?.trim();
  const detectedIssues = evaluation?.detectedIssues ?? [];

  if (input.turnSubmissionPending && !evaluation) {
    return {
      statusLabel: "평가 대기",
      analysisNotice: "AI 마스터가 제출한 코드를 분석 중입니다.",
      feedbackMessage: "평가 메시지가 도착하면 이곳에 바로 반영됩니다.",
      errorMessage: "오류 분석 결과를 기다리는 중입니다.",
    };
  }

  if (!evaluation) {
    return {
      statusLabel: "대기 중",
      analysisNotice: "턴 제출 후 평가 결과가 이 영역에 표시됩니다.",
      feedbackMessage: "턴 평가가 도착하면 피드백이 이 영역에 표시됩니다.",
      errorMessage: "감지된 이슈가 있으면 평가 이벤트와 함께 표시됩니다.",
    };
  }

  const firstIssueMessage = detectedIssues[0]?.message?.trim();
  const issueCount = detectedIssues.length;

  return {
    statusLabel: evaluation.judgeStatus === "PASSED" ? "평가 완료" : "재검토 필요",
    analysisNotice: feedbackMessage || "AI 평가 결과가 도착했습니다.",
    feedbackMessage: feedbackMessage || "AI 평가 결과가 도착했습니다.",
    errorMessage:
      issueCount > 0
        ? `${issueCount}개 이슈 감지${firstIssueMessage ? ` · ${firstIssueMessage}` : ""}`
        : "감지된 오류 없이 평가가 완료되었습니다.",
  };
}

export type IssueDisplayItem = {
  title: string;
  explanation: string;
  rows: Array<{ label: string; value: string }>;
  tip: string | null;
  technicalDetails: string | null;
};

const analysisPhaseBaseDelayMs = [1000, 1500, 1200, 800] as const;
const analysisPhaseJitterMs = [450, 650, 550, 450] as const;

export function getAnalysisPhaseDelayMs({
  phaseIndex,
  codeLength,
  random = Math.random,
}: {
  phaseIndex: number;
  codeLength: number;
  random?: () => number;
}) {
  const safePhaseIndex = Math.max(
    0,
    Math.min(analysisPhaseBaseDelayMs.length - 1, Math.floor(phaseIndex)),
  );
  const normalizedCodeLength = Math.max(0, Math.min(codeLength, 1200));
  const complexityDelayMs = Math.round(normalizedCodeLength * 0.15);
  const jitterDelayMs = Math.round(
    Math.max(0, Math.min(1, random())) * analysisPhaseJitterMs[safePhaseIndex],
  );

  return analysisPhaseBaseDelayMs[safePhaseIndex]
    + complexityDelayMs
    + jitterDelayMs;
}

export function getEvaluationFeedbackTab(judgeStatus: string) {
  return judgeStatus === "PASSED" ? "feedback" : "error";
}

type PublicCaseResultView = {
  name: string;
  stdinLines: string[];
  expectedStdout: string;
  actualStdout: string;
  stderr: string;
  outcome: string;
};

function toPublicCaseResultView(value: unknown): PublicCaseResultView | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string") {
    return null;
  }

  return {
    name: record.name,
    stdinLines: Array.isArray(record.stdinLines)
      ? record.stdinLines.filter((line): line is string => typeof line === "string")
      : [],
    expectedStdout: typeof record.expectedStdout === "string" ? record.expectedStdout : "",
    actualStdout: typeof record.actualStdout === "string" ? record.actualStdout : "",
    stderr: typeof record.stderr === "string" ? record.stderr : "",
    outcome: typeof record.outcome === "string" ? record.outcome : "",
  };
}

const emptyOutputLabel = "(출력 없음)";

function getErrorLineLabel(stderr: string) {
  const lineMatch = stderr.match(/line\s+(\d+)/i);
  return lineMatch ? `${lineMatch[1]}번째 줄` : "오류가 표시된 줄";
}

function describeRuntimeError(stderr: string) {
  const lineLabel = getErrorLineLabel(stderr);

  if (/IndentationError/i.test(stderr)) {
    if (/expected an indented block/i.test(stderr)) {
      return {
        explanation: `${lineLabel} 근처에서 들여쓰기된 코드가 필요해요. if, elif, else, for, while 또는 함수 선언 다음 줄이 비어 있거나 왼쪽으로 붙어 있어요.`,
        tip: "조건문이나 반복문 안에서 실행할 코드를 한 단계 들여써 주세요.",
      };
    }

    return {
      explanation: `${lineLabel}의 들여쓰기가 앞뒤 코드와 맞지 않아요. 같은 조건문에 속한 if, elif, else는 세로 위치가 같아야 해요.`,
      tip: "탭과 스페이스를 섞지 말고, 해당 줄의 시작 공백을 위쪽 if 또는 elif와 맞춰 주세요.",
    };
  }

  if (/SyntaxError/i.test(stderr)) {
    return {
      explanation: `${lineLabel} 근처의 Python 문법을 해석할 수 없어요. 괄호, 따옴표, 콜론(:) 중 빠진 것이 있는지 확인해 주세요.`,
      tip: "오류 표시(^) 주변과 바로 윗줄을 함께 확인해 보세요.",
    };
  }

  if (/NameError/i.test(stderr)) {
    return {
      explanation: `${lineLabel}에서 아직 만들지 않은 변수나 함수를 사용했어요. 이름의 철자나 선언 순서를 확인해 주세요.`,
      tip: "오류 원문에 나온 이름이 코드에 같은 철자로 먼저 선언되어 있는지 확인해 보세요.",
    };
  }

  if (/TypeError/i.test(stderr)) {
    return {
      explanation: `${lineLabel}에서 서로 맞지 않는 자료형을 함께 사용했어요. 예를 들어 문자열과 숫자를 바로 계산하면 이 오류가 날 수 있어요.`,
      tip: "필요한 값에 int(), float(), str() 같은 형 변환을 적용해 보세요.",
    };
  }

  if (/ValueError/i.test(stderr)) {
    return {
      explanation: `${lineLabel}에서 입력값을 원하는 형태로 바꾸지 못했어요. 숫자가 아닌 값을 int()로 변환하지 않았는지 확인해 주세요.`,
      tip: "입력 순서와 값의 형태를 다시 확인하고, 변환 전에 값이 올바른지 검사해 보세요.",
    };
  }

  if (/EOFError/i.test(stderr)) {
    return {
      explanation: "프로그램이 제공된 입력보다 더 많은 값을 읽으려고 했어요.",
      tip: "input() 호출 횟수가 문제에서 안내한 입력 개수와 같은지 확인해 보세요.",
    };
  }

  if (/timeout|time limit|timed out/i.test(stderr)) {
    return {
      explanation: "코드가 제한 시간 안에 실행을 끝내지 못했어요. 반복문이 끝나지 않거나 같은 작업을 너무 많이 반복할 수 있어요.",
      tip: "while문의 종료 조건과 반복 횟수를 먼저 확인해 보세요.",
    };
  }

  return {
    explanation: "코드를 실행하는 도중 오류가 발생해 결과를 확인하지 못했어요.",
    tip: "아래 오류 원문에서 마지막 줄을 먼저 보고, 표시된 코드 줄을 확인해 보세요.",
  };
}

function describeCaseFailure(caseResult: PublicCaseResultView): IssueDisplayItem {
  const actual = caseResult.actualStdout.trim();
  const stderr = caseResult.stderr.trim();
  const rows: IssueDisplayItem["rows"] = [];

  if (caseResult.stdinLines.length > 0) {
    rows.push({ label: "입력", value: caseResult.stdinLines.join(" / ") });
  }

  if (caseResult.outcome === "ERROR") {
    const guidance = describeRuntimeError(stderr);

    return {
      title: `"${caseResult.name}" 테스트 실행 중 오류가 발생했어요`,
      explanation: guidance.explanation,
      rows,
      tip: guidance.tip,
      technicalDetails: stderr || null,
    };
  }

  rows.push({ label: "기대한 출력", value: caseResult.expectedStdout || emptyOutputLabel });
  rows.push({ label: "내 출력", value: actual || emptyOutputLabel });

  // 오류 원문은 입력·출력 비교와 섞지 않고 접을 수 있는 기술 상세 영역에서 보여준다.

  let tip: string | null = null;
  if (!actual && !stderr) {
    tip = "아무것도 출력되지 않았어요. print()로 결과를 출력했는지 확인해 보세요.";
  } else if (actual === caseResult.expectedStdout && stderr) {
    tip = "출력은 맞지만 오류 출력이 있어 실패로 처리됐어요.";
  } else if (actual) {
    tip = "출력 값이 기대한 결과와 달라요. 계산 로직과 출력 형식을 확인해 보세요.";
  }

  return {
    title: `"${caseResult.name}" 테스트를 통과하지 못했어요`,
    explanation: !actual && !stderr
      ? "코드는 실행됐지만 결과가 출력되지 않았어요."
      : actual === caseResult.expectedStdout && stderr
        ? "계산 결과는 맞지만 실행 중 오류 메시지가 함께 발생했어요."
        : "코드는 실행됐지만 문제에서 기대한 결과와 다른 값이 나왔어요.",
    rows,
    tip,
    technicalDetails: stderr || null,
  };
}

export function buildIssueDisplayItems(
  evaluation: TurnEvaluationResult | null,
): IssueDisplayItem[] {
  if (!evaluation) {
    return [];
  }

  const caseResults = (evaluation.publicCaseResults ?? [])
    .map(toPublicCaseResultView)
    .filter((result): result is PublicCaseResultView => result !== null);
  const caseByName = new Map(caseResults.map((result) => [result.name, result]));

  return (evaluation.detectedIssues ?? []).map((issue) => {
    const caseResult = issue.caseName ? caseByName.get(issue.caseName) : undefined;

    if (caseResult) {
      return describeCaseFailure(caseResult);
    }

    const rawMessage = issue.message?.trim() || "자세한 정보가 없습니다.";
    const guidance = describeRuntimeError(rawMessage);

    return {
      title: issue.issueType === "RUNTIME_ERROR" ? "실행 중 오류가 발생했어요" : "코드 실행에 실패했어요",
      explanation: guidance.explanation,
      rows: [],
      tip: guidance.tip,
      technicalDetails: rawMessage,
    };
  });
}

export function getMissionStepStatusLabel(
  status: MissionState["currentStepStatus"] | undefined,
) {
  switch (status) {
    case "LOCKED":
      return "잠김";
    case "READY":
      return "준비됨";
    case "IN_PROGRESS":
      return "진행 중";
    case "CLEARED":
      return "완료";
    case "FAILED":
      return "실패";
    default:
      return "대기 중";
  }
}

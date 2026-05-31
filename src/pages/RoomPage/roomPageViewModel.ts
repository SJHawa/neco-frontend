import type { GameState, MissionState, RoomWaitingParticipant } from "../../shared/types/domain";

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
) {
  if (!deadlineAt) {
    return 0;
  }

  const deadlineMs = Date.parse(deadlineAt);

  if (Number.isNaN(deadlineMs)) {
    return 0;
  }

  return Math.max(0, Math.ceil((deadlineMs - now) / 1000));
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

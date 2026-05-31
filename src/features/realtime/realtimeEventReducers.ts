import {
  applyAuthoritativeFilesToEditor,
  extractAuthoritativeFilesFromCodeUpdated,
  isSameClientCodeUpdatedEcho,
} from "../editor/authoritativeEditorSync";
import { onEditorTurnIdChanged } from "../editor/editorTurnBaseline";
import type { RootClientState } from "../../shared/types/clientState";
import type {
  CodeUpdatedEvent,
  CurrentGameRoom,
  GameStartedEvent,
  GameState,
  GameStateUpdatedEvent,
  RoomParticipantsUpdatedEvent,
  RoomWaitingParticipant,
  RoomWaitingState,
} from "../../shared/types/domain";

export type GameplayNavigationTarget = `/rooms/${string}/play`;

export type ApplyGameStartedResult = {
  state: RootClientState;
  navigationTarget: GameplayNavigationTarget | null;
};

export function shouldRetainRoomSocketForPath(
  pathname: string,
  gameRoomId: string | undefined,
) {
  if (!gameRoomId) {
    return false;
  }

  if (pathname.startsWith(`/rooms/${gameRoomId}/`)) {
    return true;
  }

  return pathname === "/main";
}

export function isActiveRoomRealtimeEvent(
  state: RootClientState,
  gameRoomId: string,
) {
  return state.realtime.activeRoomId === gameRoomId;
}

export function mergeCurrentRoomFromGameState(
  currentRoom: CurrentGameRoom,
  gameState: GameState,
  participants: RoomWaitingParticipant[],
): CurrentGameRoom {
  const joinedParticipantCount = participants.filter(
    (participant) => participant.membershipStatus === "JOINED",
  ).length;

  return {
    ...currentRoom,
    status: gameState.status,
    difficulty: gameState.difficulty ?? currentRoom.difficulty,
    timeLimitSeconds: gameState.timeLimitSeconds ?? currentRoom.timeLimitSeconds,
    maxStrikeCount: gameState.maxStrikeCount ?? currentRoom.maxStrikeCount,
    minParticipants: gameState.minParticipants ?? currentRoom.minParticipants,
    maxParticipants: gameState.maxParticipants ?? currentRoom.maxParticipants,
    joinedParticipantCount:
      joinedParticipantCount > 0
        ? joinedParticipantCount
        : currentRoom.joinedParticipantCount,
  };
}

export function buildRoomWaitingStateFromParticipantsEvent(
  currentRoom: CurrentGameRoom,
  event: RoomParticipantsUpdatedEvent,
): RoomWaitingState {
  return {
    currentRoom: mergeCurrentRoomFromGameState(
      currentRoom,
      event.gameState,
      event.participants,
    ),
    participants: event.participants,
    changedParticipant: event.changedParticipant,
    gameState: event.gameState,
    missionState: event.missionState,
  };
}

function mergeGameState(
  previous: GameState | null,
  incoming: GameState,
): GameState {
  return {
    ...previous,
    ...incoming,
    turnState: incoming.turnState ?? previous?.turnState,
  };
}

function mergeMissionState(
  state: RootClientState,
  missionState: GameStateUpdatedEvent["missionState"],
) {
  if (missionState === undefined) {
    return state.game.missionState;
  }

  if (missionState === null) {
    return null;
  }

  return {
    ...state.game.missionState,
    ...missionState,
  };
}

export function bootstrapEditorFromMission(
  missionState: GameStartedEvent["missionState"],
): RootClientState["editor"] {
  const projectFiles = missionState.projectStructure?.files ?? [];
  const files = Object.fromEntries(
    projectFiles.map((file) => [file.filePath, ""]),
  );

  return {
    files,
    authoritativeFiles: {},
    activeFilePath:
      missionState.projectStructure?.entryFilePath ??
      projectFiles[0]?.filePath ??
      null,
    markers: [],
    turnBaselineFiles: {},
    turnBaselineTurnId: null,
    turnBaselineReady: false,
  };
}

export function applyRoomParticipantsUpdated(
  state: RootClientState,
  event: RoomParticipantsUpdatedEvent,
): RootClientState {
  if (!isActiveRoomRealtimeEvent(state, event.gameRoomId)) {
    return state;
  }

  const nextGame = {
    ...state.game,
    gameState: event.gameState,
    missionState: event.missionState,
  };
  const nextRealtime = {
    ...state.realtime,
    participants: event.participants,
  };

  if (state.room.currentRoom?.gameRoomId !== event.gameRoomId) {
    return {
      ...state,
      game: nextGame,
      realtime: nextRealtime,
    };
  }

  const currentRoom = mergeCurrentRoomFromGameState(
    state.room.currentRoom,
    event.gameState,
    event.participants,
  );

  return {
    ...state,
    game: nextGame,
    realtime: nextRealtime,
    room: {
      ...state.room,
      currentRoom,
      roomWaitingState: buildRoomWaitingStateFromParticipantsEvent(
        currentRoom,
        event,
      ),
    },
  };
}

export function applyGameStarted(
  state: RootClientState,
  event: GameStartedEvent,
): ApplyGameStartedResult {
  if (!isActiveRoomRealtimeEvent(state, event.gameRoomId)) {
    return { state, navigationTarget: null };
  }

  const bootstrappedEditor = bootstrapEditorFromMission(event.missionState);

  let nextState: RootClientState = {
    ...state,
    game: {
      gameState: event.gameState,
      missionState: event.missionState,
      showMissionGuideModal: event.uiHints.showMissionGuideModal,
      lastTurnEvaluation: null,
      missionResult: null,
    },
    editor: onEditorTurnIdChanged(
      bootstrappedEditor,
      event.gameState.turnState?.turnId,
    ),
  };

  if (state.room.currentRoom?.gameRoomId === event.gameRoomId) {
    const currentRoom = mergeCurrentRoomFromGameState(
      state.room.currentRoom,
      event.gameState,
      state.realtime.participants,
    );

    nextState = {
      ...nextState,
      room: {
        ...state.room,
        currentRoom,
        roomWaitingState: state.room.roomWaitingState
          ? {
              ...state.room.roomWaitingState,
              currentRoom,
              gameState: event.gameState,
              missionState: event.missionState,
            }
          : state.room.roomWaitingState,
      },
    };
  }

  return {
    state: nextState,
    navigationTarget: event.uiHints.enterGameScreen
      ? (`/rooms/${event.gameRoomId}/play` as const)
      : null,
  };
}

export function applyGameStateUpdated(
  state: RootClientState,
  event: GameStateUpdatedEvent,
): RootClientState {
  if (!isActiveRoomRealtimeEvent(state, event.gameRoomId)) {
    return state;
  }

  const mergedGameState = mergeGameState(state.game.gameState, event.gameState);
  const mergedMissionState = mergeMissionState(state, event.missionState);
  const previousTurnId = state.game.gameState?.turnState?.turnId;
  const nextTurnId = mergedGameState.turnState?.turnId;

  let nextState: RootClientState = {
    ...state,
    game: {
      ...state.game,
      gameState: mergedGameState,
      missionState: mergedMissionState,
    },
    editor:
      nextTurnId && nextTurnId !== previousTurnId
        ? onEditorTurnIdChanged(state.editor, nextTurnId)
        : state.editor,
  };

  if (state.room.currentRoom?.gameRoomId !== event.gameRoomId) {
    return nextState;
  }

  const currentRoom = mergeCurrentRoomFromGameState(
    state.room.currentRoom,
    mergedGameState,
    state.realtime.participants,
  );

  return {
    ...nextState,
    room: {
      ...state.room,
      currentRoom,
      roomWaitingState: state.room.roomWaitingState
        ? {
            ...state.room.roomWaitingState,
            currentRoom,
            gameState: mergedGameState,
            missionState: mergedMissionState,
          }
        : state.room.roomWaitingState,
    },
  };
}

export function applyCodeUpdated(
  state: RootClientState,
  event: CodeUpdatedEvent,
): RootClientState {
  if (!isActiveRoomRealtimeEvent(state, event.gameRoomId)) {
    return state;
  }

  if (isSameClientCodeUpdatedEcho(state.realtime.socketId, event.sessionId)) {
    return state;
  }

  const incoming = extractAuthoritativeFilesFromCodeUpdated(event);

  if (!incoming) {
    return state;
  }

  return {
    ...state,
    editor: applyAuthoritativeFilesToEditor(
      state.editor,
      incoming,
      state.game.gameState?.turnState?.turnId ?? null,
    ),
  };
}

export function parseRealtimeEventPayload<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return payload as T;
}

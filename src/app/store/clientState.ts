import { createStore } from "zustand/vanilla";
import { getHydratedAuthState } from "../../features/auth/authSession";
import type { RootClientState } from "../../shared/types/clientState";

function createInitialState(): RootClientState {
  return {
    auth: getHydratedAuthState(),
    aiChat: {
      activeSessionId: null,
      messages: [],
      pendingCommand: null,
    },
    room: {
      currentRoom: null,
      invitations: [],
      roomWaitingState: null,
    },
    game: {
      gameState: null,
      missionState: null,
      lastTurnEvaluation: null,
      missionResult: null,
    },
    editor: {
      files: {},
      activeFilePath: null,
      markers: [],
    },
    realtime: {
      connectionStatus: "idle",
      socketId: null,
      participants: [],
    },
  };
}

export type AppStore = ReturnType<typeof createAppStore>;

export function createAppStore() {
  return createStore<RootClientState>()(() => createInitialState());
}

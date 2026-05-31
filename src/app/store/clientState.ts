import { createStore, type StoreApi } from "zustand/vanilla";
import { getHydratedAuthState } from "../../features/auth/authSession";
import type { RootClientState } from "../../shared/types/clientState";

export function createInitialState(): RootClientState {
  return {
    auth: getHydratedAuthState(),
    aiChat: {
      activeSessionId: null,
      messages: [],
      pendingCommand: null,
      pendingRequestId: null,
    },
    room: {
      currentRoom: null,
      duplicateRoomWarning: false,
      invitations: [],
      roomWaitingState: null,
    },
    game: {
      gameState: null,
      missionState: null,
      showMissionGuideModal: false,
      lastTurnEvaluation: null,
      missionResult: null,
    },
    editor: {
      files: {},
      activeFilePath: null,
      markers: [],
    },
    realtime: {
      activeRoomId: null,
      connectionStatus: "idle",
      socketId: null,
      closeCode: null,
      closeReasonCode: null,
      participants: [],
    },
  };
}

export type AppStore = ReturnType<typeof createAppStore>;

export function createAppStore() {
  return createStore<RootClientState>()(() => createInitialState());
}

export function resetAppStoreForLogout(store: StoreApi<RootClientState>) {
  store.setState(createInitialState());
}

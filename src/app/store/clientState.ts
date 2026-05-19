import { createStore } from "zustand/vanilla";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "closed"
  | "error"
  | "left";

export type RootClientState = {
  auth: {
    isAuthenticated: boolean;
  };
  aiChat: {
    activeSessionId: string | null;
    messages: unknown[];
    pendingCommand: unknown | null;
  };
  room: {
    currentRoom: unknown | null;
    invitations: unknown[];
    roomWaitingState: unknown | null;
  };
  game: {
    gameState: unknown | null;
    missionState: unknown | null;
    lastTurnEvaluation: unknown | null;
    missionResult: unknown | null;
  };
  editor: {
    files: Record<string, string>;
    activeFilePath: string | null;
    markers: unknown[];
  };
  realtime: {
    connectionStatus: ConnectionStatus;
    socketId: string | null;
    participants: unknown[];
  };
};

const initialState: RootClientState = {
  auth: {
    isAuthenticated: false,
  },
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

export type AppStore = ReturnType<typeof createAppStore>;

export function createAppStore() {
  return createStore<RootClientState>()(() => initialState);
}

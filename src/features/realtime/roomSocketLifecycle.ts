import type { StoreApi } from "zustand/vanilla";
import type {
  ConnectionStatus,
  RootClientState,
} from "../../shared/types/clientState";
import type { CurrentGameRoom } from "../../shared/types/domain";
import type {
  CreateRealtimeSocket,
  RealtimeSocket,
} from "../../shared/socket/socketClient";
import {
  createSocketIoRealtimeSocket,
  defaultSocketUrl,
} from "../../shared/socket/socketClient";

export type JoinRoomEvent = {
  accessToken: string;
  gameRoomId: string;
  userId: string;
};

export type RoomSocketLifecycleInput = {
  accessToken: string | null;
  currentRoom: CurrentGameRoom | null;
  routeGameRoomId: string | undefined;
  socketUrl: string;
  userId: string | null;
};

export type RoomSocketEligibility =
  | {
      canConnect: true;
      joinRoomEvent: JoinRoomEvent;
      socketUrl: string;
    }
  | {
      canConnect: false;
      reason:
        | "missing-auth"
        | "missing-room"
        | "room-mismatch"
        | "not-joined"
        | "unsupported-room-status";
    };

export type RoomSocketLifecycleUpdate = {
  activeRoomId: string | null;
  connectionStatus: ConnectionStatus;
  socketId: string | null;
  terminatedReason: string | null;
};

export function isRoomSessionUnavailable(connectionStatus: ConnectionStatus) {
  return connectionStatus === "closed" || connectionStatus === "error";
}

type RoomSocketLifecycleControllerOptions = {
  createSocket: CreateRealtimeSocket;
  onUpdate: (update: RoomSocketLifecycleUpdate) => void;
};

export function getRoomSocketEligibility(
  input: RoomSocketLifecycleInput,
): RoomSocketEligibility {
  if (!input.accessToken || !input.userId) {
    return {
      canConnect: false,
      reason: "missing-auth",
    };
  }

  if (!input.currentRoom) {
    return {
      canConnect: false,
      reason: "missing-room",
    };
  }

  if (input.currentRoom.gameRoomId !== input.routeGameRoomId) {
    return {
      canConnect: false,
      reason: "room-mismatch",
    };
  }

  if (input.currentRoom.myMembershipStatus !== "JOINED") {
    return {
      canConnect: false,
      reason: "not-joined",
    };
  }

  if (
    input.currentRoom.status !== "WAITING" &&
    input.currentRoom.status !== "IN_PROGRESS"
  ) {
    return {
      canConnect: false,
      reason: "unsupported-room-status",
    };
  }

  return {
    canConnect: true,
    joinRoomEvent: {
      accessToken: input.accessToken,
      gameRoomId: input.currentRoom.gameRoomId,
      userId: input.userId,
    },
    socketUrl: input.socketUrl,
  };
}

export function createRoomSocketLifecycleController({
  createSocket,
  onUpdate,
}: RoomSocketLifecycleControllerOptions) {
  let activeRoomId: string | null = null;
  let disconnectIsExpected = false;
  let joinRoomEvent: JoinRoomEvent | null = null;
  let socket: RealtimeSocket | null = null;
  let terminatedReason: string | null = null;
  let terminatedRoomId: string | null = null;

  function update(
    connectionStatus: ConnectionStatus,
    socketId: string | null,
    terminatedReason: string | null,
  ) {
    onUpdate({
      activeRoomId,
      connectionStatus,
      socketId,
      terminatedReason,
    });
  }

  function detachAndDisconnect(status: ConnectionStatus) {
    if (!socket) {
      activeRoomId = null;
      joinRoomEvent = null;
      update(status, null, null);
      return;
    }

    disconnectIsExpected = true;
    socket.disconnect();
    disconnectIsExpected = false;
    socket = null;
    activeRoomId = null;
    joinRoomEvent = null;
    terminatedReason = null;
    terminatedRoomId = null;
    update(status, null, null);
  }

  function sync(input: RoomSocketLifecycleInput) {
    const eligibility = getRoomSocketEligibility(input);

    if (!eligibility.canConnect) {
      detachAndDisconnect(
        eligibility.reason === "missing-auth" ? "left" : "idle",
      );
      return eligibility;
    }

    if (
      terminatedRoomId === eligibility.joinRoomEvent.gameRoomId &&
      terminatedReason
    ) {
      update("closed", null, terminatedReason);
      return eligibility;
    }

    if (socket && activeRoomId === eligibility.joinRoomEvent.gameRoomId) {
      return eligibility;
    }

    if (socket) {
      detachAndDisconnect("idle");
    }

    activeRoomId = eligibility.joinRoomEvent.gameRoomId;
    joinRoomEvent = eligibility.joinRoomEvent;
    terminatedReason = null;
    terminatedRoomId = null;
    socket = createSocket({
      accessToken: eligibility.joinRoomEvent.accessToken,
      socketUrl: eligibility.socketUrl,
    });

    const activeSocket = socket;

    activeSocket.on("connect", () => {
      if (activeSocket !== socket || !joinRoomEvent) {
        return;
      }

      activeSocket.emit("join-room", joinRoomEvent);
      update("connected", activeSocket.id ?? null, null);
    });

    activeSocket.on("disconnect", (reason) => {
      if (activeSocket !== socket || disconnectIsExpected) {
        return;
      }

      socket = null;
      terminatedRoomId = activeRoomId;
      terminatedReason = String(reason ?? "socket closed");
      update("closed", null, terminatedReason);
    });

    activeSocket.on("connect_error", (error) => {
      if (activeSocket !== socket) {
        return;
      }

      socket = null;
      update("error", null, String(error ?? "socket connection error"));
    });

    update("connecting", null, null);
    activeSocket.connect();

    return eligibility;
  }

  function leave(expectedRoomId?: string) {
    if (expectedRoomId && activeRoomId !== expectedRoomId) {
      return;
    }

    detachAndDisconnect("left");
  }

  return {
    leave,
    sync,
  };
}

export type RoomSocketLifecycleController = ReturnType<
  typeof createRoomSocketLifecycleController
>;

export function createStoreBackedRoomSocketLifecycleController(
  store: StoreApi<RootClientState>,
  createSocket: CreateRealtimeSocket = createSocketIoRealtimeSocket,
) {
  return createRoomSocketLifecycleController({
    createSocket,
    onUpdate(update) {
      store.setState((state) => ({
        ...state,
        realtime: {
          ...state.realtime,
          activeRoomId: update.activeRoomId,
          connectionStatus: update.connectionStatus,
          socketId: update.socketId,
          terminatedReason: update.terminatedReason,
        },
      }));
    },
  });
}

export function createRoomSocketLifecycleInput({
  accessToken,
  currentRoom,
  routeGameRoomId,
  userId,
}: Omit<RoomSocketLifecycleInput, "socketUrl">): RoomSocketLifecycleInput {
  return {
    accessToken,
    currentRoom,
    routeGameRoomId,
    socketUrl: defaultSocketUrl,
    userId,
  };
}

export function isSameRoomScopedPath(
  pathname: string,
  gameRoomId: string | undefined,
) {
  return !!gameRoomId && pathname.startsWith(`/rooms/${gameRoomId}/`);
}

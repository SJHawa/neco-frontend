import type { StoreApi } from "zustand/vanilla";
import { notifyAuthLogout } from "../../shared/api/authStorage";
import { createInitialState } from "../../app/store/clientState";
import type { RootClientState } from "../../shared/types/clientState";
import type { RoomSocketLifecycleController } from "./roomSocketLifecycle";
import {
  resolveSocketClosePolicyAction,
  type SocketClosePolicyAction,
} from "./socketClosePolicy";

export type ApplySocketClosePolicyOptions = {
  action: SocketClosePolicyAction;
  activeRoomId: string | null;
  navigate: (path: string) => void;
  routeTarget: string | null;
  store: StoreApi<RootClientState>;
  socketController: RoomSocketLifecycleController | null;
};

export function clearRoomContextAfterTerminatedSession(
  store: StoreApi<RootClientState>,
) {
  const initial = createInitialState();

  store.setState((state) => ({
    ...state,
    room: {
      ...state.room,
      currentRoom: null,
      roomWaitingState: null,
    },
    game: initial.game,
    editor: initial.editor,
    realtime: {
      ...state.realtime,
      activeRoomId: null,
      socketId: null,
      participants: [],
    },
  }));
}

export function applySocketClosePolicy({
  action,
  activeRoomId,
  navigate,
  routeTarget,
  store,
  socketController,
}: ApplySocketClosePolicyOptions) {
  if (action === "intentional-close") {
    return;
  }

  socketController?.leave(activeRoomId ?? undefined);

  if (action === "auth-logout") {
    notifyAuthLogout();
    return;
  }

  if (action === "terminated-session") {
    clearRoomContextAfterTerminatedSession(store);
  }

  if (routeTarget) {
    navigate(routeTarget);
  }
}

export function shouldApplySocketClosePolicy(input: {
  connectionStatus: RootClientState["realtime"]["connectionStatus"];
  closeCode: number | null;
  closeReasonCode: string | null;
}) {
  if (input.connectionStatus !== "closed") {
    return false;
  }

  const action = resolveSocketClosePolicyAction(
    input.closeCode,
    input.closeReasonCode,
  );

  return action !== null && action !== "intentional-close";
}

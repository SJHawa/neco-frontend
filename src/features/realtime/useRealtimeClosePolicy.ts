import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSocketCloseRouteTarget } from "../../app/router/authRouting";
import { useAppStore, useAppStoreApi } from "../../app/providers/ClientStateProvider";
import {
  applySocketClosePolicy,
  shouldApplySocketClosePolicy,
} from "./applySocketClosePolicy";
import { resolveSocketClosePolicyAction } from "./socketClosePolicy";
import {
  getRoomSocketLifecycleController,
} from "./useRoomSocketLifecycle";

export function useRealtimeClosePolicy() {
  const navigate = useNavigate();
  const store = useAppStoreApi();
  const connectionStatus = useAppStore((state) => state.realtime.connectionStatus);
  const closeCode = useAppStore((state) => state.realtime.closeCode);
  const closeReasonCode = useAppStore((state) => state.realtime.closeReasonCode);
  const activeRoomId = useAppStore((state) => state.realtime.activeRoomId);
  const handledSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !shouldApplySocketClosePolicy({
        connectionStatus,
        closeCode,
        closeReasonCode,
      })
    ) {
      if (connectionStatus !== "closed") {
        handledSignatureRef.current = null;
      }
      return;
    }

    const action = resolveSocketClosePolicyAction(closeCode, closeReasonCode);
    if (!action) {
      return;
    }

    const signature = `${action}:${closeCode ?? ""}:${closeReasonCode ?? ""}`;
    if (handledSignatureRef.current === signature) {
      return;
    }

    handledSignatureRef.current = signature;

    applySocketClosePolicy({
      action,
      activeRoomId,
      navigate,
      routeTarget: getSocketCloseRouteTarget(
        action,
        window.location.pathname,
      ),
      store,
      socketController: getRoomSocketLifecycleController(),
    });
  }, [
    activeRoomId,
    closeCode,
    closeReasonCode,
    connectionStatus,
    navigate,
    store,
  ]);
}

import type { CodeChangeEvent } from "../../shared/types/domain";
import { getRoomSocketLifecycleController } from "./useRoomSocketLifecycle";

export function formatRealtimeOccurredAt(date = new Date()) {
  return date.toISOString();
}

export function emitCodeChangeEvent(
  payload: Omit<CodeChangeEvent, "occurredAt"> & { occurredAt?: string },
) {
  const controller = getRoomSocketLifecycleController();

  if (!controller) {
    return false;
  }

  return controller.emit("code-change", {
    ...payload,
    occurredAt: payload.occurredAt ?? formatRealtimeOccurredAt(),
  });
}

import type { ConnectionStatus } from "../../shared/types/clientState";
import type { TextRangeDelta } from "./codeDelta";

export type CodeChangeEmitSnapshot = {
  gameRoomId: string;
  userId: string;
  sessionId: string;
};

export type PendingCodeChangeEdit = {
  anchorText: string;
  currentText: string;
  wasEligibleAtSchedule: boolean;
  emitSnapshot: CodeChangeEmitSnapshot | null;
};

export type CodeChangeScheduleEligibility = {
  wasEligibleAtSchedule: boolean;
  emitSnapshot: CodeChangeEmitSnapshot | null;
};

export type CodeChangeEmitContext = {
  canEmit: boolean;
  connectionStatus: ConnectionStatus;
  gameRoomId: string | undefined;
  userId: string | null;
  socketId: string | null;
};

export function buildCodeChangeScheduleEligibility(
  context: CodeChangeEmitContext,
): CodeChangeScheduleEligibility {
  const wasEligibleAtSchedule =
    context.canEmit &&
    context.connectionStatus === "connected" &&
    Boolean(context.gameRoomId && context.userId && context.socketId);

  if (!wasEligibleAtSchedule) {
    return {
      wasEligibleAtSchedule: false,
      emitSnapshot: null,
    };
  }

  return {
    wasEligibleAtSchedule: true,
    emitSnapshot: {
      gameRoomId: context.gameRoomId as string,
      userId: context.userId as string,
      sessionId: context.socketId as string,
    },
  };
}

/** Returns emit snapshot when a pending edit should be sent (not dropped). */
export function resolveCodeChangeEmitSnapshot(
  pending: PendingCodeChangeEdit,
  current: CodeChangeEmitContext,
): CodeChangeEmitSnapshot | null {
  if (pending.wasEligibleAtSchedule && pending.emitSnapshot) {
    return pending.emitSnapshot;
  }

  if (
    !current.canEmit ||
    current.connectionStatus !== "connected" ||
    !current.gameRoomId ||
    !current.userId ||
    !current.socketId
  ) {
    return null;
  }

  return {
    gameRoomId: current.gameRoomId,
    userId: current.userId,
    sessionId: current.socketId,
  };
}

export type CodeChangeFlushPayload = {
  filePath: string;
  codeDelta: TextRangeDelta;
  emitSnapshot: CodeChangeEmitSnapshot;
};

export function resolveCodeChangeFlushPayload(
  filePath: string,
  codeDelta: TextRangeDelta,
  pending: PendingCodeChangeEdit,
  current: CodeChangeEmitContext,
): CodeChangeFlushPayload | null {
  const emitSnapshot = resolveCodeChangeEmitSnapshot(pending, current);

  if (!emitSnapshot) {
    return null;
  }

  return {
    filePath,
    codeDelta,
    emitSnapshot,
  };
}

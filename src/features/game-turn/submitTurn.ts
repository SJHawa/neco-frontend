import type { CodeSnapshot } from "../../shared/types/domain";
import {
  emitTurnSubmitEvent,
  formatRealtimeOccurredAt,
} from "../realtime/emitGameplayRealtimeEvent";

export function submitTurn(input: {
  gameRoomId: string;
  userId: string;
  turnId: string;
  codeSnapshot: CodeSnapshot;
}) {
  return emitTurnSubmitEvent({
    gameRoomId: input.gameRoomId,
    userId: input.userId,
    turnId: input.turnId,
    codeSnapshot: input.codeSnapshot,
    submittedAt: formatRealtimeOccurredAt(),
  });
}

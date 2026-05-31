import type { StoreApi } from "zustand/vanilla";
import type { RootClientState } from "../../shared/types/clientState";
import type {
  GameStartedEvent,
  GameStateUpdatedEvent,
  RoomParticipantsUpdatedEvent,
} from "../../shared/types/domain";
import type { RealtimeSocket } from "../../shared/socket/socketClient";
import { navigateToGameplay } from "./realtimeNavigation";
import {
  applyGameStarted,
  applyGameStateUpdated,
  applyRoomParticipantsUpdated,
  parseRealtimeEventPayload,
} from "./realtimeEventReducers";

const ROOM_PARTICIPANTS_UPDATED = "room-participants-updated";
const GAME_STARTED = "game-started";
const GAME_STATE_UPDATED = "game-state-updated";

export function bindRoomRealtimeEvents(
  socket: RealtimeSocket,
  store: StoreApi<RootClientState>,
) {
  function handleRoomParticipantsUpdated(payload: unknown) {
    const event = parseRealtimeEventPayload<RoomParticipantsUpdatedEvent>(payload);
    if (!event?.gameRoomId) {
      return;
    }

    store.setState((state) => applyRoomParticipantsUpdated(state, event));
  }

  function handleGameStarted(payload: unknown) {
    const event = parseRealtimeEventPayload<GameStartedEvent>(payload);
    if (!event?.gameRoomId) {
      return;
    }

    const { state: nextState, navigationTarget } = applyGameStarted(
      store.getState(),
      event,
    );
    store.setState(nextState);

    if (navigationTarget) {
      navigateToGameplay(navigationTarget);
    }
  }

  function handleGameStateUpdated(payload: unknown) {
    const event = parseRealtimeEventPayload<GameStateUpdatedEvent>(payload);
    if (!event?.gameRoomId) {
      return;
    }

    store.setState((state) => applyGameStateUpdated(state, event));
  }

  socket.on(ROOM_PARTICIPANTS_UPDATED, handleRoomParticipantsUpdated);
  socket.on(GAME_STARTED, handleGameStarted);
  socket.on(GAME_STATE_UPDATED, handleGameStateUpdated);

  return () => {
    socket.off(ROOM_PARTICIPANTS_UPDATED, handleRoomParticipantsUpdated);
    socket.off(GAME_STARTED, handleGameStarted);
    socket.off(GAME_STATE_UPDATED, handleGameStateUpdated);
  };
}

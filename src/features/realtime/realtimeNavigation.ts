import type { GameplayNavigationTarget } from "./realtimeEventReducers";

export type RealtimeNavigate = (path: GameplayNavigationTarget) => void;

let realtimeNavigate: RealtimeNavigate | null = null;

export function setRealtimeNavigateHandler(handler: RealtimeNavigate | null) {
  realtimeNavigate = handler;
}

export function navigateToGameplay(target: GameplayNavigationTarget) {
  realtimeNavigate?.(target);
}

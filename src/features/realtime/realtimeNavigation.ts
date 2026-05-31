import type {
  GameplayNavigationTarget,
  ResultNavigationTarget,
} from "./realtimeEventReducers";

export type RealtimeNavigationTarget =
  | GameplayNavigationTarget
  | ResultNavigationTarget;

export type RealtimeNavigate = (path: RealtimeNavigationTarget) => void;

let realtimeNavigate: RealtimeNavigate | null = null;

export function setRealtimeNavigateHandler(handler: RealtimeNavigate | null) {
  realtimeNavigate = handler;
}

export function navigateToGameplay(target: GameplayNavigationTarget) {
  realtimeNavigate?.(target);
}

export function navigateToResult(target: ResultNavigationTarget) {
  realtimeNavigate?.(target);
}

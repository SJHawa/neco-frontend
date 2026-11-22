import type { StoreApi } from "zustand/vanilla";
import type { RootClientState } from "../../shared/types/clientState";
import type { GameState } from "../../shared/types/domain";
import type {
  GameItemError,
  GameItemRequest,
  GameItemState,
  GameItemType,
  GameItemUsed,
  ItemUseState,
} from "../../shared/types/gameItems";

export const gameItemTypes: GameItemType[] = [
  "TIME_EXTENSION_30",
  "STRIKE_SHIELD",
  "TURN_PASS",
];

export function gameItemLabel(itemType: GameItemType) {
  return {
    TIME_EXTENSION_30: "시간 +30초",
    STRIKE_SHIELD: "스트라이크 방어",
    TURN_PASS: "턴 넘기기",
  }[itemType];
}

export function gameItemDescription(itemType: GameItemType) {
  return {
    TIME_EXTENSION_30: "현재 턴의 제한 시간을 30초 늘려요.",
    STRIKE_SHIELD: "다음 실패의 팀 목숨 차감을 한 번 막아요.",
    TURN_PASS: "현재 문제를 유지한 채 다음 팀원에게 턴을 넘겨요.",
  }[itemType];
}

export function unlockRequirementLabel(itemType: GameItemType) {
  return {
    TIME_EXTENSION_30: "첫 단계 성공 시 해금",
    STRIKE_SHIELD: "첫 실패 시 해금",
    TURN_PASS: "단계 2회 연속 성공 시 해금",
  }[itemType];
}

export function findGameItem(game: GameState | null, itemType: GameItemType) {
  return game?.items?.find((item) => item.itemType === itemType);
}

export function itemQuantity(
  game: GameState | null,
  itemType: GameItemType = "TIME_EXTENSION_30",
): number | undefined {
  const item = findGameItem(game, itemType);
  return item && Number.isInteger(item.remainingQuantity)
    ? item.remainingQuantity
    : undefined;
}

function mergeItems(previous: GameState | null, incoming: GameState) {
  if (!incoming.items) return previous?.items;
  const oldByType = new Map(previous?.items?.map((item) => [item.itemType, item]));
  const initializing = previous?.status === "WAITING" && incoming.status === "IN_PROGRESS";
  return incoming.items.map((item) => {
    const oldItem = oldByType.get(item.itemType);
    const newlyUnlocked = oldItem?.unlocked === false && item.unlocked === true;
    const remainingQuantity = !oldItem || initializing || newlyUnlocked
      ? item.remainingQuantity
      : Math.min(oldItem.remainingQuantity, item.remainingQuantity);
    return { ...oldItem, ...item, remainingQuantity };
  });
}

export function mergeItemGameState(previous: GameState | null, incoming: GameState): GameState {
  if (previous?.status === "FINISHED" && incoming.status !== "FINISHED") return previous;
  if (previous && previous.status !== "WAITING" && incoming.status === "WAITING") return previous;
  const oldTurn = previous?.turnState;
  let turnState = incoming.turnState ?? oldTurn;
  if (oldTurn && turnState) {
    if (turnState.turnNumber < oldTurn.turnNumber) turnState = oldTurn;
    else if (turnState.turnId === oldTurn.turnId) {
      turnState = {
        ...turnState,
        status: oldTurn.status !== "IN_PROGRESS" ? oldTurn.status : turnState.status,
        deadlineAt: Date.parse(oldTurn.deadlineAt) > Date.parse(turnState.deadlineAt)
          ? oldTurn.deadlineAt
          : turnState.deadlineAt,
      };
    }
  }
  const items = mergeItems(previous, incoming);
  return {
    ...previous,
    ...incoming,
    ...(turnState ? { turnState } : {}),
    ...(items ? { items } : {}),
  };
}

export function applyUnlockedItems(
  game: GameState | null,
  unlockedItems: Array<{ itemType: GameItemType; reason: string; quantity: number }> | undefined,
) {
  if (!game || !unlockedItems?.length) return game;
  const byType = new Map(game.items?.map((item) => [item.itemType, item]));
  for (const unlocked of unlockedItems) {
    byType.set(unlocked.itemType, {
      ...byType.get(unlocked.itemType),
      itemType: unlocked.itemType,
      remainingQuantity: unlocked.quantity,
      unlocked: true,
      unlockReason: unlocked.reason,
    });
  }
  return { ...game, items: [...byType.values()] };
}

export function snapshotItemUse(state: RootClientState, snapshot: GameState): ItemUseState | undefined {
  if (!Array.isArray(snapshot.items) || state.game.itemUse?.status === "pending") {
    return state.game.itemUse;
  }
  return {
    status: "ready",
    pending: null,
    message: state.game.itemUse?.status === "syncing"
      ? "아이템 상태를 동기화했어요."
      : state.game.itemUse?.message ?? null,
  };
}

export function itemDisabledReason(
  state: RootClientState,
  itemType: GameItemType = "TIME_EXTENSION_30",
  now = Date.now(),
): string | null {
  const game = state.game.gameState;
  const item = findGameItem(game, itemType);
  const turn = game?.turnState;
  if (state.realtime.connectionStatus !== "connected") return "실시간 연결을 확인해주세요.";
  if (state.game.itemUse?.status === "pending") return "아이템 사용을 확인하고 있어요.";
  if (state.game.itemUse?.status === "syncing") return "아이템 상태를 확인하고 있어요.";
  if (state.game.itemUse?.status === "needs-sync" || !Array.isArray(game?.items)) return "아이템 상태를 다시 확인해주세요.";
  if (!item || item.unlocked === false) return unlockRequirementLabel(itemType);
  if (itemType === "STRIKE_SHIELD" && (item.activeCount ?? 0) > 0) return "이미 다음 실패를 방어하도록 활성화됐어요.";
  if (game?.status !== "IN_PROGRESS" || turn?.status !== "IN_PROGRESS") return "진행 중인 턴에서만 사용할 수 있어요.";
  if (turn.currentPlayerId !== state.auth.user?.userId) return "현재 턴 플레이어만 사용할 수 있어요.";
  if (!(Date.parse(turn.deadlineAt) > now)) return "제한 시간이 끝났어요.";
  if ((item.remainingQuantity ?? 0) <= 0) return "사용 가능한 수량이 없어요.";
  if (state.game.turnSubmissionPending) return "제출 결과를 기다려주세요.";
  return null;
}

function matches(pending: GameItemRequest | null | undefined, event: GameItemError | GameItemRequest) {
  return !!pending && pending.gameRoomId === event.gameRoomId && pending.turnId === event.turnId && pending.itemType === event.itemType;
}

function updateUsedItem(items: GameItemState[] | undefined, event: GameItemUsed) {
  return (items ?? []).map((item) => item.itemType === event.itemType
    ? {
        ...item,
        remainingQuantity: event.remainingQuantity,
        ...(event.effect.type === "STRIKE_SHIELD" ? { activeCount: event.effect.activeCount } : {}),
      }
    : item);
}

function isValidItemEffect(effect: GameItemUsed["effect"]): boolean {
  if (effect.type === "TIME_EXTENSION") {
    return effect.addedSeconds === 30 && Number.isFinite(Date.parse(effect.deadlineAt));
  }
  if (effect.type === "STRIKE_SHIELD") {
    return Number.isInteger(effect.activeCount) && effect.activeCount > 0;
  }
  return typeof effect.nextPlayerId === "string" && effect.nextPlayerId.length > 0 &&
    Number.isFinite(Date.parse(effect.deadlineAt));
}

export function applyGameItemUsed(state: RootClientState, payload: unknown): RootClientState {
  const candidate = payload as GameItemUsed | null;
  const legacyEffect = candidate?.effect as unknown as { type?: string; addedSeconds?: number; deadlineAt?: string } | undefined;
  const event = candidate && !legacyEffect?.type && legacyEffect?.addedSeconds === 30 && typeof legacyEffect.deadlineAt === "string"
    ? { ...candidate, effect: { type: "TIME_EXTENSION" as const, addedSeconds: 30 as const, deadlineAt: legacyEffect.deadlineAt } }
    : candidate;
  if (!event || event.gameRoomId !== state.realtime.activeRoomId ||
      !gameItemTypes.includes(event.itemType) || typeof event.turnId !== "string" ||
      !Number.isInteger(event.remainingQuantity) || !event.effect ||
      !["TIME_EXTENSION", "STRIKE_SHIELD", "TURN_PASS"].includes(event.effect.type) ||
      !isValidItemEffect(event.effect) || typeof event.usedBy?.userId !== "string" ||
      typeof event.usedBy?.nickname !== "string" ||
      !Number.isFinite(Date.parse(event.occurredAt))) return state;
  const game = state.game.gameState;
  if (!game) return state;
  const pending = state.game.itemUse?.pending;
  let turnState = game.turnState;
  if (turnState?.turnId === event.turnId && event.effect.type === "TIME_EXTENSION") {
    if (Date.parse(event.effect.deadlineAt) > Date.parse(turnState.deadlineAt)) {
      turnState = { ...turnState, deadlineAt: event.effect.deadlineAt };
    }
  }
  if (turnState?.turnId === event.turnId && event.effect.type === "TURN_PASS") {
    turnState = { ...turnState, currentPlayerId: event.effect.nextPlayerId };
  }
  const effectMessage = event.effect.type === "TIME_EXTENSION"
    ? "제한 시간을 30초 늘렸어요."
    : event.effect.type === "STRIKE_SHIELD"
      ? "다음 실패의 목숨 차감을 방어해요."
      : "다음 팀원에게 턴을 넘겼어요.";
  return {
    ...state,
    game: {
      ...state.game,
      itemUse: {
        status: pending && !matches(pending, event) ? "pending" : "ready",
        pending: pending && !matches(pending, event) ? pending : null,
        message: `${event.usedBy.nickname}님이 ${effectMessage}`,
      },
      gameState: { ...game, items: updateUsedItem(game.items, event), turnState },
    },
  };
}

const errors: Record<string, string> = {
  TURN_PLAYER_REQUIRED: "현재 턴 플레이어만 사용할 수 있어요.",
  TURN_DEADLINE_EXPIRED: "제한 시간이 끝나 아이템을 사용할 수 없어요.",
  GAME_ITEM_EXHAUSTED: "사용 가능한 아이템이 없어요.",
  TURN_MISMATCH: "턴이 바뀌었어요. 현재 상태를 확인해주세요.",
  TURN_NOT_IN_PROGRESS: "이미 종료된 턴이에요.",
  GAME_ROOM_NOT_IN_PROGRESS: "진행 중인 게임에서만 사용할 수 있어요.",
  TURN_PASS_UNAVAILABLE: "턴을 넘길 다른 참가자가 없어요.",
};

export function applyGameItemError(state: RootClientState, payload: unknown): RootClientState {
  const event = payload as GameItemError | null;
  if (!event || event.gameRoomId !== state.realtime.activeRoomId ||
      typeof event.code !== "string" || !matches(state.game.itemUse?.pending, event)) return state;
  return {
    ...state,
    game: {
      ...state.game,
      itemUse: {
        status: "needs-sync",
        pending: null,
        message: errors[event.code] ?? "사용 결과를 확인하지 못했어요. 아이템 상태를 다시 확인해주세요.",
      },
    },
  };
}

export function createGameItemActions(
  store: StoreApi<RootClientState>,
  emit: (name: string, payload: unknown) => boolean,
  resync: () => boolean,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const setUse = (itemUse: ItemUseState) => store.setState((state) => ({ ...state, game: { ...state.game, itemUse } }));
  const needsSync = (message: string) => setUse({ status: "needs-sync", pending: null, message });
  function syncGameItems() {
    const state = store.getState();
    if (state.realtime.connectionStatus !== "connected" || ["pending", "syncing"].includes(state.game.itemUse?.status ?? "")) return false;
    clearTimeout(timer);
    const marker: ItemUseState = { status: "syncing", pending: null, message: "서버에서 아이템 상태를 확인하고 있어요." };
    setUse(marker);
    timer = setTimeout(() => {
      if (store.getState().game.itemUse === marker) needsSync("상태 확인이 지연되고 있어요. 다시 시도해주세요.");
    }, 10_000);
    try { if (resync()) return true; } catch { /* Keep the unknown outcome explicit. */ }
    clearTimeout(timer);
    needsSync("서버에 연결할 수 없어요. 다시 시도해주세요.");
    return false;
  }
  function useGameItem(itemType: GameItemType = "TIME_EXTENSION_30") {
    const state = store.getState();
    if (itemDisabledReason(state, itemType) || !state.realtime.activeRoomId || !state.game.gameState?.turnState) return false;
    const pending: GameItemRequest = {
      gameRoomId: state.realtime.activeRoomId,
      turnId: state.game.gameState.turnState.turnId,
      itemType,
    };
    clearTimeout(timer);
    setUse({ status: "pending", pending, message: null });
    timer = setTimeout(() => {
      if (store.getState().game.itemUse?.pending !== pending) return;
      needsSync("사용 응답이 지연되어 서버 상태를 확인합니다.");
      syncGameItems();
    }, 10_000);
    try { if (emit("game-item-use", pending)) return true; } catch { /* Sending may have succeeded. */ }
    clearTimeout(timer);
    needsSync("사용 결과를 확인하지 못했어요. 상태를 다시 확인해주세요.");
    return false;
  }
  return { useGameItem, syncGameItems, dispose: () => clearTimeout(timer) };
}

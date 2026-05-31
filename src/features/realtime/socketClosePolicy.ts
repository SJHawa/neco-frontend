export const SOCKET_CLOSE_CODES = {
  AUTH_TOKEN_INVALID: 4401,
  FORBIDDEN_RESOURCE_ACCESS: 4403,
  GAME_ROOM_NOT_FOUND: 4404,
  NORMAL: 1000,
} as const;

export const SOCKET_CLOSE_REASON_CODES = {
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  FORBIDDEN_RESOURCE_ACCESS: "FORBIDDEN_RESOURCE_ACCESS",
  GAME_ROOM_NOT_FOUND: "GAME_ROOM_NOT_FOUND",
} as const;

export type SocketClosePolicyAction =
  | "auth-logout"
  | "terminated-session"
  | "intentional-close";

export function resolveSocketClosePolicyAction(
  closeCode: number | null,
  closeReasonCode: string | null,
): SocketClosePolicyAction | null {
  if (
    closeCode === SOCKET_CLOSE_CODES.AUTH_TOKEN_INVALID ||
    closeReasonCode === SOCKET_CLOSE_REASON_CODES.AUTH_TOKEN_INVALID
  ) {
    return "auth-logout";
  }

  if (
    closeCode === SOCKET_CLOSE_CODES.FORBIDDEN_RESOURCE_ACCESS ||
    closeReasonCode === SOCKET_CLOSE_REASON_CODES.FORBIDDEN_RESOURCE_ACCESS
  ) {
    return "terminated-session";
  }

  if (
    closeCode === SOCKET_CLOSE_CODES.GAME_ROOM_NOT_FOUND ||
    closeReasonCode === SOCKET_CLOSE_REASON_CODES.GAME_ROOM_NOT_FOUND
  ) {
    return "terminated-session";
  }

  if (closeCode === SOCKET_CLOSE_CODES.NORMAL) {
    return "intentional-close";
  }

  return null;
}

export function shouldLatchTerminatedSocketSession(
  closeCode: number | null,
  closeReasonCode: string | null,
) {
  return closeCode !== null || closeReasonCode !== null;
}

export function isApplicationTerminatedClose(
  closeCode: number | null,
  closeReasonCode: string | null,
) {
  return resolveSocketClosePolicyAction(closeCode, closeReasonCode) === "terminated-session";
}

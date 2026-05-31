import type { SocketClosePolicyAction } from "../../features/realtime/socketClosePolicy";

export function getRootRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? "/main" : "/login";
}

export function getGuestRouteRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? "/main" : null;
}

export function getProtectedRouteRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? null : "/login";
}

export function isRoomScopedPath(pathname: string) {
  return /^\/rooms\/[^/]+\//.test(pathname);
}

export function getSocketCloseRouteTarget(
  action: SocketClosePolicyAction | null,
  pathname: string,
) {
  if (!action) {
    return null;
  }

  if (action === "auth-logout") {
    return "/login";
  }

  if (action === "terminated-session" && isRoomScopedPath(pathname)) {
    return "/main";
  }

  return null;
}

export function shouldBypassProtectedRouteForMainPageMock(
  pathname: string,
  search: string,
) {
  if (pathname !== "/main") {
    return false;
  }

  const value = new URLSearchParams(search).get("mock");

  return (
    value === "room-create" ||
    value === "room-create-delay" ||
    value === "invitation" ||
    value === "invitation-delay" ||
    value === "start-ready"
  );
}

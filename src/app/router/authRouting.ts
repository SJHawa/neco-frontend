export function getRootRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? "/main" : "/login";
}

export function getGuestRouteRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? "/main" : null;
}

export function getProtectedRouteRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? null : "/login";
}

export function shouldBypassProtectedRouteForMainPageMock(
  pathname: string,
  search: string,
) {
  if (pathname !== "/main") {
    return false;
  }

  const value = new URLSearchParams(search).get("mock");

  return value === "room-create" || value === "room-create-delay";
}

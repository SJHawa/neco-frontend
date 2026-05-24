export function getRootRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? "/main" : "/login";
}

export function getGuestRouteRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? "/main" : null;
}

export function getProtectedRouteRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? null : "/login";
}

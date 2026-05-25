import type { AuthState, AuthUser, LoginResponse } from "../../shared/types/domain";
import {
  getStoredAccessToken,
  getStoredAuthUser,
  getStoredRefreshToken,
  setStoredAuthSession,
} from "../../shared/api/authStorage";

export function createLoggedOutAuthState(): AuthState {
  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  };
}

export function createAuthenticatedAuthState({
  accessToken,
  refreshToken,
  user,
}: {
  accessToken: string;
  refreshToken: string | null;
  user: AuthUser;
}): AuthState {
  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated: true,
  };
}

export function getHydratedAuthState(
  fallbackUser: AuthUser | null = null,
): AuthState {
  const accessToken = getStoredAccessToken();

  if (!accessToken) {
    return createLoggedOutAuthState();
  }

  const user = getStoredAuthUser() ?? fallbackUser;

  if (!user) {
    return createLoggedOutAuthState();
  }

  return {
    user,
    accessToken,
    refreshToken: getStoredRefreshToken(),
    isAuthenticated: true,
  };
}

export function persistLoginSession(response: LoginResponse) {
  setStoredAuthSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    user: response.user,
  });
}

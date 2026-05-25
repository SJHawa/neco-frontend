import {
  ACCESS_TOKEN_STORAGE_KEY,
  AUTH_SESSION_SYNC_EVENT,
  AUTH_LOGOUT_EVENT,
  AUTH_USER_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from "../constants/auth";
import type { AuthUser } from "../types/domain";

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function getLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function dispatchAuthEvent(eventName: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

export function getStoredAccessToken() {
  return getSessionStorage()?.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? null;
}

export function setStoredAccessToken(accessToken: string) {
  getSessionStorage()?.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
}

export function clearStoredAccessToken() {
  getSessionStorage()?.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function getStoredRefreshToken() {
  return getLocalStorage()?.getItem(REFRESH_TOKEN_STORAGE_KEY) ?? null;
}

export function getStoredAuthUser() {
  const serializedUser = getSessionStorage()?.getItem(AUTH_USER_STORAGE_KEY);

  if (!serializedUser) {
    return null;
  }

  try {
    return JSON.parse(serializedUser) as AuthUser;
  } catch {
    getSessionStorage()?.removeItem(AUTH_USER_STORAGE_KEY);
    return null;
  }
}

export function setStoredRefreshToken(refreshToken: string) {
  getLocalStorage()?.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

export function clearStoredRefreshToken() {
  getLocalStorage()?.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setStoredAuthUser(user: AuthUser) {
  getSessionStorage()?.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredAuthUser() {
  getSessionStorage()?.removeItem(AUTH_USER_STORAGE_KEY);
}

export function clearStoredAuthTokens() {
  clearStoredAccessToken();
  clearStoredRefreshToken();
}

export function notifyAuthSessionSync() {
  dispatchAuthEvent(AUTH_SESSION_SYNC_EVENT);
}

export function setStoredAuthSession({
  accessToken,
  refreshToken,
  user,
}: {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}) {
  setStoredAccessToken(accessToken);
  setStoredRefreshToken(refreshToken);
  setStoredAuthUser(user);
  notifyAuthSessionSync();
}

export function clearStoredAuthSession() {
  clearStoredAccessToken();
  clearStoredRefreshToken();
  clearStoredAuthUser();
  notifyAuthSessionSync();
}

export function notifyAuthLogout() {
  clearStoredAuthSession();

  if (typeof window !== "undefined") {
    dispatchAuthEvent(AUTH_LOGOUT_EVENT);

    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }
}

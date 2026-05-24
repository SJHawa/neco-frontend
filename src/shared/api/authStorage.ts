import {
  ACCESS_TOKEN_STORAGE_KEY,
  AUTH_LOGOUT_EVENT,
  REFRESH_TOKEN_STORAGE_KEY,
} from "../constants/auth";

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

export function setStoredRefreshToken(refreshToken: string) {
  getLocalStorage()?.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

export function clearStoredRefreshToken() {
  getLocalStorage()?.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function clearStoredAuthTokens() {
  clearStoredAccessToken();
  clearStoredRefreshToken();
}

export function notifyAuthLogout() {
  clearStoredAuthTokens();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));

    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }
}

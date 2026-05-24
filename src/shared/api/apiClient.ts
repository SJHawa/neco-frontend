import type { ApiResponse } from "../types/api";
import type { RefreshTokenResponse } from "../types/domain";
import { AppError } from "../utils/appError";
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  notifyAuthSessionSync,
  notifyAuthLogout,
  setStoredAccessToken,
} from "./authStorage";
import { createApiClient, unwrapApiResponse } from "./createApiClient";

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? "/v1";

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    throw new AppError({
      code: response.status === 401 ? "AUTH_REFRESH_TOKEN_REVOKED" : "UNAUTHORIZED",
      message: response.statusText || "Token refresh failed.",
      status: response.status,
    });
  }

  const envelope = (await response.json()) as ApiResponse<RefreshTokenResponse>;
  const data = unwrapApiResponse(envelope, response.status);

  if (!data?.accessToken) {
    throw new AppError({
      code: "AUTH_REFRESH_TOKEN_REVOKED",
      message: "Token refresh did not return a new access token.",
      requestId: envelope.meta.requestId,
      status: response.status,
    });
  }

  setStoredAccessToken(data.accessToken);
  notifyAuthSessionSync();

  return data.accessToken;
}

export const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  getAccessToken: getStoredAccessToken,
  getRefreshToken: getStoredRefreshToken,
  refreshAccessToken,
  onAuthFailure: notifyAuthLogout,
});

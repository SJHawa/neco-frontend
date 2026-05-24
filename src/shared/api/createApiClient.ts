import type { ApiResponse } from "../types/api";
import { AppError } from "../utils/appError";

export type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  authMode?: "required" | "none";
  body?: BodyInit | Record<string, unknown> | null;
  headers?: HeadersInit;
};

export type CreateApiClientOptions = {
  baseURL: string;
  fetchFn?: typeof fetch;
  getAccessToken?: () => string | null;
  getRefreshToken?: () => string | null;
  refreshAccessToken?: (refreshToken: string) => Promise<string>;
  onAuthFailure?: () => void | Promise<void>;
};

type InternalRequestOptions = ApiRequestOptions & {
  _hasRetriedAfterRefresh?: boolean;
};

function joinUrl(baseURL: string, path: string) {
  const normalizedBaseURL = baseURL.endsWith("/")
    ? baseURL.slice(0, -1)
    : baseURL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseURL}${normalizedPath}`;
}

function isJsonResponse(response: Response) {
  return response.headers.get("content-type")?.includes("application/json");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof FormData) &&
    !(value instanceof URLSearchParams) &&
    !(value instanceof Blob) &&
    !(value instanceof ArrayBuffer)
  );
}

function inferErrorCode(status: number) {
  if (status === 401) {
    return "UNAUTHORIZED";
  }

  if (status === 403) {
    return "FORBIDDEN_RESOURCE_ACCESS";
  }

  if (status >= 500) {
    return "INTERNAL_SERVER_ERROR";
  }

  return "HTTP_REQUEST_FAILED";
}

async function parseResponseEnvelope<T>(response: Response) {
  if (response.status === 204) {
    return null;
  }

  if (!isJsonResponse(response)) {
    return null;
  }

  return (await response.json()) as ApiResponse<T>;
}

export function unwrapApiResponse<T>(
  response: ApiResponse<T>,
  status?: number,
): T | null {
  if (response.error) {
    throw new AppError({
      code: response.error.code,
      message: response.error.message,
      requestId: response.meta.requestId,
      status,
    });
  }

  return response.data;
}

function shouldRefreshRequest<T>(
  response: Response,
  envelope: ApiResponse<T> | null,
  options: InternalRequestOptions,
) {
  if (options.authMode === "none" || options._hasRetriedAfterRefresh) {
    return false;
  }

  return response.status === 401 || envelope?.error?.code === "AUTH_TOKEN_EXPIRED";
}

function buildHeaders(
  headersInit: HeadersInit | undefined,
  accessToken: string | null,
  options: InternalRequestOptions,
) {
  const headers = new Headers(headersInit);

  headers.set("Accept", "application/json");

  if (
    options.body !== undefined &&
    options.body !== null &&
    !headers.has("Content-Type") &&
    isPlainObject(options.body)
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (options.authMode !== "none" && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

function serializeBody(body: ApiRequestOptions["body"]) {
  if (body === undefined || body === null) {
    return undefined;
  }

  return isPlainObject(body) ? JSON.stringify(body) : body;
}

export function createApiClient({
  baseURL,
  fetchFn = (input, init) => fetch(input, init),
  getAccessToken,
  getRefreshToken,
  refreshAccessToken,
  onAuthFailure,
}: CreateApiClientOptions) {
  async function executeRequest<T>(
    path: string,
    options: InternalRequestOptions = {},
  ): Promise<T | null> {
    const accessToken = getAccessToken?.() ?? null;
    const headers = buildHeaders(options.headers, accessToken, options);

    const response = await fetchFn(joinUrl(baseURL, path), {
      ...options,
      headers,
      body: serializeBody(options.body),
    });
    const envelope = await parseResponseEnvelope<T>(response);

    if (shouldRefreshRequest(response, envelope, options)) {
      const refreshToken = getRefreshToken?.() ?? null;

      if (!refreshToken || !refreshAccessToken) {
        await onAuthFailure?.();

        throw new AppError({
          code: "AUTH_REFRESH_TOKEN_REVOKED",
          message: "Unable to refresh the current session.",
          requestId: envelope?.meta.requestId,
          status: response.status,
        });
      }

      try {
        await refreshAccessToken(refreshToken);

        return executeRequest<T>(path, {
          ...options,
          _hasRetriedAfterRefresh: true,
        });
      } catch (error) {
        await onAuthFailure?.();
        throw error;
      }
    }

    if (response.status === 204) {
      return null;
    }

    if (!envelope) {
      throw new AppError({
        code: inferErrorCode(response.status),
        message: response.statusText || "Request failed.",
        status: response.status,
      });
    }

    return unwrapApiResponse(envelope, response.status);
  }

  return {
    request<T>(path: string, options?: ApiRequestOptions) {
      return executeRequest<T>(path, options);
    },
    get<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
      return executeRequest<T>(path, {
        ...options,
        method: "GET",
      });
    },
    post<T>(
      path: string,
      body?: ApiRequestOptions["body"],
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) {
      return executeRequest<T>(path, {
        ...options,
        method: "POST",
        body,
      });
    },
    put<T>(
      path: string,
      body?: ApiRequestOptions["body"],
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) {
      return executeRequest<T>(path, {
        ...options,
        method: "PUT",
        body,
      });
    },
    patch<T>(
      path: string,
      body?: ApiRequestOptions["body"],
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) {
      return executeRequest<T>(path, {
        ...options,
        method: "PATCH",
        body,
      });
    },
    delete<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
      return executeRequest<T>(path, {
        ...options,
        method: "DELETE",
      });
    },
  };
}

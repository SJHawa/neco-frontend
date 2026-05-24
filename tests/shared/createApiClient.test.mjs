import test from "node:test";
import assert from "node:assert/strict";
import { createApiClient, unwrapApiResponse } from "../../src/shared/api/createApiClient.ts";
import { AppError } from "../../src/shared/utils/appError.ts";

test("unwrapApiResponse returns data when the API envelope has no error", () => {
  const data = unwrapApiResponse({
    data: { value: 7 },
    meta: { requestId: "req-success" },
    error: null,
  });

  assert.deepEqual(data, { value: 7 });
});

test("unwrapApiResponse throws AppError when the API envelope contains an error", () => {
  assert.throws(
    () =>
      unwrapApiResponse(
        {
          data: null,
          meta: { requestId: "req-error" },
          error: {
            code: "ROOM_NOT_FOUND",
            message: "room missing",
          },
        },
        404,
      ),
    (error) =>
      error instanceof AppError &&
      error.code === "ROOM_NOT_FOUND" &&
      error.requestId === "req-error" &&
      error.status === 404,
  );
});

test("createApiClient retries once after a token refresh and reuses the new token", async () => {
  let accessToken = "expired-token";
  let refreshCallCount = 0;
  const authorizationHeaders = [];

  const client = createApiClient({
    baseURL: "/v1",
    getAccessToken: () => accessToken,
    getRefreshToken: () => "refresh-token",
    refreshAccessToken: async () => {
      refreshCallCount += 1;
      accessToken = "fresh-token";
      return accessToken;
    },
    fetchFn: async (_input, init) => {
      authorizationHeaders.push(new Headers(init?.headers).get("Authorization"));

      if (authorizationHeaders.length === 1) {
        return new Response(
          JSON.stringify({
            data: null,
            meta: { requestId: "req-expired" },
            error: {
              code: "AUTH_TOKEN_EXPIRED",
              message: "expired",
            },
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          data: { ok: true },
          meta: { requestId: "req-retry" },
          error: null,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    },
  });

  const result = await client.get("/protected");

  assert.deepEqual(result, { ok: true });
  assert.equal(refreshCallCount, 1);
  assert.deepEqual(authorizationHeaders, [
    "Bearer expired-token",
    "Bearer fresh-token",
  ]);
});

test("createApiClient returns null for successful 204 responses", async () => {
  const client = createApiClient({
    baseURL: "/v1",
    fetchFn: async () =>
      new Response(null, {
        status: 204,
      }),
  });

  const result = await client.delete("/resource");

  assert.equal(result, null);
});

test("createApiClient logs out when refresh fails", async () => {
  let logoutCallCount = 0;

  const client = createApiClient({
    baseURL: "/v1",
    getAccessToken: () => "expired-token",
    getRefreshToken: () => "refresh-token",
    refreshAccessToken: async () => {
      throw new AppError({
        code: "AUTH_REFRESH_TOKEN_REVOKED",
        message: "refresh revoked",
        status: 401,
      });
    },
    onAuthFailure: async () => {
      logoutCallCount += 1;
    },
    fetchFn: async () =>
      new Response(
        JSON.stringify({
          data: null,
          meta: { requestId: "req-expired" },
          error: {
            code: "AUTH_TOKEN_EXPIRED",
            message: "expired",
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
  });

  await assert.rejects(
    () => client.get("/protected"),
    (error) =>
      error instanceof AppError &&
      error.code === "AUTH_REFRESH_TOKEN_REVOKED",
  );
  assert.equal(logoutCallCount, 1);
});

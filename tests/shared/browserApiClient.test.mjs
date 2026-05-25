import test from "node:test";
import assert from "node:assert/strict";
import {
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredAuthUser,
  getStoredRefreshToken,
  notifyAuthLogout,
  setStoredAccessToken,
  setStoredAuthUser,
  setStoredRefreshToken,
} from "../../src/shared/api/authStorage.ts";
import { apiClient } from "../../src/shared/api/apiClient.ts";

function createStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
}

function createWindowStub(pathname = "/main") {
  const dispatchEvents = [];
  const locationAssignments = [];

  return {
    window: {
      sessionStorage: createStorage(),
      localStorage: createStorage(),
      dispatchEvent(event) {
        dispatchEvents.push(event.type);
        return true;
      },
      location: {
        pathname,
        assign(path) {
          locationAssignments.push(path);
        },
      },
    },
    dispatchEvents,
    locationAssignments,
  };
}

test(
  "authStorage stores access and refresh tokens in separate browser storages",
  { concurrency: false },
  () => {
    const originalWindow = globalThis.window;
    const originalCustomEvent = globalThis.CustomEvent;
    const { window } = createWindowStub();

    globalThis.window = window;
    globalThis.CustomEvent =
      originalCustomEvent ??
      class CustomEvent {
        constructor(type) {
          this.type = type;
        }
      };

    try {
      clearStoredAuthTokens();
      setStoredAccessToken("access-token");
      setStoredRefreshToken("refresh-token");
      setStoredAuthUser({
        userId: "user-1",
        loginId: "relay-user",
        nickname: "Relay Runner",
        email: null,
      });

      assert.equal(getStoredAccessToken(), "access-token");
      assert.equal(getStoredRefreshToken(), "refresh-token");
      assert.deepEqual(getStoredAuthUser(), {
        userId: "user-1",
        loginId: "relay-user",
        nickname: "Relay Runner",
        email: null,
      });
      assert.equal(
        window.sessionStorage.getItem("neconaeco.auth.refreshToken"),
        null,
      );
      assert.equal(
        window.localStorage.getItem("neconaeco.auth.accessToken"),
        null,
      );
      assert.equal(
        window.localStorage.getItem("neconaeco.auth.user"),
        null,
      );
    } finally {
      globalThis.window = originalWindow;
      globalThis.CustomEvent = originalCustomEvent;
    }
  },
);

test(
  "notifyAuthLogout clears browser auth tokens and redirects to /login",
  { concurrency: false },
  () => {
    const originalWindow = globalThis.window;
    const originalCustomEvent = globalThis.CustomEvent;
    const { window, dispatchEvents, locationAssignments } = createWindowStub();

    globalThis.window = window;
    globalThis.CustomEvent =
      originalCustomEvent ??
      class CustomEvent {
        constructor(type) {
          this.type = type;
        }
      };

    try {
      setStoredAccessToken("access-token");
      setStoredRefreshToken("refresh-token");
      setStoredAuthUser({
        userId: "user-1",
        loginId: "relay-user",
        nickname: "Relay Runner",
        email: null,
      });

      notifyAuthLogout();

      assert.equal(getStoredAccessToken(), null);
      assert.equal(getStoredRefreshToken(), null);
      assert.equal(getStoredAuthUser(), null);
      assert.deepEqual(dispatchEvents, [
        "neconaeco:auth-session-sync",
        "neconaeco:auth-logout",
      ]);
      assert.deepEqual(locationAssignments, ["/login"]);
    } finally {
      globalThis.window = originalWindow;
      globalThis.CustomEvent = originalCustomEvent;
    }
  },
);

test(
  "apiClient refreshes using stored tokens and writes the new access token back to sessionStorage",
  { concurrency: false },
  async () => {
    const originalWindow = globalThis.window;
    const originalCustomEvent = globalThis.CustomEvent;
    const originalFetch = globalThis.fetch;
    const { window, locationAssignments } = createWindowStub();

    globalThis.window = window;
    globalThis.CustomEvent =
      originalCustomEvent ??
      class CustomEvent {
        constructor(type) {
          this.type = type;
        }
      };

    try {
      setStoredAccessToken("expired-token");
      setStoredRefreshToken("refresh-token");

      const calls = [];

      globalThis.fetch = async (input, init) => {
        const url = String(input);
        calls.push({
          url,
          authorization: new Headers(init?.headers).get("Authorization"),
          body: init?.body ? String(init.body) : null,
        });

        if (url.endsWith("/protected") && calls.length === 1) {
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

        if (url.endsWith("/auth/refresh")) {
          return new Response(
            JSON.stringify({
              data: {
                accessToken: "fresh-token",
              },
              meta: { requestId: "req-refresh" },
              error: null,
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }

        return new Response(
          JSON.stringify({
            data: { ok: true },
            meta: { requestId: "req-success" },
            error: null,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      };

      const result = await apiClient.get("/protected");

      assert.deepEqual(result, { ok: true });
      assert.equal(getStoredAccessToken(), "fresh-token");
      assert.equal(locationAssignments.length, 0);
      assert.deepEqual(
        calls.map((call) => ({
          url: call.url,
          authorization: call.authorization,
        })),
        [
          {
            url: "/v1/protected",
            authorization: "Bearer expired-token",
          },
          {
            url: "/v1/auth/refresh",
            authorization: null,
          },
          {
            url: "/v1/protected",
            authorization: "Bearer fresh-token",
          },
        ],
      );
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.window = originalWindow;
      globalThis.CustomEvent = originalCustomEvent;
    }
  },
);

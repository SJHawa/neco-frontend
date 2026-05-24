import test from "node:test";
import assert from "node:assert/strict";
import {
  clearStoredAuthSession,
  getStoredAccessToken,
  getStoredAuthUser,
  getStoredRefreshToken,
  setStoredAuthSession,
} from "../../src/shared/api/authStorage.ts";
import {
  createAuthenticatedAuthState,
  createLoggedOutAuthState,
  getHydratedAuthState,
  persistLoginSession,
} from "../../src/features/auth/authSession.ts";

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
  };
}

test("persistLoginSession stores tokens and the auth user for the current browser session", () => {
  const originalWindow = globalThis.window;
  const originalCustomEvent = globalThis.CustomEvent;

  globalThis.window = {
    sessionStorage: createStorage(),
    localStorage: createStorage(),
    dispatchEvent() {
      return true;
    },
  };
  globalThis.CustomEvent =
    originalCustomEvent ??
    class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    };

  try {
    persistLoginSession({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        userId: "user-1",
        loginId: "relay-user",
        nickname: "Relay Runner",
        email: "runner@example.com",
      },
    });

    assert.equal(getStoredAccessToken(), "access-token");
    assert.equal(getStoredRefreshToken(), "refresh-token");
    assert.deepEqual(getStoredAuthUser(), {
      userId: "user-1",
      loginId: "relay-user",
      nickname: "Relay Runner",
      email: "runner@example.com",
    });
  } finally {
    globalThis.window = originalWindow;
    globalThis.CustomEvent = originalCustomEvent;
  }
});

test("getHydratedAuthState restores an authenticated session from storage", () => {
  const originalWindow = globalThis.window;
  const originalCustomEvent = globalThis.CustomEvent;

  globalThis.window = {
    sessionStorage: createStorage(),
    localStorage: createStorage(),
    dispatchEvent() {
      return true;
    },
  };
  globalThis.CustomEvent =
    originalCustomEvent ??
    class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    };

  try {
    setStoredAuthSession({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        userId: "user-1",
        loginId: "relay-user",
        nickname: "Relay Runner",
        email: null,
      },
    });

    assert.deepEqual(getHydratedAuthState(), {
      user: {
        userId: "user-1",
        loginId: "relay-user",
        nickname: "Relay Runner",
        email: null,
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
      isAuthenticated: true,
    });
  } finally {
    globalThis.window = originalWindow;
    globalThis.CustomEvent = originalCustomEvent;
  }
});

test("getHydratedAuthState rejects a token-only snapshot when the auth user is missing", () => {
  const originalWindow = globalThis.window;
  const originalCustomEvent = globalThis.CustomEvent;

  globalThis.window = {
    sessionStorage: createStorage(),
    localStorage: createStorage(),
    dispatchEvent() {
      return true;
    },
  };
  globalThis.CustomEvent =
    originalCustomEvent ??
    class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    };

  try {
    globalThis.window.sessionStorage.setItem(
      "neconaeco.auth.accessToken",
      "access-token",
    );
    globalThis.window.localStorage.setItem(
      "neconaeco.auth.refreshToken",
      "refresh-token",
    );

    assert.deepEqual(getHydratedAuthState(), createLoggedOutAuthState());
  } finally {
    globalThis.window = originalWindow;
    globalThis.CustomEvent = originalCustomEvent;
  }
});

test("clearStoredAuthSession removes the persisted browser auth snapshot", () => {
  const originalWindow = globalThis.window;
  const originalCustomEvent = globalThis.CustomEvent;

  globalThis.window = {
    sessionStorage: createStorage(),
    localStorage: createStorage(),
    dispatchEvent() {
      return true;
    },
  };
  globalThis.CustomEvent =
    originalCustomEvent ??
    class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    };

  try {
    setStoredAuthSession({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        userId: "user-1",
        loginId: "relay-user",
        nickname: "Relay Runner",
        email: null,
      },
    });

    clearStoredAuthSession();

    assert.equal(getStoredAccessToken(), null);
    assert.equal(getStoredRefreshToken(), null);
    assert.equal(getStoredAuthUser(), null);
    assert.deepEqual(getHydratedAuthState(), createLoggedOutAuthState());
  } finally {
    globalThis.window = originalWindow;
    globalThis.CustomEvent = originalCustomEvent;
  }
});

test("createAuthenticatedAuthState mirrors the login response payload", () => {
  assert.deepEqual(
    createAuthenticatedAuthState({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        userId: "user-1",
        loginId: "relay-user",
        nickname: "Relay Runner",
        email: null,
      },
    }),
    {
      user: {
        userId: "user-1",
        loginId: "relay-user",
        nickname: "Relay Runner",
        email: null,
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
      isAuthenticated: true,
    },
  );
});

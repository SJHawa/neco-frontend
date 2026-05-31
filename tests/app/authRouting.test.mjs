import test from "node:test";
import assert from "node:assert/strict";
import {
  getGuestRouteRedirectPath,
  getProtectedRouteRedirectPath,
  getRootRedirectPath,
  getSocketCloseRouteTarget,
  isRoomScopedPath,
  shouldBypassProtectedRouteForMainPageMock,
} from "../../src/app/router/authRouting.ts";

test("getRootRedirectPath sends guests to login and members to main", () => {
  assert.equal(getRootRedirectPath(false), "/login");
  assert.equal(getRootRedirectPath(true), "/main");
});

test("getGuestRouteRedirectPath blocks authenticated users from guest-only routes", () => {
  assert.equal(getGuestRouteRedirectPath(false), null);
  assert.equal(getGuestRouteRedirectPath(true), "/main");
});

test("getProtectedRouteRedirectPath blocks guests from protected routes", () => {
  assert.equal(getProtectedRouteRedirectPath(false), "/login");
  assert.equal(getProtectedRouteRedirectPath(true), null);
});

test("isRoomScopedPath only matches room gameplay routes", () => {
  assert.equal(isRoomScopedPath("/rooms/room-1/play"), true);
  assert.equal(isRoomScopedPath("/rooms/room-1/result"), true);
  assert.equal(isRoomScopedPath("/main"), false);
  assert.equal(isRoomScopedPath("/login"), false);
});

test("getSocketCloseRouteTarget maps reflected close-code policy to navigation targets", () => {
  assert.equal(getSocketCloseRouteTarget("auth-logout", "/rooms/room-1/play"), "/login");
  assert.equal(
    getSocketCloseRouteTarget("terminated-session", "/rooms/room-1/play"),
    "/main",
  );
  assert.equal(
    getSocketCloseRouteTarget("terminated-session", "/rooms/room-1/result"),
    "/main",
  );
  assert.equal(getSocketCloseRouteTarget("terminated-session", "/main"), null);
  assert.equal(
    getSocketCloseRouteTarget("intentional-close", "/rooms/room-1/play"),
    null,
  );
  assert.equal(getSocketCloseRouteTarget(null, "/rooms/room-1/play"), null);
});

test("shouldBypassProtectedRouteForMainPageMock only allows supported mock scenarios on /main", () => {
  assert.equal(
    shouldBypassProtectedRouteForMainPageMock("/main", "?mock=room-create"),
    true,
  );
  assert.equal(
    shouldBypassProtectedRouteForMainPageMock("/main", "?mock=room-create-delay"),
    true,
  );
  assert.equal(
    shouldBypassProtectedRouteForMainPageMock("/main", "?mock=invitation"),
    true,
  );
  assert.equal(
    shouldBypassProtectedRouteForMainPageMock("/main", "?mock=invitation-delay"),
    true,
  );
  assert.equal(
    shouldBypassProtectedRouteForMainPageMock("/main", "?mock=start-ready"),
    true,
  );
  assert.equal(
    shouldBypassProtectedRouteForMainPageMock("/rooms/mock", "?mock=room-create"),
    false,
  );
  assert.equal(
    shouldBypassProtectedRouteForMainPageMock("/main", "?mock=unknown"),
    false,
  );
});

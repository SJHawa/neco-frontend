import assert from "node:assert/strict";
import test from "node:test";
import { createRankingApi } from "../../src/features/ranking/rankingApi.ts";

test("ranking api requests team and individual rankings with an explicit limit", async () => {
  const requestedPaths = [];
  const api = createRankingApi({
    async get(path) {
      requestedPaths.push(path);
      return [];
    },
  });

  assert.deepEqual(await api.listTeams(20), []);
  assert.deepEqual(await api.listIndividuals(30), []);
  assert.deepEqual(requestedPaths, [
    "/rankings/teams?limit=20",
    "/rankings/individual?limit=30",
  ]);
});

test("ranking api normalizes empty response bodies to empty lists", async () => {
  const api = createRankingApi({
    async get() {
      return null;
    },
  });

  assert.deepEqual(await api.listTeams(), []);
  assert.deepEqual(await api.listIndividuals(), []);
});

test("ranking api loads one game contribution and registers a team name", async () => {
  const requests = [];
  const api = createRankingApi({
    async get(path) {
      requests.push({ method: "GET", path });
      return { gameRoomId: "room 1", contributions: [] };
    },
    async post(path, body) {
      requests.push({ method: "POST", path, body });
      return { gameRoomId: "room 1", teamName: body.teamName };
    },
  });

  await api.getGameContributions("room 1");
  await api.registerTeamRanking("room 1", "네코 팀");

  assert.deepEqual(requests, [
    {
      method: "GET",
      path: "/rankings/game-rooms/room%201/contributions",
    },
    {
      method: "POST",
      path: "/rankings/game-rooms/room%201/register",
      body: { teamName: "네코 팀" },
    },
  ]);
});

import { apiClient } from "../../shared/api/apiClient";

export type RankingDifficulty = "EASY" | "NORMAL" | "HARD";

export type TeamRankingEntry = {
  rank: number;
  gameRoomId: string;
  teamName: string;
  score: number;
  difficulty: RankingDifficulty;
  missionCleared: boolean;
  remainingStrikes: number;
  participants: Array<{
    userId: string;
    nickname: string;
  }>;
};

export type GameContributionEntry = {
  rank: number;
  userId: string;
  nickname: string;
  score: number;
  contributionPercent: number;
  clearedSteps: number;
  failedAttempts: number;
  firstAttemptClears: number;
  averageClearSeconds: number | null;
  scoreBreakdown: IndividualRankingEntry["scoreBreakdown"];
};

export type GameContributionSummary = {
  gameRoomId: string;
  teamScore: number;
  teamName: string | null;
  rankingRegistered: boolean;
  canRegisterRanking: boolean;
  contributions: GameContributionEntry[];
};

export type TeamRankingRegistration = {
  gameRoomId: string;
  teamName: string;
  registeredAt: string;
};

export type IndividualRankingEntry = {
  rank: number;
  userId: string;
  nickname: string;
  score: number;
  clearedSteps: number;
  failedAttempts: number;
  firstAttemptClears: number;
  averageClearSeconds: number | null;
  scoreBreakdown: {
    clear: number;
    firstAttempt: number;
    time: number;
    failure: number;
  };
};

type RankingApiClient = Pick<typeof apiClient, "get" | "post">;

export function createRankingApi(client: RankingApiClient = apiClient) {
  return {
    async listTeams(limit = 50) {
      return (
        (await client.get<TeamRankingEntry[]>(`/rankings/teams?limit=${limit}`)) ?? []
      );
    },
    async listIndividuals(limit = 50) {
      return (
        (await client.get<IndividualRankingEntry[]>(
          `/rankings/individual?limit=${limit}`,
        )) ?? []
      );
    },
    async getGameContributions(gameRoomId: string) {
      return client.get<GameContributionSummary>(
        `/rankings/game-rooms/${encodeURIComponent(gameRoomId)}/contributions`,
      );
    },
    async registerTeamRanking(gameRoomId: string, teamName: string) {
      return client.post<TeamRankingRegistration>(
        `/rankings/game-rooms/${encodeURIComponent(gameRoomId)}/register`,
        { teamName },
      );
    },
  };
}

export const rankingApi = createRankingApi();

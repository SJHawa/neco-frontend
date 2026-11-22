import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rankingApi, type GameContributionEntry } from "../../features/ranking/rankingApi";
import "./ResultRankingActions.css";

type DetailView = "closed" | "contributions" | "registration";

export function ResultRankingActions({ gameRoomId }: { gameRoomId: string }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<DetailView>("closed");
  const [teamName, setTeamName] = useState("");
  const contributionQuery = useQuery({
    queryKey: ["ranking-contribution", gameRoomId],
    queryFn: () => rankingApi.getGameContributions(gameRoomId),
    staleTime: 30_000,
  });
  const registrationMutation = useMutation({
    mutationFn: () => rankingApi.registerTeamRanking(gameRoomId, teamName.trim()),
    onSuccess: async () => {
      await Promise.all([
        contributionQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["rankings", "team"] }),
      ]);
      setView("contributions");
    },
  });
  const summary = contributionQuery.data;
  const normalizedTeamName = teamName.trim();
  const canSubmit = normalizedTeamName.length >= 2 && normalizedTeamName.length <= 12;

  function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit && !registrationMutation.isPending) registrationMutation.mutate();
  }

  return (
    <>
      <div className="result-ranking-actions">
        <button
          type="button"
          disabled={!summary}
          onClick={() => setView("contributions")}
        >
          {contributionQuery.isPending ? "기여도 집계 중..." : "기여도 보기"}
        </button>
        {summary?.canRegisterRanking ? (
          <button type="button" onClick={() => setView("registration")}>
            팀 랭킹 등록
          </button>
        ) : null}
        {summary?.rankingRegistered ? (
          <span className="result-ranking-actions__registered" role="status">
            {summary.teamName} 팀으로 랭킹 등록 완료
          </span>
        ) : null}
      </div>

      {contributionQuery.isError ? (
        <div className="result-ranking-actions__error" role="alert">
          기여도를 불러오지 못했어요.
          <button type="button" onClick={() => void contributionQuery.refetch()}>다시 시도</button>
        </div>
      ) : null}

      {view !== "closed" && summary ? (
        <div className="result-ranking-detail__overlay">
          <section
            className="result-ranking-detail"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-ranking-detail-title"
          >
            {view === "contributions" ? (
              <ContributionView
                teamName={summary.teamName}
                teamScore={summary.teamScore}
                contributions={summary.contributions}
                canRegister={summary.canRegisterRanking}
                onRegister={() => setView("registration")}
                onClose={() => setView("closed")}
              />
            ) : (
              <form onSubmit={submitRegistration}>
                <p className="result-ranking-detail__eyebrow">팀 랭킹 등록</p>
                <h2 id="result-ranking-detail-title">우리 팀 이름을 정해주세요</h2>
                <p className="result-ranking-detail__description">
                  이번 게임의 팀 점수 {summary.teamScore.toLocaleString("ko-KR")}점이 등록됩니다.
                </p>
                <label htmlFor="ranking-team-name">팀 이름</label>
                <input
                  id="ranking-team-name"
                  value={teamName}
                  minLength={2}
                  maxLength={12}
                  pattern="[가-힣a-zA-Z0-9 _-]+"
                  placeholder="2~12자로 입력"
                  autoFocus
                  required
                  onChange={(event) => setTeamName(event.target.value)}
                />
                <small>{normalizedTeamName.length}/12자</small>
                {registrationMutation.isError ? (
                  <p className="result-ranking-detail__error" role="alert">
                    등록하지 못했어요. 팀 이름을 확인하고 다시 시도해주세요.
                  </p>
                ) : null}
                <div className="result-ranking-detail__buttons">
                  <button type="button" onClick={() => setView("closed")}>취소</button>
                  <button type="submit" disabled={!canSubmit || registrationMutation.isPending}>
                    {registrationMutation.isPending ? "등록 중..." : "등록하기"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}

function ContributionView({ teamName, teamScore, contributions, canRegister, onRegister, onClose }: {
  teamName: string | null;
  teamScore: number;
  contributions: GameContributionEntry[];
  canRegister: boolean;
  onRegister: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <p className="result-ranking-detail__eyebrow">게임 기여도</p>
      <h2 id="result-ranking-detail-title">팀원별 활약</h2>
      <p className="result-ranking-detail__description">
        {teamName ? `${teamName} · ` : ""}팀 점수 {teamScore.toLocaleString("ko-KR")}점
      </p>
      {contributions.length === 0 ? (
        <p className="result-ranking-detail__empty">집계할 수 있는 턴 기록이 없어요.</p>
      ) : (
        <ol className="contribution-list">
          {contributions.map((entry) => (
            <li key={entry.userId}>
              <div className="contribution-list__heading">
                <strong>{entry.nickname}</strong>
                <span>{entry.contributionPercent}% · {entry.score.toLocaleString("ko-KR")}점</span>
              </div>
              <div className="contribution-list__track" role="img" aria-label={`${entry.nickname} 기여도 ${entry.contributionPercent}%`}>
                <span style={{ width: `${entry.contributionPercent}%` }} />
              </div>
              <p>성공 {entry.clearedSteps} · 첫 시도 {entry.firstAttemptClears} · 실패 {entry.failedAttempts}</p>
            </li>
          ))}
        </ol>
      )}
      <div className="result-ranking-detail__buttons">
        {canRegister ? <button type="button" onClick={onRegister}>팀 랭킹 등록</button> : null}
        <button type="button" onClick={onClose} autoFocus>닫기</button>
      </div>
    </>
  );
}

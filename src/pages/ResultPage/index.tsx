import { useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "../../app/providers/ClientStateProvider";
import { useRoomSocketLifecycle } from "../../features/realtime/useRoomSocketLifecycle";
import { PageShell } from "../../shared/components/PageShell";
import "./ResultPage.css";

export function ResultPage() {
  const navigate = useNavigate();
  const { gameRoomId } = useParams();
  useRoomSocketLifecycle(gameRoomId);

  const missionResult = useAppStore((state) => state.game.missionResult);
  const gameStatus = useAppStore((state) => state.game.gameState?.status);

  if (!missionResult) {
    return (
      <PageShell
        title="미션 결과"
        description="실시간 미션 결과가 아직 도착하지 않았습니다. 게임 화면에서 플레이를 이어가거나 메인으로 돌아가세요."
      >
        <div className="result-page__actions">
          {gameRoomId ? (
            <button
              type="button"
              onClick={() => navigate(`/rooms/${gameRoomId}/play`)}
            >
              게임 화면으로
            </button>
          ) : null}
          <button type="button" onClick={() => navigate("/main")}>
            메인으로
          </button>
        </div>
      </PageShell>
    );
  }

  const outcomeLabel = missionResult.isMissionCleared
    ? "미션 성공"
    : "미션 실패";
  const primaryIssue = missionResult.detectedIssues?.[0];

  return (
    <PageShell
      title={outcomeLabel}
      description={missionResult.feedbackMessage}
    >
      <section className="result-page__summary" aria-label="미션 결과 요약">
        <dl>
          <div>
            <dt>판정</dt>
            <dd>{missionResult.judgeStatus}</dd>
          </div>
          <div>
            <dt>게임 상태</dt>
            <dd>{gameStatus ?? "FINISHED"}</dd>
          </div>
          <div>
            <dt>스트라이크</dt>
            <dd>
              {missionResult.strikeCount} / 남은 목숨{" "}
              {missionResult.remainingStrikeCount}
            </dd>
          </div>
        </dl>

        {primaryIssue ? (
          <p className="result-page__issue">
            {primaryIssue.filePath}:{primaryIssue.lineNumber} —{" "}
            {primaryIssue.message}
          </p>
        ) : null}

        <div className="result-page__actions">
          <button type="button" onClick={() => navigate("/main")}>
            메인으로
          </button>
        </div>
      </section>
    </PageShell>
  );
}

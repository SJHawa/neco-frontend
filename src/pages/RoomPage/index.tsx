import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./RoomPage.css";
import { useAppStore, useAppStoreApi } from "../../app/providers/ClientStateProvider";
import {
  getRealtimeCloseBannerCopy,
  isRoomSessionUnavailable,
} from "../../features/realtime/roomSocketLifecycle";
import { applyEditorFileReset } from "../../features/editor/editorTurnBaseline";
import { useRoomSocketLifecycle } from "../../features/realtime/useRoomSocketLifecycle";
import backgroundRunImg from "../../assets/characters/background-run.png";
import catIdeaImg from "../../assets/characters/cat-idea.png";
import catNoImg from "../../assets/characters/cat-no.png";
import catImg from "../../assets/characters/cat.png";
import hamImg from "../../assets/characters/ham.png";
import lionImg from "../../assets/characters/lion.png";
import mouseImg from "../../assets/characters/mouse.png";
import rabbitRun1Img from "../../assets/characters/rabbit-run-1.png";
import rabbitRun2Img from "../../assets/characters/rabbit-run-2.png";
import rabbitRun3Img from "../../assets/characters/rabbit-run-3.png";
import rabbitRun4Img from "../../assets/characters/rabbit-run-4.png";
import rabbitImg from "../../assets/characters/rabbit.png";
import whiteImg from "../../assets/characters/white.png";
import {
  buildMissionFileTabs,
  buildParticipantRows,
  buildStrikeHeartDisplay,
  canEditGameplay,
  canMutateMissionFile,
  computeRemainingSeconds,
  findMissionFileTab,
  formatTurnTimerText,
  getLanguageDisplayLabel,
  getMissionStepStatusLabel,
  isEditorContentReadOnly,
  resolveActiveFilePath,
  type RoomParticipantRow,
} from "./roomPageViewModel";

type AiMasterStep = "analysis" | "feedback" | "error";
type StartCountdownValue = 5 | 4 | 3 | 2 | 1 | "START";

const participantAvatarImages = [
  whiteImg,
  catImg,
  rabbitImg,
  mouseImg,
  lionImg,
];

const aiMasterSteps: Array<{ id: AiMasterStep; label: string }> = [
  { id: "analysis", label: "코드 분석" },
  { id: "feedback", label: "코드 피드백" },
  { id: "error", label: "오류 피드백" },
];

const runnerFrames = [
  rabbitRun1Img,
  rabbitRun2Img,
  rabbitRun3Img,
  rabbitRun4Img,
];

function getParticipantAvatar(userId: string) {
  const index =
    [...userId].reduce((total, character) => total + character.charCodeAt(0), 0) %
    participantAvatarImages.length;

  return participantAvatarImages[index];
}

function getParticipantAvatarAlt(nickname: string) {
  return `${nickname} 아바타`;
}

export function RoomPage() {
  const navigate = useNavigate();
  const { gameRoomId } = useParams();
  const store = useAppStoreApi();
  useRoomSocketLifecycle(gameRoomId);

  const authUserId = useAppStore((state) => state.auth.user?.userId ?? null);
  const gameState = useAppStore((state) => state.game.gameState);
  const missionState = useAppStore((state) => state.game.missionState);
  const showMissionGuideModal = useAppStore(
    (state) => state.game.showMissionGuideModal,
  );
  const lastTurnEvaluation = useAppStore(
    (state) => state.game.lastTurnEvaluation,
  );
  const editorFiles = useAppStore((state) => state.editor.files);
  const activeFilePath = useAppStore((state) => state.editor.activeFilePath);
  const participants = useAppStore((state) => state.realtime.participants);
  const realtimeStatus = useAppStore((state) => state.realtime.connectionStatus);
  const closeCode = useAppStore((state) => state.realtime.closeCode);
  const closeReasonCode = useAppStore((state) => state.realtime.closeReasonCode);

  const closeBannerCopy = getRealtimeCloseBannerCopy({
    closeCode,
    closeReasonCode,
    connectionStatus: realtimeStatus,
  });
  const isRealtimeUnavailable = isRoomSessionUnavailable(realtimeStatus);

  const [aiMasterStep, setAiMasterStep] = useState<AiMasterStep>("analysis");
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [startCountdown, setStartCountdown] =
    useState<StartCountdownValue>(5);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const startTimerRef = useRef<number | null>(null);

  const fileTabs = useMemo(
    () => buildMissionFileTabs(missionState, editorFiles),
    [editorFiles, missionState],
  );
  const resolvedActiveFilePath = resolveActiveFilePath(activeFilePath, fileTabs);
  const selectedCode =
    resolvedActiveFilePath === null
      ? ""
      : (editorFiles[resolvedActiveFilePath] ?? "");
  const activeFileTab = findMissionFileTab(fileTabs, resolvedActiveFilePath);
  const selectedFileName = activeFileTab?.fileName ?? "파일 없음";

  const turnState = gameState?.turnState;
  const isMyTurn = turnState?.currentPlayerId === authUserId;
  const canEditTurn = canEditGameplay(authUserId, gameState);
  const isTurnExpired = remainingSeconds <= 0;
  const isMissionGuideOpen = showMissionGuideModal && !isRealtimeUnavailable;
  const canMutateActiveFile = canMutateMissionFile(canEditTurn, activeFileTab);
  const isEditorReadOnly = isEditorContentReadOnly({
    canEditTurn,
    tab: activeFileTab,
    isTurnExpired,
    isMissionGuideOpen,
    isRealtimeUnavailable,
  });
  const isTurnActionLocked = isEditorReadOnly;

  const strikeDisplay = buildStrikeHeartDisplay(
    gameState?.strikeCount,
    gameState?.maxStrikeCount,
  );
  const languageLabel = getLanguageDisplayLabel(missionState?.language);
  const participantRows = buildParticipantRows(
    participants,
    turnState?.currentPlayerId,
    authUserId,
  );
  const missionTitle =
    missionState?.title?.trim() || "미션 정보를 불러오는 중입니다.";
  const missionDescription =
    missionState?.description?.trim() ||
    "실시간 미션 데이터가 연결되면 설명이 표시됩니다.";
  const timerText = formatTurnTimerText(remainingSeconds);
  const hasGameplayData = Boolean(gameState && missionState);
  const evaluationFeedback = lastTurnEvaluation?.feedbackMessage?.trim();

  useEffect(() => {
    if (!turnState?.deadlineAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemainingTime = () => {
      setRemainingSeconds(computeRemainingSeconds(turnState.deadlineAt));
    };

    updateRemainingTime();
    const timerId = window.setInterval(updateRemainingTime, 250);

    return () => window.clearInterval(timerId);
  }, [turnState?.deadlineAt, turnState?.turnId]);

  useEffect(() => {
    return () => {
      if (startTimerRef.current !== null) {
        window.clearInterval(startTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMissionGuideOpen) {
      return;
    }

    const sequence: StartCountdownValue[] = [5, 4, 3, 2, 1, "START"];
    let sequenceIndex = 0;
    setStartCountdown(sequence[sequenceIndex]);

    startTimerRef.current = window.setInterval(() => {
      sequenceIndex += 1;

      if (sequenceIndex < sequence.length) {
        setStartCountdown(sequence[sequenceIndex]);
        return;
      }

      if (startTimerRef.current !== null) {
        window.clearInterval(startTimerRef.current);
        startTimerRef.current = null;
      }

      store.setState((state) => ({
        ...state,
        game: {
          ...state.game,
          showMissionGuideModal: false,
        },
      }));
    }, 1000);

    return () => {
      if (startTimerRef.current !== null) {
        window.clearInterval(startTimerRef.current);
        startTimerRef.current = null;
      }
    };
  }, [isMissionGuideOpen, store]);

  const handleSelectFile = (filePath: string) => {
    store.setState((state) => ({
      ...state,
      editor: {
        ...state.editor,
        activeFilePath: filePath,
      },
    }));
  };

  const handleEditorChange = (nextValue: string) => {
    if (!resolvedActiveFilePath || !canMutateActiveFile || isTurnActionLocked) {
      return;
    }

    store.setState((state) => ({
      ...state,
      editor: {
        ...state.editor,
        files: {
          ...state.editor.files,
          [resolvedActiveFilePath]: nextValue,
        },
      },
    }));
  };

  const handleResetEditor = () => {
    if (!resolvedActiveFilePath || !canMutateActiveFile || isTurnActionLocked) {
      return;
    }

    store.setState((state) => ({
      ...state,
      editor: applyEditorFileReset(
        state.editor,
        resolvedActiveFilePath,
        turnState?.turnId,
      ),
    }));
  };

  return (
    <div className="room-page">
      <header className="room-header">
        <div className="room-logo" aria-label="네코네코 홈">
          네코네코 <span>☘</span>
        </div>

        <div className="room-status">
          <div
            className="status-pill"
            aria-label={`남은 시간 ${remainingSeconds}초`}
          >
            <span>◷</span>
            <span>남은 시간</span>
            <strong>{timerText}</strong>
          </div>
          <div
            className="status-pill lives"
            aria-label={`팀 목숨 ${strikeDisplay.remaining}개 남음`}
          >
            <span>팀 목숨</span>
            {Array.from({ length: strikeDisplay.remaining }, (_, index) => (
              <span key={`heart-${index}`}>♥</span>
            ))}
            {Array.from({ length: strikeDisplay.lost }, (_, index) => (
              <span className="empty-heart" key={`empty-heart-${index}`}>
                ♡
              </span>
            ))}
          </div>
          {languageLabel ? (
            <div className="status-pill">{languageLabel}</div>
          ) : null}
          {turnState ? (
            <div className="status-pill" aria-label={`${turnState.turnNumber}턴`}>
              {turnState.turnNumber}턴
            </div>
          ) : null}
        </div>

        <div className="team-strip">
          <strong>팀원 {participantRows.length}명</strong>
          {participantRows.map((participant) => (
            <span className="avatar" key={participant.userId}>
              <img
                src={getParticipantAvatar(participant.userId)}
                alt={getParticipantAvatarAlt(participant.nickname)}
              />
            </span>
          ))}
          <button className="settings-button" type="button" aria-label="설정">
            ⚙
          </button>
        </div>
      </header>

      {isRealtimeUnavailable ? (
        <section className="socket-closed-banner" role="status">
          <div>
            <strong>{closeBannerCopy.title}</strong>
            <span>{closeBannerCopy.description}</span>
          </div>
          <button type="button" onClick={() => navigate("/main")}>
            메인으로 돌아가기
          </button>
        </section>
      ) : null}

      {!hasGameplayData && !isRealtimeUnavailable ? (
        <section className="socket-closed-banner" role="status">
          <div>
            <strong>게임 정보를 불러오는 중</strong>
            <span>실시간 게임 상태가 연결되면 화면이 표시됩니다.</span>
          </div>
        </section>
      ) : null}

      <main className="room-layout">
        <aside className="left-rail">
          <section className="panel mission-panel">
            <h2>⚑ 미션</h2>
            <p>{missionDescription}</p>
            <img className="mission-mascot" src={hamImg} alt="미션 안내 캐릭터" />
          </section>

          <section className="panel file-panel">
            <h3>파일</h3>
            <div className="file-list">
              {fileTabs.length > 0 ? (
                fileTabs.map((file) => (
                  <button
                    className={
                      file.filePath === resolvedActiveFilePath ? "active" : ""
                    }
                    key={file.filePath}
                    type="button"
                    onClick={() => handleSelectFile(file.filePath)}
                  >
                    ▣ {file.fileName}
                  </button>
                ))
              ) : (
                <p>미션 파일이 아직 없습니다.</p>
              )}
            </div>
          </section>

          <section className="panel member-panel">
            <div className="panel-header">
              <h3>팀원</h3>
            </div>
            <div className="member-list">
              {participantRows.length > 0 ? (
                participantRows.map((member) => (
                  <ParticipantRow
                    key={member.userId}
                    member={member}
                  />
                ))
              ) : (
                <p>참가자 정보를 불러오는 중입니다.</p>
              )}
            </div>
          </section>
        </aside>

        <section className="main-column">
          <section className="editor-card panel">
            <div className="editor-tab">{selectedFileName}</div>
            <textarea
              aria-label={`${selectedFileName} 코드 편집기`}
              className="code-editor"
              readOnly={isEditorReadOnly}
              spellCheck={false}
              value={selectedCode}
              onChange={(event) => handleEditorChange(event.target.value)}
            />
            <div className="editor-actions">
              <button
                className={`submit-button ${canMutateActiveFile ? "active" : ""}`}
                type="button"
                disabled={isTurnActionLocked || !canMutateActiveFile}
              >
                ▶{" "}
                {!canEditTurn
                  ? "내 턴이 아닙니다"
                  : activeFileTab?.readonly
                    ? "읽기 전용 파일"
                    : "제출 하기"}
              </button>
              <button
                className="reset-button"
                type="button"
                disabled={isTurnActionLocked}
                onClick={handleResetEditor}
              >
                ↺ 초기화
              </button>
            </div>
          </section>

          <section className="panel progress-panel">
            <h3>미션 진행도</h3>
            <div className="progress-steps">
              <article
                className={`progress-step ${
                  missionState?.currentStepStatus === "IN_PROGRESS"
                    ? "active"
                    : missionState?.currentStepStatus === "CLEARED"
                      ? "done"
                      : "waiting"
                }`}
              >
                <span className="step-number">1</span>
                <span className="step-icon">✣</span>
                <strong>{missionTitle}</strong>
                <p>{missionDescription}</p>
                <em>
                  {getMissionStepStatusLabel(missionState?.currentStepStatus)}
                </em>
              </article>
            </div>
          </section>
        </section>

        <aside className="right-rail">
          <section className="panel ai-card">
            <h3>
              <span>🤖</span> AI 마스터
            </h3>
            <div className="ai-tabs">
              {aiMasterSteps.map((step) => (
                <button
                  className={aiMasterStep === step.id ? "active" : ""}
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setAiMasterStep(step.id);
                    setIsHintOpen(false);
                  }}
                >
                  {step.label}
                </button>
              ))}
            </div>

            <div className="ai-content">
              {aiMasterStep === "analysis" ? (
                <div className="analysis-view">
                  <strong>
                    AI 마스터가 <span>코드를 분석</span>할 준비가 되었어요
                  </strong>
                  <small>턴 제출 후 평가 결과가 여기에 표시됩니다.</small>
                  <div className="analysis-steps">
                    <span className="active">1 코드 구조 분석</span>
                    <span>2 로직 검증</span>
                    <span>3 테스트 실행</span>
                    <span>4 결과 생성</span>
                  </div>
                  <div
                    className="run-track"
                    style={{ backgroundImage: `url(${backgroundRunImg})` }}
                  >
                    <div className="runner">
                      {runnerFrames.map((frame, index) => (
                        <img
                          alt=""
                          key={frame}
                          src={frame}
                          style={{ animationDelay: `${index * 0.14}s` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="analysis-notice">
                    {evaluationFeedback ||
                      "코드 제출과 힌트 연동은 다음 작업에서 연결됩니다."}
                  </div>
                </div>
              ) : null}

              {aiMasterStep === "feedback" ? (
                <div className="feedback-view">
                  <img className="floating-mascot" src={catIdeaImg} alt="힌트 캐릭터" />
                  <div className="feedback-card">
                    <strong>코드 피드백</strong>
                    <p>
                      {evaluationFeedback ||
                        "턴 평가가 도착하면 피드백이 이 영역에 표시됩니다."}
                    </p>
                  </div>
                  <HintPanel open={isHintOpen}>
                    힌트 API 연동은 다음 작업에서 연결됩니다.
                  </HintPanel>
                </div>
              ) : null}

              {aiMasterStep === "error" ? (
                <div className="feedback-view">
                  <img className="floating-mascot" src={catNoImg} alt="오류 안내 캐릭터" />
                  <div className="feedback-card error">
                    <strong>ⓘ 오류 피드백</strong>
                    <p>
                      {lastTurnEvaluation?.detectedIssues?.[0]?.message ||
                        "감지된 이슈가 있으면 평가 이벤트와 함께 표시됩니다."}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {aiMasterStep !== "analysis" ? (
              <div className="ai-footer">
                <button type="button" onClick={() => setIsHintOpen((open) => !open)}>
                  💡 {isHintOpen ? "힌트 닫기" : "힌트 보기"}
                </button>
              </div>
            ) : null}
          </section>

          <section className="panel chat-card">
            <h3>팀 채팅 ⧉</h3>
            <p>팀 채팅은 이후 작업에서 연결됩니다.</p>
          </section>
        </aside>
      </main>

      {isMissionGuideOpen ? (
        <GameStartModal
          countdown={startCountdown}
          missionTitle={missionTitle}
          participants={participantRows}
        />
      ) : null}
    </div>
  );
}

function ParticipantRow({ member }: { member: RoomParticipantRow }) {
  const displayName = member.isCurrentUser ? "나" : member.nickname;
  const roleSuffix = member.roleLabel ? ` (${member.roleLabel})` : "";

  return (
    <div className={`member-row ${member.isCurrentTurn ? "current" : ""}`}>
      <span className="avatar">
        <img
          src={getParticipantAvatar(member.userId)}
          alt={getParticipantAvatarAlt(member.nickname)}
        />
      </span>
      <strong>
        {displayName}
        {roleSuffix}
      </strong>
      {member.isCurrentTurn ? <em>현재 턴</em> : null}
    </div>
  );
}

function HintPanel({
  children,
  open,
}: {
  children: React.ReactNode;
  open: boolean;
}) {
  return (
    <div className={`hint-panel ${open ? "open" : ""}`}>
      <strong>💡 힌트 보기</strong>
      <p>{children}</p>
    </div>
  );
}

function GameStartModal({
  countdown,
  missionTitle,
  participants,
}: {
  countdown: StartCountdownValue;
  missionTitle: string;
  participants: RoomParticipantRow[];
}) {
  return (
    <div className="modal-overlay start-overlay" role="dialog" aria-modal="true">
      <div className="start-modal">
        <h2>게임 시작 준비!</h2>
        <p>잠시후 게임이 시작됩니다</p>
        <section className="start-card mission">
          <h3>⚑ 미션</h3>
          <span>{missionTitle}</span>
          <img src={hamImg} alt="미션 안내 캐릭터" />
        </section>
        <section className="start-card">
          <h3>♧ 턴 순서</h3>
          <div className="turn-order">
            {participants.map((member, index) => (
              <div key={member.userId}>
                <span className="avatar">
                  <img
                    src={getParticipantAvatar(member.userId)}
                    alt={getParticipantAvatarAlt(member.nickname)}
                  />
                </span>
                <b>{index + 1}</b>
                <small>
                  {member.isCurrentUser ? "나" : member.nickname}
                  {member.roleLabel ? ` (${member.roleLabel})` : ""}
                </small>
              </div>
            ))}
          </div>
        </section>
        <div className="countdown-stage">
          <span className="sparkle one" />
          <span className="sparkle two" />
          <span className="sparkle three" />
          <div className={`countdown-circle ${countdown === "START" ? "start" : ""}`}>
            {countdown !== "START" ? (
              <svg viewBox="0 0 128 128" aria-hidden="true">
                <circle className="gauge-track" cx="64" cy="64" r="54" />
                <circle key={countdown} className="gauge-progress" cx="64" cy="64" r="54" />
              </svg>
            ) : null}
            <span>{countdown === "START" ? "START!" : countdown}</span>
          </div>
        </div>
        <p className="countdown-help">카운트다운이 끝나면 게임이 자동으로 시작됩니다!</p>
      </div>
    </div>
  );
}

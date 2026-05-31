import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./RoomPage.css";
import { useAppStore } from "../../app/providers/ClientStateProvider";
import {
  formatRealtimeCloseMessage,
  isRoomSessionUnavailable,
} from "../../features/realtime/roomSocketLifecycle";
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
import teamHappyImg from "../../assets/characters/team-happy.png";
import teamSadImg from "../../assets/characters/team-sad.png";
import whiteImg from "../../assets/characters/white.png";

type TeamMember = {
  id: string;
  name: string;
  role?: string;
  avatar: string;
  avatarAlt: string;
  color: string;
  status: "current" | "done" | "waiting";
};

type MissionFile = {
  id: string;
  name: string;
  content: string;
};

type ProgressStep = {
  id: number;
  title: string;
  description: string;
  state: "done" | "active" | "waiting";
};

type AiMasterStep = "analysis" | "feedback" | "error";
type ResultModalState = "success" | "failure" | null;
type StartCountdownValue = 5 | 4 | 3 | 2 | 1 | "START";

const missionFiles: MissionFile[] = [
  {
    id: "main.py",
    name: "main.py",
    content: `def even_numbers(numbers):
    result = []
    for n in numbers:
        if n % 2 == 0:
            result.append(n)
    return result

# 실행 예시
data = [1, 2, 3, 4, 5, 6]
print(even_numbers(data))`,
  },
  {
    id: "sub.py",
    name: "sub.py",
    content: `def is_even(number):
    return number % 2 == 0


def format_result(numbers):
    return ", ".join(str(number) for number in numbers)`,
  },
];

const teamMembers: TeamMember[] = [
  {
    id: "me",
    name: "나",
    role: "현재",
    avatar: whiteImg,
    avatarAlt: "흰 캐릭터",
    color: "#f8b8b8",
    status: "current",
  },
  {
    id: "hyun",
    name: "현",
    avatar: catImg,
    avatarAlt: "파란 리본 캐릭터",
    color: "#b9d9f3",
    status: "done",
  },
  {
    id: "junghwa",
    name: "정화",
    avatar: rabbitImg,
    avatarAlt: "토끼 캐릭터",
    color: "#f7de9d",
    status: "waiting",
  },
  {
    id: "sungmin",
    name: "성민",
    avatar: mouseImg,
    avatarAlt: "파란 귀 캐릭터",
    color: "#c7e8f7",
    status: "waiting",
  },
  {
    id: "suhyun",
    name: "수현",
    avatar: lionImg,
    avatarAlt: "노란 캐릭터",
    color: "#f8dfb5",
    status: "waiting",
  },
];

const progressSteps: ProgressStep[] = [
  {
    id: 1,
    title: "리스트 합계 계산",
    description: "사용자 입력에서 숫자 리스트를 읽어옵니다.",
    state: "done",
  },
  {
    id: 2,
    title: "짝수만 모아 새 리스트 반환",
    description: "조건문으로 짝수 값을 판별합니다.",
    state: "active",
  },
  {
    id: 3,
    title: "반환 출력",
    description: "완성된 리스트를 화면에 보여줍니다.",
    state: "waiting",
  },
  {
    id: 4,
    title: "기능 확인",
    description: "다양한 입력으로 결과를 검증합니다.",
    state: "waiting",
  },
];

const teamMessages = [
  {
    id: 1,
    name: "성민",
    time: "14:32",
    avatar: mouseImg,
    avatarAlt: "파란 귀 캐릭터",
    color: "#c7e8f7",
    text: "짝수만 따로 모으면 좋아질 것 같지!",
    mine: false,
  },
  {
    id: 2,
    name: "나",
    time: "14:33",
    avatar: whiteImg,
    avatarAlt: "흰 캐릭터",
    color: "#f8b8b8",
    text: "응 좋아. 바로 추가할게",
    mine: true,
  },
  {
    id: 3,
    name: "현",
    time: "14:34",
    avatar: catImg,
    avatarAlt: "파란 리본 캐릭터",
    color: "#b9d9f3",
    text: "그럼 다음은 출력하는 함수 만들면 되겠다",
    mine: false,
  },
  {
    id: 4,
    name: "정화",
    time: "14:34",
    avatar: rabbitImg,
    avatarAlt: "토끼 캐릭터",
    color: "#f7de9d",
    text: "좋게 가보자고!",
    mine: false,
  },
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

const currentUserId = "me";
const currentTurnUserId = "me";
const currentTurnFileId = "sub.py";
const turnTimeLimitSeconds = 30;
const turnStartCodeByFile = Object.fromEntries(
  missionFiles.map((file) => [file.id, file.content]),
);

export function RoomPage() {
  const navigate = useNavigate();
  const { gameRoomId } = useParams();
  useRoomSocketLifecycle(gameRoomId);
  const realtimeStatus = useAppStore((state) => state.realtime.connectionStatus);
  const closeCode = useAppStore((state) => state.realtime.closeCode);
  const closeReasonCode = useAppStore((state) => state.realtime.closeReasonCode);
  const closeMessage = formatRealtimeCloseMessage({ closeCode, closeReasonCode });
  const isRealtimeUnavailable = isRoomSessionUnavailable(realtimeStatus);
  const [selectedFileId, setSelectedFileId] = useState(missionFiles[0].id);
  const [fileContents, setFileContents] =
    useState<Record<string, string>>(turnStartCodeByFile);
  const [aiMasterStep, setAiMasterStep] = useState<AiMasterStep>("analysis");
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(true);
  const [startCountdown, setStartCountdown] =
    useState<StartCountdownValue>(5);
  const [resultModal, setResultModal] = useState<ResultModalState>(null);
  const [isAiJudging, setIsAiJudging] = useState(false);
  const [turnDeadlineAt, setTurnDeadlineAt] = useState(
    () => Date.now() + turnTimeLimitSeconds * 1000,
  );
  const [remainingSeconds, setRemainingSeconds] =
    useState(turnTimeLimitSeconds);
  const judgingTimerRef = useRef<number | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const isMyTurn = currentTurnUserId === currentUserId;
  const isTurnExpired = remainingSeconds <= 0;
  const isTurnActionLocked =
    !isMyTurn ||
    isAiJudging ||
    isTurnExpired ||
    isStartModalOpen ||
    isRealtimeUnavailable;
  const isSuccessResult = resultModal === "success";
  const canFollowCurrentTurn = missionFiles.length > 1;
  const selectedFile =
    missionFiles.find((file) => file.id === selectedFileId) ?? missionFiles[0];
  const selectedCode = fileContents[selectedFile.id] ?? selectedFile.content;
  const timerText = `${String(Math.floor(remainingSeconds / 60)).padStart(
    2,
    "0",
  )} : ${String(remainingSeconds % 60).padStart(2, "0")}`;
  const randomizedTurnOrder = useMemo(
    () => [...teamMembers].sort(() => Math.random() - 0.5),
    [],
  );

  useEffect(() => {
    return () => {
      if (judgingTimerRef.current !== null) {
        window.clearTimeout(judgingTimerRef.current);
      }

      if (startTimerRef.current !== null) {
        window.clearInterval(startTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isStartModalOpen) {
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

      setIsStartModalOpen(false);
      setRemainingSeconds(turnTimeLimitSeconds);
      setTurnDeadlineAt(Date.now() + turnTimeLimitSeconds * 1000);
    }, 1000);

    return () => {
      if (startTimerRef.current !== null) {
        window.clearInterval(startTimerRef.current);
        startTimerRef.current = null;
      }
    };
  }, [isStartModalOpen]);

  useEffect(() => {
    if (isStartModalOpen) {
      setRemainingSeconds(turnTimeLimitSeconds);
      return;
    }

    const updateRemainingTime = () => {
      setRemainingSeconds(
        Math.max(0, Math.ceil((turnDeadlineAt - Date.now()) / 1000)),
      );
    };

    updateRemainingTime();
    const timerId = window.setInterval(updateRemainingTime, 250);

    return () => window.clearInterval(timerId);
  }, [isStartModalOpen, turnDeadlineAt]);

  const handleSubmitTurn = () => {
    if (isTurnActionLocked) {
      return;
    }

    setAiMasterStep("analysis");
    setIsHintOpen(false);
    setIsAiJudging(true);

    if (judgingTimerRef.current !== null) {
      window.clearTimeout(judgingTimerRef.current);
    }

    judgingTimerRef.current = window.setTimeout(() => {
      setIsAiJudging(false);
      setResultModal("success");
      judgingTimerRef.current = null;
    }, 2600);
  };

  return (
    <div className="room-page">
      <header className="room-header">
        <div className="room-logo" aria-label="네코네코 홈">
          네코네코 <span>☘</span>
        </div>

        <div className="room-status">
          <div className="status-pill" aria-label={`남은 시간 ${remainingSeconds}초`}>
            <span>◷</span>
            <span>남은 시간</span>
            <strong>{timerText}</strong>
          </div>
          <div className="status-pill lives" aria-label="팀 목숨 2개 남음">
            <span>팀 목숨</span>
            <span>♥</span>
            <span>♥</span>
            <span className="empty-heart">♡</span>
          </div>
          <div className="status-pill">🐍 Python</div>
        </div>

        <div className="team-strip">
          <strong>Team Chikawa</strong>
          {teamMembers.map((member) => (
            <span className="avatar" key={member.id}>
              <img src={member.avatar} alt={member.avatarAlt} />
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
            <strong>
              {realtimeStatus === "error"
                ? "실시간 연결에 실패했어요."
                : "실시간 연결이 종료됐어요."}
            </strong>
            <span>
              {closeMessage ??
                (realtimeStatus === "error"
                  ? "연결 상태를 확인한 뒤 다시 입장해주세요."
                  : "게임 세션이 닫혔습니다.")}
            </span>
          </div>
          <button type="button" onClick={() => navigate("/main")}>
            메인으로 돌아가기
          </button>
        </section>
      ) : null}

      <main className="room-layout">
        <aside className="left-rail">
          <section className="panel mission-panel">
            <h2>⚑ 미션</h2>
            <p>
              짝수를 모아 리스트를
              <br />
              반환하는 함수를 작성하세요.
            </p>
            <img className="mission-mascot" src={hamImg} alt="미션 안내 캐릭터" />
          </section>

          <section className="panel file-panel">
            <h3>파일</h3>
            <div className="file-list">
              {missionFiles.map((file) => (
                <button
                  className={file.id === selectedFileId ? "active" : ""}
                  key={file.id}
                  type="button"
                  onClick={() => setSelectedFileId(file.id)}
                >
                  ▣ {file.name}
                </button>
              ))}
            </div>
          </section>

          <section className="panel member-panel">
            <div className="panel-header">
              <h3>팀원</h3>
              <button
                type="button"
                disabled={!canFollowCurrentTurn}
                onClick={() => setSelectedFileId(currentTurnFileId)}
              >
                따라가기
              </button>
            </div>
            <div className="member-list">
              {teamMembers.map((member) => (
                <div
                  className={`member-row ${member.status === "current" ? "current" : ""}`}
                  key={member.id}
                >
                  <span className="avatar">
                    <img src={member.avatar} alt={member.avatarAlt} />
                  </span>
                  <strong>
                    {member.name}
                    {member.role ? ` (${member.role})` : ""}
                  </strong>
                  {member.status === "current" ? <em>현재 턴</em> : null}
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="main-column">
          <section className="editor-card panel">
            <div className="editor-tab">{selectedFile.name}</div>
            <textarea
              aria-label={`${selectedFile.name} 코드 편집기`}
              className="code-editor"
              readOnly={isTurnActionLocked}
              spellCheck={false}
              value={selectedCode}
              onChange={(event) => {
                if (isTurnActionLocked) {
                  return;
                }

                setFileContents((currentContents) => ({
                  ...currentContents,
                  [selectedFile.id]: event.target.value,
                }));
              }}
            />
            <div className="editor-actions">
              <button
                className={`submit-button ${isMyTurn && !isAiJudging ? "active" : ""}`}
                type="button"
                disabled={isTurnActionLocked}
                onClick={handleSubmitTurn}
              >
                ▶ {isAiJudging ? "분석 중" : "제출 하기"}
              </button>
              <button
                className="reset-button"
                type="button"
                disabled={isTurnActionLocked}
                onClick={() => setFileContents(turnStartCodeByFile)}
              >
                ↺ 초기화
              </button>
            </div>
          </section>

          <section className="panel progress-panel">
            <h3>미션 진행도</h3>
            <div className="progress-steps">
              {progressSteps.map((step) => (
                <article className={`progress-step ${step.state}`} key={step.id}>
                  <span className="step-number">{step.id}</span>
                  <span className="step-icon">{step.state === "done" ? "✓" : "✣"}</span>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                  <em>
                    {step.state === "done"
                      ? "완료"
                      : step.state === "active"
                        ? "진행 중"
                        : "대기 중"}
                  </em>
                </article>
              ))}
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
                    AI 마스터가 <span>코드를 분석</span>하고 있어요!
                  </strong>
                  <small>잠시만 기다려주세요. 약 5~10초 소요</small>
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
                    {isAiJudging
                      ? "제출한 코드를 분석하고 있어요..."
                      : "코드 구조를 분석하고 있어요..."}
                  </div>
                </div>
              ) : null}

              {aiMasterStep === "feedback" ? (
                <div className="feedback-view">
                  <img className="floating-mascot" src={catIdeaImg} alt="힌트 캐릭터" />
                  <div className="feedback-card">
                    <strong>코드를 분석했어요!</strong>
                    <p>
                      짝수 판별 조건(if n % 2 == 0)이 올바르게 작성되었어요.
                      이제 짝수를 result 리스트에 추가하는 흐름을 이어가보세요.
                    </p>
                  </div>
                  <HintPanel open={isHintOpen}>
                    리스트 컴프리헨션을 사용하면 더 간결하게 작성할 수 있어요!
                  </HintPanel>
                </div>
              ) : null}

              {aiMasterStep === "error" ? (
                <div className="feedback-view">
                  <img className="floating-mascot" src={catNoImg} alt="오류 안내 캐릭터" />
                  <div className="feedback-card error">
                    <strong>ⓘ 코드에 문제가 있어요!</strong>
                    <p>
                      짝수만 필터링해야 하는데, 현재 코드는 모든 숫자를 그대로
                      반환하고 있어요. 미션 조건을 만족하지 못했습니다.
                    </p>
                    <hr />
                    <b>💡 수정 방향</b>
                    <p>if n % 2 == 0 조건을 사용해서 짝수만 result 리스트에 추가해보세요!</p>
                    <HintPanel open={isHintOpen}>
                      append를 호출하기 전에 짝수인지 확인하는 조건문을 먼저 통과시켜보세요.
                    </HintPanel>
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
            <div className="messages">
              {teamMessages.map((message) => (
                <div className={`message ${message.mine ? "mine" : ""}`} key={message.id}>
                  {!message.mine ? (
                    <span className="avatar">
                      <img src={message.avatar} alt={message.avatarAlt} />
                    </span>
                  ) : null}
                  <div>
                    <span>
                      <strong>{message.name}</strong> {message.time}
                    </span>
                    <p>{message.text}</p>
                  </div>
                  {message.mine ? (
                    <span className="avatar">
                      <img src={message.avatar} alt={message.avatarAlt} />
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <label className="chat-input">
              <input placeholder="메시지를 입력하세요..." />
              <button type="button" aria-label="메시지 전송">
                ➤
              </button>
            </label>
          </section>
        </aside>
      </main>

      {resultModal ? (
        <ResultModal
          result={resultModal}
          success={isSuccessResult}
          onClose={() => setResultModal(null)}
        />
      ) : null}

      {isStartModalOpen ? (
        <GameStartModal
          countdown={startCountdown}
          missionTitle="짝수만 모아 반환하는 리스트 함수를 작성하세요"
          order={randomizedTurnOrder}
        />
      ) : null}
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

function ResultModal({
  onClose,
  result,
  success,
}: {
  onClose: () => void;
  result: Exclude<ResultModalState, null>;
  success: boolean;
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className={`result-modal ${result}`}>
        <strong>{success ? "축하드립니다!" : "아쉽지만..."}</strong>
        <h2>{success ? "성공하셨습니다!" : "실패하셨습니다!"}</h2>
        <img
          src={success ? teamHappyImg : teamSadImg}
          alt={success ? "성공한 팀 캐릭터" : "실패한 팀 캐릭터"}
        />
        <p>{success ? "모든 코드를 잘 작성했어요!" : "팀 목숨을 모두 사용했어요."}</p>
        {success ? (
          <div className="execution-result">
            <b>실행 결과</b>
            <code>[2, 4, 6]</code>
          </div>
        ) : null}
        <button type="button" onClick={onClose}>
          게임 종료
        </button>
      </div>
    </div>
  );
}

function GameStartModal({
  countdown,
  missionTitle,
  order,
}: {
  countdown: StartCountdownValue;
  missionTitle: string;
  order: TeamMember[];
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
            {order.map((member, index) => (
              <div key={member.id}>
                <span className="avatar">
                  <img src={member.avatar} alt={member.avatarAlt} />
                </span>
                <b>{index + 1}</b>
                <small>
                  {member.name}
                  {member.role ? ` (${member.role})` : ""}
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

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAppStore, useAppStoreApi } from "../../app/providers/ClientStateProvider";
import { gameRoomApi } from "../../features/game-room/gameRoomApi";
import { invitationApi } from "../../features/invitation/invitationApi";
import { SignupMascotIllustration } from "../../shared/components/SignupMascotIllustration";
import type { CurrentGameRoom, GameRoomParticipant, GameRoomStatus } from "../../shared/types/domain";
import {
  deriveMainPageInitializationView,
  loadCurrentRoomState,
  loadInvitations,
} from "./mainInitialization";

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m19.1 13.35.9-1.35-.9-1.35-1.8-.36a5.65 5.65 0 0 0-.63-1.51l1.04-1.5-.64-1.1-1.82.28a5.93 5.93 0 0 0-1.33-.88L12.9 3h-1.8l-.99 1.58c-.47.19-.92.47-1.33.82l-1.82-.22-.64 1.1 1.04 1.5c-.28.47-.5.98-.64 1.53L4.9 10.65 4 12l.9 1.35 1.82.36c.14.55.36 1.06.64 1.53l-1.04 1.5.64 1.1 1.82-.22c.41.35.86.63 1.33.82L11.1 21h1.8l.99-1.58c.47-.19.92-.47 1.33-.82l1.82.22.64-1.1-1.04-1.5c.28-.47.49-.98.63-1.53l1.82-.36Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="m5.25 7.5 4.75 5 4.75-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.5 3.5 10 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m20.5 3.5-6.4 17-3.15-6.85L4.1 10.5l16.4-7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserAvatar({ label }: { label: string }) {
  const initial = label.trim().charAt(0) || "?";

  return <span className="main-user-chip__avatar">{initial}</span>;
}

function AiAvatar() {
  return (
    <span className="main-message__avatar main-message__avatar--ai" aria-hidden="true">
      AI
    </span>
  );
}

function formatChatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getRoomStatusLabel(status: GameRoomStatus) {
  switch (status) {
    case "WAITING":
      return "대기중";
    case "IN_PROGRESS":
      return "진행중";
    case "JUDGING":
      return "판정중";
    case "ANALYZED":
      return "분석중";
    case "FINISHED":
      return "완료";
    default:
      return status;
  }
}

function MainGuideSidebar() {
  return (
    <aside className="main-guide">
      <button type="button" className="main-guide__menu-button" disabled aria-label="Menu">
        ≡
      </button>

      <div className="main-guide__content">
        <h2>AI와 함께 코딩 릴레이!</h2>

        <ol className="main-guide__steps">
          <li>
            <strong>1. 게임룸 생성</strong>
            <p>채팅창에 명령 한 마디로 방을 만드세요.</p>
          </li>
          <li>
            <strong>2. 친구 초대</strong>
            <p>AI에게 말해서 친구들을 불러보세요.</p>
          </li>
          <li>
            <strong>3. 코드 바통 터치</strong>
            <p>미션을 해결하고 다음 주자에게 넘기세요!</p>
          </li>
        </ol>
      </div>

      <div className="main-guide__mascots" aria-hidden="true">
        <SignupMascotIllustration />
      </div>
    </aside>
  );
}

function MainLoadingState() {
  return (
    <div className="main-chat-shell">
      <div className="main-chat-shell__body">
        <div className="main-message main-message--assistant main-message--skeleton">
          <div className="main-message__meta">
            <AiAvatar />
            <span className="main-message__sender">AI 마스터</span>
          </div>
          <div className="main-message__bubble">
            <div className="main-skeleton main-skeleton--line main-skeleton--wide" />
            <div className="main-skeleton main-skeleton--line" />
            <div className="main-skeleton main-skeleton--line main-skeleton--short" />
          </div>
        </div>

        <div className="main-message main-message--assistant main-message--skeleton">
          <div className="main-message__meta">
            <AiAvatar />
            <span className="main-message__sender">AI 마스터</span>
          </div>
          <div className="main-message__bubble">
            <div className="main-skeleton main-skeleton--line" />
            <div className="main-skeleton main-skeleton--line main-skeleton--medium" />
          </div>
        </div>
      </div>

      <div className="main-chat-shell__composer main-chat-shell__composer--disabled">
        <input value="" placeholder="초기화 중입니다..." readOnly aria-label="메시지 입력" />
        <button type="button" disabled aria-label="메시지 전송">
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

function MainErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="main-chat-shell">
      <div className="main-chat-shell__body">
        <div className="main-message main-message--assistant">
          <div className="main-message__meta">
            <AiAvatar />
            <span className="main-message__sender">AI 마스터</span>
          </div>
          <div className="main-message__bubble main-message__bubble--error">
            <p className="main-chat-shell__status-title">초기화에 실패했어요.</p>
            <p className="main-chat-shell__status-copy">{message}</p>
            <button type="button" className="main-chat-shell__retry" onClick={onRetry}>
              다시 시도
            </button>
          </div>
        </div>
      </div>

      <div className="main-chat-shell__composer main-chat-shell__composer--disabled">
        <input value="" placeholder="초기화가 완료되면 채팅을 사용할 수 있어요." readOnly aria-label="메시지 입력" />
        <button type="button" disabled aria-label="메시지 전송">
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

function MainPartialErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <AssistantMessage>
      <p className="main-chat-shell__warning">{title}</p>
      <p>{message}</p>
      <button type="button" className="main-chat-shell__retry" onClick={onRetry}>
        다시 시도
      </button>
    </AssistantMessage>
  );
}

function AssistantMessage({
  children,
  timestamp,
}: {
  children: ReactNode;
  timestamp?: string;
}) {
  return (
    <div className="main-message main-message--assistant">
      <div className="main-message__meta">
        <AiAvatar />
        <span className="main-message__sender">AI 마스터</span>
      </div>
      <div className="main-message__bubble">
        {children}
        {timestamp ? <span className="main-message__time">{formatChatTime(timestamp)}</span> : null}
      </div>
    </div>
  );
}

function CurrentRoomSummary({ room }: { room: CurrentGameRoom }) {
  return (
    <div className="main-room-card">
      <div className="main-room-card__header">
        <strong>{room.title}</strong>
        <span className="main-room-card__status">{getRoomStatusLabel(room.status)}</span>
      </div>
      <dl className="main-room-card__details">
        <div>
          <dt>내 역할</dt>
          <dd>{room.myRole === "OWNER" ? "방장" : "참가자"}</dd>
        </div>
        <div>
          <dt>참여 인원</dt>
          <dd>
            {room.joinedParticipantCount}/{room.maxParticipants}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function InvitationCard({ invitation }: { invitation: GameRoomParticipant }) {
  return (
    <article className="main-invitation-card">
      <header className="main-invitation-card__header">
        <strong>{invitation.gameRoomTitle}</strong>
        <span>{getRoomStatusLabel(invitation.roomStatus)}</span>
      </header>
      <p>
        {invitation.nickname}님이 초대했어요. 현재 상태는{" "}
        <strong>{invitation.status === "INVITED" ? "초대됨" : invitation.status}</strong> 입니다.
      </p>
    </article>
  );
}

function MainReadyState({
  nickname,
  currentRoom,
  duplicateRoomWarning,
  invitations,
  currentRoomErrorMessage,
  invitationErrorMessage,
  onRetryCurrentRoom,
  onRetryInvitations,
}: {
  nickname: string;
  currentRoom: CurrentGameRoom | null;
  duplicateRoomWarning: boolean;
  invitations: GameRoomParticipant[];
  currentRoomErrorMessage: string | null;
  invitationErrorMessage: string | null;
  onRetryCurrentRoom: () => void;
  onRetryInvitations: () => void;
}) {
  const hasCurrentRoom = Boolean(currentRoom);
  const hasInvitations = invitations.length > 0;
  const showEmptyState = !hasCurrentRoom && !hasInvitations;

  return (
    <div className="main-chat-shell">
      <div className="main-chat-shell__body">
        <AssistantMessage timestamp={currentRoom?.updatedAt ?? invitations[0]?.createdAt}>
          <p>안녕하세요! AI 마스터입니다. 😊</p>
          <p>{nickname}님, 네코내코에 오신 것을 환영해요!</p>
          {showEmptyState ? (
            <>
              <p>현재 참여하고있는 방이 없어요.</p>
              <p>방을 만들고 친구를 초대해보세요!</p>
            </>
          ) : (
            <p>현재 서버 상태를 바탕으로 방 정보와 초대장을 불러왔어요.</p>
          )}
        </AssistantMessage>

        {duplicateRoomWarning ? (
          <AssistantMessage timestamp={currentRoom?.updatedAt}>
            <p className="main-chat-shell__warning">
              여러 개의 현재 방이 감지되어 가장 최근 방을 우선 표시하고 있어요.
            </p>
          </AssistantMessage>
        ) : null}

        {currentRoom ? (
          <AssistantMessage timestamp={currentRoom.updatedAt}>
            <p>현재 참여 중인 방을 찾았어요.</p>
            <CurrentRoomSummary room={currentRoom} />
          </AssistantMessage>
        ) : null}

        {currentRoomErrorMessage ? (
          <MainPartialErrorState
            title="현재 방 정보를 다시 불러오지 못했어요."
            message={currentRoomErrorMessage}
            onRetry={onRetryCurrentRoom}
          />
        ) : null}

        {hasInvitations ? (
          <AssistantMessage timestamp={invitations[0].createdAt}>
            <p>도착한 초대장을 확인해보세요.</p>
            <div className="main-invitation-list">
              {invitations.map((invitation) => (
                <InvitationCard key={invitation.participantId} invitation={invitation} />
              ))}
            </div>
          </AssistantMessage>
        ) : null}

        {invitationErrorMessage ? (
          <MainPartialErrorState
            title="초대장 목록을 다시 불러오지 못했어요."
            message={invitationErrorMessage}
            onRetry={onRetryInvitations}
          />
        ) : null}

        {showEmptyState ? (
          <AssistantMessage>
            <p>메시지 입력창을 통해 게임 방 생성 요청을 보낼 수 있어요.</p>
            <p>실제 AI 채팅 연결은 다음 단계에서 이어집니다.</p>
          </AssistantMessage>
        ) : null}
      </div>

      <div className="main-chat-shell__composer main-chat-shell__composer--disabled">
        <input
          value=""
          placeholder="메시지를 입력하세요... (예: 친구 초대 방법 알려줘)"
          readOnly
          aria-label="메시지 입력"
        />
        <button type="button" disabled aria-label="메시지 전송">
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

export function MainPage() {
  const store = useAppStoreApi();
  const user = useAppStore((state) => state.auth.user);

  const currentRoomQuery = useQuery({
    queryKey: ["main-page-current-room", user?.userId],
    enabled: Boolean(user?.userId),
    queryFn: () =>
      loadCurrentRoomState({
        userId: user?.userId ?? "",
        getCurrentRooms: gameRoomApi.getCurrentRooms,
        onDuplicateRoomsDetected(rooms) {
          console.warn(
            "[MainPage] Multiple current rooms detected. Using the most recently updated room.",
            rooms.map((room) => room.gameRoomId),
          );
        },
      }),
  });

  const invitationQuery = useQuery({
    queryKey: ["main-page-invitations", user?.userId],
    enabled: Boolean(user?.userId),
    queryFn: () =>
      loadInvitations({
        userId: user?.userId ?? "",
        getInvitedParticipants: invitationApi.getInvitedParticipants,
      }),
  });

  useEffect(() => {
    if (currentRoomQuery.data === undefined) {
      return;
    }

    store.setState((state) => ({
      ...state,
      room: {
        ...state.room,
        currentRoom: currentRoomQuery.data.currentRoom,
        duplicateRoomWarning: currentRoomQuery.data.duplicateRoomWarning,
      },
    }));
  }, [currentRoomQuery.data, store]);

  useEffect(() => {
    if (invitationQuery.data === undefined) {
      return;
    }

    store.setState((state) => ({
      ...state,
      room: {
        ...state.room,
        invitations: invitationQuery.data,
      },
    }));
  }, [invitationQuery.data, store]);

  const mainPageView = deriveMainPageInitializationView({
    currentRoomQuery: {
      data: currentRoomQuery.data,
      error: currentRoomQuery.error,
      isPending: currentRoomQuery.isPending,
    },
    invitationQuery: {
      data: invitationQuery.data,
      error: invitationQuery.error,
      isPending: invitationQuery.isPending,
    },
  });

  return (
    <main className="main-screen">
      <div className="main-screen__frame">
        <header className="main-screen__topbar">
          <span className="signup-screen__logo">
            네코네코<span className="signup-screen__logo-paw">✿</span>
          </span>

          <div className="main-screen__topbar-actions">
            <button type="button" className="main-screen__icon-button" disabled aria-label="Settings">
              <SettingsIcon />
            </button>

            <button type="button" className="main-user-chip" disabled aria-label="User menu">
              <UserAvatar label={user?.nickname ?? "사용자"} />
              <span className="main-user-chip__name">{user?.nickname ?? "사용자"}</span>
              <ChevronDownIcon />
            </button>
          </div>
        </header>

        <div className="main-screen__workspace">
          <MainGuideSidebar />

          {mainPageView.status === "loading" ? <MainLoadingState /> : null}
          {mainPageView.status === "error" ? (
            <MainErrorState
              message={mainPageView.blockingErrorMessage ?? "초기화에 실패했어요."}
              onRetry={() => {
                void currentRoomQuery.refetch();
                void invitationQuery.refetch();
              }}
            />
          ) : null}
          {mainPageView.status === "ready" ? (
            <MainReadyState
              nickname={user?.nickname ?? "플레이어"}
              currentRoom={mainPageView.currentRoomState.currentRoom}
              duplicateRoomWarning={mainPageView.currentRoomState.duplicateRoomWarning}
              invitations={mainPageView.invitations}
              currentRoomErrorMessage={mainPageView.currentRoomErrorMessage}
              invitationErrorMessage={mainPageView.invitationErrorMessage}
              onRetryCurrentRoom={() => {
                void currentRoomQuery.refetch();
              }}
              onRetryInvitations={() => {
                void invitationQuery.refetch();
              }}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useAppStore, useAppStoreApi } from "../../app/providers/ClientStateProvider";
import { aiChatApi } from "../../features/ai-chat/aiChatApi";
import { syncSentAiChatResponse } from "../../features/ai-chat/aiChatMessage";
import {
  buildRoomCreateDifficultyMessage,
  buildRoomCreateTemplateConfirmationMessage,
  extractLatestRoomCreateDifficultyForRequest,
  extractRoomCreateTemplateOptions,
  shouldShowRoomCreateDifficultySelection,
  type RoomCreateDifficulty,
  type RoomCreateTemplateOption,
} from "../../features/ai-chat/roomCreateFlow";
import { gameRoomApi } from "../../features/game-room/gameRoomApi";
import {
  buildInvitationAcceptMessage,
  buildInvitationDenyMessage,
  isRetryableInvitationActionError,
  resolveCompletedInvitationIds,
  type InvitationActionType,
} from "../../features/invitation/invitationFlow";
import { invitationApi } from "../../features/invitation/invitationApi";
import { SignupMascotIllustration } from "../../shared/components/SignupMascotIllustration";
import type { AiChatMessage, CurrentGameRoom, GameRoomParticipant, GameRoomStatus } from "../../shared/types/domain";
import { getUserFacingErrorMessage } from "../../shared/utils/appError";
import {
  deriveMainPageAiChatView,
  loadAiChatMessages,
  loadAiChatSessions,
  syncAiChatMessages,
  syncAiChatSessionSelection,
} from "./aiChatInitialization";
import {
  deriveMainPageInitializationView,
  loadCurrentRoomState,
  loadInvitations,
} from "./mainInitialization";
import {
  createMainPageMockApi,
  getMainPageMockScenario,
  MAIN_PAGE_MOCK_USER,
} from "./mockMode";

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

function UserMessageAvatar({ nickname }: { nickname: string }) {
  const initial = nickname.trim().charAt(0) || "?";

  return (
    <span className="main-message__avatar main-message__avatar--user" aria-hidden="true">
      {initial}
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

function getDifficultyLabel(difficulty: string | null) {
  switch (difficulty) {
    case "EASY":
      return "쉬움";
    case "NORMAL":
      return "보통";
    case "HARD":
      return "어려움";
    default:
      return difficulty ?? "미정";
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

function MainMockModeNotice({
  scenario,
  onReset,
}: {
  scenario: string;
  onReset: () => void;
}) {
  const scenarioLabel =
    scenario === "room-create-delay" ||
    scenario === "invitation" ||
    scenario === "invitation-delay"
      ? scenario
      : "room-create";
  const description =
    scenario === "invitation" || scenario === "invitation-delay"
      ? "백엔드 없이 `/main` 초대 수락/거절 흐름을 확인하는 목데이터 모드예요."
      : "백엔드 없이 `/main` ROOM_CREATE 흐름을 확인하는 목데이터 모드예요.";

  return (
    <AssistantMessage>
      <p className="main-chat-shell__waiting-badge">Mock Mode</p>
      <p>{description}</p>
      <p>
        현재 시나리오: <strong>{scenarioLabel}</strong>
      </p>
      <button type="button" className="main-chat-shell__retry" onClick={onReset}>
        목 시나리오 처음부터 다시 보기
      </button>
    </AssistantMessage>
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

      <MainChatComposer
        value=""
        placeholder="초기화 중입니다..."
        disabled
        isPending={false}
      />
    </div>
  );
}

function MainChatLoadingBubbles() {
  return (
    <>
      <div className="main-message main-message--assistant main-message--skeleton">
        <div className="main-message__meta">
          <AiAvatar />
          <span className="main-message__sender">AI 마스터</span>
        </div>
        <div className="main-message__bubble">
          <div className="main-skeleton main-skeleton--line main-skeleton--wide" />
          <div className="main-skeleton main-skeleton--line" />
        </div>
      </div>

      <div className="main-message main-message--assistant main-message--skeleton">
        <div className="main-message__meta">
          <AiAvatar />
          <span className="main-message__sender">AI 마스터</span>
        </div>
        <div className="main-message__bubble">
          <div className="main-skeleton main-skeleton--line main-skeleton--medium" />
          <div className="main-skeleton main-skeleton--line main-skeleton--short" />
        </div>
      </div>
    </>
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

      <MainChatComposer
        value=""
        placeholder="초기화가 완료되면 채팅을 사용할 수 있어요."
        disabled
        isPending={false}
      />
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

function MainChatComposer({
  value,
  placeholder,
  disabled,
  isPending,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  disabled: boolean;
  isPending: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className={`main-chat-shell__composer${disabled ? " main-chat-shell__composer--disabled" : ""}`}
      onSubmit={onSubmit}
    >
      <input
        value={value}
        placeholder={placeholder}
        readOnly={!onChange}
        disabled={disabled}
        onChange={onChange}
        aria-label="메시지 입력"
      />
      <button type="submit" disabled={disabled} aria-label="메시지 전송">
        {isPending ? <span className="main-chat-shell__composer-spinner" aria-hidden="true" /> : <SendIcon />}
      </button>
    </form>
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

function ChatHistoryMessage({
  message,
  nickname,
}: {
  message: AiChatMessage;
  nickname: string;
}) {
  const isUserMessage = message.senderType === "USER";

  return (
    <div className={`main-message ${isUserMessage ? "main-message--user" : "main-message--assistant"}`}>
      <div className="main-message__meta">
        {isUserMessage ? <UserMessageAvatar nickname={nickname} /> : <AiAvatar />}
        <span className="main-message__sender">
          {isUserMessage ? nickname : message.senderType === "SYSTEM" ? "시스템" : "AI 마스터"}
        </span>
      </div>
      <div
        className={`main-message__bubble${
          isUserMessage ? " main-message__bubble--user" : ""
        }`}
      >
        <p>{message.content}</p>
        <span className="main-message__time">{formatChatTime(message.createdAt)}</span>
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

type InvitationActionViewState = {
  action: InvitationActionType;
  errorMessage: string | null;
  retryable: boolean;
} | null;

function InvitationCard({
  invitation,
  actionState,
  disabled,
  onAccept,
  onDeny,
  onRetry,
}: {
  invitation: GameRoomParticipant;
  actionState: InvitationActionViewState;
  disabled: boolean;
  onAccept: () => void;
  onDeny: () => void;
  onRetry: () => void;
}) {
  const isTerminalError = Boolean(actionState?.errorMessage) && !actionState?.retryable;
  const isPending = disabled && actionState?.errorMessage === null;
  const isActionDisabled = disabled || isTerminalError;

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

      <div className="main-invitation-card__actions">
        <button
          type="button"
          className="main-invitation-card__button main-invitation-card__button--accept"
          disabled={isActionDisabled}
          onClick={onAccept}
        >
          {isPending && actionState?.action === "accept" ? "수락 처리 중..." : "초대 수락"}
        </button>
        <button
          type="button"
          className="main-invitation-card__button main-invitation-card__button--deny"
          disabled={isActionDisabled}
          onClick={onDeny}
        >
          {isPending && actionState?.action === "deny" ? "거절 처리 중..." : "거절"}
        </button>
      </div>

      {actionState?.errorMessage ? (
        <div className="main-invitation-card__error" role="status">
          <p>{actionState.errorMessage}</p>
          {actionState.retryable ? (
            <button
              type="button"
              className="main-invitation-card__retry"
              onClick={onRetry}
            >
              다시 시도
            </button>
          ) : (
            <p>이 초대장은 새로고침 후 최신 상태를 다시 확인해주세요.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function RoomCreateDifficultySelector({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (difficulty: RoomCreateDifficulty) => void;
}) {
  const options: Array<{ value: RoomCreateDifficulty; title: string; description: string }> = [
    {
      value: "EASY",
      title: "쉬움",
      description: "입문용 템플릿을 먼저 받아볼 수 있어요.",
    },
    {
      value: "NORMAL",
      title: "보통",
      description: "균형 잡힌 난이도의 방 후보를 받아볼 수 있어요.",
    },
    {
      value: "HARD",
      title: "어려움",
      description: "조금 더 도전적인 템플릿 중심으로 진행돼요.",
    },
  ];

  return (
    <AssistantMessage>
      <p>방 생성에 사용할 난이도를 골라주세요.</p>
      <div className="main-selection-grid">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="main-selection-card"
            disabled={disabled}
            onClick={() => {
              onSelect(option.value);
            }}
          >
            <strong>{option.title}</strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>
    </AssistantMessage>
  );
}

function RoomCreateTemplateSelector({
  templates,
  selectedDifficulty,
  disabled,
  onSelect,
}: {
  templates: RoomCreateTemplateOption[];
  selectedDifficulty: string | null;
  disabled: boolean;
  onSelect: (template: RoomCreateTemplateOption) => void;
}) {
  return (
    <AssistantMessage>
      <p>
        {selectedDifficulty
          ? `${getDifficultyLabel(selectedDifficulty)} 난이도에서 선택할 수 있는 템플릿이에요.`
          : "선택할 수 있는 템플릿 목록이에요."}
      </p>
      <div className="main-selection-grid">
        {templates.map((template) => (
          <button
            key={template.templateId}
            type="button"
            className="main-selection-card"
            disabled={disabled}
            onClick={() => {
              onSelect(template);
            }}
          >
            <div className="main-selection-card__header">
              <strong>{template.title}</strong>
              <span>{getDifficultyLabel(template.difficulty)}</span>
            </div>
            <p>{template.description}</p>
          </button>
        ))}
      </div>
    </AssistantMessage>
  );
}

function WaitingRoomModeNotice({ room }: { room: CurrentGameRoom }) {
  return (
    <AssistantMessage timestamp={room.updatedAt}>
      <p className="main-chat-shell__waiting-badge">대기방 모드</p>
      <p>현재 `/main`에서 게임 시작 전 대기 상태를 유지하고 있어요.</p>
      <p>방 정보는 아래에 계속 표시되고, 다음 단계에서도 페이지 이동 없이 이어집니다.</p>
    </AssistantMessage>
  );
}

function WaitingRoomTransitionNotice({
  source,
  errorMessage,
  onRetry,
}: {
  source: "room-create" | "room-join";
  errorMessage: string | null;
  onRetry: () => void;
}) {
  const successMessage =
    source === "room-join"
      ? "초대를 수락했어요. 대기방 정보를 불러오는 중이에요."
      : "방 생성을 완료했어요. 대기방 정보를 불러오는 중이에요.";
  const errorTitle =
    source === "room-join"
      ? "초대 수락은 완료됐지만 대기방 정보를 아직 다시 불러오지 못했어요."
      : "방 생성은 완료됐지만 대기방 정보를 아직 다시 불러오지 못했어요.";

  return (
    <AssistantMessage>
      <p className="main-chat-shell__waiting-badge">대기방 모드</p>
      <p>{errorMessage ? errorTitle : successMessage}</p>
      <p>
        {errorMessage
          ? errorMessage
          : "페이지 이동 없이 `/main`에서 바로 대기방 상태로 이어집니다."}
      </p>
      <button type="button" className="main-chat-shell__retry" onClick={onRetry}>
        다시 확인
      </button>
    </AssistantMessage>
  );
}

function MainReadyState({
  nickname,
  currentRoom,
  duplicateRoomWarning,
  invitations,
  aiMessages,
  mockScenario,
  shouldShowRoomCreateDifficultyUi,
  shouldShowRoomCreateTemplateUi,
  roomCreateTemplates,
  latestRoomCreateDifficulty,
  waitingRoomTransition,
  invitationActionState,
  hasActiveAiChatSession,
  isAiChatLoading,
  isAiChatSendPending,
  sendErrorMessage,
  composerValue,
  composerDisabled,
  composerPlaceholder,
  aiChatSessionErrorMessage,
  aiChatMessageErrorMessage,
  currentRoomErrorMessage,
  invitationErrorMessage,
  shouldShowEmptyPrompt,
  onComposerChange,
  onComposerSubmit,
  onSelectRoomCreateDifficulty,
  onSelectRoomCreateTemplate,
  onAcceptInvitation,
  onDenyInvitation,
  onRetryInvitationAction,
  onResetMockScenario,
  onRetryWaitingRoomTransition,
  onRetrySendMessage,
  onRetryAiChatSessions,
  onRetryAiChatMessages,
  onRetryCurrentRoom,
  onRetryInvitations,
}: {
  nickname: string;
  currentRoom: CurrentGameRoom | null;
  duplicateRoomWarning: boolean;
  invitations: GameRoomParticipant[];
  aiMessages: AiChatMessage[];
  mockScenario: string | null;
  shouldShowRoomCreateDifficultyUi: boolean;
  shouldShowRoomCreateTemplateUi: boolean;
  roomCreateTemplates: RoomCreateTemplateOption[];
  latestRoomCreateDifficulty: string | null;
  waitingRoomTransition: WaitingRoomTransitionState | null;
  invitationActionState: {
    participantId: string;
    action: InvitationActionType;
    errorMessage: string | null;
    retryable: boolean;
  } | null;
  hasActiveAiChatSession: boolean;
  isAiChatLoading: boolean;
  isAiChatSendPending: boolean;
  sendErrorMessage: string | null;
  composerValue: string;
  composerDisabled: boolean;
  composerPlaceholder: string;
  aiChatSessionErrorMessage: string | null;
  aiChatMessageErrorMessage: string | null;
  currentRoomErrorMessage: string | null;
  invitationErrorMessage: string | null;
  shouldShowEmptyPrompt: boolean;
  onComposerChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onComposerSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectRoomCreateDifficulty: (difficulty: RoomCreateDifficulty) => void;
  onSelectRoomCreateTemplate: (template: RoomCreateTemplateOption) => void;
  onAcceptInvitation: (invitation: GameRoomParticipant) => void;
  onDenyInvitation: (invitation: GameRoomParticipant) => void;
  onRetryInvitationAction: () => void;
  onResetMockScenario: () => void;
  onRetryWaitingRoomTransition: () => void;
  onRetrySendMessage: () => void;
  onRetryAiChatSessions: () => void;
  onRetryAiChatMessages: () => void;
  onRetryCurrentRoom: () => void;
  onRetryInvitations: () => void;
}) {
  const hasCurrentRoom = Boolean(currentRoom);
  const hasInvitations = invitations.length > 0;

  return (
    <div className="main-chat-shell">
      <div className="main-chat-shell__body">
        {mockScenario ? (
          <MainMockModeNotice scenario={mockScenario} onReset={onResetMockScenario} />
        ) : null}

        {isAiChatLoading ? <MainChatLoadingBubbles /> : null}

        {aiMessages.length > 0
          ? aiMessages.map((message) => (
              <ChatHistoryMessage
                key={message.messageId}
                message={message}
                nickname={nickname}
              />
            ))
          : null}

        {isAiChatSendPending ? (
          <AssistantMessage>
            <p>AI 마스터가 답변을 준비하고 있어요.</p>
          </AssistantMessage>
        ) : null}

        {shouldShowEmptyPrompt ? (
          <AssistantMessage>
            <p>안녕하세요! AI 마스터입니다. 😊</p>
            <p>{nickname}님, 네코내코에 오신 것을 환영해요!</p>
            <p>현재 참여하고있는 방이 없어요.</p>
            <p>방을 만들고 친구를 초대해보세요!</p>
          </AssistantMessage>
        ) : null}

        {hasCurrentRoom || hasInvitations ? (
          <AssistantMessage timestamp={currentRoom?.updatedAt ?? invitations[0]?.createdAt}>
            <p>현재 서버 상태를 바탕으로 방 정보와 초대장을 불러왔어요.</p>
          </AssistantMessage>
        ) : null}

        {duplicateRoomWarning ? (
          <AssistantMessage timestamp={currentRoom?.updatedAt}>
            <p className="main-chat-shell__warning">
              여러 개의 현재 방이 감지되어 가장 최근 방을 우선 표시하고 있어요.
            </p>
          </AssistantMessage>
        ) : null}

        {currentRoom?.status === "WAITING" ? <WaitingRoomModeNotice room={currentRoom} /> : null}

        {!currentRoom && waitingRoomTransition ? (
          <WaitingRoomTransitionNotice
            source={waitingRoomTransition.source}
            errorMessage={waitingRoomTransition.errorMessage}
            onRetry={onRetryWaitingRoomTransition}
          />
        ) : null}

        {currentRoom ? (
          <AssistantMessage timestamp={currentRoom.updatedAt}>
            <p>현재 참여 중인 방을 찾았어요.</p>
            <CurrentRoomSummary room={currentRoom} />
          </AssistantMessage>
        ) : null}

        {!hasCurrentRoom && shouldShowRoomCreateDifficultyUi ? (
          <RoomCreateDifficultySelector
            disabled={isAiChatSendPending}
            onSelect={onSelectRoomCreateDifficulty}
          />
        ) : null}

        {!hasCurrentRoom && shouldShowRoomCreateTemplateUi ? (
          <RoomCreateTemplateSelector
            templates={roomCreateTemplates}
            selectedDifficulty={latestRoomCreateDifficulty}
            disabled={isAiChatSendPending}
            onSelect={onSelectRoomCreateTemplate}
          />
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
                <InvitationCard
                  key={invitation.participantId}
                  invitation={invitation}
                  actionState={
                    invitationActionState?.participantId === invitation.participantId
                      ? invitationActionState
                      : null
                  }
                  disabled={isAiChatSendPending}
                  onAccept={() => {
                    onAcceptInvitation(invitation);
                  }}
                  onDeny={() => {
                    onDenyInvitation(invitation);
                  }}
                  onRetry={onRetryInvitationAction}
                />
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

        {aiChatSessionErrorMessage ? (
          <MainPartialErrorState
            title="AI 채팅 세션 목록을 다시 불러오지 못했어요."
            message={aiChatSessionErrorMessage}
            onRetry={onRetryAiChatSessions}
          />
        ) : null}

        {aiChatMessageErrorMessage ? (
          <MainPartialErrorState
            title="AI 채팅 메시지를 다시 불러오지 못했어요."
            message={aiChatMessageErrorMessage}
            onRetry={onRetryAiChatMessages}
          />
        ) : null}

        {sendErrorMessage ? (
          <MainPartialErrorState
            title="메시지를 보내지 못했어요."
            message={sendErrorMessage}
            onRetry={onRetrySendMessage}
          />
        ) : null}

        {shouldShowEmptyPrompt ? (
          <AssistantMessage>
            <p>
              {hasActiveAiChatSession
                ? "메시지 입력창을 통해 게임 방 생성 요청을 보낼 수 있어요."
                : "활성 채팅 세션이 아직 준비되지 않아 입력창을 잠시 비활성화했어요."}
            </p>
            <p>
              {hasActiveAiChatSession
                ? "예를 들어 '방 만들어줘'처럼 자연스럽게 요청해보세요."
                : "채팅 세션을 다시 불러오면 AI 룸 생성 흐름을 이어갈 수 있어요."}
            </p>
          </AssistantMessage>
        ) : null}

        {shouldShowEmptyPrompt && !hasActiveAiChatSession && !aiChatSessionErrorMessage ? (
          <MainPartialErrorState
            title="활성 AI 채팅 세션을 찾지 못했어요."
            message="채팅 세션을 다시 불러온 뒤 다시 시도해주세요."
            onRetry={onRetryAiChatSessions}
          />
        ) : null}
      </div>

      <MainChatComposer
        value={composerValue}
        placeholder={composerPlaceholder}
        disabled={composerDisabled}
        isPending={isAiChatSendPending}
        onChange={onComposerChange}
        onSubmit={onComposerSubmit}
      />
    </div>
  );
}

function MainScrollDebugState({ nickname }: { nickname: string }) {
  const messages = Array.from({ length: 18 }, (_, index) => ({
    id: `debug-message-${index + 1}`,
    timestamp: `2026-05-25T12:${String((index * 3) % 60).padStart(2, "0")}:00`,
    content:
      index % 2 === 0
        ? "스크롤 동작 확인용 더미 메시지입니다. 채팅이 길어져도 바깥 페이지가 아니라 이 채팅 영역 안에서만 스크롤되어야 합니다."
        : "입력창은 아래에 계속 붙어 있고, 헤더와 사이드바도 제자리를 유지하는지 같이 확인해보세요.",
  }));

  return (
    <div className="main-chat-shell">
      <div className="main-chat-shell__body">
        <AssistantMessage timestamp="2026-05-25T12:00:00">
          <p>안녕하세요! AI 마스터입니다. 😊</p>
          <p>{nickname}님, 지금은 채팅 스크롤 확인용 디버그 모드예요.</p>
        </AssistantMessage>

        {messages.map((message, index) => (
          <AssistantMessage key={message.id} timestamp={message.timestamp}>
            <p>
              <strong>테스트 메시지 {index + 1}</strong>
            </p>
            <p>{message.content}</p>
          </AssistantMessage>
        ))}
      </div>

      <MainChatComposer
        value=""
        placeholder="스크롤 테스트용 입력창입니다."
        disabled
        isPending={false}
      />
    </div>
  );
}

type WaitingRoomTransitionState = {
  source: "room-create" | "room-join";
  gameRoomId: string;
  errorMessage: string | null;
};

type InvitationActionState = {
  participantId: string;
  action: InvitationActionType;
  errorMessage: string | null;
  retryable: boolean;
  submittedMessage: string;
};

export function MainPage() {
  const store = useAppStoreApi();
  const user = useAppStore((state) => state.auth.user);
  const aiChatState = useAppStore((state) => state.aiChat);
  const [composerValue, setComposerValue] = useState("");
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [waitingRoomTransition, setWaitingRoomTransition] =
    useState<WaitingRoomTransitionState | null>(null);
  const [hiddenInvitationIds, setHiddenInvitationIds] = useState<string[]>([]);
  const [invitationActionState, setInvitationActionState] =
    useState<InvitationActionState | null>(null);
  const [mockInstanceId] = useState(
    () => `main-page-mock-${Math.random().toString(36).slice(2, 10)}`,
  );
  const search =
    typeof window !== "undefined" ? window.location.search : "";
  const isScrollDebugMode =
    typeof window !== "undefined" &&
    new URLSearchParams(search).get("debug") === "scroll";
  const mockScenario = getMainPageMockScenario(search);
  const mainPageMockApi = mockScenario
    ? createMainPageMockApi(mockScenario, mockInstanceId)
    : null;
  const effectiveUser = mockScenario ? MAIN_PAGE_MOCK_USER : user;

  const currentRoomQuery = useQuery({
    queryKey: ["main-page-current-room", effectiveUser?.userId, mockScenario],
    enabled: Boolean(effectiveUser?.userId) && !isScrollDebugMode,
    queryFn: () =>
      loadCurrentRoomState({
        userId: effectiveUser?.userId ?? "",
        getCurrentRooms: mainPageMockApi?.getCurrentRooms ?? gameRoomApi.getCurrentRooms,
        onDuplicateRoomsDetected(rooms) {
          console.warn(
            "[MainPage] Multiple current rooms detected. Using the most recently updated room.",
            rooms.map((room) => room.gameRoomId),
          );
        },
      }),
  });

  const invitationQuery = useQuery({
    queryKey: ["main-page-invitations", effectiveUser?.userId, mockScenario],
    enabled: Boolean(effectiveUser?.userId) && !isScrollDebugMode,
    queryFn: () =>
      loadInvitations({
        userId: effectiveUser?.userId ?? "",
        getInvitedParticipants:
          mainPageMockApi?.getInvitedParticipants ?? invitationApi.getInvitedParticipants,
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
  const visibleInvitations = mainPageView.invitations.filter(
    (invitation) => !hiddenInvitationIds.includes(invitation.participantId),
  );
  const aiChatSessionQuery = useQuery({
    queryKey: ["main-page-ai-chat-sessions", effectiveUser?.userId, mockScenario],
    enabled: Boolean(effectiveUser?.userId) && !isScrollDebugMode,
    queryFn: () =>
      loadAiChatSessions({
        userId: effectiveUser?.userId ?? "",
        getSessions: mainPageMockApi?.getSessions ?? aiChatApi.getSessions,
      }),
  });
  const aiChatView = deriveMainPageAiChatView({
    currentRoom: mainPageView.currentRoomState.currentRoom,
    invitations: visibleInvitations,
    sessionQuery: {
      data: aiChatSessionQuery.data,
      error: aiChatSessionQuery.error,
      isPending: aiChatSessionQuery.isPending,
    },
    messageQuery: {
      data: undefined,
      error: null,
      isPending: false,
    },
  });
  const aiChatMessageQuery = useQuery({
    queryKey: ["main-page-ai-chat-messages", aiChatView.activeSession?.aiChatSessionId],
    enabled: Boolean(aiChatView.activeSession?.aiChatSessionId) && !isScrollDebugMode,
    queryFn: () =>
      loadAiChatMessages({
        aiChatSessionId: aiChatView.activeSession?.aiChatSessionId ?? "",
        getMessages: mainPageMockApi?.getMessages ?? aiChatApi.getMessages,
      }),
  });
  const finalAiChatView = deriveMainPageAiChatView({
    currentRoom: mainPageView.currentRoomState.currentRoom,
    invitations: visibleInvitations,
    sessionQuery: {
      data: aiChatSessionQuery.data,
      error: aiChatSessionQuery.error,
      isPending: aiChatSessionQuery.isPending,
    },
    messageQuery: {
      data: aiChatMessageQuery.data,
      error: aiChatMessageQuery.error,
      isPending: aiChatMessageQuery.isPending,
    },
  });
  const activeSessionId = finalAiChatView.activeSession?.aiChatSessionId ?? null;
  const aiMessages =
    activeSessionId && aiChatState.activeSessionId === activeSessionId
      ? aiChatState.messages
      : finalAiChatView.messages;
  const roomCreateTemplates = extractRoomCreateTemplateOptions({
    messages: aiMessages,
    pendingRequestId: aiChatState.pendingRequestId,
  });
  const latestRoomCreateDifficulty = extractLatestRoomCreateDifficultyForRequest({
    messages: aiMessages,
    pendingRequestId: aiChatState.pendingRequestId,
  });
  const shouldShowRoomCreateTemplateUi =
    aiChatState.pendingCommand?.commandType === "ROOM_CREATE" &&
    aiChatState.pendingCommand.status === "PENDING" &&
    roomCreateTemplates.length > 0;
  const shouldShowRoomCreateDifficultyUi = shouldShowRoomCreateDifficultySelection(
    aiChatState.pendingCommand,
    roomCreateTemplates,
  );

  useEffect(() => {
    if (invitationQuery.data === undefined) {
      return;
    }

    setHiddenInvitationIds((previousIds) =>
      previousIds.filter((participantId) =>
        invitationQuery.data?.some((invitation) => invitation.participantId === participantId),
      ),
    );
  }, [invitationQuery.data]);

  useEffect(() => {
    setSendErrorMessage(null);
    setFailedMessage(null);
    setComposerValue("");
    setWaitingRoomTransition(null);
    setHiddenInvitationIds([]);
    setInvitationActionState(null);
  }, [activeSessionId]);

  useEffect(() => {
    if (
      waitingRoomTransition &&
      mainPageView.currentRoomState.currentRoom?.gameRoomId === waitingRoomTransition.gameRoomId
    ) {
      setWaitingRoomTransition(null);
    }
  }, [mainPageView.currentRoomState.currentRoom?.gameRoomId, waitingRoomTransition]);

  useEffect(() => {
    if (isScrollDebugMode) {
      return;
    }

    store.setState((state) => ({
      ...state,
      aiChat: syncAiChatSessionSelection({
        previousState: state.aiChat,
        activeSessionId: finalAiChatView.activeSession?.aiChatSessionId ?? null,
      }),
    }));
  }, [finalAiChatView.activeSession?.aiChatSessionId, isScrollDebugMode, store]);

  useEffect(() => {
    if (isScrollDebugMode || aiChatMessageQuery.data === undefined) {
      return;
    }

    store.setState((state) => ({
      ...state,
      aiChat: syncAiChatMessages({
        previousState: state.aiChat,
        activeSessionId: finalAiChatView.activeSession?.aiChatSessionId ?? null,
        messages: aiChatMessageQuery.data,
      }),
    }));
  }, [
    aiChatMessageQuery.data,
    finalAiChatView.activeSession?.aiChatSessionId,
    isScrollDebugMode,
    store,
  ]);

  const sendMessageMutation = useMutation({
    mutationFn: ({
      aiChatSessionId,
      message,
      invitationAction,
    }: {
      aiChatSessionId: string;
      message: string;
      invitationAction?: {
        participantId: string;
        action: InvitationActionType;
      };
    }) =>
      (mainPageMockApi?.sendMessage ?? aiChatApi.sendMessage)(aiChatSessionId, { message }),
    onMutate(variables) {
      setSendErrorMessage(null);
      setFailedMessage(null);

      if (variables.invitationAction) {
        setInvitationActionState({
          participantId: variables.invitationAction.participantId,
          action: variables.invitationAction.action,
          errorMessage: null,
          retryable: true,
          submittedMessage: variables.message,
        });
      }
    },
    async onSuccess(response, variables) {
      setComposerValue("");
      setFailedMessage(null);
      setSendErrorMessage(null);
      setInvitationActionState(null);
      store.setState((state) => ({
        ...state,
        aiChat: syncSentAiChatResponse({
          previousState: state.aiChat,
          activeSessionId: variables.aiChatSessionId,
          response,
        }),
      }));

      const storedInvitations = store.getState().room.invitations;
      const completedInvitationIds = resolveCompletedInvitationIds({
        invitations: storedInvitations,
        response,
      });

      if (completedInvitationIds.length > 0) {
        setHiddenInvitationIds((previousIds) => [
          ...new Set([...previousIds, ...completedInvitationIds]),
        ]);
        store.setState((state) => ({
          ...state,
          room: {
            ...state.room,
            invitations: state.room.invitations.filter(
              (invitation) => !completedInvitationIds.includes(invitation.participantId),
            ),
          },
        }));
      }

      if (
        (response.requestType === "ROOM_CREATE" || response.requestType === "ROOM_JOIN") &&
        response.commandResult?.status === "SUCCESS" &&
        response.commandResult.gameRoomId
      ) {
        setWaitingRoomTransition({
          source: response.requestType === "ROOM_JOIN" ? "room-join" : "room-create",
          gameRoomId: response.commandResult.gameRoomId,
          errorMessage: null,
        });
      }

      const [currentRoomResult] = await Promise.all([
        currentRoomQuery.refetch(),
        invitationQuery.refetch(),
        aiChatSessionQuery.refetch(),
        aiChatMessageQuery.refetch(),
      ]);

      if (
        (response.requestType === "ROOM_CREATE" || response.requestType === "ROOM_JOIN") &&
        response.commandResult?.status === "SUCCESS" &&
        response.commandResult.gameRoomId &&
        currentRoomResult.data?.currentRoom?.gameRoomId !== response.commandResult.gameRoomId
      ) {
        setWaitingRoomTransition({
          source: response.requestType === "ROOM_JOIN" ? "room-join" : "room-create",
          gameRoomId: response.commandResult.gameRoomId,
          errorMessage: currentRoomResult.error
            ? getUserFacingErrorMessage(currentRoomResult.error)
            : null,
        });
      }
    },
    onError(error, variables) {
      if (variables.invitationAction) {
        setInvitationActionState({
          participantId: variables.invitationAction.participantId,
          action: variables.invitationAction.action,
          errorMessage: getUserFacingErrorMessage(error),
          retryable: isRetryableInvitationActionError(error),
          submittedMessage: variables.message,
        });
        return;
      }

      setFailedMessage(variables.message);
      setSendErrorMessage(getUserFacingErrorMessage(error));
    },
  });

  async function submitAiChatMessage(
    message: string,
    options?: {
      invitationAction?: {
        participantId: string;
        action: InvitationActionType;
      };
    },
  ) {
    const trimmedMessage = message.trim();

    if (!activeSessionId || !trimmedMessage || sendMessageMutation.isPending) {
      return;
    }

    try {
      await sendMessageMutation.mutateAsync({
        aiChatSessionId: activeSessionId,
        message: trimmedMessage,
        invitationAction: options?.invitationAction,
      });
    } catch {
      // React Query already routes the failure through onError for UI state updates.
    }
  }

  function handleComposerChange(event: ChangeEvent<HTMLInputElement>) {
    setComposerValue(event.currentTarget.value);
    setSendErrorMessage(null);
    setFailedMessage(null);
  }

  async function handleComposerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAiChatMessage(composerValue);
  }

  async function retryFailedSend() {
    if (!failedMessage) {
      return;
    }

    await submitAiChatMessage(failedMessage);
  }

  async function retryWaitingRoomTransition() {
    if (!waitingRoomTransition) {
      return;
    }

    const result = await currentRoomQuery.refetch();

    if (result.data?.currentRoom?.gameRoomId === waitingRoomTransition.gameRoomId) {
      setWaitingRoomTransition(null);
      return;
    }

    setWaitingRoomTransition({
      ...waitingRoomTransition,
      errorMessage: result.error ? getUserFacingErrorMessage(result.error) : null,
    });
  }

  async function resetMockScenario() {
    if (!mainPageMockApi) {
      return;
    }

    mainPageMockApi.reset();
    setComposerValue("");
    setSendErrorMessage(null);
    setFailedMessage(null);
    setWaitingRoomTransition(null);
    setHiddenInvitationIds([]);
    setInvitationActionState(null);
    store.setState((state) => ({
      ...state,
      aiChat: {
        activeSessionId: null,
        messages: [],
        pendingCommand: null,
        pendingRequestId: null,
      },
      room: {
        ...state.room,
        currentRoom: null,
        duplicateRoomWarning: false,
        invitations: [],
      },
    }));
    await Promise.all([
      currentRoomQuery.refetch(),
      invitationQuery.refetch(),
      aiChatSessionQuery.refetch(),
      aiChatMessageQuery.refetch(),
    ]);
  }

  function handleRoomCreateDifficultySelect(difficulty: RoomCreateDifficulty) {
    void submitAiChatMessage(buildRoomCreateDifficultyMessage(difficulty));
  }

  function handleRoomCreateTemplateSelect(template: RoomCreateTemplateOption) {
    void submitAiChatMessage(buildRoomCreateTemplateConfirmationMessage(template));
  }

  function handleInvitationAccept(invitation: GameRoomParticipant) {
    void submitAiChatMessage(buildInvitationAcceptMessage(invitation), {
      invitationAction: {
        participantId: invitation.participantId,
        action: "accept",
      },
    });
  }

  function handleInvitationDeny(invitation: GameRoomParticipant) {
    void submitAiChatMessage(buildInvitationDenyMessage(invitation), {
      invitationAction: {
        participantId: invitation.participantId,
        action: "deny",
      },
    });
  }

  async function retryInvitationAction() {
    if (!invitationActionState) {
      return;
    }

    await submitAiChatMessage(invitationActionState.submittedMessage, {
      invitationAction: {
        participantId: invitationActionState.participantId,
        action: invitationActionState.action,
      },
    });
  }

  const composerDisabled =
    !activeSessionId || finalAiChatView.status === "loading" || sendMessageMutation.isPending;
  const composerPlaceholder = !activeSessionId
    ? "활성 채팅 세션을 불러오는 중이에요."
    : finalAiChatView.status === "loading"
      ? "이전 대화를 불러오는 중이에요."
      : sendMessageMutation.isPending
      ? "AI 마스터가 답변을 준비하고 있어요..."
      : "메시지를 입력하세요... (예: 방 만들어줘)";

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
              <UserAvatar label={effectiveUser?.nickname ?? "사용자"} />
              <span className="main-user-chip__name">{effectiveUser?.nickname ?? "사용자"}</span>
              <ChevronDownIcon />
            </button>
          </div>
        </header>

        <div className="main-screen__workspace">
          <MainGuideSidebar />

          {isScrollDebugMode ? (
            <MainScrollDebugState nickname={effectiveUser?.nickname ?? "플레이어"} />
          ) : null}
          {!isScrollDebugMode && mainPageView.status === "loading" ? (
            <MainLoadingState />
          ) : null}
          {!isScrollDebugMode && mainPageView.status === "error" ? (
            <MainErrorState
              message={mainPageView.blockingErrorMessage ?? "초기화에 실패했어요."}
              onRetry={() => {
                void currentRoomQuery.refetch();
                void invitationQuery.refetch();
              }}
            />
          ) : null}
          {!isScrollDebugMode && mainPageView.status === "ready" ? (
            <MainReadyState
              nickname={effectiveUser?.nickname ?? "플레이어"}
              currentRoom={mainPageView.currentRoomState.currentRoom}
              duplicateRoomWarning={mainPageView.currentRoomState.duplicateRoomWarning}
              invitations={visibleInvitations}
              aiMessages={aiMessages}
              mockScenario={mockScenario}
              shouldShowRoomCreateDifficultyUi={shouldShowRoomCreateDifficultyUi}
              shouldShowRoomCreateTemplateUi={shouldShowRoomCreateTemplateUi}
              roomCreateTemplates={roomCreateTemplates}
              latestRoomCreateDifficulty={latestRoomCreateDifficulty}
              waitingRoomTransition={waitingRoomTransition}
              invitationActionState={
                invitationActionState
                  ? {
                      participantId: invitationActionState.participantId,
                      action: invitationActionState.action,
                      errorMessage: invitationActionState.errorMessage,
                      retryable: invitationActionState.retryable,
                    }
                  : null
              }
              hasActiveAiChatSession={Boolean(activeSessionId)}
              isAiChatLoading={finalAiChatView.status === "loading"}
              isAiChatSendPending={sendMessageMutation.isPending}
              sendErrorMessage={sendErrorMessage}
              composerValue={composerValue}
              composerDisabled={composerDisabled}
              composerPlaceholder={composerPlaceholder}
              aiChatSessionErrorMessage={finalAiChatView.sessionErrorMessage}
              aiChatMessageErrorMessage={finalAiChatView.messageErrorMessage}
              currentRoomErrorMessage={mainPageView.currentRoomErrorMessage}
              invitationErrorMessage={mainPageView.invitationErrorMessage}
              shouldShowEmptyPrompt={finalAiChatView.shouldShowEmptyPrompt}
              onComposerChange={handleComposerChange}
              onComposerSubmit={handleComposerSubmit}
              onSelectRoomCreateDifficulty={handleRoomCreateDifficultySelect}
              onSelectRoomCreateTemplate={handleRoomCreateTemplateSelect}
              onAcceptInvitation={handleInvitationAccept}
              onDenyInvitation={handleInvitationDeny}
              onRetryInvitationAction={() => {
                void retryInvitationAction();
              }}
              onResetMockScenario={() => {
                void resetMockScenario();
              }}
              onRetryWaitingRoomTransition={() => {
                void retryWaitingRoomTransition();
              }}
              onRetrySendMessage={() => {
                void retryFailedSend();
              }}
              onRetryAiChatSessions={() => {
                void aiChatSessionQuery.refetch();
              }}
              onRetryAiChatMessages={() => {
                void aiChatMessageQuery.refetch();
              }}
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

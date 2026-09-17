# FE-3: 새 방 생성 후 클라이언트 문맥 동기화

작성일: 2026-09-17 | 상태: **구현 완료 / 지연 응답은 FE-4**

**Plan reference:** [작업 목록과 공통 제약](README.md). 앞선 사용자 요청의 초대·방장 권한·게임 종료 후 재입장 수정 계획을 분할한 작업이다.

**Description:** ROOM_CREATE 성공으로 확정된 방 ID를 currentRoom·대기방 전환·채팅 세션 선택에 일관되게 반영한다. 이전 상태가 존재한다는 이유만으로 새 방 반영이 막히는 경로를 검증한다.

**Dependencies:** FE-1, BE-3

**Read first:** 위 선행 Task 로그, 아래 대상 파일과 인접 테스트. 계약을 변경하거나 충돌을 해소할 때 `docs/specs/05-ai-chat-flow.md`, `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/07-state-and-client-data.md`을 확인한다. 기존 전체 worker 계획의 재실행은 이 Task 범위가 아니다.

**Acceptance criteria:**
- [ ] B의 새 방 생성 후 화면·스토어·선택 세션이 새 방과 일치한다.
- [ ] 과거 조회 응답이 새 방을 덮거나 과거 방의 채팅 문맥을 다시 선택하지 않는다.
- [ ] 비방장 화면에서 방장으로 잘못 표시하거나 권한을 임의 부여하지 않는다.

**Files likely touched / inspected:**
- [`src/pages/MainPage/index.tsx`](../../../src/pages/MainPage/index.tsx)
- [`src/pages/MainPage/mainInitialization.ts`](../../../src/pages/MainPage/mainInitialization.ts)
- [`src/pages/MainPage/aiChatInitialization.ts`](../../../src/pages/MainPage/aiChatInitialization.ts)
- [`tests/app/mainInitialization.test.mjs`](../../../tests/app/mainInitialization.test.mjs)
- [`tests/app/aiChatInitialization.test.mjs`](../../../tests/app/aiChatInitialization.test.mjs)

**Verification — 실행 예정:**

저장소 루트에서 실행한다.

```sh
node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/mainInitialization.test.mjs tests/app/aiChatInitialization.test.mjs
```

- [ ] 위 테스트/검사를 실행하고 결과를 기록한다.
- [ ] 완료 조건의 사용자 시나리오를 검증한다. 실제 환경 검증과 대역을 사용한 검증을 구분한다.
- [ ] 앞선 Task 동작에 회귀가 없는지 확인한다.

**Estimated scope:** M — 대상 파일 최대 5개. 추가 독립 변경이 필요하면 Task를 나눈다.

**Design constraints / risks:** 서버 권한이 기준이다. 로컬 OWNER 표시로 서버 권한 오류를 덮지 않는다. FE-2와 메인 화면 파일을 공유하므로 순차 진행한다.

## 실행 로그 — 2026-09-17

**What was done:** 생성·수락 성공의 새 방을 원자적으로 반영하는 applyConfirmedRoomEntry 도입. 과거 currentRoom이 있더라도 새 방으로 교체하고 이전 게임·에디터·참여자·대기방 상태 정리. 서버가 확정한 생성/참여 역할 구분 유지.

**Verification completed:** 메인 초기화 및 채팅 초기화 59개 통과. 새 방 교체와 참여자 역할 회귀 테스트 추가.

**Not verified / remaining:** 진행 중 HTTP 취소 및 전환 상태 유지 검증은 FE-4에 이어서 수행.

**Files changed:** 이 Task의 커밋 변경 목록 참조. 기존 사용자 변경은 포함하지 않는다.

**Commit:** 이 파일을 포함하는 Task별 커밋으로 기록한다. `git log --oneline --follow -- docs/implementation-logs/invitation-room-lifecycle-2026-09-17/task-3.md`로 조회 가능.

**Design decisions:** HTTP 본문은 message만 유지. 카드 문구는 `게임방 초대를 수락할게요. (초대 ID: <participantId>)` / `게임방 초대는 거절할게요. (초대 ID: <participantId>)`. 서버는 사용자와 초대 상태를 별도 검증한다. MVP의 연결 종료→LEFT 정책은 유지한다.

**Impact / next:** README의 순서를 따라 진행하며 실제 환경에서 검증하지 않은 항목은 완료로 간주하지 않는다.

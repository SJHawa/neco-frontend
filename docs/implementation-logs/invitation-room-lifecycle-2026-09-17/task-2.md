# FE-2: 선택한 초대의 수락·거절 대상 전달

작성일: 2026-09-17 | 상태: **구현 완료 / 실환경 미검증**

**Plan reference:** [작업 목록과 공통 제약](README.md). 앞선 사용자 요청의 초대·방장 권한·게임 종료 후 재입장 수정 계획을 분할한 작업이다.

**Description:** 초대 카드의 선택 정보가 자연어 메시지에 보존되도록 하고 서버 응답의 대상과 선택한 카드를 일치시킨다. 현재 중립적인 메시지 테스트는 명세와의 관계를 설명한 뒤 프로젝트의 테스트 변경 규칙에 따라 갱신한다.

**Dependencies:** FE-1, BE-2의 메시지 해석 규칙 확정

**Read first:** 위 선행 Task 로그, 아래 대상 파일과 인접 테스트. 계약을 변경하거나 충돌을 해소할 때 `docs/specs/05-ai-chat-flow.md`, `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/07-state-and-client-data.md`을 확인한다. 기존 전체 worker 계획의 재실행은 이 Task 범위가 아니다.

**Acceptance criteria:**
- [x] 서로 다른 초대 카드의 동작이 해당 초대를 식별할 수 있는 메시지를 생성한다.
- [x] 성공한 응답의 초대만 목록에서 제거하고 실패한 초대는 오류와 함께 유지한다.
- [x] 전송 본문은 message만 포함하고 다른 초대를 임의 처리하지 않는다.

**Files likely touched / inspected:**
- [`src/features/invitation/invitationFlow.ts`](../../../src/features/invitation/invitationFlow.ts)
- [`tests/app/invitationFlow.test.mjs`](../../../tests/app/invitationFlow.test.mjs)
- [`src/pages/MainPage/index.tsx`](../../../src/pages/MainPage/index.tsx)

**Verification — 계획 명령 (실제 결과는 아래 실행 로그):**

저장소 루트에서 실행한다.

```sh
node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/invitationFlow.test.mjs tests/app/aiChatInitialization.test.mjs
```

- [ ] 위 테스트/검사를 실행하고 결과를 기록한다.
- [ ] 완료 조건의 사용자 시나리오를 검증한다. 실제 환경 검증과 대역을 사용한 검증을 구분한다.
- [ ] 앞선 Task 동작에 회귀가 없는지 확인한다.

**Estimated scope:** M — 대상 파일 최대 5개. 추가 독립 변경이 필요하면 Task를 나눈다.

**Design constraints / risks:** 식별 정보를 메시지에 넣는 구체적인 표현은 BE-2와 합의한다. 화면에 노출할 문구와 서버 해석 방식도 함께 확인한다. 테스트를 단순히 통과시키기 위해 약화하지 않는다.

## 실행 로그 — 2026-09-17

**What was done:** 수락·거절 메시지에 선택한 participantId 포함. 사용자 동의를 받아 중립 문구 테스트 2개를 대상 식별 검증으로 갱신하고 다른 카드 대상 구분 테스트 추가.

**Verification completed:** invitationFlow 및 aiChatInitialization 30개 통과. message 단일 필드 전송과 성공 응답 대상만 제거하는 기존 검증 유지.

**Not verified / remaining:** 실제 카드 클릭과 서버 연결 검증은 FE-5 대상.

**Files changed:** 이 Task의 커밋 변경 목록 참조. 기존 사용자 변경은 포함하지 않는다.

**Commit:** 이 파일을 포함하는 Task별 커밋으로 기록한다. `git log --oneline --follow -- docs/implementation-logs/invitation-room-lifecycle-2026-09-17/task-2.md`로 조회 가능.

**Design decisions:** HTTP 본문은 message만 유지. 카드 문구는 `게임방 초대를 수락할게요. (초대 ID: <participantId>)` / `게임방 초대는 거절할게요. (초대 ID: <participantId>)`. 서버는 사용자와 초대 상태를 별도 검증한다. MVP의 연결 종료→LEFT 정책은 유지한다.

**Impact / next:** README의 순서를 따라 진행하며 실제 환경에서 검증하지 않은 항목은 완료로 간주하지 않는다.

**Implementation commit:** `fff3809` (이후 검증 체크리스트 갱신은 Task 5 로그 커밋).

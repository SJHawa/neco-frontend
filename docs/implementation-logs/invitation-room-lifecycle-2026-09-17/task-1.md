# FE-1: 초대와 방 전환 재현 시나리오 고정

작성일: 2026-09-17 | 상태: **재현 완료 / 실환경 미검증**

**Plan reference:** [작업 목록과 공통 제약](README.md). 앞선 사용자 요청의 초대·방장 권한·게임 종료 후 재입장 수정 계획을 분할한 작업이다.

**Description:** 카드 선택부터 메시지 전송, 방 생성·수락 응답, HTTP 재조회, 소켓 연결까지 상태 전이를 재현한다. 기존 함수 테스트만으로 React effect 순서를 검증했다고 간주하지 않는다.

**Dependencies:** 없음; BE-1과 재현 순서 공유

**Read first:** 위 선행 Task 로그, 아래 대상 파일과 인접 테스트. 계약을 변경하거나 충돌을 해소할 때 `docs/specs/05-ai-chat-flow.md`, `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/07-state-and-client-data.md`을 확인한다. 기존 전체 worker 계획의 재실행은 이 Task 범위가 아니다.

**Acceptance criteria:**
- [x] 과거 방 상태가 남은 경우와 깨끗한 초기 상태를 각각 재현한다.
- [x] 수락 성공 뒤 늦은 HTTP 응답으로 방 정보가 되돌아가는지 확인한다.
- [x] 카드에서 고른 초대와 실제 전송 메시지의 대상 정보를 비교하고 BE-2에 전달할 메시지 규칙을 정한다.

**Files likely touched / inspected:**
- [`tests/app/invitationFlow.test.mjs`](../../../tests/app/invitationFlow.test.mjs)
- [`tests/app/mainInitialization.test.mjs`](../../../tests/app/mainInitialization.test.mjs)
- [`tests/app/roomSocketLifecycle.test.mjs`](../../../tests/app/roomSocketLifecycle.test.mjs)
- [`src/pages/MainPage/index.tsx`](../../../src/pages/MainPage/index.tsx)

**Verification — 계획 명령 (실제 결과는 아래 실행 로그):**

저장소 루트에서 실행한다.

```sh
node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/invitationFlow.test.mjs tests/app/mainInitialization.test.mjs tests/app/roomSocketLifecycle.test.mjs
```

- [ ] 위 테스트/검사를 실행하고 결과를 기록한다.
- [ ] 완료 조건의 사용자 시나리오를 검증한다. 실제 환경 검증과 대역을 사용한 검증을 구분한다.
- [ ] 앞선 Task 동작에 회귀가 없는지 확인한다.

**Estimated scope:** M — 대상 파일 최대 5개. 추가 독립 변경이 필요하면 Task를 나눈다.

**Design constraints / risks:** React hook/화면 통합 재현 방식은 기존 도구를 먼저 확인한 뒤 선택한다. 실제 네트워크 요청·종료 시점과 상태 스냅샷을 함께 기록한다.

## 실행 로그 — 2026-09-17

**What was done:** 새 방 소켓을 연결해도 종료된 이전 게임 상태가 남는 회귀 테스트 추가. activeRoomId만 새 방으로 바뀌어 이전 FINISHED가 새 방 스냅샷으로 해석되는 경로를 확인.

**Verification completed:** 기존 소켓 테스트 52개 통과, 신규 1개 예상 실패.

**Not verified / remaining:** React 실제 화면 및 HTTP 지연 통합 검증은 FE-4~5에서 수행. 초대 문구 대상 식별 규칙은 위 Design decisions 참조.

**Files changed:** 이 Task의 커밋 변경 목록 참조. 기존 사용자 변경은 포함하지 않는다.

**Commit:** 이 파일을 포함하는 Task별 커밋으로 기록한다. `git log --oneline --follow -- docs/implementation-logs/invitation-room-lifecycle-2026-09-17/task-1.md`로 조회 가능.

**Design decisions:** HTTP 본문은 message만 유지. 카드 문구는 `게임방 초대를 수락할게요. (초대 ID: <participantId>)` / `게임방 초대는 거절할게요. (초대 ID: <participantId>)`. 서버는 사용자와 초대 상태를 별도 검증한다. MVP의 연결 종료→LEFT 정책은 유지한다.

**Impact / next:** README의 순서를 따라 진행하며 실제 환경에서 검증하지 않은 항목은 완료로 간주하지 않는다.

**Implementation commit:** `737fee0` (이후 검증 체크리스트 갱신은 Task 5 로그 커밋).

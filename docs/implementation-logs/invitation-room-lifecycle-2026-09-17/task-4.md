# FE-4: 초대 수락 후 방 전환과 소켓 유지

작성일: 2026-09-17 | 상태: **구현 완료 / 실서버 검증 별도**

**Plan reference:** [작업 목록과 공통 제약](README.md). 앞선 사용자 요청의 초대·방장 권한·게임 종료 후 재입장 수정 계획을 분할한 작업이다.

**Description:** ROOM_JOIN 성공 후 확정된 새 방을 늦은 응답으로 잃지 않도록 하고 이전 방 cleanup이 새 소켓에 영향을 주는지 검증한다. 확인된 경합에 최소 수정만 적용한다.

**Dependencies:** FE-2, FE-3; BE-4와 함께 검증

**Read first:** 위 선행 Task 로그, 아래 대상 파일과 인접 테스트. 계약을 변경하거나 충돌을 해소할 때 `docs/specs/05-ai-chat-flow.md`, `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/07-state-and-client-data.md`을 확인한다. 기존 전체 worker 계획의 재실행은 이 Task 범위가 아니다.

**Acceptance criteria:**
- [ ] 수락 후 HTTP 재조회 지연에도 새 방 소켓이 불필요하게 닫히지 않는다.
- [ ] 이전 방의 늦은 응답·이벤트·cleanup이 새 방 상태와 연결을 변경하지 않는다.
- [ ] C→A 수락 이후 JOINED를 유지하고 실제 퇴장 시에는 정상 정리된다.

**Files likely touched / inspected:**
- [`src/pages/MainPage/index.tsx`](../../../src/pages/MainPage/index.tsx)
- [`src/features/realtime/useRoomSocketLifecycle.ts`](../../../src/features/realtime/useRoomSocketLifecycle.ts)
- [`src/features/realtime/roomSocketLifecycle.ts`](../../../src/features/realtime/roomSocketLifecycle.ts)
- [`tests/app/mainInitialization.test.mjs`](../../../tests/app/mainInitialization.test.mjs)
- [`tests/app/roomSocketLifecycle.test.mjs`](../../../tests/app/roomSocketLifecycle.test.mjs)

**Verification — 실행 예정:**

저장소 루트에서 실행한다.

```sh
node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/mainInitialization.test.mjs tests/app/roomSocketLifecycle.test.mjs tests/app/roomRealtimeAuthoritativeSync.test.mjs
```

- [ ] 위 테스트/검사를 실행하고 결과를 기록한다.
- [ ] 완료 조건의 사용자 시나리오를 검증한다. 실제 환경 검증과 대역을 사용한 검증을 구분한다.
- [ ] 앞선 Task 동작에 회귀가 없는지 확인한다.

**Estimated scope:** M — 대상 파일 최대 5개. 추가 독립 변경이 필요하면 Task를 나눈다.

**Design constraints / risks:** 만료된 방을 무기한 유지하는 방식으로 해결하지 않는다. 함수 테스트 외에 실제 화면 전환과 effect cleanup 순서를 검증한다.

## 실행 로그 — 2026-09-19

**What was done:** 새 방 연결 시 이전 게임·에디터·참여자 상태 초기화. 생성/수락 전 조회 취소와 HTTP 확인 전 전환 상태 유지. 실제 React 테스트에서 발견한 결과 화면→메인 캐시 부활을 ResultPage 종료 정리로 수정. 실제 연결 종료 후 빈 서버 응답에서 대기방을 유지하지 않도록 수정.

**Verification completed:** 전체 Node 테스트 444개 통과. 앱 tsc와 Vite 번들 생성 통과. 브라우저 HTTP/WS 대역 기반 3개 시나리오 실행 결과는 FE-5에 기록.

**Not verified / remaining:** 실제 DB·LLM·세 계정 검증은 FE-5에서 환경 확보 후 수행. npm run build의 기존 tsconfig.node 오류는 범위 밖으로 유지.

**Files changed:** 이 Task의 커밋 변경 목록 참조. 기존 사용자 변경은 포함하지 않는다.

**Commit:** 이 파일을 포함하는 Task별 커밋으로 기록한다. `git log --oneline --follow -- docs/implementation-logs/invitation-room-lifecycle-2026-09-17/task-4.md`로 조회 가능.

**Design decisions:** HTTP 본문은 message만 유지. 카드 문구는 `게임방 초대를 수락할게요. (초대 ID: <participantId>)` / `게임방 초대는 거절할게요. (초대 ID: <participantId>)`. 서버는 사용자와 초대 상태를 별도 검증한다. MVP의 연결 종료→LEFT 정책은 유지한다.

**Impact / next:** README의 순서를 따라 진행하며 실제 환경에서 검증하지 않은 항목은 완료로 간주하지 않는다.

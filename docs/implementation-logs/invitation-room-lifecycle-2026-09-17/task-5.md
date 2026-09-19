# FE-5: 세 계정 화면 통합 검증과 프론트 인계

작성일: 2026-09-17 | 상태: **부분 검증 완료 / 실서버 대기**

**Plan reference:** [작업 목록과 공통 제약](README.md). 앞선 사용자 요청의 초대·방장 권한·게임 종료 후 재입장 수정 계획을 분할한 작업이다.

**Description:** 사용자별 브라우저 세션을 분리해 제보한 전체 흐름을 실행하고 화면 표시와 서버 상태가 일치하는지 확인한다.

**Dependencies:** FE-2, FE-3, FE-4, BE-2, BE-3, BE-4

**Read first:** 위 선행 Task 로그, 아래 대상 파일과 인접 테스트. 계약을 변경하거나 충돌을 해소할 때 `docs/specs/05-ai-chat-flow.md`, `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/07-state-and-client-data.md`을 확인한다. 기존 전체 worker 계획의 재실행은 이 Task 범위가 아니다.

**Acceptance criteria:**
- [ ] A→B 수락·거절 및 B의 방 생성→초대가 각각 정상 동작한다.
- [ ] A→C 게임 종료→C의 새 방 생성→A 초대·수락→다음 게임 시작까지 성공한다.
- [ ] 느린 조회 응답과 이전 방 이벤트에서도 잘못된 이탈·초대 제거가 없고 실제 퇴장은 반영된다.

**Files likely touched / inspected:**
- [`tests/app/invitationFlow.test.mjs`](../../../tests/app/invitationFlow.test.mjs)
- [`tests/app/mainInitialization.test.mjs`](../../../tests/app/mainInitialization.test.mjs)
- [`tests/app/roomSocketLifecycle.test.mjs`](../../../tests/app/roomSocketLifecycle.test.mjs)
- [`docs/implementation-logs/invitation-room-lifecycle-2026-09-17/task-5.md`](../../../docs/implementation-logs/invitation-room-lifecycle-2026-09-17/task-5.md)

**Verification — 실행 예정:**

저장소 루트에서 실행한다.

```sh
npm test
npm run build
```

- [ ] 위 테스트/검사를 실행하고 결과를 기록한다.
- [ ] 완료 조건의 사용자 시나리오를 검증한다. 실제 환경 검증과 대역을 사용한 검증을 구분한다.
- [ ] 앞선 Task 동작에 회귀가 없는지 확인한다.

**Estimated scope:** M — 대상 파일 최대 5개. 추가 독립 변경이 필요하면 Task를 나눈다.

**Design constraints / risks:** BE-5와 같은 실행 기록을 참조하되 화면 결과와 DB 상태 결과를 구분한다. 실행 환경이 없으면 미검증 사유와 재현 절차를 남긴다.

## 실행 로그 — 2026-09-19

**What was done:** 실제 Chrome과 React, WebSocket 어댑터를 사용한 브라우저 회귀 스크립트 추가 및 실행. HTTP와 WS 서버는 결정적인 대역이므로 실제 세 계정 통합 검증과 구분.

**Verification completed:** Node 테스트 444개 통과. tsc -p tsconfig.app.json 및 vite build 통과. 브라우저 게임 종료→초대 수락/거절/새 방 생성 3개 통과. 수락 후 실제 소켓 종료를 주입하면 대기방이 정리되며 새 방 소켓 재생성 없음.

**Not verified / remaining:** 실서버 A/B/C 연속 플레이 및 실제 LLM 해석은 미검증. npm run build는 기존 tsconfig.node.json의 process 타입 및 startsWith lib 설정 오류로 실패. 관련 설정은 변경하지 않았고 기존 package-lock.json 변경도 보존했다.

**Files changed:** 이 Task의 커밋 변경 목록 참조. 기존 사용자 변경은 포함하지 않는다.

**Commit:** 이 파일을 포함하는 Task별 커밋으로 기록한다. `git log --oneline --follow -- docs/implementation-logs/invitation-room-lifecycle-2026-09-17/task-5.md`로 조회 가능.

**Design decisions:** HTTP 본문은 message만 유지. 카드 문구는 `게임방 초대를 수락할게요. (초대 ID: <participantId>)` / `게임방 초대는 거절할게요. (초대 ID: <participantId>)`. 서버는 사용자와 초대 상태를 별도 검증한다. MVP의 연결 종료→LEFT 정책은 유지한다.

**Impact / next:** README의 순서를 따라 진행하며 실제 환경에서 검증하지 않은 항목은 완료로 간주하지 않는다.

## 환경 확보 후 실행할 실제 세 계정 검증

1. A/B/C를 서로 다른 브라우저 프로필로 로그인한다. 기존 서비스 사용자 데이터를 임의 삭제하지 않는다.
2. A가 방을 만들고 B를 초대한다. B의 수락 및 거절은 서로 분리된 초기 상태에서 검증한다.
3. 이전 게임 종료 후 B가 새 방을 만들고 A를 초대한다. 생성 방 ID, 세션 방 ID, 초대 명령 방 ID가 일치하는지 기록한다.
4. A가 C를 초대하고 게임을 시작해 종료한다. C가 새 방을 만든 뒤 A를 초대하고 A가 수락한다.
5. A의 멤버십 JOINED와 새 방 소켓 유지, 다음 게임 시작을 확인한다. 실제 퇴장 시 해당 방만 LEFT가 되는지 검증한다.
6. 각 단계의 요청 ID·방 ID·초대 ID·참여 상태·소켓 종료 시점을 기록한다. 토큰과 계정 비밀번호는 로그에 남기지 않는다.

**완료 조건:** 위 실서비스 결과와 자동 테스트 결과가 모두 확인된 후에만 Task 5 상태 및 상단 체크리스트를 완료로 갱신한다.

## 브라우저 회귀 재실행

대상: `tests/browser/roomEntry.browser.mjs`. 실제 React effect, 결과 페이지→메인 복귀, 조회 지연, 소켓 생명주기를 검증한다. HTTP와 WS는 Playwright 경로 대역이며 라이브 백엔드를 사용하지 않는다.

1. 프론트 저장소 루트에서 `npm run dev -- --host 127.0.0.1` 실행.
2. 저장소 의존성 파일 변경 없이 별도 테스트 런타임에 `playwright-core` 설치. 실행 시 모듈 경로를 두 번째 인자로 전달 가능.
3. 실행 예시:

```sh
node tests/browser/roomEntry.browser.mjs /tmp/neconaeco-browser-check/node_modules/playwright-core/index.mjs
```

기본 Chrome 경로는 macOS의 Google Chrome이다. 다른 환경에서는 `CHROME_PATH` 지정. 서버 주소는 `APP_URL`로 지정하며 기본값은 `http://127.0.0.1:5173`.

통과한 항목: 이전 게임 결과 표시 → 종료 버튼 → 새 초대 수락과 선택 ID 전송 → 지연된 방 조회 이후 새 방 연결 유지 → 실제 연결 종료 후 대기방 정리. 별도 브라우저 context에서 초대 거절과 새 방 생성도 통과.

**범위 조정:** FE-4의 실제 화면 재현에서 ResultPage 캐시 부활이 발견되어 해당 파일의 종료 정리도 수정했다. 이 발견과 브라우저 테스트를 FE-4 커밋에 함께 포함했다.

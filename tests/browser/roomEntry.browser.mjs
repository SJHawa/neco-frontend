// Run against Vite with PLAYWRIGHT_MODULE pointing to an installed playwright-core entry.
// HTTP and WS are deterministic fixtures; this verifies real React effects, not a live backend.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const playwrightModule = process.env.PLAYWRIGHT_MODULE ?? process.argv[2];
const { chromium } = await import(playwrightModule
  ? pathToFileURL(playwrightModule).href : 'playwright-core');
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const baseURL = process.env.APP_URL ?? 'http://127.0.0.1:5173';
const now = new Date().toISOString();
const failures = [];
let activePage;
try {
  for (const action of ['accept', 'deny', 'create']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    activePage = page;
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const user = { userId: 'A', loginId: 'A', nickname: 'A', email: 'a@example.com' };
    await page.addInitScript((user) => {
      sessionStorage.setItem('neconaeco.auth.accessToken', 'fixture-token');
      sessionStorage.setItem('neconaeco.auth.user', JSON.stringify(user));
    }, user);
    let phase = 'playing';
    let lagReads = 0;
    const messages = [];
    const sentMessages = [];
    const sockets = [];
    const room = (id) => ({
      gameRoomId: id, ownerUserId: id === 'old-room' || action === 'create' ? 'A' : 'C',
      status: id === 'old-room' ? 'IN_PROGRESS' : 'WAITING', difficulty: 'EASY',
      myRole: id === 'old-room' || action === 'create' ? 'OWNER' : 'PARTICIPANT',
      myMembershipStatus: 'JOINED', joinedParticipantCount: 2, minParticipants: 2,
      maxParticipants: 4, maxStrikeCount: 3, timeLimitSeconds: 30, createdAt: now, updatedAt: now,
    });
    const invitation = { participantId: 'invite-new', gameRoomId: 'new-room', userId: 'A',
      nickname: 'A', role: 'PARTICIPANT', membershipStatus: 'INVITED', roomStatus: 'WAITING', createdAt: now };
    await page.route('**/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      let data = [];
      if (path.endsWith('/game-rooms')) {
        if (phase === 'playing') data = [room('old-room')];
        else if (phase === 'joined') data = lagReads++ === 0 ? [] : [room('new-room')];
      } else if (path.endsWith('/game-room-participants')) {
        if (url.searchParams.get('membershipStatus') === 'INVITED') {
          data = phase === 'invited' && action !== 'create' ? [invitation] : [];
        } else {
          const gameRoomId = url.searchParams.get('gameRoomId');
          data = ['A', 'C'].map((userId) => ({ ...invitation, gameRoomId, userId, nickname: userId,
            role: userId === room(gameRoomId).ownerUserId ? 'OWNER' : 'PARTICIPANT', membershipStatus: 'JOINED' }));
        }
      } else if (path.endsWith('/ai-chat-sessions')) {
        data = [{ aiChatSessionId: 'session-A', requesterUserId: 'A', status: 'ACTIVE',
          gameRoomId: phase === 'joined' ? 'new-room' : null, createdAt: now, updatedAt: now }];
      } else if (path.endsWith('/messages') && route.request().method() === 'GET') {
        data = messages;
      } else if (path.endsWith('/messages')) {
        const payload = route.request().postDataJSON();
        assert.deepEqual(Object.keys(payload), ['message']);
        sentMessages.push(payload.message);
        const requestType = action === 'create' ? 'ROOM_CREATE' : action === 'accept' ? 'ROOM_JOIN' : 'USER_INVITE_DENY';
        phase = action === 'deny' ? 'denied' : 'joined';
        const assistantMessage = { messageId: 'reply', aiChatRequestId: 'req', senderType: 'ASSISTANT',
          messageType: 'COMMAND_RESULT', content: '처리 완료', createdAt: now,
          metadata: { gameRoomId: 'new-room', membershipStatus: action === 'deny' ? 'DENIED' : 'JOINED' } };
        messages.push(assistantMessage);
        data = { aiChatRequestId: 'req', requestType, requestStatus: 'COMPLETED', assistantMessage,
          commandResult: { commandType: requestType, status: 'SUCCESS', gameRoomId: 'new-room', started: false,
            apiPath: action === 'create' ? '/v1/game-rooms' : `/v1/game-room-participants/invite-new/${action === 'accept' ? 'join' : 'deny'}` } };
      }
      await route.fulfill({ json: { data, meta: {}, error: null } });
    });
    await page.routeWebSocket(/ws:\/\/localhost:8080/, (socket) => {
      const record = { socket, roomId: null, closed: false };
      sockets.push(record);
      socket.onClose(() => { record.closed = true; });
      socket.onMessage((raw) => {
        const frame = JSON.parse(String(raw));
        if (frame.event !== 'join-room') return;
        record.roomId = frame.data.gameRoomId;
        socket.send(JSON.stringify({ event: 'room-participants-updated', data: {
          gameRoomId: record.roomId,
          participants: ['A', 'C'].map((userId) => ({ userId, nickname: userId, role: userId === room(record.roomId).ownerUserId ? 'OWNER' : 'PARTICIPANT', membershipStatus: 'JOINED' })),
          gameState: { status: room(record.roomId).status }, missionState: null,
        } }));
      });
    });
    await page.goto(`${baseURL}/main`);
    await poll(() => sockets.some((socket) => socket.roomId === 'old-room'));
    phase = 'invited';
    sockets.find((socket) => socket.roomId === 'old-room').socket.send(JSON.stringify({ event: 'mission-result', data: {
      gameRoomId: 'old-room', gameState: { status: 'FINISHED' },
      missionResult: { missionId: 'old-mission', isMissionCleared: true, judgeStatus: 'PASSED',
        strikeCount: 0, remainingStrikeCount: 3, feedbackMessage: '완료', detectedIssues: [] },
    } }));
    await page.getByRole('button', { name: '게임 종료', exact: true }).click();
    if (action === 'create') {
      await page.getByRole('textbox').last().fill('새 게임 방 만들어줘');
      await page.getByRole('button', { name: '메시지 전송', exact: true }).click();
    } else {
      await page.getByRole('button', { name: action === 'accept' ? '초대 수락' : '거절', exact: true }).click();
      assert.match(sentMessages.at(-1), /초대 ID: invite-new/);
    }
    await poll(() => phase === (action === 'deny' ? 'denied' : 'joined'));
    if (action !== 'deny') {
      await poll(() => sockets.some((socket) => socket.roomId === 'new-room'));
      // Wait through HTTP polling and React effects after the initial lagged response.
      await poll(() => lagReads >= 2);
      const current = sockets.filter((socket) => socket.roomId === 'new-room');
      assert.equal(current.length, 1, 'new room must not reconnect');
      assert.equal(current[0].closed, false, 'new room must stay connected');
      assert.equal(await page.getByRole('button', { name: '초대 수락', exact: true }).count(), 0);
      if (action === 'accept') {
        phase = 'left';
        current[0].socket.close({ code: 1000, reason: 'fixture disconnect' });
        await poll(async () => await page.locator('.main-waiting-room').count() === 0);
        assert.equal(sockets.filter((socket) => socket.roomId === 'new-room').length, 1);
      }
    } else {
      await poll(async () => await page.getByRole('button', { name: '초대 수락', exact: true }).count() === 0);
      assert.equal(sockets.some((socket) => socket.roomId === 'new-room'), false);
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: previous game → result → ${action}, delayed HTTP, real React and WebSocket adapter`);
    await context.close();
  }
} catch (error) {
  if (activePage && !activePage.isClosed()) console.error(await activePage.locator('body').innerText());
  failures.push(error);
} finally {
  await browser.close();
}
if (failures.length) throw failures[0];
async function poll(check) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for browser state');
}

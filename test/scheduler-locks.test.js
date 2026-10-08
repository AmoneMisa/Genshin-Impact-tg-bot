import test from 'node:test';
import assert from 'node:assert/strict';
import Chat from '../db/models/Chat.js';
import { withLock } from '../functions/general/chatLock.js';
import checkAccumulateTimer from '../functions/game/builds/checkAccumulateTimer.js';
import resetSwordTimer from '../functions/game/sword/resetSwordTimer.js';

// The hourly/daily schedulers used to load every chat up front and save it much later,
// so a save from the Mini App in between made theirs fail with a VersionError.
// They now list chat ids only and re-read + save each chat under that chat's lock.

function mockChats(t, chats) {
  const reads = [];
  t.mock.method(Chat, 'find', () => ({ lean: async () => chats.map(chat => ({ chatId: chat.chatId })) }));
  t.mock.method(Chat, 'findOne', async ({ chatId }) => {
    reads.push(chatId);
    return chats.find(chat => chat.chatId === chatId) || null;
  });
  return reads;
}

const tick = () => new Promise(resolve => setTimeout(resolve, 20));

test('the building tick reads a chat only once the chat lock is free, and saves it', async t => {
  const chat = {
    chatId: 7,
    saves: 0,
    save: async function () { this.saves++; },
    members: [{ userId: 1, game: { builds: { goldMine: { currentLvl: 1, lastCollectAt: Date.now() } } } }],
  };
  const reads = mockChats(t, [chat]);

  let release;
  const held = withLock(7, () => new Promise(resolve => { release = resolve; }));
  await tick();
  const running = checkAccumulateTimer();
  await tick();
  assert.deepEqual(reads, [], 'must wait for the lock before reading the chat');

  release();
  await held;
  await running;
  assert.deepEqual(reads, [7]);
  assert.ok(chat.saves <= 1);
});

test('the sword timer reset works chat by chat under the lock', async t => {
  const future = Date.now() + 3_600_000;
  const chats = [
    { chatId: 1, saves: 0, save: async function () { this.saves++; }, members: [{ userId: 1, timerSwordCallback: future }] },
    { chatId: 2, saves: 0, save: async function () { this.saves++; }, members: [{ userId: 2, timerSwordCallback: 0 }] },
  ];
  const reads = mockChats(t, chats);

  let release;
  const held = withLock(2, () => new Promise(resolve => { release = resolve; }));
  await tick();
  const running = resetSwordTimer();
  await tick();
  assert.deepEqual(reads, [1], 'chat 1 is processed while chat 2 is still locked');
  assert.equal(chats[0].saves, 1);
  assert.notEqual(chats[0].members[0].timerSwordCallback, future);

  release();
  await held;
  await running;
  assert.deepEqual(reads, [1, 2]);
  assert.equal(chats[1].saves, 0, 'nothing to change in chat 2');
});

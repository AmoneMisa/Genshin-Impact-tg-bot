import test from 'node:test';
import assert from 'node:assert/strict';
import { withLock, releasingLock, chatIdOfUpdate } from '../functions/general/chatLock.js';

const tick = ms => new Promise(resolve => setTimeout(resolve, ms));

test('work for one chat runs strictly one after another', async () => {
  const log = [];
  const job = (name, ms) => withLock(1, async () => { log.push(`${name}:start`); await tick(ms); log.push(`${name}:end`); });
  await Promise.all([job('a', 20), job('b', 1)]);
  assert.deepEqual(log, ['a:start', 'a:end', 'b:start', 'b:end']);
});

test('different chats do not block each other', async () => {
  const log = [];
  await Promise.all([
    withLock(1, async () => { await tick(20); log.push('slow'); }),
    withLock(2, async () => { log.push('fast'); }),
  ]);
  assert.deepEqual(log, ['fast', 'slow']);
});

test('nested lock on the same chat does not deadlock', async () => {
  const result = await withLock(7, () => withLock('7', async () => 'inner'));
  assert.equal(result, 'inner');
});

test('a failing job releases the lock', async () => {
  await assert.rejects(withLock(3, async () => { throw new Error('boom'); }), /boom/);
  assert.equal(await withLock(3, async () => 'ok'), 'ok');
});

test('long waits release the lock so other work can run', async () => {
  const log = [];
  const sleeper = withLock(5, async () => {
    log.push('before');
    await releasingLock(() => tick(30));
    log.push('after');
  });
  await tick(5);
  await withLock(5, async () => { log.push('other'); });
  await sleeper;
  assert.deepEqual(log, ['before', 'other', 'after']);
});

test('updates are mapped to their chat', () => {
  assert.equal(chatIdOfUpdate({ message: { chat: { id: -5 } } }), -5);
  assert.equal(chatIdOfUpdate({ callback_query: { message: { chat: { id: 9 } } } }), 9);
  assert.equal(chatIdOfUpdate({ inline_query: {} }), null);
});

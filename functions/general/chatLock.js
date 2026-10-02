import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * One FIFO lock per chat, shared by the Mini App API and the legacy chat
 * command handlers. Both read a whole Chat document, change a member's gold or
 * items and save it back, so unsynchronised they overwrite each other.
 *
 * Handlers that deliberately wait (game countdowns) release the lock for the
 * duration of the wait through `releasingLock`, so one table never freezes a chat.
 */
const context = new AsyncLocalStorage();
const tails = new Map();

async function acquire(key) {
  const previous = tails.get(key) || Promise.resolve();
  let open;
  const gate = new Promise(resolve => { open = resolve; });
  const tail = previous.catch(() => {}).then(() => gate);
  tails.set(key, tail);

  await previous.catch(() => {});
  return () => {
    open();
    if (tails.get(key) === tail) tails.delete(key);
  };
}

export async function withLock(rawKey, action) {
  const key = String(rawKey);
  const held = context.getStore();
  // Re-entrant: nested work inside a handler that already holds this lock.
  if (held?.active && held.key === key) return action();

  const state = { key, active: true, release: await acquire(key) };
  try {
    return await context.run(state, action);
  } finally {
    if (state.active) {
      state.active = false;
      state.release();
    }
  }
}

/** Runs a long wait (sleep, countdown) without holding the surrounding chat lock. */
export async function releasingLock(wait) {
  const state = context.getStore();
  if (!state?.active) return wait();

  state.active = false;
  state.release();
  try {
    return await wait();
  } finally {
    state.release = await acquire(state.key);
    state.active = true;
  }
}

/** The chat a Telegram update belongs to, or null when it has none. */
export function chatIdOfUpdate(update) {
  const message = update?.message
    || update?.edited_message
    || update?.callback_query?.message
    || update?.channel_post
    || update?.edited_channel_post;
  return message?.chat?.id ?? null;
}

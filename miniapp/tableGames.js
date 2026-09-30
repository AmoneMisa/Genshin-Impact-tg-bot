// Shared helpers for the multiplayer table games (21, elements): seat
// portraits and stuck-table detection. A healthy table never stalls — every
// request runs the game's sync, which advances past expired deadlines — so a
// table whose deadline passed long ago without progress is broken and may be
// reset by anyone at it; chat admins can reset at any time.

export const STALE_MS = 3 * 60_000;

/** Class and gender of a chat member, for the seat portrait. */
export function seatLook(member) {
  return {
    className: member?.game?.gameClass?.stats?.name || 'noClass',
    gender: member?.gender === 'female' ? 'female' : 'male',
  };
}

/** True when the table's current deadline passed STALE_MS ago with no progress. */
export function isStaleTable(game, deadline, now = Date.now()) {
  if (!game || game.phase === 'finished') return false;
  const last = Number(game.gameSessionLastUpdateAt) || Number(game.createdAt) || 0;
  if (deadline) return now > Number(deadline) + STALE_MS && now - last > STALE_MS;
  return now - last > STALE_MS;
}

export function isChatAdmin(session) {
  const status = session?.userChatData?.status || session?.$locals?.telegramMembership?.status;
  return status === 'administrator' || status === 'creator';
}

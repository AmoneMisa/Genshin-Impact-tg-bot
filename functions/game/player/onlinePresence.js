export const ONLINE_WINDOW_MS = 5 * 60 * 1000;
export const LAST_SEEN_STAMP_MS = 60 * 1000;
export function isPlayerOnline(session, now = Date.now()) {
  const seen = Number(session?.game?.lastSeenAt);
  return !session?.isHided && !session?.userChatData?.user?.is_bot && Number.isFinite(seen) && seen > 0 && now - seen <= ONLINE_WINDOW_MS;
}

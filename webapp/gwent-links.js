// Shared format. Only signed Telegram start_param selects the server's chat context.
const entryPattern = /^gwent_(-?\d+)_(i|w|p)_([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/;
export function parseGwentEntry(value) {
  const match = entryPattern.exec(String(value || ''));
  if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) === 0) return null;
  return { chatId: Number(match[1]), kind: match[2] === 'i' ? 'invite' : match[2] === 'p' ? 'play' : 'watch', token: match[3] };
}
export function gwentEntry(chatId, kind, token) {
  const value = `gwent_${chatId}_${kind === 'invite' ? 'i' : kind === 'play' ? 'p' : 'w'}_${token}`;
  return ['invite','watch','play'].includes(kind) && parseGwentEntry(value) ? value : null;
}
export function gwentAppLink(base, chatId, kind, token) {
  const entry = gwentEntry(chatId, kind, token);
  if (!base || !entry) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== 'https:' || url.hostname !== 't.me') return null;
    url.searchParams.set('startapp', entry);
    return url.href;
  } catch { return null; }
}

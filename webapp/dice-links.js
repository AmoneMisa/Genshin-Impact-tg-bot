// A dice invitation link opens the Mini App with `startapp=dice_i_<token>`; the shared lobby finds the invitation by its token.
const entryPattern = /^dice_i_([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/;
export function parseDiceEntry(value) {
  const match = entryPattern.exec(String(value || ''));
  return match ? { token: match[1] } : null;
}
export function diceAppLink(base, token) {
  const entry = `dice_i_${token}`;
  if (!base || !parseDiceEntry(entry)) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== 'https:' || url.hostname !== 't.me') return null;
    url.searchParams.set('startapp', entry);
    return url.href;
  } catch { return null; }
}

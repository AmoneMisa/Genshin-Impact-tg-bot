/** Numeric Telegram chat ids and feature locks share the same chat scope. */
export function lockScope(rawKey) {
  const key = String(rawKey);
  return key.startsWith('clan:') ? key : key.split(':')[0];
}

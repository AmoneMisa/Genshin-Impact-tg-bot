// Bosses belong to clans: the whole boss fight (functions/game/boss, the schedulers, the epic timers) is keyed by a
// chat id, so a clan fights in its own hidden "chat" with a negative id that no Telegram chat can have. The members
// of that chat are the clan members that took part; their heroes are the shared ones (characterSync.js).
export const CLAN_SCOPE_BASE = 4e12;

export const isClanScope = chatId => Number(chatId) <= -CLAN_SCOPE_BASE;

/** The id of the hidden chat of a clan: stable, derived from the clan's database id. */
export function clanScopeId(clan) {
    const tail = parseInt(String(clan?._id || clan?.id || '0').slice(-10), 16) || 0;
    return -(CLAN_SCOPE_BASE + tail);
}

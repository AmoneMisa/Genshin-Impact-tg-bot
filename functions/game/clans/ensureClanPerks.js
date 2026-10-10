import getClan from './getClan.js';
import { syncClanPerks } from './clanPerks.js';

/**
 * Gives a fighter the current skills of its clan. The copy a session keeps (game.clanPerks) is only refreshed when its owner
 * makes a request, so every combat that reads the opponent's stats (arena, raids, clan duels) refreshes both sides first.
 * `clan` may be passed when it is already loaded. Never throws: a fight goes on without the perks rather than not at all.
 */
export default async function ensureClanPerks(session, userId, clan) {
    if (!session?.game) return false;
    try {
        const source = clan !== undefined ? clan : await getClan(Number(userId));
        return syncClanPerks(session, source);
    } catch (error) {
        console.warn('[clan perks] sync failed:', error.message);
        return false;
    }
}

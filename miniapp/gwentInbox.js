import GwentLobby from '../db/models/GwentLobby.js';
import { LOBBY_KEY } from './gwentLobby.js';

// Pending Gwent invitations of a player for the navigation badge. The shared lobby is read at most every
// five seconds for all players, so the badge request does not load it each time.
const CACHE_MS = 5_000;
let cache = { at: 0, invites: [] };

export async function pendingGwentInvites(userId, now = Date.now()) {
  try {
    if (now - cache.at >= CACHE_MS) {
      const doc = await GwentLobby.findOne({ key: LOBBY_KEY }, { 'data.gwent.invites': 1 }).lean();
      cache = { at: now, invites: doc?.data?.gwent?.invites || [] };
    }
  } catch { return 0; }
  return cache.invites.filter(invite => invite.status === 'pending' && invite.to === String(userId) && invite.expiresAt > now).length;
}

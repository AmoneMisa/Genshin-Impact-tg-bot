import { gwentState, gwentAction, gwentFingerprint } from './gwent.js';
import { inspectLoadout } from '../webapp/gwent-builder.js';
import { collectRatingUpdates } from './gwentRating.js';
import { loadoutKey } from '../webapp/gwent-decks.js';

// Gwent for the whole app. A player has one hero in every chat, so the search queue, invitations and
// matches live in one shared record (the lobby) and are not tied to a game chat.
//
// miniapp/gwent.js stores its data in a chat-shaped object. `lobbyChat` presents the lobby as such a
// chat: its members are the players who use the lobby (public profiles: in-game name and last activity)
// plus the people the request needs to see (the player's friends of any chat, or a player looked up by
// nickname). Those extra people exist only for the request and are not stored.
//
// Saved decks live on the hero (session.game.gwentLoadouts), not in the lobby, so the shared record
// stays small.

export const LOBBY_KEY = 'global';
const PROFILE_REFRESH = 20_000;
const PROFILE_TTL = 2 * 24 * 60 * 60_000;
const fail = reason => ({ ok: false, reason, error: reason });

export function emptyLobby() {
  return { gwent: { queue: [], matches: [], loadouts: {}, invites: [] }, profiles: {} };
}

/** The public profile of a player who uses the lobby: the in-game name and the last activity. */
export function touchProfile(lobby, userId, { name }, now) {
  const id = String(userId);
  const profile = lobby.profiles[id] ||= { name, lastSeenAt: 0 };
  profile.name = name;
  // Written at most every 20 s, so polling does not rewrite the lobby.
  if (now - profile.lastSeenAt >= PROFILE_REFRESH) profile.lastSeenAt = now;
}

/**
 * The lobby as a chat. `people` maps a user id to `{ name, friends, lastSeenAt }` for the players the
 * request needs to know (the viewer, their friends, an invited stranger); they override stored profiles.
 */
export function lobbyChat(lobby, people = {}) {
  const members = new Map();
  for (const [userId, profile] of Object.entries(lobby.profiles)) {
    members.set(userId, { userId, game: { friends: [], lastSeenAt: profile.lastSeenAt, nickname: profile.name } });
  }
  for (const [userId, person] of Object.entries(people)) {
    const stored = members.get(userId);
    members.set(userId, { userId, game: { friends: (person.friends || []).map(String), lastSeenAt: person.lastSeenAt ?? stored?.game.lastSeenAt ?? 0, nickname: person.name || stored?.game.nickname } });
  }
  return { game: { gwent: lobby.gwent }, members: [...members.values()] };
}

const searching = (lobby, id) => lobby.gwent.queue.some(entry => entry.userId === String(id));
const inMatch = (lobby, id) => lobby.gwent.matches.some(match => match.players.includes(String(id)) && !match.dismissed.includes(String(id)));
const hasInvite = (lobby, id) => lobby.gwent.invites.some(invite => invite.status === 'pending' && (invite.from === String(id) || invite.to === String(id)));
/** True while the player waits in the queue, has a match not yet dismissed, or a pending invitation. */
export const lobbyBusy = (lobby, id) => searching(lobby, id) || inMatch(lobby, id) || hasInvite(lobby, id);

export function lobbyFingerprint(lobby) {
  return gwentFingerprint({ game: { gwent: lobby.gwent } }) + '|' + Object.entries(lobby.profiles).map(([id, profile]) => `${id}:${profile.name}:${profile.lastSeenAt}`).join(',');
}

/** Forgets players who have been away for two days and have nothing left in the lobby. */
function pruneProfiles(lobby, now) {
  for (const [id, profile] of Object.entries(lobby.profiles)) {
    if (now - profile.lastSeenAt > PROFILE_TTL && !lobbyBusy(lobby, id)) delete lobby.profiles[id];
  }
}

/**
 * One Gwent request for a player. Everything goes through the shared lobby; `loadouts` are the player's
 * saved decks from their hero and `saveLoadout(loadout)` stores one back there.
 * Returns the answer and whether the lobby must be saved.
 */
export function runGwent({ lobby, userId, name, people = {}, loadouts = {}, saveLoadout = null, strangers = [], rating = null, mutation, body = null, watch = null, invite = null, now = Date.now(), rng = Math.random }) {
  const id = String(userId);
  const before = lobbyFingerprint(lobby);
  // Only players who use the lobby are remembered; a visitor who just looks at the list is not stored.
  if (mutation || lobbyBusy(lobby, id)) touchProfile(lobby, id, { name }, now);
  const shared = lobbyChat(lobby, { ...people, [id]: { ...people[id], name } });
  let result;
  if (!mutation) {
    result = gwentState(shared, id, now, { watch, invite, rng });
    if (result.ok !== false) result.ok = true;
  } else if (body?.action === 'save') {
    const stats = inspectLoadout(body.loadout);
    if (!stats.valid) result = fail(stats.errors.join('. '));
    else {
      saveLoadout?.(body.loadout);
      loadouts = { ...loadouts, [loadoutKey(body.loadout.ruleset, body.loadout.faction)]: body.loadout };
      result = { ok: true, ...gwentState(shared, id, now) };
    }
  } else {
    result = gwentAction(shared, id, body, now, rng, { strangers, rating });
  }
  // Finished rated games change ratings once; the caller stores the changes.
  const ratingUpdates = collectRatingUpdates(lobby);
  if (ratingUpdates.length && result.ok !== false && result.match !== undefined) {
    // The answer was built before the games were counted; show the change on the result screen.
    const fresh = gwentState(shared, id, now, { rng });
    result = { ...result, match: fresh.match, games: fresh.games };
  }
  if (result.ok !== false) result.loadouts = structuredClone(loadouts);
  pruneProfiles(lobby, now);
  return { result, ratingUpdates, lobbyChanged: lobbyFingerprint(lobby) !== before };
}

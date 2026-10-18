import { authorize } from '../http/auth.js';
import { guarded, sendJson } from '../http/response.js';
import { readJsonBody, withLock } from '../http/request.js';
import { withLock as withGlobalLock } from '../../functions/general/chatLock.js';
import saveSession from '../../functions/getters/saveSession.js';
import Character from '../../db/models/Character.js';
import GwentLobby from '../../db/models/GwentLobby.js';
import { playerName, validatePlayerNickname } from '../../functions/game/player/playerName.js';
import { inspectLoadout, repairLoadout } from '../../webapp/gwent-builder.js';
import { loadoutKey } from '../../webapp/gwent-decks.js';
import { runGwent, emptyLobby, LOBBY_KEY } from '../gwentLobby.js';
import { collectCredits, returnStake, takeStake, walletOf } from '../gwentWallet.js';
import { getRating, applyRatingUpdates, leaderboard } from '../gwentRatings.js';
import { gwentAppBase, addGwentLinks, pushGwentInvite, pushGwentPlay } from '../gwent-sharing.js';
import { gwentAppLink } from '../../webapp/gwent-links.js';

const FRIENDS_CACHE_MS = 30_000;
const friendsCache = new Map();

/** A hero record of another player as the lobby sees it: name, friends and last activity. */
function personOf(character) {
  const game = character?.data?.game || {};
  return { name: playerName({ userId: character.userId, game }), friends: Array.isArray(game.friends) ? game.friends.map(String) : [], lastSeenAt: Number(game.lastSeenAt) || 0 };
}

/** The player's friends of every chat (a hero is shared by all chats), cached for half a minute. */
export async function loadFriends(session, now) {
  const ids = (Array.isArray(session.game?.friends) ? session.game.friends : []).map(Number).filter(Number.isSafeInteger).slice(0, 50);
  const cached = friendsCache.get(session.userId);
  if (cached && now - cached.at < FRIENDS_CACHE_MS && cached.key === ids.join(',')) return cached.people;
  const people = {};
  if (ids.length) {
    for (const character of await Character.find({ userId: { $in: ids } }, { userId: 1, 'data.game.nickname': 1, 'data.game.friends': 1, 'data.game.lastSeenAt': 1 }).lean()) {
      people[String(character.userId)] = personOf(character);
    }
  }
  friendsCache.set(session.userId, { at: now, key: ids.join(','), people });
  if (friendsCache.size > 5000) friendsCache.clear();
  return people;
}

/** Looks a player up by in-game nickname. Returns `{ id, person }` or null. */
export async function findByNickname(value) {
  const checked = validatePlayerNickname(value);
  if (!checked.ok) return null;
  const character = await Character.findOne({ 'data.game.nicknameKey': checked.key }, { userId: 1, 'data.game.nickname': 1, 'data.game.friends': 1, 'data.game.lastSeenAt': 1 }).lean();
  return character ? { id: String(character.userId), person: personOf(character) } : null;
}

/** Runs `work(lobby)` with the shared lobby loaded; saves it when `work` reports a change. */
async function withLobby(work) {
  return withGlobalLock('gwent-global', async () => {
    const doc = await GwentLobby.findOne({ key: LOBBY_KEY }) || new GwentLobby({ key: LOBBY_KEY, data: emptyLobby() });
    const lobby = doc.data?.gwent ? doc.data : emptyLobby();
    const { value, changed } = await work(lobby);
    if (changed) { doc.data = lobby; doc.markModified('data'); await doc.save(); }
    return value;
  });
}

/** The saved decks of the hero that are still valid. */
function savedLoadouts(session) {
  const stored = session.game?.gwentLoadouts;
  if (!stored || typeof stored !== 'object') return {};
  // Decks saved under older copy limits are cut to today's limits and kept when they are still valid.
  return Object.fromEntries(Object.entries(stored).map(([key, config]) => [key, repairLoadout(config)]).filter(([key, config]) => config && loadoutKey(config.ruleset, config.faction) === key && inspectLoadout(config).valid));
}

async function handle(req, res, mutation) {
  const context = await authorize(req);
  const body = mutation ? await readJsonBody(req, 16384) : null;
  const params = new URL(req.url,'http://localhost').searchParams;
  const now = Date.now();
  // The chat lock protects the hero record (decks); the lobby lock is always taken second.
  const result = await withLock(`${context.chatId}:gwent`, async () => {
    const people = await loadFriends(context.session, now);
    people[String(context.userId)] = { name: playerName(context.session), friends: context.session.game?.friends || [], lastSeenAt: Number(context.session.game?.lastSeenAt) || 0 };
    let strangers = [];
    if (mutation && body?.action === 'invite' && typeof body.targetNickname === 'string') {
      const found = await findByNickname(body.targetNickname);
      if (!found) return { ok: false, reason: 'Игрок с таким ником не найден', error: 'Игрок с таким ником не найден' };
      people[found.id] = found.person;
      body.targetId = found.id; strangers = [found.id];
    }
    let saved = null;
    let rating = await getRating(context.userId);
    let charged = null, credited = [];
    let run;
    try {
      run = await withLobby(async lobby => {
        // What the lobby owes this player is paid first, so the stake can use it.
        const early = collectCredits(lobby, context.session);
        const out = runGwent({ lobby, userId: context.userId, name: people[String(context.userId)].name, people, loadouts: savedLoadouts(context.session),
          saveLoadout: loadout => { saved = loadout; }, strangers, rating, wallet: walletOf(context.session), mutation, body, watch: params.get('watch'), invite: params.get('invite'), now });
        // Finished rated games change ratings. If the database refuses, the lobby is not saved and the games stay uncounted.
        await applyRatingUpdates(out.ratingUpdates, now);
        if (out.ratingUpdates.some(update => String(update.userId) === String(context.userId))) rating = await getRating(context.userId);
        const stake = out.result.charge;
        delete out.result.charge;
        credited = [...early, ...collectCredits(lobby, context.session)];
        if (stake) {
          if (!takeStake(context.session, stake)) throw new Error('Недостаточно средств для ставки');
          charged = stake;
        }
        // The hero is saved before the lobby: money is never lost without a trace, and the credit ledger prevents paying twice.
        if (credited.length || charged) await saveSession(context.session);
        return { value: out.result, changed: out.lobbyChanged || credited.length > 0 };
      });
    } catch (error) {
      if (charged) { try { returnStake(context.session, charged); await saveSession(context.session); } catch { /* the stake stays taken; the error below is reported */ } }
      throw error;
    }
    if (run.ok !== false) {
      run.rating = rating;
      run.wallet = walletOf(context.session);
      if (credited.length) run.credited = credited;
      if (!mutation && params.get('board')) run.leaderboard = await leaderboard(context.userId, now);
    }
    if (saved) {
      const game = context.session.game ||= {};
      game.gwentLoadouts = { ...(game.gwentLoadouts || {}), [loadoutKey(saved.ruleset, saved.faction)]: saved };
      await saveSession(context.session);
    }
    return run;
  });
  const base = await gwentAppBase();
  addGwentLinks(result, base);
  if(result.ok!==false && result.notifyInvite){
    const notification=result.notifyInvite;delete result.notifyInvite;
    try {result.notificationSent=await pushGwentInvite(notification,gwentAppLink(base,null,'invite',notification.id));}
    catch {result.notificationSent=false;}
  }
  if(result.ok!==false && result.notifyPlay){
    const notification=result.notifyPlay;delete result.notifyPlay;
    // Fire and forget: a failed message must not delay or fail the move.
    pushGwentPlay(notification,gwentAppLink(base,null,'play',notification.matchId)).catch(()=>{});
  }
  return sendJson(res, result.ok === false ? 409 : 200, result);
}
export const gwentRead = guarded('gwent state', (req, res) => handle(req, res, false));
export const gwentWrite = guarded('gwent action', (req, res) => handle(req, res, true));

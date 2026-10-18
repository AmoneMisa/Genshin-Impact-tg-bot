import { authorize } from '../http/auth.js';
import { guarded, sendJson } from '../http/response.js';
import { readJsonBody, withLock } from '../http/request.js';
import { withLock as withGlobalLock } from '../../functions/general/chatLock.js';
import saveSession from '../../functions/getters/saveSession.js';
import GwentLobby from '../../db/models/GwentLobby.js';
import { playerName } from '../../functions/game/player/playerName.js';
import { diceAction, diceState, diceFingerprint, emptyDice } from '../diceLobby.js';
import { collectCreditsFrom, returnStake, takeStake, walletOf } from '../gwentWallet.js';
import { loadFriends, findByNickname } from './gwent.js';

// Dice poker between players. One shared record (key 'dice' next to the Gwent lobby), read and written under a
// global lock; the hero is always saved before the lobby, as in routes/gwent.js.
const LOBBY_KEY = 'dice';

async function withLobby(work) {
  return withGlobalLock('dice-global', async () => {
    const doc = await GwentLobby.findOne({ key: LOBBY_KEY }) || new GwentLobby({ key: LOBBY_KEY, data: emptyDice() });
    const data = doc.data?.matches ? doc.data : emptyDice();
    data.credits ||= [];
    const before = diceFingerprint(data);
    const { value, changed } = await work(data);
    if (changed || diceFingerprint(data) !== before) { doc.data = data; doc.markModified('data'); await doc.save(); }
    return value;
  });
}

async function handle(req, res, mutation) {
  const context = await authorize(req);
  const body = mutation ? await readJsonBody(req, 4096) : null;
  const now = Date.now();
  const result = await withLock(`${context.chatId}:dice`, async () => {
    const me = String(context.userId);
    const people = await loadFriends(context.session, now);
    people[me] = { name: playerName(context.session), friends: context.session.game?.friends || [], lastSeenAt: Number(context.session.game?.lastSeenAt) || 0 };
    let strangers = [];
    if (mutation && body?.action === 'invite' && typeof body.targetNickname === 'string') {
      const found = await findByNickname(body.targetNickname);
      if (!found) return { ok: false, reason: 'Игрок с таким ником не найден', error: 'Игрок с таким ником не найден' };
      people[found.id] = found.person;
      body.targetId = found.id; strangers = [found.id];
    }
    let charged = null, credited = [], run;
    try {
      run = await withLobby(async data => {
        const early = collectCreditsFrom(data, context.session);
        const out = mutation ? diceAction(data, me, body, now, undefined, { people, strangers, wallet: walletOf(context.session) }) : diceState(data, me, now, { people });
        const stake = out.charge;
        delete out.charge;
        credited = [...early, ...collectCreditsFrom(data, context.session)];
        if (stake) {
          if (!takeStake(context.session, stake)) throw new Error('Недостаточно средств для ставки');
          charged = stake;
        }
        if (credited.length || charged) await saveSession(context.session);
        return { value: out, changed: credited.length > 0 };
      });
    } catch (error) {
      if (charged) { try { returnStake(context.session, charged); await saveSession(context.session); } catch { /* reported below */ } }
      throw error;
    }
    if (run.ok !== false) {
      run.wallet = walletOf(context.session);
      if (credited.length) run.credited = credited;
    }
    return run;
  });
  return sendJson(res, result.ok === false ? 409 : 200, result);
}
export const diceRead = guarded('dice state', (req, res) => handle(req, res, false));
export const diceWrite = guarded('dice action', (req, res) => handle(req, res, true));

import { randomUUID } from 'node:crypto';
import { TABLE_SEATS } from '../webapp/gwent-engine.js';

// Stakes in friendly Gwent games (invitations and tables). Only players stake, never a house: every stake
// comes from a player and the winners get 90% of the pot (1.8 stakes in a duel), so no currency is created and
// shuffling money between one's own accounts always loses some. Rated queue games
// and rematches are played without stakes.
//
// Money lives in each hero's own record, while the lobby is shared. So a player pays their stake from their
// own hero in the very request that sets it (`charge`), and anything the lobby owes a player (a won pot, a
// refund of a closed invitation) waits in `data.credits` until that player's next request pays it out.

export const STAKE_CURRENCIES = Object.freeze({
  gold: { label: 'адена', max: 10_000_000 },
  luckCoins: { label: 'CoL', max: 1_000 },
});
/** The winners share this part of the pot; the rest leaves the game, so moving money between one's own accounts always costs. */
export const WIN_SHARE = 0.9;
const CREDIT_TTL = 90 * 24 * 60 * 60_000;
const fail = error => ({ ok: false, error });

/** `raw` is the client's `{ currency, amount }`; no stake (null, undefined) is valid. */
export function parseStake(raw) {
  if (raw == null) return { ok: true, stake: null };
  if (typeof raw !== 'object' || Array.isArray(raw) || !Object.hasOwn(STAKE_CURRENCIES, raw.currency)) return fail('Неизвестная валюта ставки');
  const amount = Number(raw.amount);
  const { max } = STAKE_CURRENCIES[raw.currency];
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > max) return fail(`Ставка — от 1 до ${max.toLocaleString('ru-RU')} ${STAKE_CURRENCIES[raw.currency].label}`);
  return { ok: true, stake: { currency: raw.currency, amount } };
}

/** The reason a player cannot pay the stake with `wallet`, or null. */
export function cannotPay(stake, wallet) {
  if (!stake) return null;
  if (!wallet) return 'Ставки сейчас недоступны';
  if (stake.currency === 'gold' && wallet.goldLock) return wallet.goldLock;
  return (Number(wallet[stake.currency]) || 0) >= stake.amount ? null : `Недостаточно средств: нужно ${stake.amount.toLocaleString('ru-RU')} ${STAKE_CURRENCIES[stake.currency].label}`;
}

export const sameStake = (a, b) => (a?.currency ?? null) === (b?.currency ?? null) && (a?.amount ?? null) === (b?.amount ?? null);

export function credit(data, userId, stake, reason, now, amount = stake.amount) {
  if (!(amount > 0)) return;
  (data.credits ||= []).push({ id: randomUUID(), userId: String(userId), currency: stake.currency, amount, reason, at: now });
}

/** Gives back the stakes held by an invitation that did not become a match. Only the first call pays. */
export function refundInvite(data, invite, now) {
  if (!invite.stake || invite.refunded) return;
  invite.refunded = true;
  for (const userId of invite.table ? invite.table.players.map(person => person.userId) : [invite.from]) credit(data, userId, invite.stake, 'refund', now);
}

/** Closes an invitation for any reason but acceptance and returns its stakes. */
export function closeInvite(data, invite, status, now) {
  invite.status = status;
  refundInvite(data, invite, now);
}

/** Splits `pot` between `ids`; the first ones get the remainder. */
function split(pot, ids) {
  const share = Math.floor(pot / ids.length), rest = pot - share * ids.length;
  return Object.fromEntries(ids.map((id, i) => [id, share + (i < rest ? 1 : 0)]));
}

/** What each holder has put in: the stake, plus any raises (`paid` is kept by games with raises). */
export const paidOf = stake => stake.paid || Object.fromEntries(stake.holders.map(id => [id, stake.amount]));

/** Who gets the pot of a finished staked match. */
function payoutsOf(match) {
  const { amount, holders } = match.stake, paid = paidOf(match.stake), pot = Math.round(Object.values(paid).reduce((total, value) => total + value, 0) * WIN_SHARE);
  const refund = () => ({ kind: 'refund', payouts: paid });
  if (!match.table) {
    const winner = match.state.winner;
    return winner === 'player' || winner === 'ai' ? { kind: 'win', payouts: { [match.players[winner === 'player' ? 0 : 1]]: pot } } : refund();
  }
  // At a table whoever left forfeits the stake; if nobody stayed, everybody gets it back.
  const stayed = holders.filter(id => match.players.includes(id));
  if (!stayed.length) return refund();
  const winners = (match.state.winners || []).map(seat => match.players[TABLE_SEATS.indexOf(seat)]).filter(id => stayed.includes(id));
  return { kind: 'win', payouts: split(pot, winners.length ? winners : stayed) };
}

/** Pays out the pots of finished matches once. */
export function settleStakes(data, now) {
  for (const match of data.matches) {
    const stake = match.stake;
    if (!stake || stake.settled || match.state.phase !== 'matchOver') continue;
    const result = payoutsOf(match);
    for (const [userId, amount] of Object.entries(result.payouts)) credit(data, userId, stake, result.kind, now, amount);
    stake.settled = true; stake.result = result;
  }
  if (data.credits) data.credits = data.credits.filter(entry => now - entry.at < CREDIT_TTL);
}

/** The stake as one player (or a spectator, `userId` null) sees it. */
export function stakeView(match, userId) {
  const stake = match.stake;
  if (!stake) return null;
  const pot = Object.values(paidOf(stake)).reduce((total, value) => total + value, 0);
  const view = { currency: stake.currency, amount: stake.amount, pot, prize: Math.round(pot * WIN_SHARE), settled: !!stake.settled };
  if (userId != null && stake.holders.includes(String(userId))) {
    view.you = true;
    if (stake.result) {
      const payout = stake.result.payouts[String(userId)] || 0, mine = paidOf(stake)[String(userId)] ?? stake.amount;
      view.result = { kind: stake.result.kind === 'refund' ? 'refund' : payout > 0 ? 'won' : 'lost', payout, delta: payout - mine, paid: mine };
    }
  }
  return view;
}

export const stakeFingerprint = data => [(data.credits || []).length, (data.matches || []).map(match => match.stake?.settled ? 1 : 0).join('')];

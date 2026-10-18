import { goldLockForMember } from '../functions/game/general/goldLock.js';
import { STAKE_CURRENCIES } from './gwentStakes.js';

// The player's side of Gwent stakes: what they can pay, what the lobby owes them, and the payment itself.
// Every change happens on the player's own hero inside their own request; see gwentStakes.js.

const LEDGER_SIZE = 200;
const amountOf = value => Math.max(0, Math.floor(Number(value) || 0));

export function walletOf(session) {
  const inventory = session.game?.inventory || {};
  return { gold: amountOf(inventory.gold), luckCoins: amountOf(inventory.luckCoins), goldLock: goldLockForMember(session) };
}

/**
 * Pays the player what the lobby owes them (won pots, refunds). Each credit carries an id that the hero
 * remembers, so a credit is never paid twice even if the lobby could not be saved afterwards.
 * Returns what was paid.
 */
export function collectCredits(lobby, session) {
  const data = lobby.gwent, id = String(session.userId);
  const mine = (data.credits || []).filter(entry => entry.userId === id);
  if (!mine.length) return [];
  const game = session.game ||= {}, inventory = game.inventory ||= {};
  const seen = new Set(game.gwentCredited || []);
  const paid = [];
  for (const entry of mine) {
    if (seen.has(entry.id) || !Object.hasOwn(STAKE_CURRENCIES, entry.currency)) continue;
    inventory[entry.currency] = amountOf(inventory[entry.currency]) + entry.amount;
    seen.add(entry.id);
    paid.push({ currency: entry.currency, amount: entry.amount, reason: entry.reason });
  }
  data.credits = data.credits.filter(entry => entry.userId !== id);
  game.gwentCredited = [...seen].slice(-LEDGER_SIZE);
  return paid;
}

/** Takes a stake from the hero; false (nothing taken) if they cannot pay it. */
export function takeStake(session, stake) {
  const inventory = session.game?.inventory;
  if (!inventory || amountOf(inventory[stake.currency]) < stake.amount) return false;
  inventory[stake.currency] = amountOf(inventory[stake.currency]) - stake.amount;
  return true;
}

export function returnStake(session, stake) {
  const inventory = session.game.inventory ||= {};
  inventory[stake.currency] = amountOf(inventory[stake.currency]) + stake.amount;
}

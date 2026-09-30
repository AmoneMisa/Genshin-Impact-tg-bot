import { isStaleTable } from '../../../miniapp/tableGames.js';

// While a player is in any game with a bet — the 21 / elements tables and the
// arcade games (dice, bowling, darts, football, basketball, slots), in the chat
// or the Mini App — their gold is frozen: no transfers, no spending and no
// robbery until the round is settled. Otherwise a bet could be placed and the
// same gold spent or stolen before settlement.

export const GOLD_LOCK_REASON = 'in_table_game';
// Chat games without a turn for this long no longer hold the lock.
export const LEGACY_LOCK_MS = 10 * 60_000;
// An arcade game abandoned for this long no longer holds the lock.
export const ARCADE_LOCK_MS = 5 * 60_000;

// Per-player arcade state keys (chat commands and the Mini App share them).
const ARCADE_GAMES = [
  ['dice', 'Кубики'], ['bowling', 'Боулинг'], ['darts', 'Дартс'],
  ['football', 'Футбол'], ['basketball', 'Баскетбол'], ['slots', 'Слоты'], ['slotsMiniApp', 'Слоты'],
];

function arcadeLockFor(member, now, except = null) {
  const games = member?.game || {};
  for (const [key, title] of ARCADE_GAMES) {
    if (key === except) continue;
    const game = games[key];
    if (!game || !(Number(game.bet) > 0)) continue;
    const active = key === 'slots' ? ['bets', 'wait_start', 'spin1', 'spin2'].includes(game.state) : Boolean(game.isStart);
    const startedAt = Number(game.startedAt) || 0;
    if (active && startedAt && now - startedAt <= ARCADE_LOCK_MS) return title;
  }
  return null;
}

const LEGACY_TABLES = [['points', '21 очко'], ['elements', 'Стихии']];

function miniAppDeadline(key, game) {
  if (key === 'pointsMiniApp') return game.phase === 'lobby' ? game.lobbyEndsAt : game.phase === 'playing' ? game.roundEndsAt : null;
  return game.phase === 'join' ? game.joinEndsAt
    : game.phase === 'betting' ? game.bettingEndsAt
      : game.phase === 'playing' ? game.turnEndsAt : null;
}

const MINIAPP_TABLES = [['pointsMiniApp', '21 очко'], ['elementsMiniApp', 'Стихии']];

/**
 * Name of the game (table or arcade) that currently holds this player's gold, or null.
 * `except` skips one game (a chat.game table key or a member arcade key), so
 * betting in your own game works.
 */
export function tableLockFor(chat, userId, now = Date.now(), except = null) {
  const id = String(userId);
  const games = chat?.game || {};

  for (const [key, title] of LEGACY_TABLES) {
    if (key === except) continue;
    const game = games[key];
    if (!game?.players || !Object.hasOwn(game.players, id)) continue;
    const last = Number(game.gameSessionLastUpdateAt) || 0;
    if (last && now - last <= LEGACY_LOCK_MS) return title;
  }

  for (const [key, title] of MINIAPP_TABLES) {
    if (key === except) continue;
    const game = games[key];
    if (!game?.players || !Object.hasOwn(game.players, id) || game.phase === 'finished') continue;
    if (!isStaleTable(game, miniAppDeadline(key, game), now)) return title;
  }

  const member = (chat?.members || []).find(item => String(item.userId) === id);
  return arcadeLockFor(member, now, except);
}

/** Shown when someone tries to rob a player who is seated at a table. */
export function robLockMessage(title) {
  return `Игрок сейчас в игре «${title}» со ставкой — ограбить его нельзя, пока партия не закончится.`;
}

export function goldLockMessage(title) {
  return `Ты сейчас в игре «${title}» со ставкой — золото нельзя тратить и переводить, пока партия не закончится.`;
}

/** The chat a member subdocument belongs to (Mongoose), when there is one. */
function chatOf(member) {
  return typeof member?.ownerDocument === 'function' ? member.ownerDocument() : null;
}

/**
 * Lock check for code that only has the member session. Returns the message
 * to show, or null when gold can be used.
 */
export function goldLockForMember(member, chat = chatOf(member), now = Date.now()) {
  if (!member) return null;
  const title = tableLockFor(chat, member.userId, now);
  return title ? goldLockMessage(title) : null;
}

const BET_SUFFIX = '(?:bet|double_bet|thousand_bet|xfive_bet|10t_bet|xten_bet|x20_bet|x50_bet|allin_bet)';

// Bot buttons that spend or send gold. The first group, when present, is the
// game chat id (these buttons often live in private messages).
const GOLD_SPEND_CALLBACKS = [
  /^builds\.([-0-9]+)\.[^.]+\.upgrade$/,
  /^builds\.([-0-9]+)\.forge\.craft_[a-zA-Z]+\.0$/,
  /^builds\.([-0-9]+)\.forge\.itemUpgrade_[0-9]+\.0$/,
  /^shop\.([-0-9]+)\.[^.]+\.[^.]+\.buy$/,
  /^lucky_roll\.([-0-9]+)\.[^.]+\.roll$/,
  /^player\.([-0-9]+)\.skills\.confirm_[0-9]+$/,
  /^sendGoldRecipient\.([-0-9]+)\./,
  /^clan\.contribute_gold$/,
  /^clan\.upgrade_[a-z]+$/,
];
// Bets in a game are fine for that game itself, not while in another one.
const OWN_GAME_BET_CALLBACK = new RegExp(`^(points|elements|basketball|bowling|darts|dice|football|slots)_${BET_SUFFIX}$`);

/**
 * For a bot callback: `{ chatId, except }` when it spends gold (chatId null
 * means the chat the button was pressed in), otherwise null.
 */
export function goldSpendCallback(data) {
  if (typeof data !== 'string') return null;
  const own = data.match(OWN_GAME_BET_CALLBACK);
  if (own) return { chatId: null, except: own[1] };
  for (const pattern of GOLD_SPEND_CALLBACKS) {
    const match = data.match(pattern);
    if (match) return { chatId: match[1] ?? null, except: null };
  }
  return null;
}

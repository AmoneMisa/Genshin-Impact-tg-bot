// Dice poker as played in the first Witcher: five dice with the faces 9, 10, J, Q, K, A, one throw and up to two
// re-throws of any dice, then the better combination wins the round. Pure rules: no DOM, the random source is injected.

export const FACES = Object.freeze(['9', '10', 'В', 'Д', 'К', 'Т']);
export const FACE_NAMES = Object.freeze(['девятка', 'десятка', 'валет', 'дама', 'король', 'туз']);
export const DICE = 5;
export const REROLLS = 2;
export const ROUNDS_TO_WIN = 3;
export const LEVELS = Object.freeze({ easy: 'Простой', hard: 'Сильный' });

/** From the weakest: what the hand is called and how it is built. */
export const COMBINATIONS = Object.freeze([
  ['Старшая кость', 'Ничего из списка: решает самая старшая кость'],
  ['Пара', 'Две одинаковые кости'],
  ['Две пары', 'Две разные пары'],
  ['Тройка', 'Три одинаковые кости'],
  ['Фулл-хаус', 'Тройка и пара'],
  ['Малый стрит', 'Девятка, десятка, валет, дама, король'],
  ['Большой стрит', 'Десятка, валет, дама, король, туз'],
  ['Каре', 'Четыре одинаковые кости'],
  ['Покер', 'Пять одинаковых костей'],
]);

const die = rng => Math.min(5, Math.floor(rng() * 6));

export function rollDice(count, rng = Math.random) {
  return Array.from({ length: count }, () => die(rng));
}

/** The hand: `rank` (index in COMBINATIONS) and `tiebreak`, the values that decide between equal ranks, most important first. */
export function evaluate(dice) {
  const counts = Array(6).fill(0);
  for (const value of dice) counts[value] += 1;
  const groups = counts.map((count, value) => ({ count, value })).filter(group => group.count).sort((a, b) => b.count - a.count || b.value - a.value);
  const shape = groups.map(group => group.count).join('');
  const values = groups.map(group => group.value);
  let rank = 0;
  if (shape === '5') rank = 8;
  else if (shape === '41') rank = 7;
  else if (shape === '32') rank = 4;
  else if (shape === '311') rank = 3;
  else if (shape === '221') rank = 2;
  else if (shape === '2111') rank = 1;
  else if (counts.slice(0, 5).every(Boolean)) { rank = 5; return { rank, tiebreak: [4], name: COMBINATIONS[rank][0] }; }
  else if (counts.slice(1).every(Boolean)) { rank = 6; return { rank, tiebreak: [5], name: COMBINATIONS[rank][0] }; }
  return { rank, tiebreak: values, name: COMBINATIONS[rank][0] };
}

/** A positive number when `a` beats `b`, negative when `b` wins, 0 for a tie. */
export function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i += 1) {
    const difference = (a.tiebreak[i] ?? -1) - (b.tiebreak[i] ?? -1);
    if (difference) return difference;
  }
  return 0;
}

/** One number for a hand, so hands can be averaged: the rank first, then the deciding values. */
const strength = hand => hand.tiebreak.reduce((total, value, i) => total + (value + 1) * 7 ** (4 - i) / 7 ** 5, hand.rank);

/** Everything a set of re-thrown dice can land on, with equal weight. */
function* outcomes(count) {
  const total = 6 ** count;
  for (let n = 0; n < total; n += 1) {
    const faces = [];
    for (let i = 0, rest = n; i < count; i += 1, rest = Math.floor(rest / 6)) faces.push(rest % 6);
    yield faces;
  }
}

/** The dice to keep (by index) that give the best average hand after one re-throw. */
function bestKeep(dice) {
  const current = strength(evaluate(dice));
  let best = { keep: dice.map((_, i) => i), average: current };
  for (let mask = 0; mask < 2 ** dice.length - 1; mask += 1) {
    const keep = dice.map((_, i) => i).filter(i => mask & (1 << i)), kept = keep.map(i => dice[i]);
    let sum = 0, n = 0;
    for (const faces of outcomes(dice.length - keep.length)) { sum += strength(evaluate([...kept, ...faces])); n += 1; }
    if (sum / n > best.average + 1e-9) best = { keep, average: sum / n };
  }
  return best.keep;
}

/** Easy: keeps what repeats and throws the rest, never chases a straight. */
function repeatedKeep(dice) {
  const counts = Array(6).fill(0);
  for (const value of dice) counts[value] += 1;
  const top = Math.max(...counts);
  if (top === 1) return [];
  const targets = counts.map((count, value) => (count === top || count >= 2 ? value : -1)).filter(value => value >= 0);
  return dice.map((value, i) => (targets.includes(value) ? i : -1)).filter(i => i >= 0);
}

/** The indexes of the dice the AI keeps; every index kept means it stands. */
export function aiKeep(dice, level = 'hard') {
  return level === 'easy' ? repeatedKeep(dice) : bestKeep(dice);
}

export function newMatch(rng = Math.random, level = 'hard') {
  return { level, round: 1, wins: { player: 0, ai: 0 }, phase: 'throw', rolls: { player: 0, ai: 0 }, dice: { player: rollDice(DICE, rng), ai: rollDice(DICE, rng) }, result: null, winner: null, history: [] };
}

/** The player re-throws the dice that are not in `keep` (indexes). Keeping all five stands. */
export function playerThrow(match, keep, rng = Math.random) {
  if (match.phase !== 'throw') return { error: 'Сейчас нельзя бросать кости' };
  const kept = new Set(keep);
  if (match.rolls.player >= REROLLS) return { error: 'Перебросов не осталось' };
  const dice = match.dice.player.map((value, i) => (kept.has(i) ? value : die(rng)));
  return { match: { ...match, dice: { ...match.dice, player: dice }, rolls: { ...match.rolls, player: match.rolls.player + 1 } } };
}

/** What the AI does with its throws after the player stands: every step, so the screen can show them one by one. */
export function aiSteps(match, rng = Math.random) {
  const steps = [];
  let dice = match.dice.ai;
  for (let roll = 0; roll < REROLLS; roll += 1) {
    const keep = aiKeep(dice, match.level);
    if (keep.length === dice.length) break;
    const kept = new Set(keep);
    dice = dice.map((value, i) => (kept.has(i) ? value : die(rng)));
    steps.push({ dice, keep });
  }
  return steps;
}

/** The round is decided: a point for the better hand, nothing for a tie (the round is thrown again). */
export function settleRound(match, aiDice = match.dice.ai) {
  const mine = evaluate(match.dice.player), theirs = evaluate(aiDice);
  const difference = compareHands(mine, theirs);
  const winner = difference > 0 ? 'player' : difference < 0 ? 'ai' : 'draw';
  const wins = { ...match.wins, ...(winner === 'draw' ? {} : { [winner]: match.wins[winner] + 1 }) };
  const over = wins.player >= ROUNDS_TO_WIN || wins.ai >= ROUNDS_TO_WIN;
  return { ...match, dice: { ...match.dice, ai: aiDice }, rolls: { player: REROLLS, ai: REROLLS }, wins, phase: over ? 'over' : 'result', winner: over ? (wins.player > wins.ai ? 'player' : 'ai') : null,
    result: { winner, player: mine, ai: theirs }, history: [...match.history, { round: match.round, winner, player: mine.name, ai: theirs.name }] };
}

/** The next round: a fresh throw for both. A drawn round does not count and keeps its number. */
export function nextRound(match, rng = Math.random) {
  if (match.phase !== 'result') return { error: 'Раунд ещё не закончен' };
  return { match: { ...match, round: match.result.winner === 'draw' ? match.round : match.round + 1, phase: 'throw', rolls: { player: 0, ai: 0 }, dice: { player: rollDice(DICE, rng), ai: rollDice(DICE, rng) }, result: null } };
}

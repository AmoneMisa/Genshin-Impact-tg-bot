// Shared by the browser editor and the authoritative multiplayer endpoint.
import { GWENT_DECKS, NEUTRAL } from './gwent-decks.js';
import { cardArtOptions } from './gwent-art-options.js';

export const MIN_UNITS = 22;
export const MAX_SPECIALS = 10;
const neutralIds = new Set(NEUTRAL.map(([card]) => card.id));

export function defaultLoadout(faction = 'northern-realms') {
  const deck = Object.hasOwn(GWENT_DECKS, faction) ? GWENT_DECKS[faction] : null;
  if (!deck) throw new Error('Неизвестная фракция');
  let remaining = MAX_SPECIALS;
  const counts = Object.fromEntries(deck.cards.map(([card, limit]) => {
    // Every unit at its full limit; one copy of each special card (the deck holds at most ten).
    const count = card.type === 'unit' ? limit : Math.min(remaining, 1);
    if (card.type !== 'unit') remaining -= count;
    return [card.id, count];
  }));
  return { faction, leaderId: deck.leaders[0].id, counts, arts: {} };
}

/**
 * A saved deck made under older copy limits, brought within today's limits: unknown cards dropped, counts
 * cut to the limit, special cards cut to the maximum. The result may still be invalid (too few units).
 */
export function repairLoadout(loadout) {
  const deck = loadout && Object.hasOwn(GWENT_DECKS, loadout.faction) ? GWENT_DECKS[loadout.faction] : null;
  if (!deck || !loadout.counts || typeof loadout.counts !== 'object' || Array.isArray(loadout.counts)) return loadout;
  const counts = {};
  let specials = 0;
  for (const [card, limit] of deck.cards) {
    let count = Number.isInteger(loadout.counts[card.id]) ? Math.max(0, Math.min(limit, loadout.counts[card.id])) : 0;
    if (card.type !== 'unit') { count = Math.min(count, MAX_SPECIALS - specials); specials += count; }
    counts[card.id] = count;
  }
  return { ...loadout, counts };
}

export function inspectLoadout(loadout) {
  const deck = loadout && Object.hasOwn(GWENT_DECKS, loadout.faction) ? GWENT_DECKS[loadout.faction] : null;
  const errors = [];
  let units = 0, specials = 0, heroes = 0, strength = 0;
  if (!deck) return { valid: false, errors: ['Выберите фракцию'], units, specials, heroes, strength, total: 0 };
  if (!deck.leaders.some(leader => leader.id === loadout.leaderId)) errors.push('Выберите одного лидера своей фракции');
  if (loadout.arts !== undefined) {
    const arts = loadout.arts;
    const allowed = new Set([...deck.cards.map(([card]) => card.id), ...deck.leaders.map(card => card.id)]);
    if (!arts || typeof arts !== 'object' || Array.isArray(arts) || Object.entries(arts).some(([id, index]) => !allowed.has(id)
      || !Number.isInteger(index) || index < 0 || index >= cardArtOptions(id).length)) errors.push('Недопустимый вариант изображения карты');
  }
  const counts = loadout.counts;
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) {
    return { valid: false, errors: ['Не указан состав колоды'], units, specials, heroes, strength, total: 0 };
  }
  const known = new Set(deck.cards.map(([card]) => card.id));
  if (Object.keys(counts).some(id => !known.has(id))) errors.push('В колоде есть карты другой фракции или неизвестные карты');
  for (const [card, limit] of deck.cards) {
    const count = Object.hasOwn(counts, card.id) ? counts[card.id] : 0;
    if (!Number.isInteger(count) || count < 0 || count > limit) {
      errors.push(`${card.name}: допустимо от 0 до ${limit} копий`);
      continue;
    }
    if (card.type === 'unit') {
      units += count; strength += count * card.strength;
      if (card.hero) heroes += count;
    } else specials += count;
  }
  if (units < MIN_UNITS) errors.push(`Нужно ещё ${MIN_UNITS - units} отрядов (минимум ${MIN_UNITS})`);
  if (specials > MAX_SPECIALS) errors.push(`Уберите ${specials - MAX_SPECIALS} особых карт (максимум ${MAX_SPECIALS})`);
  return { valid: !errors.length, errors, units, specials, heroes, strength, total: units + specials };
}

export function buildDeck(loadout) {
  const stats = inspectLoadout(loadout);
  if (!stats.valid) throw new Error(stats.errors.join('. '));
  const base = GWENT_DECKS[loadout.faction];
  const withArt = card => ({ ...card, artIndex: loadout.arts?.[card.id] ?? 0 });
  return { ...base, leaders: base.leaders.filter(leader => leader.id === loadout.leaderId).map(withArt),
    cards: base.cards.filter(([card]) => loadout.counts[card.id] > 0).map(([card]) => [withArt(card), loadout.counts[card.id]]) };
}

export function cardTraits(card) {
  if (card.type === 'special') return ({ decoy: 'Чучело', horn: 'Командирский рог', scorch: 'Казнь', weather: 'Погода', mardroeme: 'Мардрём', ambush: 'Засада' })[card.special] || '';
  return [[card.hero, 'Герой'], [card.spy, 'Шпион'], [card.medic, 'Медик'], [card.bond, 'Связь'],
    [card.morale, 'Прилив сил'], [card.horn, 'Командирский рог'], [card.muster, 'Призыв'],
    [card.agile, 'Проворство'], [card.swap, 'Подмена'], [card.transformsTo, 'Берсерк'], [card.onPlay?.type === 'scorchRow', 'Казнь'],
    [card.onDestroy, 'Возмездие']].filter(([value]) => value).map(([, label]) => label).join(' · ');
}

export function filterCards(loadout, { search = '', row = '', type = '', ability = '', origin = '', included = false, sort = 'name' } = {}) {
  const query = search.trim().toLocaleLowerCase('ru');
  const cards = (GWENT_DECKS[loadout.faction]?.cards || []).filter(([card]) => {
    if (query && !`${card.name} ${cardTraits(card)}`.toLocaleLowerCase('ru').includes(query)) return false;
    if (row && !card.rows?.includes(row)) return false;
    if (type === 'hero' ? !card.hero : type && card.type !== type) return false;
    if (ability && !(ability === 'weather' ? card.special === 'weather' : ability === 'scorch' ? card.special === 'scorch' || card.onPlay?.type === 'scorchRow' : ability === 'horn' ? card.horn || card.special === 'horn' : card[ability])) return false;
    if (origin && (origin === 'neutral') !== neutralIds.has(card.id)) return false;
    return !included || loadout.counts[card.id] > 0;
  });
  return cards.sort(([a], [b]) => sort === 'strength' ? b.strength - a.strength || a.name.localeCompare(b.name, 'ru') : a.name.localeCompare(b.name, 'ru'));
}

export function leaderDescription(leader) {
  const e = leader.effect;
  const row = { close: 'ближнего боя', ranged: 'дальнего боя', siege: 'осады' };
  if (e.type === 'double') return `Удваивает силу обычных отрядов ряда ${row[e.row]}.`;
  if (e.type === 'weather') return `Применяет погоду: ${{ close: 'Мороз', ranged: 'Мгла', siege: 'Ливень', clear: 'Ясное небо' }[e.weather]}.`;
  if (e.type === 'scorchRow') return `Уничтожает сильнейшие обычные отряды вражеского ряда ${row[e.target]}, если сила его ряда ${row[e.cond]} не меньше ${e.threshold}.`;
  return ({ 'passive-bran': 'Постоянно: отряды теряют в погоде половину силы.', 'passive-extra-draw': 'Постоянно: дополнительная карта в начале раунда.',
    shuffleGraveyards: 'Возвращает карты из отбоя обеих сторон в колоды.', reveal: 'Показывает три карты из руки противника.',
    cancelEnemyLeader: 'Отменяет способность лидера противника.', takeEnemyGraveyard: 'Позволяет выбрать обычный отряд из отбоя противника.',
    returnFromGraveyard: 'Позволяет вернуть карту из своего отбоя.', discardDraw: 'Сбросьте две карты и выберите карту из колоды.',
    weatherBest: 'Позволяет выбрать погодную карту из колоды.', moveAgile: 'Позволяет выбрать ряды для проворных отрядов.', moveAny: 'Переносит до трёх ваших обычных отрядов в другие ряды по вашему выбору.',
    reviveAny: 'Позволяет медикам обеих сторон возвращать героев.' })[e.type] || 'Особая способность лидера.';
}

const LEADER_PREFERENCE = ['double', 'scorchRow', 'reviveAny', 'takeEnemyGraveyard', 'weatherBest', 'discardDraw', 'returnFromGraveyard'];

/**
 * The deck a computer opponent plays. Easy and medium take every available card with a random
 * leader. Hard builds a tight deck of the strongest cards (24 units at most, whole bond and muster
 * groups) and a leader with a strong active effect.
 */
export function aiLoadout(faction, level = 'medium', rng = Math.random) {
  const deck = GWENT_DECKS[faction];
  const base = defaultLoadout(faction);
  const pool = deck.leaders;
  base.leaderId = pool[Math.floor(rng() * pool.length)].id;
  if (level !== 'hard') return base;
  const preferred = LEADER_PREFERENCE.map(type => pool.find(leader => leader.effect.type === type)).find(Boolean);
  if (preferred) base.leaderId = preferred.id;
  const value = card => card.strength * (card.bond ? 1.6 : 1) + (card.hero ? 5 : 0) + (card.muster ? 3 : 0)
    + (card.spy ? 4 : 0) + (card.medic ? 4 : 0) + (card.morale || card.horn ? 4 : 0);
  const units = deck.cards.filter(([card]) => card.type === 'unit').sort((a, b) => value(b[0]) - value(a[0]));
  const counts = {};
  let total = 0;
  for (const [card, limit] of units) {
    if (total >= 24) break;
    const take = card.bond || card.muster ? limit : Math.min(limit, 24 - total);
    counts[card.id] = take; total += take;
  }
  for (const [card, limit] of units) if (total < MIN_UNITS && !counts[card.id]) { counts[card.id] = Math.min(limit, MIN_UNITS - total); total += counts[card.id]; }
  const wanted = ['horn', 'scorch', 'decoy', 'weather', 'mardroeme'];
  let specials = 0;
  for (const special of wanted) for (const [card, limit] of deck.cards) {
    if (card.type === 'unit' || card.special !== special || specials >= 8) continue;
    counts[card.id] = Math.min(limit, special === 'weather' || special === 'mardroeme' ? 1 : 2, 8 - specials); specials += counts[card.id];
  }
  for (const [card] of deck.cards) counts[card.id] ||= 0;
  return { ...base, counts };
}

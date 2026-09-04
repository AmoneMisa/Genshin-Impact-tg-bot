import gachaTemplate from '../../../template/gachaTemplate.js';

export default function normalizeGachaState(session) {
  const game = session.game;
  const legacy = game.gacha;
  let normalized = [];

  if (Array.isArray(legacy)) {
    normalized = legacy
      .filter((item) => item && typeof item === 'object' && item.name)
      .map((item) => ({
        name: item.name,
        freeSpins: Number(item.freeSpins) || 0,
      }));
  } else if (legacy && typeof legacy === 'object') {
    normalized = gachaTemplate
      .filter((template) => Object.prototype.hasOwnProperty.call(legacy, template.name))
      .map((template) => ({
        name: template.name,
        freeSpins: Number(legacy[template.name]) || 0,
      }));
  }

  game.gacha = normalized;

  game.inventory.gacha = game.inventory.gacha || { name: 'Предметы гачи', items: [] };
  game.inventory.gacha.items = Array.isArray(game.inventory.gacha.items)
    ? game.inventory.gacha.items
    : [];

  return game.gacha;
}

export function ensureGachaEntry(session, gachaType) {
  const list = normalizeGachaState(session);
  let entry = list.find((item) => item.name === gachaType);
  if (entry) return entry;

  const template = gachaTemplate.find((item) => item.name === gachaType);
  if (!template) throw new Error(`Unknown gacha type: ${gachaType}`);

  entry = { name: gachaType, freeSpins: template.freeSpins };
  list.push(entry);
  return entry;
}

export function getGachaShardEntry(session, gachaType, create = false) {
  normalizeGachaState(session);
  const items = session.game.inventory.gacha.items;
  let entry = items.find((item) => item.name === gachaType);

  if (!entry && create) {
    entry = { name: gachaType, value: 0 };
    items.push(entry);
  }

  return entry || null;
}

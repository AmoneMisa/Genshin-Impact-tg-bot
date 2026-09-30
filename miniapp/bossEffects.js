// Pure DTO helpers for the boss HUD status rows. Kept free of bot / database
// imports so they can be used (and tested) without a bot token or MongoDB.

import { getBossAttacks } from '../template/bossAttacksTemplate.js';

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const EFFECT_LABELS = Object.freeze({
  shield: { id: 'shield', label: 'Щит' },
  addDamageToBoss: { id: 'damageUp', label: 'Урон по боссу' },
  addCritChanceToBoss: { id: 'critChanceUp', label: 'Шанс крита' },
  addCritDamageToBoss: { id: 'critDamageUp', label: 'Сила крита' },
});

/** Player buffs/debuffs for the status row of the player frame. */
export function playerEffectsDto(effects, respawnRemainMs = 0) {
  const list = (Array.isArray(effects) ? effects : []).map(effect => {
    const known = EFFECT_LABELS[effect?.name] || { id: String(effect?.name || 'effect'), label: String(effect?.name || 'Эффект') };
    return {
      id: known.id,
      label: known.label,
      value: number(effect?.value ?? effect?.amount, 0) || null,
      count: Number.isFinite(Number(effect?.count)) ? number(effect.count) : null,
    };
  });
  if (respawnRemainMs > 0) list.unshift({ id: 'dead', label: 'Воскрешение', value: null, count: null });
  return list;
}

/** Boss status icons: its active skill (reflect, regen, rage, ...). */
export function bossStatusesDto(boss) {
  const skill = boss?.skill;
  if (!skill || !skill.effect) return [];
  return [{ id: String(skill.effect), label: skill.name || String(skill.effect), description: skill.description || '' }];
}

/** The boss's own attacks, for the "Атаки босса" row. */
export function bossAttacksDto(bossName) {
  return getBossAttacks(bossName).map(({ key, name, icon, target, description }) => ({ key, name, icon, target, description }));
}

/** Latest boss casts, newest first; `you` marks the viewer's own hits. */
export function attackLogDto(log, viewerId, now = Date.now()) {
  return (Array.isArray(log) ? log : []).slice(0, 5).map(record => ({
    key: String(record?.key || ''),
    name: String(record?.name || ''),
    icon: String(record?.icon || ''),
    target: record?.target === 'all' ? 'all' : 'single',
    at: number(record?.at),
    agoMs: Math.max(0, now - number(record?.at)),
    hits: (Array.isArray(record?.hits) ? record.hits : []).map(hit => ({
      userId: String(hit?.userId ?? ''),
      name: String(hit?.name || ''),
      dmg: number(hit?.dmg),
      absorbed: number(hit?.absorbed),
      killed: Boolean(hit?.killed),
      you: viewerId != null && String(hit?.userId) === String(viewerId),
    })),
  }));
}

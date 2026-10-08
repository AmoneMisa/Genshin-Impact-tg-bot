// Class buffs (Lineage II style): the buffs of template/buffPotions.js cast by the
// class itself, for MP, at a buff level that grows with the character's level.
// Support classes (priest line) can also buff other players of the chat.

import buffPotions from '../template/buffPotions.js';
import { BUFF_LEVEL_FACTOR, buffLevelAt, canBuffOthers, classBuffsFor } from '../template/classBuffs.js';
import { applyPotionBuff, scaleModifier } from '../functions/game/player/potionBuffs.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import { memberName } from './social.js';

export const BUFF_CAST_COOLDOWN_MS = 20_000;
const OTHERS_COST_MULTIPLIER = 1.5;

const STAT_TEXT = {
  attackMul: { label: 'Атака', unit: '%', mul: true },
  defenceMul: { label: 'Защита', unit: '%', mul: true },
  speedMul: { label: 'Боевая скорость', unit: '%', mul: true },
  criticalDamage: { label: 'Крит. урон', unit: '%', mul: true },
  criticalChance: { label: 'Шанс крита', unit: '', mul: false },
  accuracy: { label: 'Точность', unit: '', mul: false },
  speed: { label: 'Скорость', unit: '', mul: false },
};

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const round = value => Math.round(value * 10) / 10;

/** "Атака +8.7%" lines for a buff at a given strength. */
export function describeBuff(definition, factor) {
  return Object.entries(definition.modifiers).map(([stat, value]) => {
    const text = STAT_TEXT[stat];
    if (!text) return null;
    const scaled = scaleModifier(value, text.mul, factor);
    const amount = text.mul ? round((scaled - 1) * 100) : round(scaled);
    return `${text.label} +${amount}${text.unit}`;
  }).filter(Boolean).join(', ');
}

function profile(session) {
  const stats = session?.game?.gameClass?.stats || {};
  return { className: stats.name || 'noClass', classTitle: stats.translateName || stats.name || 'Без класса', level: Math.max(1, number(session?.game?.stats?.lvl, 1)) };
}

export function buffManaCost(session, level, forOthers = false) {
  const maxMp = Math.max(1, number(getMaxMp(session, session.game.gameClass), 1));
  const base = Math.max(10, Math.ceil(maxMp * (0.04 + 0.02 * level)));
  return forOthers ? Math.ceil(base * OTHERS_COST_MULTIPLIER) : base;
}

function chatMembers(session) {
  const chat = typeof session?.ownerDocument === 'function' ? session.ownerDocument() : null;
  return Array.isArray(chat?.members) ? chat.members : [];
}

const isListed = member => member && !member.isHided && !member.userChatData?.user?.is_bot;

export function getClassBuffsState(session, now = Date.now()) {
  const { className, classTitle, level } = profile(session);
  const learned = classBuffsFor(className);
  const effects = session?.game?.effects || [];
  const cooldowns = session?.game?.buffCastAt || {};
  const support = canBuffOthers(className);

  const buffs = buffPotions.map(definition => {
    const unlocks = learned[definition.id] || [];
    const buffLevel = buffLevelAt(className, definition.id, level);
    const shown = Math.max(1, buffLevel);
    const active = effects.find(effect => effect?.potionId === definition.id && number(effect.until) > now);
    return {
      id: definition.id,
      name: definition.name.replace(/^Зелье\s+/, ''),
      artKey: definition.artKey,
      learnable: unlocks.length > 0,
      level: buffLevel,
      maxLevel: unlocks.length,
      nextLevelAt: unlocks[buffLevel] ?? null,
      firstLevelAt: unlocks[0] ?? null,
      effect: describeBuff(definition, BUFF_LEVEL_FACTOR[shown]),
      cost: buffManaCost(session, shown),
      costOthers: support ? buffManaCost(session, shown, true) : null,
      cooldownUntil: Math.max(0, number(cooldowns[definition.id])),
      active: active ? { until: number(active.until), factor: number(active.factor, 1) } : null,
    };
  }).filter(buff => buff.learnable);

  return {
    className,
    classTitle,
    level,
    support,
    mp: number(getCurrentMp(session, session.game.gameClass)),
    maxMp: Math.max(1, number(getMaxMp(session, session.game.gameClass), 1)),
    durationMinutes: Math.round(buffPotions[0].seconds / 60),
    buffs,
    players: support ? chatMembers(session).filter(isListed).map(member => ({ userId: String(member.userId), name: memberName(member) })) : [],
  };
}

/** Casts a class buff on yourself or, for support classes, on another player of the chat. */
export function castClassBuff(session, buffId, targetId = null, now = Date.now()) {
  const definition = buffPotions.find(potion => potion.id === buffId);
  if (!definition) return { ok: false, reason: 'unknown_buff' };

  const { className, level } = profile(session);
  const buffLevel = buffLevelAt(className, buffId, level);
  if (buffLevel < 1) return { ok: false, reason: 'not_learned' };
  if (number(getCurrentHp(session, session.game.gameClass)) <= 0) return { ok: false, reason: 'player_dead' };

  const self = targetId === null || targetId === undefined || String(targetId) === String(session.userId);
  let target = session;
  if (!self) {
    if (!canBuffOthers(className)) return { ok: false, reason: 'self_only' };
    target = chatMembers(session).find(member => String(member.userId) === String(targetId));
    if (!isListed(target)) return { ok: false, reason: 'unknown_player' };
  }

  if (!session.game.buffCastAt || typeof session.game.buffCastAt !== 'object') session.game.buffCastAt = {};
  if (number(session.game.buffCastAt[buffId]) > now) {
    return { ok: false, reason: 'cooldown', cooldownUntil: session.game.buffCastAt[buffId] };
  }

  if (!target.game) target.game = {};
  const cost = buffManaCost(session, buffLevel, !self);
  const mp = number(getCurrentMp(session, session.game.gameClass));
  if (mp < cost) return { ok: false, reason: 'not_enough_mp', cost, mp };

  session.game.gameClass.stats.mp = mp - cost;
  session.game.buffCastAt[buffId] = now + BUFF_CAST_COOLDOWN_MS;
  const factor = BUFF_LEVEL_FACTOR[buffLevel];
  const effect = applyPotionBuff(target, buffId, now, { factor });
  return {
    ok: true,
    buff: buffId,
    level: buffLevel,
    onSelf: self,
    targetName: self ? null : memberName(target),
    until: effect.until,
    kept: number(effect.factor, 1) > factor,
    spent: cost,
  };
}

// Passive skills (Lineage II): permanent stat bonuses a class learns with skill points (ОП) and gold.
// Every class family has its own four; each has five levels that need a character level. The bonus
// is a delta: attackMul 0.02 per level is +2% attack, criticalChance 1.5 per level is +1.5 points.
//
// Learned levels live in session.game.passives = {id: level}. Only the passives of the current class
// family count, so a class change keeps what was learned but switches it off.
import { classFamily } from '../classes/classFamily.js';

export const PASSIVE_MAX_LEVEL = 5;
/** Character level needed for passive level 1..5. */
export const PASSIVE_NEED_LEVEL = Object.freeze([10, 25, 40, 55, 70]);
/** Skill points and gold for passive level 1..5. */
export const PASSIVE_COST = Object.freeze([
  { sp: 15, gold: 1500 }, { sp: 30, gold: 5000 }, { sp: 60, gold: 15000 }, { sp: 100, gold: 35000 }, { sp: 160, gold: 80000 },
]);

const p = (id, name, text, stat, per, families) => ({ id, name, text, stat, per, families });

export const PASSIVES = Object.freeze([
  p('weapon-mastery', 'Мастерство оружия', 'Атака', 'attackMul', 0.02, ['warrior', 'berserk', 'archer', 'rogue']),
  p('magic-mastery', 'Мастерство магии', 'Атака', 'attackMul', 0.025, ['mage']),
  p('heavy-armor-mastery', 'Мастерство тяжёлой брони', 'Защита', 'defenceMul', 0.025, ['warrior', 'berserk']),
  p('robe-mastery', 'Мастерство мантий', 'Защита', 'defenceMul', 0.02, ['mage', 'priest']),
  p('light-armor-mastery', 'Мастерство лёгкой брони', 'Уклонение', 'evasion', 2, ['archer', 'rogue']),
  p('boost-hp', 'Прилив здоровья', 'Максимальное HP', 'maxHpMul', 0.03, ['warrior', 'berserk', 'priest']),
  p('boost-mana', 'Прилив маны', 'Максимальная мана', 'maxMpMul', 0.04, ['mage', 'priest']),
  p('critical-power', 'Критическая мощь', 'Критический урон', 'criticalDamage', 0.03, ['warrior', 'berserk', 'rogue']),
  p('critical-chance', 'Критический шанс', 'Шанс крита', 'criticalChance', 1.5, ['archer', 'rogue', 'mage']),
  p('accuracy', 'Меткость', 'Точность', 'accuracy', 2, ['archer', 'mage']),
  p('quick-recovery', 'Быстрое восстановление', 'Перезарядка навыков', 'skillCooltimeMul', -0.02, ['berserk', 'mage']),
  p('healing-power', 'Сила исцеления', 'Сила лечения', 'healPowerMul', 0.04, ['priest']),
  p('toughness', 'Стойкость', 'Получаемый урон', 'incomingDamageModifier', -0.015, ['priest', 'warrior']),
].map(Object.freeze));

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const familyOf = session => classFamily(session?.game?.gameClass?.stats?.name || 'noClass');

export const passivesForFamily = family => PASSIVES.filter(passive => passive.families.includes(family));

export function learnedLevel(session, id) {
  const level = Math.floor(number(session?.game?.passives?.[id]));
  return Math.max(0, Math.min(PASSIVE_MAX_LEVEL, level));
}

/** Stat deltas of every active passive: {attackMul: 0.04, evasion: 4}. */
export function passiveModifiers(session) {
  const result = {};
  for (const passive of passivesForFamily(familyOf(session))) {
    const level = learnedLevel(session, passive.id);
    if (level) result[passive.stat] = (result[passive.stat] || 0) + passive.per * level;
  }
  return result;
}

const percentText = (passive, level) => (passive.stat === 'evasion' || passive.stat === 'criticalChance' || passive.stat === 'accuracy'
  ? `+${Math.round(passive.per * level * 10) / 10}`
  : `${passive.per * level > 0 ? '+' : ''}${Math.round(passive.per * level * 1000) / 10}%`);

export function getPassivesState(session) {
  const family = familyOf(session);
  const level = Math.max(1, number(session?.game?.stats?.lvl, 1));
  const sp = Math.max(0, number(session?.game?.inventory?.sp));
  const gold = Math.max(0, number(session?.game?.inventory?.gold));
  return {
    family,
    level,
    sp,
    gold,
    maxLevel: PASSIVE_MAX_LEVEL,
    passives: passivesForFamily(family).map(passive => {
      const have = learnedLevel(session, passive.id);
      const next = have < PASSIVE_MAX_LEVEL ? have + 1 : null;
      const cost = next ? PASSIVE_COST[next - 1] : null;
      return {
        id: passive.id,
        name: passive.name,
        stat: passive.text,
        level: have,
        maxLevel: PASSIVE_MAX_LEVEL,
        current: have ? percentText(passive, have) : null,
        next: next ? percentText(passive, next) : null,
        needLvl: next ? PASSIVE_NEED_LEVEL[next - 1] : null,
        cost,
        canLearn: Boolean(next) && level >= PASSIVE_NEED_LEVEL[next - 1] && sp >= cost.sp && gold >= cost.gold,
      };
    }),
  };
}

/** Raises one passive by a level. The caller saves the session. */
export function learnPassive(session, id) {
  const passive = passivesForFamily(familyOf(session)).find(entry => entry.id === id);
  if (!passive) return { ok: false, reason: 'unknown_passive' };
  const have = learnedLevel(session, id);
  if (have >= PASSIVE_MAX_LEVEL) return { ok: false, reason: 'max_level' };

  const next = have + 1;
  if (number(session.game.stats?.lvl, 1) < PASSIVE_NEED_LEVEL[next - 1]) return { ok: false, reason: 'level_too_low', needLvl: PASSIVE_NEED_LEVEL[next - 1] };
  const cost = PASSIVE_COST[next - 1];
  const inventory = session.game.inventory;
  if (number(inventory.sp) < cost.sp) return { ok: false, reason: 'not_enough_sp', missing: cost.sp - number(inventory.sp) };
  if (number(inventory.gold) < cost.gold) return { ok: false, reason: 'not_enough_gold', missing: cost.gold - number(inventory.gold) };

  inventory.sp = number(inventory.sp) - cost.sp;
  inventory.gold = number(inventory.gold) - cost.gold;
  if (!session.game.passives || typeof session.game.passives !== 'object') session.game.passives = {};
  session.game.passives[id] = next;
  return { ok: true, id, level: next, name: passive.name };
}

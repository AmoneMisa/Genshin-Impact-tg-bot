import { getPlayerProfileState } from './playerProfile.js';
import { createMiniAppState } from './state.js';
import { getEquipmentState } from './equipment.js';
import { getSkillsState } from './skills.js';
import { getClassBuffsState, describeBuff } from './buffs.js';
import { getBaseStatsState } from '../functions/game/player/baseStats.js';
import { getAttributesState } from '../functions/game/equipment/attributes.js';
import { getPassivesState } from '../functions/game/player/passiveSkills.js';
import { CLAN_SKILLS } from '../functions/game/clans/clanPerks.js';
import { describeSkill } from '../functions/game/equipment/lifestoneSkills.js';
import buffPotions from '../template/buffPotions.js';
import getAttack from '../functions/game/player/getters/getAttack.js';
import getDefence from '../functions/game/player/getters/getDefence.js';
import getSpeed from '../functions/game/player/getters/getSpeed.js';
import getAccuracy from '../functions/game/player/getters/getAccuracy.js';
import getEvasion from '../functions/game/player/getters/getEvasion.js';
import getCriticalChance from '../functions/game/player/getters/getCriticalChance.js';
import getCriticalDamage from '../functions/game/player/getters/getCriticalDamage.js';

const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const LABELS = { shield:'Щит', addDamageToBoss:'Урон по боссу', addCritChanceToBoss:'Шанс крита', addCritDamageToBoss:'Сила крита', guard:'Защитная стойка', taunt:'Провокация', evade:'Уклонение', haste:'Ускорение' };

/** Only effects stored on this player; boss debuffs never appear as player effects. */
export function characterEffects(session, now = Date.now()) {
  const effects = (session?.game?.effects || []).filter(effect => effect && (!effect.until || num(effect.until) > now)
    && (effect.count == null || num(effect.count) > 0)
    && (effect.name !== 'shield' || num(effect.value) > 0)).map((effect, index) => {
    const potion = buffPotions.find(entry => entry.id === effect.potionId);
    return {
      id: String(effect.potionId || effect.name || 'effect') + ':' + index,
      name: potion ? potion.name.replace(/^Зелье\s+/, '') : LABELS[effect.name] || String(effect.name || 'Эффект'),
      iconKey: effect.potionId || effect.name || 'utility',
      source: potion ? 'Бафф / зелье' : 'Боевой эффект',
      description: potion ? describeBuff(potion, Math.min(1.3, Math.max(.1, num(effect.factor) || 1)))
        : effect.value != null ? 'Значение: ' + num(effect.value) : effect.amount != null ? 'Бонус: ' + num(effect.amount) * (['guard','evade','haste'].includes(effect.name) ? 100 : 1) + '%' : '',
      until: num(effect.until) || null,
      charges: effect.count == null ? null : num(effect.count),
      kind: effect.isDebuff || effect.kind === 'debuff' ? 'debuff' : 'buff',
    };
  });
  const ls = session?.game?.lsBuff;
  const skill = describeSkill(ls);
  if (skill && num(ls.until) > now) effects.push({
    id:'ls:' + skill.id, name:skill.name, iconKey:skill.id, source:'Активная аугментация ЛС',
    description:skill.text, until:num(ls.until), charges:null, kind:'buff',
  });
  return effects;
}

function combatValue(session, getter, raw) {
  // Legacy documents without equipmentStats use raw class values, as in bootstrap.
  if (!session?.game?.equipmentStats) return num(raw);
  const value = getter(session, session.game.gameClass);
  return Number.isFinite(Number(value)) ? Number(value) : num(raw);
}

/** One authenticated snapshot for all four character tabs. No clan roster or private data. */
export function getCharacterState(session, context = {}, now = Date.now()) {
  // Expired equipment is removed before calculating stats and effects.
  const equipment = getEquipmentState(session);
  const state = createMiniAppState(session, context);
  const raw = session?.game?.gameClass?.stats || {};
  const getters = [
    ['attack','Атака',getAttack,raw.attack], ['defence','Защита',getDefence,raw.defence],
    ['speed','Скорость',getSpeed,raw.speed], ['accuracy','Точность',getAccuracy,raw.accuracy],
    ['evasion','Уклонение',getEvasion,raw.evasion], ['criticalChance','Шанс крита',getCriticalChance,raw.criticalChance],
    ['criticalDamage','Крит. урон',getCriticalDamage,raw.criticalDamage],
  ];
  return {
    profile:getPlayerProfileState(session, now), player:state.player,
    name:context.user?.first_name || context.user?.firstName || context.user?.username || 'Путешественник',
    characteristics:getBaseStatsState(session),
    combat:getters.map(([id,label,getter,rawValue]) => ({id,label,value:combatValue(session,getter,rawValue)})),
    attributes:getAttributesState(session), equipment, skills:getSkillsState(session),
    passives:getPassivesState(session), buffs:getClassBuffsState(session, now),
    effects:characterEffects(session, now),
    clanPassives:CLAN_SKILLS.map(entry => {
      const level = Math.min(5, Math.max(0, Math.floor(num(session?.game?.clanPerks?.[entry.id]))));
      const amount = entry.per * level;
      return {id:entry.id,name:entry.name,level,stat:entry.text,
        bonus:entry.stat === 'accuracy' || entry.stat === 'evasion' ? '+' + amount : '+' + Math.round(amount * 1000) / 10 + '%'};
    }).filter(entry => entry.level > 0),
  };
}
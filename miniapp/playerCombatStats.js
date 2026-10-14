import getAttack from '../functions/game/player/getters/getAttack.js';
import getDefence from '../functions/game/player/getters/getDefence.js';
import getSpeed from '../functions/game/player/getters/getSpeed.js';
import getAccuracy from '../functions/game/player/getters/getAccuracy.js';
import getEvasion from '../functions/game/player/getters/getEvasion.js';
import getCriticalChance from '../functions/game/player/getters/getCriticalChance.js';
import getCriticalDamage from '../functions/game/player/getters/getCriticalDamage.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getMaxCp from '../functions/game/player/getters/getMaxCp.js';

const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function combatValue(session, getter, raw) {
  // Legacy documents without equipmentStats use raw class values, as in bootstrap.
  if (!session?.game?.equipmentStats) return num(raw);
  const value = getter(session, session.game.gameClass);
  return Number.isFinite(Number(value)) ? Number(value) : num(raw);
}

export function getPlayerResourceStats(session) {
  const raw = session?.game?.gameClass?.stats || {};
  return Object.fromEntries([
    ['maxHp',getMaxHp,raw.maxHp ?? raw.hp ?? raw.health ?? 1],
    ['maxMp',getMaxMp,raw.maxMp ?? raw.mp ?? 1],
    ['maxCp',getMaxCp,raw.maxCp ?? raw.cp ?? 1],
  ].map(([id,getter,fallback])=>[id,Math.max(1,combatValue(session,getter,fallback))]));
}

/** Shared visible combat values for the character window and paid class service. */
export function getPlayerCombatStats(session) {
  const raw = session?.game?.gameClass?.stats || {};
  const getters = [
    ['pAtk','Физ. атака',s=>getAttack(s,s.game.gameClass,'physical'),raw.pAtk ?? raw.attack],
    ['mAtk','Маг. атака',s=>getAttack(s,s.game.gameClass,'magic'),raw.mAtk ?? raw.attack],
    ['pDef','Физ. защита',s=>getDefence(s,s.game.gameClass,'physical'),raw.pDef ?? raw.defence],
    ['mDef','Маг. защита',s=>getDefence(s,s.game.gameClass,'magic'),raw.mDef ?? raw.defence],
    ['speed','Скорость',getSpeed,raw.speed], ['accuracy','Точность',getAccuracy,raw.accuracy],
    ['evasion','Уклонение',getEvasion,raw.evasion], ['criticalChance','Шанс крита',getCriticalChance,raw.criticalChance],
    ['criticalDamage','Крит. урон',getCriticalDamage,raw.criticalDamage],
  ];
  return getters.map(([id,label,getter,rawValue]) => {
      const value= combatValue(session,getter,rawValue);
      // Combat getters use percent internally. The L2 Status window displays
      // physical critical rating in integer units out of 1000, capped at 500.
      return id==='criticalChance'?{id,label,value:Math.min(500,Math.max(0,Math.floor(value*10))),unit:'rating',max:500}:{id,label,value};
    });
}

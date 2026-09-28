import classes from '../template/classStatsTemplate.js';
import getClassStatsFromTemplate from '../functions/game/player/getters/getGameClassStatsFromTemplate.js';
import changePlayerClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';

const CLASS_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const GENDERS = new Set(['male', 'female']);

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function statDto(stats = {}) {
  return {
    attack: number(stats.attack),
    defence: number(stats.defence),
    maxHp: number(stats.maxHp ?? stats.hp),
    maxMp: number(stats.maxMp ?? stats.mp),
    maxCp: number(stats.maxCp ?? stats.cp),
    speed: number(stats.speed),
    criticalChance: number(stats.criticalChance),
    criticalDamage: number(stats.criticalDamage, 1),
    block: number(stats.block),
    accuracy: number(stats.accuracy),
    evasion: number(stats.evasion),
  };
}

function classDto(template, level) {
  const scaled = getClassStatsFromTemplate(template.name, level) || template;
  return {
    name: template.name,
    title: template.translateName,
    description: template.description,
    stats: statDto(scaled),
  };
}

export function getPlayerProfileState(session, now = Date.now()) {
  const game = session?.game || {};
  const stats = game.stats || {};
  const current = game.gameClass?.stats || {};
  const level = Math.max(1, number(stats.lvl, 1));
  const currentName = current.name || 'noClass';
  const timer = Math.max(0, number(session?.changeClassTimer));

  return {
    level,
    gender: GENDERS.has(session?.gender) ? session.gender : 'male',
    currentClass: {
      name: currentName,
      title: current.translateName || classes.find(item => item.name === currentName)?.translateName || 'Бродяжка',
      stats: statDto(current),
    },
    classChangeRemainingMs: currentName === 'noClass' ? 0 : Math.max(0, timer - now),
    classes: classes
      .filter(item => item.name !== 'noClass')
      .map(item => classDto(item, level)),
  };
}

export function changePlayerClassForMiniApp(session, className, now = Date.now()) {
  const target = classes.find(item => item.name === className && item.name !== 'noClass');
  if (!target) return { ok: false, reason: 'unknown_class' };

  const currentName = session?.game?.gameClass?.stats?.name || 'noClass';
  if (currentName === className) return { ok: false, reason: 'same_class' };

  const cooldownRemainingMs = currentName === 'noClass'
    ? 0
    : Math.max(0, number(session?.changeClassTimer) - now);
  if (cooldownRemainingMs > 0) {
    return { ok: false, reason: 'class_cooldown', cooldownRemainingMs };
  }

  session.changeClassTimer = now + CLASS_CHANGE_COOLDOWN_MS;
  changePlayerClass(session, target);
  updatePlayerStats(session);

  return {
    ok: true,
    className,
    classTitle: target.translateName,
    profile: getPlayerProfileState(session, now),
  };
}

export function changePlayerGenderForMiniApp(session, gender, now = Date.now()) {
  if (!GENDERS.has(gender)) return { ok: false, reason: 'unknown_gender' };
  session.gender = gender;
  return {
    ok: true,
    gender,
    profile: getPlayerProfileState(session, now),
  };
}

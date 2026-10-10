// Clan Hall (Scryde): five levels of development. A level needs a number of Glory points and gold from the clan warehouse;
// every level opens the next level of the Clan Hall skills, which every member has while in the clan.
//
// Glory comes from Glory Coins: a member earns them for killing enemy characters in field PvP and for raids on the epic
// bosses (Valakas, Antharas, Baium) and hands them in; every coin is one Glory point of the clan. The hall also collects a
// few Glory points by itself every hour (the farm premises).
//
// The state is clan.hall = {level, glory, lastTickAt}; a member's copy of the skill levels lives in game.clanPerks under
// `hall:<key>` (clanPerks.js syncClanPerks), which is what hallModifiers reads.
export const HALL_MAX_LEVEL = 5;
export const HALL_PREFIX = 'hall:';

/** What a hall level costs (Glory points that must have been gathered, gold of the warehouse) and what it gives. */
export const HALL_LEVELS = Object.freeze([
    {level: 1, glory: 0, gold: 0, farmGloryPerHour: 0, enchantBonus: 0, shop: 1, teleports: ['Город клана']},
    {level: 2, glory: 1000, gold: 300_000, farmGloryPerHour: 5, enchantBonus: 0.01, shop: 2, teleports: ['Логово муравьёв', 'Долина драконов']},
    {level: 3, glory: 4000, gold: 1_000_000, farmGloryPerHour: 10, enchantBonus: 0.02, shop: 3, teleports: ['Сады Генезиса', 'Паган']},
    {level: 4, glory: 12000, gold: 3_000_000, farmGloryPerHour: 20, enchantBonus: 0.03, shop: 4, teleports: ['Логово Антараса', 'Остров Молитв']},
    {level: 5, glory: 30000, gold: 8_000_000, farmGloryPerHour: 35, enchantBonus: 0.05, shop: 5, teleports: ['Седьмая печать (SoA)', 'Логово Валакаса']},
]);

/** Glory Coins an epic raid pays every fighter. */
export const EPIC_GLORY_COINS = Object.freeze({valakas: 50, antharas: 40, baium: 30});
export const PVP_GLORY_COINS = 1;

// key -> {name, values by skill level, stat the value moves, scale (value -> delta), when (weapon kind needed), text}
const percent = value => value / 100;
export const HALL_SKILLS = Object.freeze([
    {key: 'greed', name: 'Greed', values: [3, 6, 10, 15], effects: [{stat: 'dropRateMul', scale: percent}], text: 'Адена, дроп, спойл и эполеты +{0}%'},
    {key: 'hunter', name: 'Hunter', values: [3, 5, 7, 10], effects: [{stat: 'attackMul', scale: percent}, {stat: 'defenceMul', scale: percent}], text: 'Урон и защита в PvE +{0}%'},
    {key: 'clarity', name: 'Clarity', values: [5, 7, 10], effects: [{stat: 'skillMpCostMul', scale: value => -value / 100}, {stat: 'mpRestoreSpeed', scale: value => value}], text: 'Расход MP умений -{0}%, восстановление MP +{0}'},
    {key: 'elementalism', name: 'Elementalism', values: [15, 30, 45, 60], effects: [{stat: 'elementResist', scale: value => value}], text: 'Защита от всех стихий +{0}'},
    {key: 'treatment', name: 'Treatment', values: [2, 4, 7], effects: [{stat: 'healPowerMul', scale: percent}], text: 'Сила лечения +{0}%'},
    {key: 'excellence', name: 'Excellence', values: [1, 2, 3], points: [['MEN', 'CON'], ['MEN', 'CON', 'DEX', 'WIT'], ['MEN', 'CON', 'DEX', 'WIT', 'STR', 'INT']], text: 'Характеристики +1: {0}'},
    {key: 'savage', name: 'Savage', values: [1, 2, 3, 4, 5], effects: [{stat: 'pvpDamageMul', scale: percent}], text: 'Урон в PvP +{0}%'},
    {key: 'reinforcement', name: 'Reinforcement', values: [10, 15, 25], effects: [{stat: 'block', scale: value => value / 5}], text: 'Защита щита +{0}%'},
    {key: 'ghost-form', name: 'Ghost Form', values: [1, 3, 5], effects: [{stat: 'evasion', scale: value => value}], extra: {3: [{stat: 'incomingDamageModifier', delta: -0.01}]}, text: 'Уклонение +{0}, на 3 уровне -1% получаемого урона'},
    {key: 'mental-crush', name: 'Mental Crush', values: [1, 3, 5], effects: [], text: 'Минимальный шанс ментальных атак +{0}% (нет эффекта в игре)'},
    {key: 'guidance', name: 'Guidance', values: [1, 3, 5], effects: [{stat: 'accuracy', scale: value => value}], text: 'Точность +{0}'},
    {key: 'bash', name: 'Bash', values: [1, 3, 5], effects: [], text: 'Минимальный шанс шоковых атак +{0}% (нет эффекта в игре)'},
    {key: 'murder', name: 'Murder', values: [10, 15, 25], effects: [{stat: 'criticalDamage', scale: percent}], needsWeapon: ['dagger'], text: 'Сила крита с кинжалом +{0}%'},
    {key: 'ambidexter', name: 'Ambidexter', values: [6, 9, 12], effects: [{stat: 'castingSpeedMul', scale: percent}], needsWeapon: ['blunt', 'mace'], text: 'Скорость магии с двуручным дробящим +{0}%'},
    {key: 'courage', name: 'Courage', values: [3, 5, 7, 10], effects: [{stat: 'pvpDefence', scale: percent}], melee: true, text: 'Защита в PvP воинов ближнего боя +{0}%'},
    {key: 'persistence', name: 'Persistence', values: [5, 10, 15], effects: [], text: 'Сопротивление параличу +{0}% (нет эффекта в игре)'},
    {key: 'strength', name: 'Strength', values: [2, 4, 6], effects: [], text: 'Защита от луков +{0}% (нет эффекта в игре)'},
    {key: 'renewal', name: 'Renewal', values: [1, 3, 5], effects: [{stat: 'skillCooltimeMul', scale: value => -value / 100}], text: 'Откат умений -{0}%'},
].map(skill => Object.freeze(skill)));

const MELEE_FAMILIES = new Set(['warrior', 'berserk', 'rogue']);
const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const skillByKey = key => HALL_SKILLS.find(skill => skill.key === key);

/** The hall record of a clan, created on first use; the farm premises pay their Glory since the last look. */
export function ensureHall(clan, now = Date.now()) {
    if (!clan.hall || typeof clan.hall !== 'object') clan.hall = {};
    const hall = clan.hall;
    hall.level = Math.max(1, Math.min(HALL_MAX_LEVEL, Math.floor(number(hall.level, 1))));
    hall.glory = Math.max(0, Math.floor(number(hall.glory)));
    if (!number(hall.lastTickAt)) hall.lastTickAt = now;
    const hours = Math.floor(Math.max(0, now - hall.lastTickAt) / 3_600_000);
    if (hours > 0) {
        hall.glory += hours * HALL_LEVELS[hall.level - 1].farmGloryPerHour;
        hall.lastTickAt += hours * 3_600_000;
    }
    return hall;
}

export const hallLevel = clan => Math.max(1, Math.min(HALL_MAX_LEVEL, Math.floor(number(clan?.hall?.level, 1))));

/** The level a skill of the hall has: its own maximum, and no more than the hall level. */
export const hallSkillLevel = (clan, key) => {
    const skill = skillByKey(key);
    return skill ? Math.min(skill.values.length, hallLevel(clan)) : 0;
};

/** {key: level} of the clan, what a member's session keeps (`hall:<key>`). */
export function hallPerks(clan) {
    if (!clan) return {};
    return Object.fromEntries(HALL_SKILLS.map(skill => [`${HALL_PREFIX}${skill.key}`, hallSkillLevel(clan, skill.key)]).filter(([, level]) => level > 0));
}

function wornKinds(session) {
    const kinds = new Set();
    for (const item of Object.values(session?.game?.equipmentStats || {})) if (item?.mainType === 'weapon') kinds.add(item.kind);
    return kinds;
}

/** Stat deltas of the hall skills a member has (game.clanPerks[`hall:<key>`]). */
export function hallModifiers(session) {
    const result = {};
    const perks = session?.game?.clanPerks;
    if (!perks) return result;
    const family = session?.game?.gameClass?.stats?.family;
    const worn = wornKinds(session);
    for (const skill of HALL_SKILLS) {
        const level = Math.min(skill.values.length, Math.floor(number(perks[`${HALL_PREFIX}${skill.key}`])));
        if (!level) continue;
        if (skill.needsWeapon && !skill.needsWeapon.some(kind => worn.has(kind))) continue;
        if (skill.melee && family && !MELEE_FAMILIES.has(family)) continue;
        const value = skill.values[level - 1];
        for (const effect of skill.effects || []) result[effect.stat] = (result[effect.stat] || 0) + effect.scale(value);
        for (const extra of skill.extra?.[level] || []) result[extra.stat] = (result[extra.stat] || 0) + extra.delta;
    }
    return result;
}

/** Extra characteristic points of Excellence for a stat (STR, DEX, ...). */
export function hallPoints(session, stat) {
    const level = Math.floor(number(session?.game?.clanPerks?.[`${HALL_PREFIX}excellence`]));
    if (!level) return 0;
    const list = skillByKey('excellence').points[Math.min(level, 3) - 1] || [];
    return list.includes(stat) ? 1 : 0;
}

/** Defence against every element the hall gives. */
export const hallElementResist = session => Math.max(0, number(hallModifiers(session).elementResist));

const text = (skill, level) => {
    const value = skill.values[level - 1];
    if (skill.points) return skill.text.replace('{0}', skill.points[Math.min(level, 3) - 1].join(', '));
    return skill.text.split('{0}').join(String(value));
};

export function getClanHallState(clan, now = Date.now()) {
    const hall = ensureHall(clan, now);
    const next = hall.level < HALL_MAX_LEVEL ? HALL_LEVELS[hall.level] : null;
    const warehouseGold = Math.max(0, number(clan?.warehouse?.gold));
    const missing = [];
    if (next) {
        if (hall.glory < next.glory) missing.push('glory');
        if (warehouseGold < next.gold) missing.push('gold');
    }
    return {
        level: hall.level, maxLevel: HALL_MAX_LEVEL, glory: hall.glory, farmGloryPerHour: HALL_LEVELS[hall.level - 1].farmGloryPerHour,
        enchantBonus: HALL_LEVELS[hall.level - 1].enchantBonus, shopLevel: HALL_LEVELS[hall.level - 1].shop,
        teleports: HALL_LEVELS.slice(0, hall.level).flatMap(row => row.teleports),
        next: next ? {level: next.level, glory: next.glory, gold: next.gold, canUpgrade: missing.length === 0, missing} : null,
        skills: HALL_SKILLS.map(skill => {
            const level = hallSkillLevel(clan, skill.key);
            return {
                key: skill.key, name: skill.name, level, maxLevel: skill.values.length,
                current: level ? text(skill, level) : null,
                next: level < skill.values.length ? text(skill, level + 1) : null,
                needsHallLevel: Math.min(skill.values.length, level + 1),
                active: Boolean(skill.effects?.length || skill.points),
            };
        }),
    };
}

/** Raises the hall by a level: Glory points must be gathered, the gold is paid from the warehouse. The caller saves the clan. */
export function upgradeHall(clan, now = Date.now()) {
    const hall = ensureHall(clan, now);
    if (hall.level >= HALL_MAX_LEVEL) return {ok: false, reason: 'hall_max_level'};
    const next = HALL_LEVELS[hall.level];
    if (hall.glory < next.glory) return {ok: false, reason: 'hall_not_enough_glory', need: next.glory};
    if (!clan.warehouse) clan.warehouse = {};
    if (number(clan.warehouse.gold) < next.gold) return {ok: false, reason: 'warehouse_insufficient', need: next.gold};
    clan.warehouse.gold = number(clan.warehouse.gold) - next.gold;
    hall.level = next.level;
    return {ok: true, level: hall.level, message: `Зал клана: уровень ${hall.level}.`};
}

/** A member hands in the Glory Coins of his inventory: one coin is one Glory point of the clan. */
export function depositGlory(clan, session, now = Date.now()) {
    const inventory = session?.game?.inventory;
    const coins = Math.floor(number(inventory?.gloryCoins));
    if (!(coins > 0)) return {ok: false, reason: 'no_glory_coins'};
    const hall = ensureHall(clan, now);
    hall.glory += coins;
    inventory.gloryCoins = 0;
    return {ok: true, coins, glory: hall.glory, message: `Монет славы передано: ${coins}.`};
}

/** A member earns Glory Coins (PvP kills, epic raids). */
export function giveGloryCoins(session, amount) {
    const inventory = session?.game?.inventory;
    const coins = Math.max(0, Math.floor(number(amount)));
    if (!inventory || !coins) return 0;
    inventory.gloryCoins = Math.floor(number(inventory.gloryCoins)) + coins;
    return coins;
}

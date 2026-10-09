// Tuning of the hunting fields in one place. The mobs, their levels, experience shares and drops are the
// real Lineage II (High Five) ones, extracted into template/huntingTemplate.js; these numbers turn them
// into our scale.
export const HUNT = Object.freeze({
    // Casts a bare hero of the mob's level needs for a mob of average strength (before champion multipliers).
    killCasts: 7,
    // Mob defence is the hero's attack times this, divided by damageScale: a skill of modifier 1 then does
    // 70 * damageScale / defencePerAttack. damageScale only makes the hit points read bigger.
    defencePerAttack: 0.8,
    damageScale: 10,
    // A level-matched mob's hit, in percent of the target's max HP, before defence.
    hitPct: 4,
    // A mob above the hero's level hits harder, below it softer (per level of difference).
    levelHitStep: 0.06,
    levelHitMin: -5,
    levelHitMax: 10,
    // A mob swings this often (scaled by its real attack speed 253).
    attackMs: 4000,
    // Swings applied in one go after a long pause (the hero is not left to die offline).
    maxCatchUp: 4,
    respawnMs: 60 * 1000,
    // Real High Five rates: experience stops at this level gap; drops fade between the min and max gap.
    expMaxGap: 11,
    adenaGap: Object.freeze({min: 8, max: 15, floor: 0.1}),
    itemGap: Object.freeze({min: 5, max: 10, floor: 0.1}),
    // Gold per adena of the real drop, and a multiplier on every real drop chance.
    goldScale: 0.25,
    dropRate: 3,
    logSize: 8,
});

/** Champions (L2J ChampionMonsters.ini: hp x8, exp/sp x8, drop chance x8) in two strengths. */
export const CHAMPION_MIN_LEVEL = 20;
export const CHAMPIONS = Object.freeze({
    blue: Object.freeze({id: 'blue', label: 'Синий чемпион', chance: 0.05, hp: 3, atk: 1.15, exp: 3, drops: 3}),
    red: Object.freeze({id: 'red', label: 'Красный чемпион', chance: 0.02, hp: 8, atk: 1.3, exp: 8, drops: 8}),
});

/** Chances of an attribute stone of the mob's element by tier, for a normal mob / blue / red champion. */
export const STONE_CHANCE = Object.freeze({
    normal: Object.freeze({stone: 0.015, crystal: 0, jewel: 0}),
    blue: Object.freeze({stone: 0.3, crystal: 0.04, jewel: 0}),
    red: Object.freeze({stone: 1, crystal: 0.2, jewel: 0.01}),
});

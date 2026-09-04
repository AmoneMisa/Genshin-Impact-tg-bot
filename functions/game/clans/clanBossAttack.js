import getAttack from "../player/getters/getAttack.js";
import getCriticalChance from "../player/getters/getCriticalChance.js";
import getCriticalDamage from "../player/getters/getCriticalDamage.js";
import getRandom from "../../getters/getRandom.js";
import getRandomWithoutFloor from "../../getters/getRandomWithoutFloor.js";

/**
 * Applies a single player attack against a clan boss.
 *
 * Reuses the player stat getters (attack / crit) so damage is consistent with
 * the rest of the game, but keeps a self-contained formula — the clan boss has
 * no skills/reflect, it's a shared HP sponge. Mutates the boss object in place;
 * the caller is responsible for clan.save() (clan.boss is Mixed).
 *
 * @param {Object} session - attacker member subdoc (has game.gameClass, userId)
 * @param {Object} boss - clan.boss sub-document
 * @param {Object} upgrades - member's clan improvement levels ({ track: level })
 * @param {Number} damageMultiplier - clan-wide multiplier (e.g. barracks bonus); 1 = none
 * @returns {{error?: string, dmg?: number, isCrit?: boolean, defeated?: boolean}}
 */
const BASE_DAMAGE_FACTOR = 70;

// Per-level effects of clan character improvements (mirror dictionaries/clanUpgrades.js).
const POWER_DAMAGE_PER_LEVEL = 0.05;      // +5% boss damage
const CRITICAL_CHANCE_PER_LEVEL = 2;      // +2 crit chance (percentage points)
const FEROCITY_CRIT_DAMAGE_PER_LEVEL = 0.05; // +5% crit damage

export default function (session, boss, upgrades = {}, damageMultiplier = 1) {
    const gameClass = session.game.gameClass;
    const attack = getAttack(session, gameClass);

    // Players without a chosen class have no attack stat → NaN.
    if (!Number.isFinite(attack) || attack <= 0) {
        return { error: "noClass" };
    }

    const powerLevel = upgrades.power || 0;
    const criticalLevel = upgrades.critical || 0;
    const ferocityLevel = upgrades.ferocity || 0;

    const critChance = Math.min(100, getCriticalChance(session, gameClass) + criticalLevel * CRITICAL_CHANCE_PER_LEVEL);
    const critDamage = getCriticalDamage(session, gameClass) * (1 + ferocityLevel * FEROCITY_CRIT_DAMAGE_PER_LEVEL);
    const defence = boss.defence || 1;

    let dmg = BASE_DAMAGE_FACTOR * attack / defence;
    dmg *= 1 + powerLevel * POWER_DAMAGE_PER_LEVEL;
    dmg *= damageMultiplier;
    dmg = Math.ceil(dmg * getRandomWithoutFloor(0.9, 1.1));

    let isCrit = false;
    if (getRandom(1, 100) <= critChance) {
        isCrit = true;
        dmg = Math.ceil(dmg * critDamage);
    }

    boss.currentHp = Math.max(0, boss.currentHp - dmg);

    const key = String(session.userId);
    if (!boss.damageByUser) {
        boss.damageByUser = {};
    }
    boss.damageByUser[key] = (boss.damageByUser[key] || 0) + dmg;

    return { dmg, isCrit, defeated: boss.currentHp <= 0 };
}

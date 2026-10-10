// Symbols (tattoos) of High Five: a dye changes the six base characteristics, up to three symbols at a time.
//  - the Symbol Maker only works for a character who has taken the 2nd profession (class tier 3, level 40);
//    from then on there are three slots;
//  - drawing a symbol takes `wear[0]` dyes of one kind and adena; erasing returns `cancel[0]` dyes and costs adena;
//  - a symbol can only be drawn at the level its dye asks for and by the classes the dye is made for;
//  - gains from symbols stop at +5 per characteristic, the losses always count in full.
// The adena fees are the real ones on the game's gold scale (HUNT.goldScale).
import HENNAS from '../../../template/hennaData.js';
import {classFamily} from '../classes/classFamily.js';
import classStats from '../../../template/classStatsTemplate.js';
import {addMaterial, getMaterialCount, spendMaterials} from './materials.js';
import {HUNT} from '../hunt/huntConfig.js';
import {BASE_STATS} from './baseStatsData.js';

export const TATTOO_SLOTS = 3;
/** The class tier (1 base, 2 first profession, 3 second profession) the Symbol Maker asks for. */
export const TATTOO_MIN_TIER = 3;
export const TATTOO_BONUS_CAP = 5;

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const byDye = new Map(HENNAS.map(henna => [henna.dye, henna]));
export const dyeKey = dye => `l2_${dye}`;
export const hennaOfDye = dye => byDye.get(Number(dye)) || null;
export const allHennas = () => HENNAS;

/** fighter / mage / priest: which family of dyes the class line may wear. */
export function archetypeOf(session) {
    const family = classFamily(session?.game?.gameClass?.stats?.name);
    if (family === 'mage') return 'mage';
    if (family === 'priest') return 'priest';
    return 'fighter';
}

export const professionTier = session => number(classStats.find(entry => entry.name === session?.game?.gameClass?.stats?.name)?.tier, 1);
export const professionLevel = tier => number(classStats.find(entry => entry.tier === tier && entry.promoteLvl)?.promoteLvl, 0);

export const slotCount = session => (professionTier(session) >= TATTOO_MIN_TIER ? TATTOO_SLOTS : 0);

const worn = session => (Array.isArray(session?.game?.tattoos) ? session.game.tattoos : []);

/** Stat changes of a list of symbols: {STR: +x ...} with the gains capped. */
export function symbolTotals(dyes) {
    const gains = {}, losses = {};
    for (const dye of dyes) {
        for (const [stat, value] of Object.entries(hennaOfDye(dye)?.stats || {})) {
            if (value > 0) gains[stat] = (gains[stat] || 0) + value;
            else losses[stat] = (losses[stat] || 0) + value;
        }
    }
    return Object.fromEntries(BASE_STATS.map(stat => [stat, Math.min(TATTOO_BONUS_CAP, gains[stat] || 0) + (losses[stat] || 0)]));
}

/** Points the symbols of a character add to one characteristic (used by baseStats.js). */
export function tattooPoints(session, stat) {
    const tattoos = worn(session);
    if (!tattoos.length) return 0;
    return symbolTotals(tattoos.map(entry => entry.dye))[stat] || 0;
}

const fee = adena => Math.max(1, Math.round(adena * HUNT.goldScale));

export const DYE_PAGE_SIZE = 8;

/**
 * Everything the symbol screen needs: slots, worn symbols and one page of dyes.
 * query: {page, stat: 'STR'.., owned: only dyes the player has enough of, usable: only the ones the class and level allow}.
 */
export function getTattooState(session, query = {}) {
    const tattoos = worn(session);
    const totals = symbolTotals(tattoos.map(entry => entry.dye));
    const archetype = archetypeOf(session);
    const level = number(session?.game?.stats?.lvl, 1);
    const all = HENNAS.map(henna => ({
        dye: henna.dye, name: henna.name, stats: henna.stats, level: henna.level, need: henna.wear[0], fee: fee(henna.wear[1]),
        back: henna.cancel[0], cancelFee: fee(henna.cancel[1]), have: getMaterialCount(session, dyeKey(henna.dye)),
        classOk: henna.who.includes(archetype), levelOk: level >= henna.level,
    }));
    const stat = BASE_STATS.includes(query.stat) ? query.stat : null;
    const filtered = all
        .filter(row => !stat || row.stats[stat] > 0)
        .filter(row => !query.owned || row.have >= row.need)
        .filter(row => !query.usable || (row.classOk && row.levelOk))
        .sort((a, b) => (b.have >= b.need) - (a.have >= a.need) || a.level - b.level || a.name.localeCompare(b.name));
    const pages = Math.max(1, Math.ceil(filtered.length / DYE_PAGE_SIZE));
    const page = Math.min(pages, Math.max(1, Math.floor(number(query.page, 1))));
    const wornDyes = tattoos.map(entry => entry.dye);
    const dyes = filtered.slice((page - 1) * DYE_PAGE_SIZE, page * DYE_PAGE_SIZE)
        .map(row => ({...row, after: symbolTotals([...wornDyes, row.dye])}));
    return {
        page, pages, total: filtered.length, pageSize: DYE_PAGE_SIZE,
        slots: slotCount(session),
        maxSlots: TATTOO_SLOTS,
        needTier: TATTOO_MIN_TIER,
        needLevel: professionLevel(TATTOO_MIN_TIER),
        tierOk: professionTier(session) >= TATTOO_MIN_TIER,
        cap: TATTOO_BONUS_CAP,
        archetype,
        gold: Math.max(0, number(session?.game?.inventory?.gold)),
        worn: tattoos.map((entry, index) => {
            const henna = hennaOfDye(entry.dye);
            return {index, dye: entry.dye, name: henna?.name || String(entry.dye), stats: henna?.stats || {}, back: henna?.cancel[0] || 0, cancelFee: fee(henna?.cancel[1] || 0)};
        }),
        totals,
        dyes,
    };
}

/** Draws a symbol: all or nothing. */
export function applyTattoo(session, rawDye) {
    const henna = hennaOfDye(rawDye);
    if (!henna) return {ok: false, reason: 'unknown_dye'};
    const tattoos = worn(session);
    if (professionTier(session) < TATTOO_MIN_TIER) return {ok: false, reason: 'profession_too_low', needLevel: professionLevel(TATTOO_MIN_TIER)};
    if (tattoos.length >= slotCount(session)) return {ok: false, reason: 'no_free_slot'};
    if (number(session.game.stats?.lvl, 1) < henna.level) return {ok: false, reason: 'level_too_low', needLevel: henna.level};
    if (!henna.who.includes(archetypeOf(session))) return {ok: false, reason: 'class_cannot_use'};
    // a symbol that adds nothing new (every gain already at the cap and no loss to take) is refused
    const before = symbolTotals(tattoos.map(entry => entry.dye));
    const after = symbolTotals([...tattoos.map(entry => entry.dye), henna.dye]);
    if (Object.entries(henna.stats).every(([stat, value]) => value > 0 ? after[stat] === before[stat] : false)) return {ok: false, reason: 'bonus_capped'};
    const price = fee(henna.wear[1]);
    if (getMaterialCount(session, dyeKey(henna.dye)) < henna.wear[0]) return {ok: false, reason: 'not_enough_dyes', need: henna.wear[0]};
    if (number(session.game.inventory.gold) < price) return {ok: false, reason: 'not_enough_gold', price};

    spendMaterials(session, {[dyeKey(henna.dye)]: henna.wear[0]});
    session.game.inventory.gold = number(session.game.inventory.gold) - price;
    if (!Array.isArray(session.game.tattoos)) session.game.tattoos = [];
    session.game.tattoos.push({dye: henna.dye, at: Date.now()});
    return {ok: true, dye: henna.dye, spent: henna.wear[0], price};
}

/** Erases a symbol: some of the dyes come back. */
export function removeTattoo(session, rawIndex) {
    const tattoos = worn(session);
    const index = Number(rawIndex);
    if (!Number.isInteger(index) || !tattoos[index]) return {ok: false, reason: 'no_such_symbol'};
    const henna = hennaOfDye(tattoos[index].dye);
    const price = fee(henna?.cancel[1] || 0);
    if (number(session.game.inventory.gold) < price) return {ok: false, reason: 'not_enough_gold', price};
    session.game.inventory.gold = number(session.game.inventory.gold) - price;
    const [removed] = tattoos.splice(index, 1);
    if (henna) addMaterial(session, dyeKey(removed.dye), henna.cancel[0]);
    return {ok: true, dye: removed.dye, returned: henna?.cancel[0] || 0, price};
}

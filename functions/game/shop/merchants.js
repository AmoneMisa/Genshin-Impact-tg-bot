// The merchants of the game, stocked from the real High Five shops (template/merchantData.js):
//   weapons / armor / jewelry - the town equipment merchants: the catalog items of no grade, D and C for adena;
//   alchemist                 - gemstones D/C/B, recipe books and Mammon's Varnish Enhancer for adena;
//   mammon                    - the Merchant of Mammon and the Priest of Dawn: Gemstone A/S, enchant scrolls
//                               (Ancient Adena + Blank Scrolls) and SP scrolls for Ancient Adena.
// Adena prices are the real ones on the game's gold scale (HUNT.goldScale); Ancient Adena is not scaled.
import DATA from '../../../template/merchantData.js';
import equipmentTemplate from '../../../template/equipmentTemplate.js';
import {canClassUse, findCatalogItem, getCatalog, gradeIndex, instantiate} from '../equipment/catalog.js';
import {addMaterial, getMaterialCount, materialInfo, spendMaterials} from '../player/materials.js';
import {lootInfo, itemRow} from '../hunt/lootTable.js';
import {HUNT} from '../hunt/huntConfig.js';

export const MERCHANTS = Object.freeze([
    {id: 'weapons', title: 'Торговец оружием', subtitle: 'Оружие без грейда, D и C за адену', currency: 'gold'},
    {id: 'armor', title: 'Торговец доспехами', subtitle: 'Броня и щиты без грейда, D и C', currency: 'gold'},
    {id: 'jewelry', title: 'Торговец бижутерией', subtitle: 'Кольца, серьги и ожерелья без грейда, D и C', currency: 'gold'},
    {id: 'alchemist', title: 'Лавка мастеров', subtitle: 'Самоцветы, рецепты и лак Маммона за адену', currency: 'gold'},
    {id: 'mammon', title: 'Торговец Маммона', subtitle: 'Древняя адена: самоцветы, свитки, ОП', currency: 'aa'},
]);

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const gold = adena => Math.max(1, Math.round(adena * HUNT.goldScale));
const EQUIPMENT_GRADES = ['noGrade', 'D', 'C'];
const MAMMON_VARNISH = 12374;

function realName(itemId) {
    return DATA.items[itemId]?.[0] || itemRow(itemId)?.name || String(itemId);
}

/** The game's key of a real item; merchant data carries the rows of items that no drop table mentions. */
function infoOf(itemId) {
    const row = DATA.items[itemId];
    return lootInfo(itemId, row ? {id: Number(itemId), name: row[0], type: row[1], grade: row[2], price: row[3], etc: row[4]} : null);
}

function equipmentEntries(types) {
    return getCatalog()
        .filter(item => EQUIPMENT_GRADES.includes(item.grade) && types.includes(item.mainType) && DATA.equipment[item.id])
        .map(item => {
            const price = DATA.equipment[item.id];
            return {
                id: `eq:${item.id}`, kind: 'equipment', itemId: item.id, name: item.name, grade: item.grade,
                minLevel: equipmentTemplate.grades[gradeIndex(item.grade)].lvl.from,
                // never cheaper than twice what the shop pays for the same item
                cost: {gold: Math.max(gold(price.price), item.cost * 2)}, estimated: Boolean(price.estimated), realId: price.realId,
            };
        });
}

function productEntry(prefix, row) {
    const info = infoOf(row.product);
    const cost = {};
    if (row.aa) cost.aa = row.aa;
    if (row.adena) cost.gold = gold(row.adena);
    const materials = {};
    for (const [ingredient, count] of row.items) {
        const key = infoOf(ingredient).key;
        materials[key] = (materials[key] || 0) + count;
    }
    if (Object.keys(materials).length) cost.materials = materials;
    const sp = DATA.items[row.product]?.[6] || 0;
    return {
        id: `${prefix}:${row.product}`, kind: sp ? 'sp' : 'material', key: info.key, amount: sp || row.amount,
        name: realName(row.product), realId: row.product, cost,
    };
}

function build() {
    const stock = {
        weapons: equipmentEntries(['weapon']),
        armor: equipmentEntries(['armor', 'shield']),
        jewelry: equipmentEntries(['jewelry']),
        alchemist: [],
        mammon: [],
    };
    for (const [id, price] of DATA.grocer) {
        const info = infoOf(id);
        stock.alchemist.push({id: `bk:${id}`, kind: 'material', key: info.key, amount: 1, name: realName(id), realId: id, cost: {gold: gold(price)}});
    }
    for (const row of DATA.mammon) {
        const entry = productEntry(row.merchant === 'priest' ? 'pr' : 'mm', row);
        // only what the game can use: gemstones, enchant scrolls, SP and Mammon's varnish
        const usable = entry.kind === 'sp' || /^(craft_gem_|scroll_|blessed_)/.test(entry.key) || row.product === MAMMON_VARNISH;
        if (!usable) continue;
        (row.adena && !row.aa ? stock.alchemist : stock.mammon).push(entry);
    }
    // The game's plain enchant scroll serves weapons and armor alike while High Five prices them apart: the shop
    // sells it at the dearer (weapon) price so that nobody buys weapon enchants at the armor price.
    const best = new Map();
    for (const entry of stock.mammon) {
        if (!/^scroll_/.test(entry.key)) continue;
        const kept = best.get(entry.key);
        if (!kept || entry.cost.aa > kept.cost.aa) best.set(entry.key, entry);
    }
    stock.mammon = stock.mammon.filter(entry => !/^scroll_/.test(entry.key) || best.get(entry.key) === entry);
    return stock;
}

let cachedStock = null;
export const merchantStock = () => (cachedStock ||= build());

export function findEntry(merchantId, entryId) {
    return merchantStock()[merchantId]?.find(entry => entry.id === entryId) || null;
}

/** Everything the player must hand over for `count` of an entry, as {gold, aa, materials}. */
export function entryCost(entry, count = 1) {
    return {
        gold: number(entry.cost.gold) * count,
        aa: number(entry.cost.aa) * count,
        materials: Object.fromEntries(Object.entries(entry.cost.materials || {}).map(([key, amount]) => [key, amount * count])),
    };
}

export function entryAvailability(session, entry) {
    const level = number(session.game.stats?.lvl, 1);
    if (entry.kind === 'equipment') {
        if (level < entry.minLevel) return {ok: false, reason: 'level_too_low', needLevel: entry.minLevel};
        if (!canClassUse(session.game.gameClass?.stats?.name, findCatalogItem(entry.itemId))) return {ok: false, reason: 'class_cannot_use'};
    }
    return {ok: true};
}

export function lackOf(session, cost) {
    const inventory = session.game.inventory || {};
    if (number(inventory.gold) < cost.gold) return 'not_enough_gold';
    if (number(inventory.ancientAdena) < cost.aa) return 'not_enough_aa';
    for (const [key, amount] of Object.entries(cost.materials)) if (getMaterialCount(session, key) < amount) return 'not_enough_materials';
    return null;
}

/** Buys `count` of an entry (equipment is bought one at a time). All or nothing. */
export function buyEntry(session, merchantId, entryId, rawCount = 1) {
    const entry = findEntry(merchantId, entryId);
    if (!entry) return {ok: false, reason: 'unknown_item'};
    const count = entry.kind === 'equipment' ? 1 : Math.floor(number(rawCount, 1));
    if (!Number.isSafeInteger(count) || count < 1 || count > 1000) return {ok: false, reason: 'invalid_count'};
    const availability = entryAvailability(session, entry);
    if (!availability.ok) return availability;
    const cost = entryCost(entry, count);
    const lack = lackOf(session, cost);
    if (lack) return {ok: false, reason: lack, cost};

    const inventory = session.game.inventory;
    inventory.gold = number(inventory.gold) - cost.gold;
    inventory.ancientAdena = number(inventory.ancientAdena) - cost.aa;
    spendMaterials(session, cost.materials);
    let item = null;
    if (entry.kind === 'equipment') {
        if (!inventory.equipment) inventory.equipment = {name: 'Экипировка', items: []};
        item = instantiate(findCatalogItem(entry.itemId));
        inventory.equipment.items.push(item);
    } else if (entry.kind === 'sp') {
        inventory.sp = number(inventory.sp) + entry.amount * count;
    } else {
        addMaterial(session, entry.key, entry.amount * count);
    }
    return {ok: true, entry: {id: entry.id, name: entry.name, kind: entry.kind}, count, cost, item};
}

/** The rows of the screen for one player: price, whether they can pay and what is missing. */
export function merchantRows(session, merchantId) {
    return (merchantStock()[merchantId] || []).map(entry => {
        const cost = entryCost(entry, 1);
        const availability = entryAvailability(session, entry);
        const lack = lackOf(session, cost);
        const info = entry.kind === 'material' ? materialInfo(entry.key) : null;
        return {
            id: entry.id, kind: entry.kind, name: entry.name, grade: entry.grade || null, amount: entry.amount || 1,
            minLevel: entry.minLevel || 0, estimated: Boolean(entry.estimated), key: entry.key || null, icon: info?.icon || null,
            cost: {
                gold: cost.gold, aa: cost.aa,
                materials: Object.entries(cost.materials).map(([key, need]) => ({key, name: materialInfo(key).name, need, have: getMaterialCount(session, key)})),
            },
            canUse: availability.ok, useReason: availability.reason || null, canPay: !lack, lack,
        };
    });
}

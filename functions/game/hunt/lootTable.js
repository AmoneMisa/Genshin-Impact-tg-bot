// The real High Five drop tables (template/l2Loot.js) mapped onto the game's items. Enchant scrolls, crystals, Life
// Stones, attribute stones and seal stones become the game's own materials; every other real item - full weapons and
// armor, pieces, recipes, dyes, crafting goods - is a collectable material `l2_<item id>` named like the real item.
import LOOT from '../../../template/l2Loot.js';
import ITEMS from '../../../template/l2Items.js';
import {ATTRIBUTE_TIERS, ELEMENTS, lifestoneKey} from '../../../template/augmentData.js';

export const LOOT_KINDS = Object.freeze([
    {id: 'full', label: 'Снаряжение целиком', icon: '⚔️'},
    {id: 'piece', label: 'Части и камни для сборки', icon: '🧩'},
    {id: 'recipe', label: 'Рецепты', icon: '📜'},
    {id: 'scroll', label: 'Свитки заточки', icon: '✨'},
    {id: 'lifestone', label: 'Камни жизни', icon: '🔮'},
    {id: 'attribute', label: 'Камни атрибутов', icon: '🔥'},
    {id: 'seal', label: 'Камни печати', icon: '◆'},
    {id: 'dye', label: 'Краски', icon: '🎨'},
    {id: 'crystal', label: 'Кристаллы', icon: '💠'},
    {id: 'material', label: 'Материалы', icon: '🔩'},
    {id: 'consumable', label: 'Расходники', icon: '🧪'},
    {id: 'herb', label: 'Травы', icon: '🌿'},
    {id: 'other', label: 'Прочее', icon: '📦'},
]);

const SEAL = {6360: 'seal_blue', 6361: 'seal_green', 6362: 'seal_red'};
const gradeOfLifeStone = level => (level >= 80 ? 'S80' : level >= 76 ? 'S' : level >= 61 ? 'A' : level >= 52 ? 'B' : 'C');
const ELEMENT_BY_NAME = Object.fromEntries(ELEMENTS.map(element => [element.id, element.id]));
const TIER_BY_NAME = {Stone: 'stone', Crystal: 'crystal', Jewel: 'jewel'};

export function itemRow(id) {
    const row = ITEMS[id];
    return row ? {id: Number(id), name: row[0], type: row[1], grade: row[2], price: row[3], etc: row[4]} : null;
}

/** {key, kind} of a real item id. */
export function lootInfo(itemId) {
    const id = Number(itemId);
    if (SEAL[id]) return {key: SEAL[id], kind: 'seal'};
    const item = itemRow(id);
    if (!item) return {key: `l2_${id}`, kind: 'other'};
    const name = item.name;
    const scroll = name.match(/^(Blessed )?Scroll: Enchant (?:Weapon|Armor) \((\w+)-Grade\)/);
    if (scroll) return {key: `${scroll[1] ? 'blessed' : 'scroll'}_${scroll[2]}`, kind: 'scroll'};
    // Gemstones are the game's own gem family: SA installs and real recipes spend the same item.
    const gem = name.match(/^Gemstone ([DCBAS])$/);
    if (gem) return {key: `craft_gem_${gem[1]}`, kind: 'material'};
    const crystal = name.match(/^Crystal \((\w)-Grade\)$/);
    if (crystal) return {key: `crystal_${crystal[1]}`, kind: 'crystal'};
    const stone = name.match(/^(Mid-Grade |High-Grade |Top-Grade )?Life Stone - Level (\d+)/);
    if (stone) {
        const tier = {'Mid-Grade ': 'mid', 'High-Grade ': 'high', 'Top-Grade ': 'top'}[stone[1]] || 'normal';
        return {key: lifestoneKey(gradeOfLifeStone(+stone[2]), tier), kind: 'lifestone'};
    }
    if (item.etc === 'SCRL_ENCHANT_ATTR') {
        const [element, tierName] = name.toLowerCase().split(' ').map((word, index) => index ? TIER_BY_NAME[word[0].toUpperCase() + word.slice(1)] : ELEMENT_BY_NAME[word]);
        const tier = ATTRIBUTE_TIERS.find(entry => entry.id === tierName);
        if (element && tier) return {key: `attr_${tier.id}_${element}`, kind: 'attribute'};
    }
    const key = `l2_${id}`;
    if (item.etc === 'DYE') return {key, kind: 'dye'};
    if (item.etc === 'RECIPE' || name.startsWith('Recipe')) return {key, kind: 'recipe'};
    if (item.type === 'Weapon') return {key, kind: 'full'};
    if (item.type === 'Armor') return {key, kind: 'full'};
    if (item.etc === 'MATERIAL' && /( Piece| Gemstone)$/.test(name)) return {key, kind: 'piece'};
    if (item.etc === 'MATERIAL') return {key, kind: 'material'};
    if (/Herb /.test(name + ' ') || /Herb$/.test(name)) return {key, kind: 'herb'};
    if (['POTION', 'SCROLL', 'ELIXIR', 'ARROW'].includes(item.etc)) return {key, kind: 'consumable'};
    return {key, kind: 'other'};
}

const cache = new Map();
/** Real drop rows of one monster: [{id, key, name, kind, min, max, chance}] with chance in percent. */
export function lootRows(mobId) {
    const id = String(mobId);
    if (!cache.has(id)) {
        cache.set(id, (LOOT[id] || []).map(([itemId, min, max, chance]) => {
            const info = lootInfo(itemId), item = itemRow(itemId);
            return {id: itemId, key: info.key, kind: info.kind, name: item?.name || String(itemId), min, max, chance};
        }));
    }
    return cache.get(id);
}

/** Display data of a collectable real item for the inventory. */
export function l2MaterialInfo(key) {
    const id = Number(String(key).slice(3));
    const item = itemRow(id);
    if (!item) return null;
    const kind = lootInfo(id).kind, meta = LOOT_KINDS.find(entry => entry.id === kind);
    return {key, name: item.name, icon: meta?.icon || '📦', description: `${meta?.label || 'Предмет'} High Five. Цена в магазине ${item.price} адены.`, price: item.price, kind};
}

/** Gold a collectable real item sells for: half of the real shop price on the game's gold scale. */
export function l2SellPrice(key, goldScale = 1) {
    const info = String(key).startsWith('l2_') ? l2MaterialInfo(key) : null;
    return info ? Math.max(1, Math.floor(info.price / 2 * goldScale)) : 0;
}

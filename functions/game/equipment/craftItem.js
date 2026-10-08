// Lineage 2 style crafting: every catalog item has a recipe (materials + a gold fee + a success chance),
// recipes are learned for gold, and every craft - win or lose - trains the crafting skill that
// higher-grade recipes need. A failed craft loses the materials (the gold fee is kept by the smith).
import equipmentTemplate from '../../../template/equipmentTemplate.js';
import { getCatalog, findCatalogItem, gradeIndex, instantiate, slotShareKey, canClassUse } from './catalog.js';
import { addMaterial, getMaterialCount, materialInfo, spendMaterials } from '../player/materials.js';

const config = () => equipmentTemplate.craft;

// Share of the grade's price / material needs by what the item is (same weights as the sell price).
const SHARE = {weapon: 1, up: 0.8, fullBody: 1.2, down: 0.5, helmet: 0.35, gloves: 0.3, boots: 0.3, shield: 0.5, jewelry: 0.4};

export const craftMaterialKey = (family, grade) => `craft_${family}_${grade}`;

/** The crafting skill record of a player, created on first use. */
export function ensureCraft(session) {
    const game = session.game;
    if (!game.craft || typeof game.craft !== 'object') game.craft = {level: 1, exp: 0, recipes: []};
    game.craft.level = Math.max(1, Math.floor(Number(game.craft.level) || 1));
    game.craft.exp = Math.max(0, Math.floor(Number(game.craft.exp) || 0));
    if (!Array.isArray(game.craft.recipes)) game.craft.recipes = [];
    return game.craft;
}

/** Experience needed to go from `level` to the next one. */
export function craftNeedExp(level) {
    return config().needExp * level * level;
}

function usesOf(item) {
    const uses = config().uses;
    if (item.mainType === 'armor') return uses[item.kind];
    return uses[item.mainType];
}

/** What it takes to craft a catalog item: materials, gold, success chance, required skill level. */
export function getRecipe(itemId) {
    const item = findCatalogItem(itemId);
    // epic jewellery cannot be crafted
    if (!item || item.epic) return null;
    const index = gradeIndex(item.grade);
    const grade = equipmentTemplate.grades[index];
    const share = SHARE[slotShareKey(item)] ?? 1;

    const materials = {};
    let ironOre = 0;
    for (const [family, part] of Object.entries(usesOf(item) || {})) {
        if (family === 'ironOre') ironOre = Math.max(1, Math.round(config().ironOre[index] * share * part));
        else materials[craftMaterialKey(family, item.grade)] = Math.max(1, Math.round(config().count[index] * share * part));
    }

    const rates = config().successRate;
    const successRate = item.grade === 'noGrade' ? rates.noGrade : item.mainType === 'jewelry' ? rates.jewelry : rates.default;
    return {
        id: item.id,
        grade: item.grade,
        gold: Math.round(item.cost * config().goldShare),
        learnPrice: item.grade === 'noGrade' ? 0 : Math.round(item.cost * config().learnShare),
        ironOre,
        materials,
        successRate,
        craftLevel: config().craftLevel[index],
        minLevel: grade.lvl.from,
    };
}

export function listRecipes() {
    return getCatalog().filter(item => !item.epic).map(item => getRecipe(item.id));
}

export function isRecipeLearned(session, recipe) {
    return recipe.learnPrice === 0 || ensureCraft(session).recipes.includes(recipe.id);
}

export function learnRecipe(session, itemId) {
    const recipe = getRecipe(itemId);
    if (!recipe) return {ok: false, reason: 'unknown_recipe'};
    const craft = ensureCraft(session);
    if (isRecipeLearned(session, recipe)) return {ok: false, reason: 'already_learned'};
    if ((Number(session.game.stats?.lvl) || 1) < recipe.minLevel) return {ok: false, reason: 'level_too_low', requiredLevel: recipe.minLevel};
    if (craft.level < recipe.craftLevel) return {ok: false, reason: 'craft_level_too_low', requiredCraftLevel: recipe.craftLevel};
    const inventory = session.game.inventory;
    if ((Number(inventory.gold) || 0) < recipe.learnPrice) return {ok: false, reason: 'not_enough_gold', price: recipe.learnPrice};

    inventory.gold -= recipe.learnPrice;
    craft.recipes.push(recipe.id);
    return {ok: true, price: recipe.learnPrice};
}

/** Lacking materials, as {key: missing amount}; empty when the player has everything. */
export function missingForRecipe(session, recipe) {
    const missing = {};
    for (const [key, need] of Object.entries(recipe.materials)) {
        const lack = need - getMaterialCount(session, key);
        if (lack > 0) missing[key] = lack;
    }
    const ore = recipe.ironOre - (Number(session.game.inventory?.ironOre) || 0);
    if (ore > 0) missing.ironOre = ore;
    const gold = recipe.gold - (Number(session.game.inventory?.gold) || 0);
    if (gold > 0) missing.gold = gold;
    return missing;
}

function gainExp(session, amount) {
    const craft = ensureCraft(session);
    craft.exp += amount;
    let leveledUp = false;
    while (craft.exp >= craftNeedExp(craft.level)) {
        craft.exp -= craftNeedExp(craft.level);
        craft.level++;
        leveledUp = true;
    }
    return leveledUp;
}

/**
 * Crafts one item of a learned recipe. Materials, ore and the gold fee are spent first; the roll then
 * decides whether the item is made. `random` lets tests fix the roll.
 */
export default function craftItem(session, itemId, {random = Math.random} = {}) {
    const recipe = getRecipe(itemId);
    if (!recipe) return {ok: false, reason: 'unknown_recipe'};
    const craft = ensureCraft(session);
    if (!isRecipeLearned(session, recipe)) return {ok: false, reason: 'recipe_not_learned'};
    if ((Number(session.game.stats?.lvl) || 1) < recipe.minLevel) return {ok: false, reason: 'level_too_low', requiredLevel: recipe.minLevel};
    if (craft.level < recipe.craftLevel) return {ok: false, reason: 'craft_level_too_low', requiredCraftLevel: recipe.craftLevel};

    const missing = missingForRecipe(session, recipe);
    if (Object.keys(missing).length) return {ok: false, reason: 'not_enough_materials', missing};

    const inventory = session.game.inventory;
    spendMaterials(session, recipe.materials);
    inventory.ironOre -= recipe.ironOre;
    inventory.gold -= recipe.gold;

    const success = random() < recipe.successRate;
    const exp = config().exp;
    const gained = (success ? exp.success : exp.fail) + exp.perGrade * gradeIndex(recipe.grade);
    const leveledUp = gainExp(session, gained);

    let item = null;
    if (success) {
        if (!inventory.equipment) inventory.equipment = {name: 'Экипировка', items: []};
        item = instantiate(findCatalogItem(itemId));
        inventory.equipment.items.push(item);
    }
    return {ok: true, success, item, exp: gained, leveledUp, craft: {level: craft.level, exp: craft.exp}, recipe};
}

/** The recipes a player can sensibly look at: grades up to a few levels ahead, for items their class can use. */
export function visibleRecipes(session) {
    const level = Number(session.game.stats?.lvl) || 1;
    const className = session.game.gameClass?.stats?.name;
    return listRecipes().filter(recipe => {
        const item = findCatalogItem(recipe.id);
        return recipe.minLevel <= level + 5 && canClassUse(className, item);
    });
}

/** Display rows of a recipe's materials with how many the player has. */
export function recipeMaterialRows(session, recipe) {
    const rows = Object.entries(recipe.materials).map(([key, need]) => {
        const info = materialInfo(key);
        return {key, name: info.name, icon: info.icon, need, have: getMaterialCount(session, key)};
    });
    rows.unshift({key: 'ironOre', name: 'Железная руда', icon: '⛏️', need: recipe.ironOre, have: Number(session.game.inventory?.ironOre) || 0});
    return rows;
}

/** Drops of crafting materials for a boss fighter: every family of the fighter's grade. */
export function rollCraftDrops(member, {tier = 1, place = 10, random = Math.random} = {}) {
    const level = Number(member?.game?.stats?.lvl) || 1;
    const grade = equipmentTemplate.grades.find(entry => entry.lvl.from <= level && level <= entry.lvl.to) || equipmentTemplate.grades.at(-1);
    const luck = place <= 3 ? 1.5 : 1;
    const drops = [];
    for (const family of ['binder', 'leather', 'fiber', 'gem']) {
        if (random() >= Math.min(1, 0.45 * luck)) continue;
        const amount = (1 + Math.floor(random() * 3)) * tier;
        const key = craftMaterialKey(family, grade.name);
        addMaterial(member, key, amount);
        const info = materialInfo(key);
        drops.push({item: key, name: info.name, icon: info.icon, amount});
    }
    return drops;
}

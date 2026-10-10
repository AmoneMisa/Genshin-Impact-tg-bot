// The real High Five craft recipes (template/l2Recipes.js) on the game's items. A recipe is found by the name of the
// product; its ingredients are real items that map onto the game's materials (see hunt/lootTable.js).
import RECIPES from '../../../template/l2Recipes.js';
import {itemRow, lootInfo} from '../hunt/lootTable.js';

export const ADENA = 57;
const normal = name => String(name).toLowerCase().replace(/^sealed /, '');

const byRecipeItem = new Map(RECIPES.map(recipe => [recipe.recipeItem, recipe]));
const byProductName = new Map();
for (const recipe of RECIPES) {
    const item = itemRow(recipe.product);
    if (!item) continue;
    const name = normal(item.name);
    const list = byProductName.get(name) || [];
    list.push(recipe);
    byProductName.set(name, list);
}
const byProductKey = new Map();
for (const recipe of RECIPES) {
    const key = lootInfo(recipe.product).key;
    if (!byProductKey.has(key)) byProductKey.set(key, []);
    byProductKey.get(key).push(recipe);
}

/** The best (highest success rate) real recipe that makes an item of that name, if High Five has one. */
export function realRecipeByName(name) {
    const list = byProductName.get(normal(name));
    return list ? [...list].sort((a, b) => b.rate - a.rate)[0] : null;
}

export const realRecipeByItem = recipeItemId => byRecipeItem.get(Number(recipeItemId)) || null;
export const allRecipes = () => RECIPES;

/** The recipe that makes a material key (an intermediate product such as an alloy), if any. */
export function recipeForMaterial(key) {
    const list = byProductKey.get(key);
    return list ? [...list].sort((a, b) => b.rate - a.rate)[0] : null;
}

/** Ingredients of a recipe as {materials: {key: count}, adena}. */
export function splitIngredients(recipe) {
    const materials = {};
    let adena = 0;
    for (const [id, count] of recipe.ingredients) {
        if (id === ADENA) { adena += count; continue; }
        const key = lootInfo(id).key;
        materials[key] = (materials[key] || 0) + count;
    }
    return {materials, adena};
}

/**
 * Recipes that make materials the given recipes need, directly or through other recipes (alloys, patterns ...).
 * Returns Map(recipeItem -> recipe).
 */
export function intermediateRecipes(recipes) {
    const found = new Map();
    const queue = [...recipes];
    while (queue.length) {
        const {materials} = splitIngredients(queue.pop());
        for (const key of Object.keys(materials)) {
            const sub = recipeForMaterial(key);
            if (sub && !found.has(sub.recipeItem)) {
                found.set(sub.recipeItem, sub);
                queue.push(sub);
            }
        }
    }
    return found;
}

// UI-only catalog keeps the full item atlas off the startup dependency graph.
export const L2_UI_ART = Object.freeze({
  "coin": "icon-etc_adena_i00",
  "gem": "icon-etc_crystal_gold_i00",
  "party": "icon-action011",
  "loot-finders": "icon-action008",
  "loot-random": "icon-etc_dice_a_i00",
  "loot-turn": "icon-action012",
  "leader": "icon-accessory_crown_i00",
  "merchant-weapons": "icon-weapon_small_sword_i00",
  "merchant-armor": "icon-armor_t88_u_i00",
  "merchant-jewelry": "icon-accessary_blessed_ring_i00",
  "merchant-alchemist": "icon-etc_recipe_white_i00",
  "merchant-mammon": "icon-etc_ancient_adena_i00"
});
const published = new Set(Object.values(L2_UI_ART));
export function l2IconUrl(key,size=128) { return published.has(key) ? `/art/l2/${key}-${[128,256,512].includes(size)?size:128}.webp` : null; }

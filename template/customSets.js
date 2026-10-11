// Custom armor sets: the game's own line next to the Lineage 2 sets, one set per grade (no-grade ... S84) and
// armor type (heavy / light / robe). They are never sold, never rolled and never dropped as finished items:
// they are crafted (functions/game/equipment/craftItem.js) from the grade's crafting materials, which the raid
// bosses drop, so a hero of any grade can build a full set without sealed items or Ancient Adena.
//
// Balance (see test/custom-sets.test.js):
//   - the parts carry `defenceFactor` of the defence of the Lineage 2 set of the same grade and type;
//   - the full-set bonus is a clean ladder: every grade is a little stronger than the one below, a tank gets
//     HP / defence / block, a skirmisher attack / speed, a caster MP / attack / speed;
//   - all together a set is worth 90-100 % of its Lineage 2 counterpart, the difference being the price:
//     it costs `craftFactor` times the grade's materials.
// Weapons are not part of the line: the custom weapons stay the very rare epic weapons (epicWeapons.js).
export default {
    defenceFactor: 0.92,
    craftFactor: 1.25,
    // what a part of the type is called: the heavy set has a breastplate and gaiters, light and robe sets a full body piece
    parts: {
        heavy: {body: 'Breastplate', greaves: 'Gaiters', helmet: 'Helmet', gloves: 'Gloves', boots: 'Boots'},
        light: {fullBody: 'Leather Armor', helmet: 'Helmet', gloves: 'Gloves', boots: 'Boots'},
        robe: {fullBody: 'Robe', helmet: 'Circlet', gloves: 'Bracers', boots: 'Slippers'}
    },
    // one entry per grade, in the order of template.grades
    sets: {
        heavy: [
            {name: 'Forged Guardian', bonus: {maxHpMul: 1.02}},
            {name: 'Sapphire Guard', bonus: {maxHpMul: 1.03, defenceMul: 1.03}},
            {name: 'Opal Bastion', bonus: {maxHpMul: 1.04, defenceMul: 1.04}},
            {name: 'Twilight Frontier', bonus: {maxHpMul: 1.05, defenceMul: 1.05, block: 3}},
            {name: 'Seraphim Vanguard', bonus: {maxHpMul: 1.06, defenceMul: 1.06, block: 4}},
            {name: 'Obsidian Bastion', bonus: {maxHpMul: 1.07, defenceMul: 1.07, block: 5}},
            {name: 'Raven Frontier', bonus: {maxHpMul: 1.08, defenceMul: 1.08, block: 5, attackMul: 1.02}},
            {name: 'Prismatic Vanguard', bonus: {maxHpMul: 1.09, defenceMul: 1.09, block: 6, attackMul: 1.03}}
        ],
        light: [
            {name: 'Hunter Hide', bonus: {speed: 1}},
            {name: 'Shadow Hide', bonus: {speed: 2, defenceMul: 1.02}},
            {name: 'Lunar Scale', bonus: {speed: 2, attackMul: 1.02}},
            {name: 'Night Mantle', bonus: {speed: 3, attackMul: 1.025, defenceMul: 1.02}},
            {name: 'Hawk Hide', bonus: {speed: 3, attackMul: 1.03, maxMpMul: 1.03}},
            {name: 'Shadow Veil', bonus: {speed: 4, attackMul: 1.035, maxMpMul: 1.04}},
            {name: 'Woven Midnight', bonus: {speed: 4, attackMul: 1.04, maxMpMul: 1.04, defenceMul: 1.02}},
            {name: 'Starwatch', bonus: {speed: 5, attackMul: 1.045, maxMpMul: 1.05, defenceMul: 1.02}}
        ],
        robe: [
            {name: 'Apprentice Cloth', bonus: {speed: 1}},
            {name: 'Pearl Cloth', bonus: {speed: 2, maxMpMul: 1.03}},
            {name: 'Tidal Silk', bonus: {speed: 2, maxMpMul: 1.04}},
            {name: 'Ruby Robe', bonus: {speed: 3, maxMpMul: 1.05, defenceMul: 1.02}},
            {name: 'Astral Robe', bonus: {speed: 3, maxMpMul: 1.06, attackMul: 1.02}},
            {name: 'Crystal Robe', bonus: {speed: 4, maxMpMul: 1.06, attackMul: 1.04}},
            {name: 'Royal Robe', bonus: {speed: 4, maxMpMul: 1.07, attackMul: 1.05}},
            {name: 'Celestial Shroud', bonus: {speed: 5, maxMpMul: 1.08, attackMul: 1.05}}
        ]
    }
};

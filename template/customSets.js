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
        heavy: {body: 'Нагрудник', greaves: 'Поножи', helmet: 'Шлем', gloves: 'Перчатки', boots: 'Сапоги'},
        light: {fullBody: 'Доспех', helmet: 'Шлем', gloves: 'Перчатки', boots: 'Сапоги'},
        robe: {fullBody: 'Мантия', helmet: 'Венец', gloves: 'Наручи', boots: 'Туфли'}
    },
    // one entry per grade, in the order of template.grades
    sets: {
        heavy: [
            {name: 'Кованый страж', bonus: {maxHpMul: 1.02}},
            {name: 'Сапфировая стража', bonus: {maxHpMul: 1.03, defenceMul: 1.03}},
            {name: 'Опаловый бастион', bonus: {maxHpMul: 1.04, defenceMul: 1.04}},
            {name: 'Сумеречный рубеж', bonus: {maxHpMul: 1.05, defenceMul: 1.05, block: 3}},
            {name: 'Серафимский авангард', bonus: {maxHpMul: 1.06, defenceMul: 1.06, block: 4}},
            {name: 'Обсидиановый бастион', bonus: {maxHpMul: 1.07, defenceMul: 1.07, block: 5}},
            {name: 'Вороний рубеж', bonus: {maxHpMul: 1.08, defenceMul: 1.08, block: 5, attackMul: 1.02}},
            {name: 'Призматический авангард', bonus: {maxHpMul: 1.09, defenceMul: 1.09, block: 6, attackMul: 1.03}}
        ],
        light: [
            {name: 'Охотничья кожа', bonus: {speed: 1}},
            {name: 'Теневая кожа', bonus: {speed: 2, defenceMul: 1.02}},
            {name: 'Лунная чешуя', bonus: {speed: 2, attackMul: 1.02}},
            {name: 'Ночной покров', bonus: {speed: 3, attackMul: 1.025, defenceMul: 1.02}},
            {name: 'Кожа ястреба', bonus: {speed: 3, attackMul: 1.03, maxMpMul: 1.03}},
            {name: 'Вуаль тени', bonus: {speed: 4, attackMul: 1.035, maxMpMul: 1.04}},
            {name: 'Плетёная полночь', bonus: {speed: 4, attackMul: 1.04, maxMpMul: 1.04, defenceMul: 1.02}},
            {name: 'Звёздный дозор', bonus: {speed: 5, attackMul: 1.045, maxMpMul: 1.05, defenceMul: 1.02}}
        ],
        robe: [
            {name: 'Ученическая ткань', bonus: {speed: 1}},
            {name: 'Жемчужная ткань', bonus: {speed: 2, maxMpMul: 1.03}},
            {name: 'Приливный шёлк', bonus: {speed: 2, maxMpMul: 1.04}},
            {name: 'Рубиновая мантия', bonus: {speed: 3, maxMpMul: 1.05, defenceMul: 1.02}},
            {name: 'Астральная мантия', bonus: {speed: 3, maxMpMul: 1.06, attackMul: 1.02}},
            {name: 'Хрустальная роба', bonus: {speed: 4, maxMpMul: 1.06, attackMul: 1.04}},
            {name: 'Королевская мантия', bonus: {speed: 4, maxMpMul: 1.07, attackMul: 1.05}},
            {name: 'Небесный покров', bonus: {speed: 5, maxMpMul: 1.08, attackMul: 1.05}}
        ]
    }
};

// Craft/upgrade materials kept in inventory.materials = {key: count}. Skill
// enchanting (skillEnchant.js) spends them; bosses and minions drop them
// (bossTemplate.js `drops`). Quest-only items are not here: quest collectables
// are progress counters on the quest itself (classQuestsTemplate.js).
// Lineage 2 equipment materials, one set per grade from D up (no-grade gear cannot be enchanted):
// enchant scroll, blessed scroll (a failure only drops the item back to the safe level) and the
// crystals a destroyed item falls apart into. See functions/game/equipment/enchantItem.js.
const ENCHANT_GRADES = ['D', 'C', 'B', 'A', 'S', 'S80', 'S84'];
const enchantMaterials = ENCHANT_GRADES.flatMap(grade => [
    {key: `scroll_${grade}`, name: `Свиток заточки (${grade})`, icon: '📜', description: `Заточка снаряжения грейда ${grade}. Выше безопасного уровня предмет может разрушиться.`},
    {key: `blessed_${grade}`, name: `Благословенный свиток (${grade})`, icon: '✨', description: `Заточка снаряжения грейда ${grade}: при неудаче предмет не ломается, а возвращается на безопасный уровень.`},
    {key: `crystal_${grade}`, name: `Кристалл ${grade}`, icon: '💠', description: `Остаётся от разрушенного или кристаллизованного снаряжения грейда ${grade}. Идёт на свитки заточки.`},
]);

// Crafting materials (functions/game/equipment/craftRecipes.js): four families, one material per grade
// from no-grade to S84. Bosses drop them; metal is the ore the mine produces (inventory.ironOre).
const CRAFT_GRADES = ['noGrade', 'D', 'C', 'B', 'A', 'S', 'S80', 'S84'];
const CRAFT_FAMILIES = {
    binder: {icon: '🧪', label: 'Связующее', names: ['Coarse Bone Powder', 'Animal Bone', 'Varnish of Purity', 'Stem', 'Mold Glue', 'Mold Hardener', 'Mold Lubricant', 'Synthetic Cokes']},
    leather: {icon: '🟫', label: 'Кожа', names: ['Leather', 'Crafted Leather', 'High Grade Suede', 'Compound Braid', 'Mithril Hide', 'Drake Hide', 'Dynasty Hide', 'Vesper Hide']},
    fiber: {icon: '🧵', label: 'Ткань', names: ['Cloth', 'Metallic Fiber', 'Silk Thread', 'Reinforced Silk', 'Spirit Cloth', 'Moonstone Weave', 'Celestial Weave', 'Astral Weave']},
    gem: {icon: '💎', label: 'Камень', names: ['Coral', 'Silver Nugget', 'Moonstone', 'Sapphire', 'Ruby', 'Diamond', 'Black Pearl', 'Nephrite Pearl']},
};
const craftMaterials = Object.entries(CRAFT_FAMILIES).flatMap(([family, info]) => CRAFT_GRADES.map((grade, index) => ({
    key: `craft_${family}_${grade}`,
    name: info.names[index],
    icon: info.icon,
    description: `${info.label} для ковки снаряжения грейда ${grade === 'noGrade' ? 'NG' : grade}. Падает с боссов.`,
})));

export default [
    {key: 'skill_scroll', name: 'Свиток мастерства', icon: '📜', description: 'Нужен для улучшения навыков с 4-го по 7-й уровень. Падает с любых боссов и их свиты.'},
    {key: 'ancient_seal', name: 'Древняя печать', icon: '🔱', description: 'Нужна для улучшения навыков с 8-го по 10-й уровень. Падает со стойких боссов (2-й и 3-й ранг) и парных боссов.'},
    {key: 'essence_kivaha', name: 'Сущность Киваху', icon: '⚡', description: 'Искра грозовой черепахи. Редкая добыча с Киваху.'},
    {key: 'essence_avrora', name: 'Сущность Авроры', icon: '🌊', description: 'Капля чистой воды из сердца феи. Редкая добыча с Авроры.'},
    {key: 'essence_fjorina', name: 'Сущность Фйорины', icon: '🔥', description: 'Огненный алмаз с наконечника копья. Редкая добыча с Фйорины.'},
    {key: 'essence_radjahal', name: 'Сущность Раджахала', icon: '❄️', description: 'Вечный лёд. Редкая добыча с Раджахала.'},
    {key: 'essence_carnevorusIsse', name: 'Сущность Карневоруса', icon: '🌸', description: 'Светящийся лепесток. Редкая добыча с Карневоруса Иссе.'},
    {key: 'essence_zephyrion', name: 'Сущность Зефириона', icon: '🌪️', description: 'Запертый ветер. Редкая добыча с Зефириона.'},
    {key: 'essence_terrax', name: 'Сущность Терракса', icon: '🪨', description: 'Сердце гранита. Редкая добыча с Терракса.'},
    {key: 'essence_veraxis', name: 'Сущность Вераксиса', icon: '💀', description: 'Осколок бессмертной души. Редкая добыча с Вераксиса.'},
    {key: 'essence_tiamara', name: 'Сущность Тиамары', icon: '🐍', description: 'Чешуя трёх голов. Редкая добыча с Тиамары.'},
    {key: 'essence_ignar', name: 'Сущность Игнара', icon: '🌋', description: 'Тлеющий уголь брата. Редкая добыча с Игнара.'},
    {key: 'essence_pira', name: 'Сущность Пиры', icon: '🔆', description: 'Негаснущая искра сестры. Редкая добыча с Пиры.'},
    {key: 'essence_queenAnt', name: 'Сущность Королевы Муравьёв', icon: '🐜', description: 'Хитин матки. Падает с Королевы Муравьёв.'},
    {key: 'essence_core', name: 'Сущность Кора', icon: '🪨', description: 'Раскалённый камень недр. Падает с Кора.'},
    {key: 'essence_orfen', name: 'Сущность Орфен', icon: '🦅', description: 'Перо ведьмы ветров. Падает с Орфен.'},
    {key: 'essence_zaken', name: 'Сущность Закена', icon: '🏴‍☠️', description: 'Монета проклятого корабля. Падает с Закена.'},
    {key: 'essence_baium', name: 'Сущность Баюма', icon: '💎', description: 'Осколок кристального трона. Падает с Баюма.'},
    {key: 'essence_frintezza', name: 'Сущность Фринтеззы', icon: '🎻', description: 'Струна тёмной скрипки. Падает с Фринтеззы.'},
    {key: 'essence_antharas', name: 'Сущность Антараса', icon: '🐲', description: 'Чешуя земного дракона. Падает с Антараса.'},
    {key: 'essence_valakas', name: 'Сущность Валакаса', icon: '🌋', description: 'Лавовый коготь. Падает с Валакаса.'},
    {key: 'essence_selene', name: 'Сущность Селены', icon: '🌙', description: 'Лунный свет. Редкая добыча с Селены.'},
    {key: 'essence_umbra', name: 'Сущность Умбры', icon: '🌑', description: 'Сгусток тени. Редкая добыча с Умбры.'},
    ...enchantMaterials,
    ...craftMaterials,
];

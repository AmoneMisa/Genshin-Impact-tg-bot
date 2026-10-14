// Расчет стоимости улучшения до заданного уровня
const DEFAULT_GROWTH = 1.17;

// `growth` is a number for every resource, or {gold, ironOre, moonDew} to tune a resource on its own
// (template field upgradeCostGrowth). Anything not given grows by DEFAULT_GROWTH.
export default function (upgradeCostsArray, level, growth = DEFAULT_GROWTH) {
    const upgradeCosts = [...upgradeCostsArray]; // Создаем копию массива стоимостей улучшений
    const factor = resource => (typeof growth === 'number' ? growth : growth?.[resource]) ?? DEFAULT_GROWTH;

    while (upgradeCosts.length < level) {
        const previousLevel = upgradeCosts.length + 1;
        const previousCost = upgradeCosts[previousLevel - 2]; // Получаем стоимость предыдущего уровня

        // Рассчитываем стоимость для текущего уровня
        const currentCost = {
            level: previousLevel,
            gold: Math.round(previousCost.gold * factor('gold')),
            ironOre: Math.round(previousCost.ironOre * factor('ironOre')),
            moonDew: Math.round((previousCost.moonDew ?? previousCost.crystals ?? 0) * factor('moonDew'))
        };

        upgradeCosts.push(currentCost); // Добавляем стоимость для текущего уровня в массив
    }

    return upgradeCosts[level - 2];
}

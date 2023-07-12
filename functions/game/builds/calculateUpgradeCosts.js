// Расчет стоимости улучшения до заданного уровня
function calculateUpgradeCosts(build, level) {
    const upgradeCosts = [...build.upgradeCosts]; // Создаем копию массива стоимостей улучшений

    while (upgradeCosts.length < level) {
        const previousLevel = upgradeCosts.length + 1;
        const previousCost = upgradeCosts[previousLevel - 2]; // Получаем стоимость предыдущего уровня
        const costIncreaseFactor = 1.3; // Фактор увеличения стоимости (примерное значение, можно настроить по необходимости)

        // Рассчитываем стоимость для текущего уровня
        const currentCost = {
            level: previousLevel,
            gold: Math.round(previousCost.gold * costIncreaseFactor),
            ironOre: Math.round(previousCost.ironOre * costIncreaseFactor),
            crystals: Math.round(previousCost.crystals * costIncreaseFactor)
        };

        upgradeCosts.push(currentCost); // Добавляем стоимость для текущего уровня в массив
    }

    return upgradeCosts;
}
// Рассчет оптимальной стоимости для ускорения построек
module.exports = function (buildUpgradeTime) {
    const modifier = 30; // Предполагаемая стоимость ускорения в кристаллах
    if (buildUpgradeTime <= 15) {
        return 0; // Ускорение бесплатно, если осталось 15 минут или меньше
    } else {
        const hoursLeft = Math.ceil(buildUpgradeTime / 60);
        return hoursLeft * modifier;
    }
}

// Пример использования функции для рассчета стоимости ускорения
// const buildTimeRemaining = 15 * 60; // 15 минут в секундах
// const speedUpCost = calculateOptimalSpeedUpCost(buildTimeRemaining);
// console.log(speedUpCost);
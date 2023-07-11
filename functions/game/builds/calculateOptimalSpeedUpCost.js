// Рассчет оптимальной стоимости для ускорения построек
function calculateOptimalSpeedUpCost(buildTime) {
    if (buildTime <= 15) {
        return 0; // Ускорение бесплатно, если осталось 15 минут или меньше
    } else {
        const hoursLeft = Math.ceil(buildTime / 60);
        const cost = hoursLeft * 30; // Предполагаемая стоимость ускорения в кристаллах
        return cost;
    }
}

// Пример использования функции для рассчета стоимости ускорения
// const buildTimeRemaining = 15 * 60; // 15 минут в секундах
// const speedUpCost = calculateOptimalSpeedUpCost(buildTimeRemaining);
// console.log(speedUpCost);
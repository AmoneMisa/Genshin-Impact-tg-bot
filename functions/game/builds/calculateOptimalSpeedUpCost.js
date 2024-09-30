import calculateRemainBuildTime from './calculateRemainBuildTime.js';
// Рассчет оптимальной стоимости для ускорения построек
export default function (buildName, build) {
    const modifier = 30; // Предполагаемая стоимость ускорения в кристаллах
    let buildUpgradeTime = calculateRemainBuildTime(buildName, build) / 1000 / 60;

    if (buildUpgradeTime <= 15) {
        return 0; // Ускорение бесплатно, если осталось 15 минут или меньше
    } else {
        const hoursLeft = Math.ceil(buildUpgradeTime / 60);
        return hoursLeft * modifier;
    }
}
import getUserName from '../../getters/getUserName.js';

export default function (boss) {
    if (!boss) {
        return `Группа ещё не призвала босса. Призвать можно командой /boss`;
    }

    if (!boss.currentHp) {
        boss.currentHp = boss.hp;
        return `Ещё никто не нанёс урона боссу. Его хп: ${boss.currentHp} Нанести урон можно командой /deal_damage.`;
    }

    if (boss.currentHp <= 0) {
        return  `Босс мёртв. Звоните в камбечную.`;
    }

    let message = `Всего нанесено урона: ${boss.hp - boss.currentHp}.\nОставшееся хп: [ ${boss.currentHp} ]\n\n`;
    let players = boss.listOfDamage;
    players.sort((a, b) => b.damage - a.damage);

    for (let player of players) {
        message += `${getUserName(player, "nickname")}: ${players[player.id]}\n`;
    }

    return message;
};
module.exports = function (dmgList) {
    let message = `Босс нанёс урон всей группе:\n\n`;

    for (let player of Object.values(dmgList)) {
        message += `@${player.username} - ${player.dmg} урона\n`;

        if (player.hp  <= 0) {
            message += `@${player.username}, ты был повержен(-а) боссом.\n`;
        }
    }

    return message;
};
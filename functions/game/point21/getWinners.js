module.exports = function (winners) {
    let str = "Список игроков:\n\n";

    for (let winner of winners) {
        let goldStr = '';

        if (winner.diffGold !== 0) {
            goldStr = `${winner.diffGold} золота`;
        }

        str += `${winner.name}: ${winner.points} очка(-ов). `;

        if (winner.isWining) {
            if (goldStr) {
                str += `Выигрыш: ${goldStr}`;
            } else {
                str += `Победитель!`;
            }
        } else {
            if (goldStr) {
                str += `Проигрыш: ${goldStr}`;
            } else {
                str += `Лууузер!`;
            }
        }

        str += '\n';
    }

    return str;
};
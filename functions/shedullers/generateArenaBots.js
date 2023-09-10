const generateArenaBot = require("../game/arena/generateArenaBot");
const data = require("../../data");
const {updArenaTempBots} = require("../../data");
const fs = require("fs");

module.exports = function () {
    if (data.arenaTempBots.length) {
        data.arenaTempBots = [];
    }

    let arenaTempBotsArray;
    let unique = new Set();

    for (let arenaBot of botsMap) {
        for (let i = 0; i < arenaBot.count; i++) {
            let generatedBot = generateArenaBot(arenaBot.rating);
            unique.add(generatedBot);
        }
    }

    arenaTempBotsArray = Array.from(unique);
    data.arenaTempBots = arenaTempBotsArray;
    fs.writeFileSync('arenaTempBots.json', JSON.stringify(arenaTempBotsArray));
    updArenaTempBots();
}

const botsMap = [
    {
        rating: 0,
        count: 25
    },
    {
        rating: 1000,
        count: 55
    },
    {
        rating: 1151,
        count: 25
    },
    {
        rating: 1251,
        count: 25
    },
    {
        rating: 1301,
        count: 25
    },
    {
        rating: 1351,
        count: 25
    },
    {
        rating: 1381,
        count: 25
    },
    {
        rating: 1421,
        count: 25
    }, {
        rating: 1500,
        count: 15
    }, {
        rating: 1550,
        count: 10
    }
]
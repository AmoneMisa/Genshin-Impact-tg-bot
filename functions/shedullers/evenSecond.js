const cron = require("node-cron");
const setHpRegen = require("./setHpRegen");
const setCpRegen = require("./setCpRegen");
const setMpRegen = require("./setMpRegen");
const respawnPlayer = require("./respawnPlayer");
const bossWin = require("./bossWin");

module.exports = function () {
    cron.schedule("* * * * * *", () => {
        try {
            setHpRegen();
            setCpRegen();
            setMpRegen();
            respawnPlayer();
            bossWin();
        } catch (e) {
            console.error(e);
        }
    })
}
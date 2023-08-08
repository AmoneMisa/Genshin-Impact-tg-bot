const cron = require("node-cron");
const setHpRegen = require("./setHpRegen");
const setCpRegen = require("./setCpRegen");
const setMpRegen = require("./setMpRegen");

module.exports = function () {
    cron.schedule("* * * * * *", () => {
        try {
            setHpRegen();
            setCpRegen();
            setMpRegen();
        } catch (e) {
            console.error(e);
        }
    })
}
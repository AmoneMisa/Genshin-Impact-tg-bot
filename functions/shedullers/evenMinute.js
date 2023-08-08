const cron = require("node-cron");

module.exports = function () {
    cron.schedule("* * * * *", () => {
        try {

        } catch (e) {
            console.error(e);
        }
    })
}
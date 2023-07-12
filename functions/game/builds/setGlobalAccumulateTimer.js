const cron = require("node-cron");
const getMembers = require('../../../functions/getters/getMembers');
const getTime = require('../../../functions/getters/getTime');
const getBuildsList = require('../../../functions/game/builds/getBuildList');
const {sessions} = require('../../../data');

module.exports = function () {
    for (let chatId of Object.keys(sessions)) {
        for (let userId of Object.keys(getMembers(chatId))) {
            for (let [buildName, build] of Object.entries(getBuildsList(chatId, userId))) {
                if (build.upgradeStartedAt) {
                    continue;
                }

                if (build.lastCollectAt) {

                }
            }
        }
    }

    cron.schedule('0 * * * *', () => {

    });
}
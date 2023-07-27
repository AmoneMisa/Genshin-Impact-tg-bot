const {sessions} = require("../../data");
const getMembers = require("../getters/getMembers");

module.exports = function () {
    for (let chatId of Object.keys(sessions)) {
        for (let member of Object.values(getMembers(chatId))) {
            for (let [buildName, build] of Object.entries(await getBuildsList(chatId, userId))) {

            }
        }
    }
}
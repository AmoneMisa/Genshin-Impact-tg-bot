const calculateRemainBuildTime = require("./calculateRemainBuildTime");
const upgradeBuild = require("./upgradeBuild");
const sendMessage = require("../../tgBotFunctions/sendMessage");
const getUserName = require('../../getters/getUserName');
const buildsTemplate = require("../../../templates/buildsTemplate");

module.exports = function (buildName, build, chatId, session) {
    let remain = calculateRemainBuildTime(buildName, build);
    let buildTemplate = buildsTemplate[buildName];
    build.upgradeTimerId = +setTimeout(() => {
        upgradeBuild(build);
        build.upgradeTimerId = null;
        return sendMessage(chatId, `@${getUserName(session, "nickname")}, твоё здание "${buildTemplate.name}" успешно построено!`, {});
    }, remain);
}
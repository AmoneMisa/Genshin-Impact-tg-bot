const {sessions} = require("../../data");
const buildsTemplate = require("../../template/buildsTemplate");
const debugMessage = require("../tgBotFunctions/debugMessage");

module.exports = function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            for (let build of session.game.builds) {
                let buildTemplate = buildsTemplate[build.name];

                if (!build.lastCollectAt) {
                    build.lastCollectAt = Date.now();
                    debugMessage(`${session.game.builds[build.name].lastCollectAt} - попытка обратиться к боту.`);
                }

                if (Date.now() - build.lastCollectAt > buildTemplate.maxWorkHoursWithoutCollection * 60 * 60 * 1000) {
                    build.isCollectedResources = false;
                } else if (Date.now() - build.lastCollectAt > 0) {
                    build.isCollectedResources = true;
                    build.lastCollectAt = Date.now();
                }
            }
        }
    }
}

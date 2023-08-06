const {sessions} = require("../../data");
const buildsTemplate = require("../../templates/buildsTemplate");

module.exports = function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            for (let build of session.game.builds) {
                let buildTemplate = buildsTemplate[build.name];

                if (Date.now() - build.lastCollectedAt > buildTemplate.maxWorkHoursWithoutCollection * 60 * 60 * 1000) {
                    build.isCollectedResources = false;
                } else if (Date.now() - build.lastCollectedAt > 0) {
                    build.isCollectedResources = true;
                    build.lastCollectedAt = Date.now();
                }
            }
        }
    }
}

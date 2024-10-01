import { sessions } from '../../data.js';
import buildsTemplate from '../../template/buildsTemplate.js';
import debugMessage from '../tgBotFunctions/debugMessage.js';

export default function () {
    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            for (let build of session.game.builds) {
                let buildTemplate = buildsTemplate[build.name];

                if (!build.lastCollectAt) {
                    build.lastCollectAt = new Date().getTime();
                }

                if (new Date().getTime() - build.lastCollectAt > buildTemplate.maxWorkHoursWithoutCollection * 60 * 60 * 1000) {
                    build.isCollectedResources = false;
                } else if (new Date().getTime() - build.lastCollectAt > 0) {
                    build.isCollectedResources = true;
                    build.lastCollectAt = new Date().getTime();
                }
            }
        }
    }
}

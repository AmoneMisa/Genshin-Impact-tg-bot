import calculateRemainBuildTime from "./calculateRemainBuildTime.js";
import upgradeBuild from "./upgradeBuild.js";
import sendMessage from "../../tgBotFunctions/sendMessage.js";
import getUserName from "../../getters/getUserName.js";
import buildsTemplate from "../../../template/buildsTemplate.js";

/**
 * Запускает таймер апгрейда постройки
 * @param {string} buildName - название постройки
 * @param {Object} build - объект постройки
 * @param {string} chatId - идентификатор чата
 * @param {Object} member - объект игрока (из Chat.members)
 */
export default function startUpgradeTimer(buildName, build, chatId, member) {
    const remain = calculateRemainBuildTime(buildName, build);
    const buildTemplate = buildsTemplate[buildName];
    if (!buildTemplate) {
        throw new Error(`Неизвестная постройка: ${buildName}`);
    }

    build.upgradeTimerId = setTimeout(() => {
        upgradeBuild(build);
        build.upgradeTimerId = null;

        const username = getUserName(member, "nickname") || member.userId;
        sendMessage(
            chatId,
            `@${username}, твоё здание "${buildTemplate.name}" успешно построено!`,
            {}
        );
    }, remain);
}

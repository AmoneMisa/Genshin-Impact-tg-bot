import calculateRemainBuildTime from './calculateRemainBuildTime.js';
import upgradeBuild from './upgradeBuild.js';
import sendMessage from '../../tgBotFunctions/sendMessage.js';
import getUserName from '../../getters/getUserName.js';
import buildsTemplate from '../../../template/buildsTemplate.js';

export default function (buildName, build, chatId, session) {
    let remain = calculateRemainBuildTime(buildName, build);
    let buildTemplate = buildsTemplate[buildName];
    build.upgradeTimerId = +setTimeout(() => {
        upgradeBuild(build);
        build.upgradeTimerId = null;
        return sendMessage(chatId, `@${getUserName(session, "nickname")}, твоё здание "${buildTemplate.name}" успешно построено!`, {});
    }, remain);
}
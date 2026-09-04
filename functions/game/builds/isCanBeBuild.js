import Chat from "../../../db/models/Chat.js";
import getBuildList from "./getBuildList.js";
import buildsTemplate from "../../../template/buildsTemplate.js";

export default async function(buildName, build, chatId, userId) {
    const template = buildsTemplate[buildName];
    if (!template?.upgradeRequirements) {
        return true;
    }

    const buildList = await getBuildList(chatId, userId);
    const upgrades = template.upgradeRequirements[build.currentLvl - 1];

    for (const [upgradeKey, upgradeValue] of Object.entries(upgrades)) {
        if (upgradeKey === "buildRequirements") {
            if (!checkBuildRequirements(buildList, upgradeValue)) {
                return false;
            }
        }

        if (upgradeKey === "characterRequirements") {
            const chat = await Chat.findOne({ chatId });
            const member = chat.members.find(m => m.userId === userId);
            if (!member) throw new Error(`Игрок ${userId} не найден`);

            if (!checkCharacterRequirements(member.game, upgradeValue)) {
                return false;
            }
        }
    }

    return true;
}

function checkBuildRequirements(buildList, requirements) {
    if (!requirements?.length) return true;

    return requirements.every(req => {
        const build = buildList[req.name];
        return build && build.currentLvl >= req.level;
    });
}

function checkCharacterRequirements({ stats, gameClass }, requirements) {
    if (!requirements?.length) return true;
    if (!stats || !gameClass) return false;

    return requirements.every(req => {
        // проверяем, что хотя бы одно из условий выполнено
        return Object.entries(req).every(([key, value]) => {
            if (stats[key]) return stats[key] >= value;
            if (gameClass[key]) return gameClass[key] >= value;
            return false;
        });
    });
}

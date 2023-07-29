const bot = require("../../../../bot");
const getRandom = require("../../../getters/getRandom");

module.exports = async function (bossSkill, chatId) {
    let countChatMembers = await bot.getChatMembersCount(chatId);
    let maxHp = countChatMembers * 6780;
    let hp = getRandom(maxHp * 3.75, maxHp);

    if (bossSkill.effect.includes("rage")) {
        hp = hp / 2;
    }

    return hp;
}
const bot = require("../../../../bot");
const getRandom = require("../../../getters/getRandom");

module.exports = async function (bossSkill, chatId) {
    let countChatMembers = await bot.getChatMembersCount(chatId);
    // let maxHp = countChatMembers * 1200;
    let maxHp = countChatMembers * 1;
    let hp = getRandom(maxHp * 1.33, maxHp);

    if (bossSkill.effect.includes("rage")) {
        hp = hp / 2;
    }

    return hp;
}
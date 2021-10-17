const userTemplate = require('../templates/userTemplate');
const bot = require('../bot');
const getMembers = require('./getMembers');

module.exports = async function (chatId, userId) {
    let members = getMembers(chatId);

    if (!members[userId]) {
        members[userId] = {
            userChatData: await bot.getChatMember(chatId, userId),
            user: {...userTemplate}
        };
    }

    if (!members[userId].game) {
        members[userId].game = {
            stats: {
                currentExp: 0,
                needExp: 1500,
                lvl: 1,
            },
            shopTimers: {
                swordImmune: 0,
                swordAddMM: 0,
                addBossDmg: 0,
                addBossCritChance: 0,
                addBossCritDmg: 0,
                swordAdditionalTry: 0
            },
            inventory: {
                gold: 0,
                potions: [{name: "hp_1000", count: 0}, {name: "hp_3000", count: 0}]
            },
            boss: {
                hp: 1000,
                damagedHp: 0,
                damage: 0,
                bonus: {}
            }
        };
    }

    return members[userId];
};
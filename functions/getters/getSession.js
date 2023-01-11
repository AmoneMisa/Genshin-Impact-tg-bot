const userTemplate = require('../../templates/userTemplate');
const bot = require('../../bot');
const getMembers = require('./getMembers');

module.exports = async function (chatId, userId) {
    let members = getMembers(chatId);

    if (!members[userId]) {
        members[userId] = {
            userChatData: await bot.getChatMember(chatId, userId),
            user: {...userTemplate}
        };
    }

    if (!members[userId].hasOwnProperty("reddit")) {
        members[userId].reddit = {
            subscribes: [],
            countPosts: 3,
            postType: "hot",
            timer: {
                hour: 2,
                minute: 0
            }
        };
    }

    if (!members[userId].game) {
        members[userId].game = {
            dice: {
                isStart: false,
                bet: 0,
                dice: 0,
                counter: 0
            },
            stats: {
                currentExp: 0,
                needExp: 1500,
                lvl: 1,
            },
            effects: [],
            gameClass: {
                stats: {
                    translateName: "Бродяжка",
                    attack: 1,
                    defence: 1,
                    criticalDamage: 1,
                    criticalChance: 1
                },
                skills: [{
                    slot: 0,
                    name: "Тык палкой",
                    description: "Тыкнуть палкой в босса.",
                    effect: "common_attack",
                    damageModificator: 1,
                    cooltime: 0,
                    isSelf: false,
                    isDealDamage: true,
                    isHeal: false,
                    isShield: false,
                    isBuff: false,
                    needlvl: 0,
                    crystalCost: 0,
                    cost: 0,
                    cooltimeReceive: 0
                }]
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
                crystals: 0,
                potions: [{name: "hp_1000", count: 0}, {name: "hp_3000", count: 0}]
            },
            boss: {
                hp: 1000,
                damagedHp: 0,
                damage: 0
            }
        };
    }

    if (!members[userId].game.hasOwnProperty("effects")) {
        members[userId].game.effects = [];
    }

    if (!members[userId].game.inventory.hasOwnProperty("crystals")) {
        members[userId].game.inventory.crystals = 0;
    }

    if (!members[userId].game.hasOwnProperty("gameClass")) {
        members[userId].game.gameClass = {
            stats: {
                translateName: "Бродяжка",
                attack: 1,
                defence: 1,
                criticalDamage: 1,
                criticalChance: 1
            },
            skills: [{
                slot: 0,
                name: "Тык палкой",
                description: "Тыкнуть палкой в босса.",
                effect: "common_attack",
                damageModificator: 1,
                cooltime: 0,
                isSelf: false,
                isDealDamage: true,
                isHeal: false,
                isShield: false,
                isBuff: false,
                needlvl: 0,
                crystalCost: 0,
                cost: 0,
                cooltimeReceive: 0
            }]
        };
    }

    return members[userId];
};
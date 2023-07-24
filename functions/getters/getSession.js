const userTemplate = require('../../templates/userTemplate');
const bot = require('../../bot');
const getMembers = require('./getMembers');
const getBuildFromTemplate = require('../game/builds/getBuildFromTemplate');
const classStatsTemplate = require('../../templates/classStatsTemplate');
const classSkillsTemplate = require('../../templates/classSkillsTemplate');
const potionsInInventoryTemplate = require('../../templates/potionsInInventoryTemplate');

module.exports = async function (chatId, userId) {
    let members = getMembers(chatId);
    let getUpdatedData = await bot.getChatMember(chatId, userId);

    if (!members[userId]) {
        members[userId] = {
            userChatData: getUpdatedData,
            user: {...userTemplate}
        };
    }

    if (members[userId].userChatData.user.username !== getUpdatedData.user.username) {
        members[userId].userChatData.user.username = getUpdatedData.user.username;
    }

    if (members[userId].userChatData.user.first_name !== getUpdatedData.user.first_name) {
        members[userId].userChatData.user.first_name = getUpdatedData.user.first_name;
    }

    // if (!members[userId].hasOwnProperty("reddit")) {
    //     members[userId].reddit = {
    //         subscribes: [],
    //         countPosts: 3,
    //         postType: "hot",
    //         timer: {
    //             hour: 2,
    //             minute: 0
    //         }
    //     };
    // }

    if (!members[userId].game) {
        members[userId].game = {
            dice: {
                isStart: false,
                bet: 0,
                dice: 0,
                counter: 0
            },
            basketball: {
                bet: 0,
                ball: 0,
                counter: 0,
                isStart: false
            },
            football: {
                bet: 0,
                ball: 0,
                counter: 0,
                isStart: false
            },
            bowling: {
                bet: 0,
                skittles: 0,
                counter: 0,
                isStart: false
            },
            darts: {
                bet: 0,
                dart: 0,
                counter: 0,
                isStart: false
            },
            stats: {
                currentExp: 0,
                needExp: 1500,
                lvl: 1,
            },
            effects: [],
            gameClass: {
                stats: {...classStatsTemplate[0]},
                skills: {...classSkillsTemplate[0]}
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
                ironOre: 0,
                potions: lodash.cloneDeep(potionsInInventoryTemplate)
            }
        };
    }

    if (!members[userId].game.hasOwnProperty("effects")) {
        members[userId].game.effects = [];
    }

    if (!members[userId].game.hasOwnProperty("builds")) {
        members[userId].game.builds = getBuildFromTemplate();
    }

    if (!members[userId].game.inventory.hasOwnProperty("crystals")) {
        members[userId].game.inventory.crystals = 0;
    }

    if (!members[userId].game.inventory.hasOwnProperty("ironOre")) {
        members[userId].game.inventory.ironOre = 0;
    }

    members[userId].game.inventory.potions.forEach(potion => {
        if (!potion.bottleType || !potion.description) {
            members[userId].game.inventory.potions = lodash.cloneDeep(potionsInInventoryTemplate);
        }
    })

    if (!members[userId].game.hasOwnProperty("gameClass")) {
        members[userId].game.gameClass = {
            stats: {...classStatsTemplate[0]},
            skills: {...classSkillsTemplate[0]}
        };
    }

    let foundedClass;
    if (members[userId].game.gameClass.stats.name) {
        foundedClass = classStatsTemplate.find(_class => _class.name === members[userId].game.gameClass.stats.name);
    } else {
        foundedClass = classStatsTemplate.find(_class => _class.name === "noClass");
    }

    for (let [newStatKey, newStatValue] of Object.entries(foundedClass)) {
        if (members[userId].game.gameClass.stats.hasOwnProperty(newStatKey)) {
            continue;
        }

        members[userId].game.gameClass.stats[newStatKey] = newStatValue;
    }

    return members[userId];
};
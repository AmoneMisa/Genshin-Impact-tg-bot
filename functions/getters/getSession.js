const userTemplate = require('../../templates/userTemplate');
const bot = require('../../bot');
const getMembers = require('./getMembers');
const getBuildFromTemplate = require('../game/builds/getBuildFromTemplate');
const classStatsTemplate = require('../../templates/classStatsTemplate');
const classSkillsTemplate = require('../../templates/classSkillsTemplate');
const potionsInInventoryTemplate = require('../../templates/potionsInInventoryTemplate');
const lodash = require("lodash");

module.exports = async function (chatId, userId) {
    let members = getMembers(chatId);
    let getUpdatedData = await bot.getChatMember(chatId, userId);

    if (!members[userId]) {
        members[userId] = {
            isHided: false,
            user: {...userTemplate},
            gender: "male"
        };
    }

    members[userId].userChatData = Object.assign({}, getUpdatedData);

    if (!members[userId].game) {
        members[userId].game = {
            gacha: {},
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
                inFightTimer: 0
            },
            effects: [],
            gameClass: {
                stats: {...classStatsTemplate[0]},
                skills: {...classSkillsTemplate.noClass}
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
        members[userId].game.stealImmuneTimer = 0;
        members[userId].game.chanceToSteal = 2;
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
            skills: {...classSkillsTemplate.noClass}
        };
    }

    let className = members[userId].game.gameClass.stats.name || 'noClass';

    if (!classSkillsTemplate[className]) {
        throw new Error("Not found skills for class " + className);
    }

    let foundedClassSkills = classSkillsTemplate[className];
    let foundedClassStats = classStatsTemplate.find(_class => _class.name === className);

    if (!foundedClassStats) {
        throw new Error("Not found stats for class " + className);
    }

    members[userId].game.gameClass.stats = Object.assign({}, foundedClassStats, members[userId].game.gameClass.stats);
    members[userId].game.gameClass.skills = [...foundedClassSkills];

    if (members[userId].game.hasOwnProperty("gacha")) {
        members[userId].game.gacha = {};
    }

    return members[userId];
};
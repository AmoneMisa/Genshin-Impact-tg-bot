const getBuildFromTemplate = require("../game/builds/getBuildFromTemplate");
const lodash = require("lodash");
const potionsInInventoryTemplate = require("../../templates/potionsInInventoryTemplate");
const classStatsTemplate = require("../../templates/classStatsTemplate");
const classSkillsTemplate = require("../../templates/classSkillsTemplate");
module.exports = function (session) {
    if (!session.game) {
        session.game = {
            equipmentStats: {},
            character: {
                head: null,
                hands: null,
                leftHand: null,
                rightHand: null,
                legs: null,
                leftEar: null,
                rightEar: null,
                leftRing: null,
                rightRing: null,
                necklace: null,
                up: null,
                down: null,
                cloak: null
            },
            gacha: [],
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
                potions: lodash.cloneDeep(potionsInInventoryTemplate),
                gacha: [],
                equipment: []
            }
        };
    }


    if (!session.game.hasOwnProperty("effects")) {
        session.game.effects = [];
    }

    if (!session.game.hasOwnProperty("builds")) {
        session.game.builds = getBuildFromTemplate();
        session.game.stealImmuneTimer = 0;
        session.game.chanceToSteal = 2;
    }

    if (!session.game.inventory.hasOwnProperty("crystals")) {
        session.game.inventory.crystals = 0;
    }

    if (!session.game.inventory.hasOwnProperty("ironOre")) {
        session.game.inventory.ironOre = 0;
    }

    session.game.inventory.potions.forEach(potion => {
        if (!potion.bottleType || !potion.description) {
            session.game.inventory.potions = lodash.cloneDeep(potionsInInventoryTemplate);
        }
    })

    if (!session.game.hasOwnProperty("gameClass")) {
        session.game.gameClass = {
            stats: {...classStatsTemplate[0]},
            skills: {...classSkillsTemplate.noClass}
        };
    }

    if (!session.game.inventory.hasOwnProperty("gacha")) {
        session.game.inventory.gacha = {};
    }

    if (!session.game.hasOwnProperty("gacha")) {
        session.game.gacha = [];
    }

    if (!session.game.inventory.hasOwnProperty("equipment")) {
        session.game.inventory.equipment = [];
    }

    if (!session.game.hasOwnProperty("character")) {
        session.game.character = {
            head: null,
            hands: null,
            leftHand: null,
            rightHand: null,
            legs: null,
            leftEar: null,
            rightEar: null,
            leftRing: null,
            rightRing: null,
            necklace: null,
            up: null,
            down: null,
            cloak: null
        };
    }

    if (!session.game.hasOwnProperty("equipmentStats")) {
        session.game.equipmentStats = {};
    }
}
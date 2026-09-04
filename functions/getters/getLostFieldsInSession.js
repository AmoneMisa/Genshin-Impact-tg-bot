import getBuildFromTemplate from '../game/builds/getBuildFromTemplate.js';
import lodash from 'lodash';
import potionsInInventoryTemplate from '../../template/potionsInInventoryTemplate.js';
import classStatsTemplate from '../../template/classStatsTemplate.js';
import classSkillsTemplate from '../../template/classSkillsTemplate.js';

export default function (session) {
    if (!session.hasOwnProperty("whatsNewSettings")) {
        session.whatsNewSettings = {
            flag: 0,
            button: {
                text: "Выкл",
                callback_data: "whatsNew.0"
            }
        };
    }

    if (!session.hasOwnProperty("horoscope")) {
        session.horoscope = {
            sign: 'aries',
            style: 'cheeky'
        };
    }

    const sessionGameTemplate = {
        arenaChances: 15,
        arenaExpansionChances: 10,
        basketball: {
            bet: 0,
            ball: 0,
            counter: 0,
            isStart: false
        },
        bonusChances: 1,
        bowling: {
            bet: 0,
            skittles: 0,
            counter: 0,
            isStart: false
        },
        builds: getBuildFromTemplate(),
        chanceToSteal: 2,
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
        darts: {
            bet: 0,
            dart: 0,
            counter: 0,
            isStart: false
        },
        dice: {
            isStart: false,
            bet: 0,
            dice: 0,
            counter: 0
        },
        effects: [],
        equipmentStats: {},
        football: {
            bet: 0,
            ball: 0,
            counter: 0,
            isStart: false
        },
        gacha: [],
        gameClass: {
            stats: {...classStatsTemplate[0]},
            skills: {...classSkillsTemplate.noClass}
        },
        inventory: {
            arena: {
                name: "Предметы арены",
                items: [
                    {tokens: 0},
                    {pvpSign: null}
                ],
            },
            gold: 0,
            crystals: 0,
            ironOre: 0,
            sp: 0, // skill points, earned on level-up — spent enchanting skills (see skillEnchant.js)
            potions: {
                name: "Зелья",
                items: lodash.cloneDeep(potionsInInventoryTemplate)
            },
            gacha: {
                name: "Предметы гачи",
                items: []
            },
            equipment: {
                name: "Экипировка",
                items: []
            }
        },
        respawnTime: 0,
        shopTimers: {
            swordImmune: 0,
            swordAddMM: 0,
            addBossDmg: 0,
            addBossCritChance: 0,
            addBossCritDmg: 0,
            swordAdditionalTry: 0
        },
        stats: {
            currentExp: 0,
            needExp: 1500,
            lvl: 1,
            inFightTimer: 0
        },
        stealImmuneTimer: 0
    }

    session.game = Object.assign({}, sessionGameTemplate, session.game);

    // Object.assign above is shallow: an existing player's `game.builds` object
    // wins wholesale over the template's, so a newly-added building would never
    // backfill for existing bot players otherwise (miniapp/builds.js already
    // backfills per-key via ensureBuildDefaults — this mirrors that for the bot).
    if (!session.game.builds || typeof session.game.builds !== "object") {
        session.game.builds = sessionGameTemplate.builds;
    } else {
        for (const [key, defaultBuild] of Object.entries(sessionGameTemplate.builds)) {
            if (!session.game.builds[key]) {
                session.game.builds[key] = defaultBuild;
            }
        }
    }
}
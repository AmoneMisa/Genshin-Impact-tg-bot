import {UserFormType} from "./UserFormType";
import {ClassStatsType} from "./ClassStatsType";
import {UserSkillType} from "./UserSkillType";
import {CharacterType} from "./CharacterType";

export type UserType = {
    isHided: boolean,
    user: UserFormType,
    gender: "male" | "female",
    userChatData: object,
    whatsNewSettings: {
        flag: 0 | 1,
        button: {
            text: "Выкл",
            callback_data: "whatsNew.0"
        },
    },
    game: {
        arenaChances: number,
        arenaExpansionChances: number,
        basketball: {
            bet: number,
            ball: number,
            counter: number,
            isStart: boolean
        },
        bonusChances: number,
        bowling: {
            bet: number,
            skittles: number,
            counter: number,
            isStart: boolean
        },
        builds: object,
        chanceToSteal: number,
        character: CharacterType,
        darts: {
            bet: number,
            dart: number,
            counter: number,
            isStart: boolean
        },
        dice: {
            isStart: boolean,
            bet: number,
            dice: number,
            counter: number
        },
        effects: object[],
        equipmentStats: object,
        football: {
            bet: number,
            ball: number,
            counter: number,
            isStart: boolean
        },
        gacha: object[],
        gameClass: {
            stats: ClassStatsType,
            skills: UserSkillType
        },
        inventory: {
            arena: {
                name: string | "Предметы арены",
                items: [
                    {tokens: number},
                    {pvpSign: object}
                ]

            },
            gold: number,
            crystals: number,
            ironOre: number,
            potions: {
                name: string | "Зелья",
                items: object[]
            },
            gacha: {
                name: string | "Предметы гачи",
                items: object[]
            },
            equipment: {
                name: string | "Экипировка",
                items: object[]
            }
        },
        respawnTime: number,
        shopTimers: {
            swordImmune: number,
            swordAddMM: number,
            addBossDmg: number,
            addBossCritChance: number,
            addBossCritDmg: number,
            swordAdditionalTry: number
        },
        stats: {
            currentExp: number,
            needExp: number,
            lvl: number,
            inFightTimer: number
        },
        stealImmuneTimer: number
    }
}
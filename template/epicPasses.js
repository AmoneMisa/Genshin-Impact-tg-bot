// Entering an epic raid boss (Lineage II). The open-world raids (Queen Ant, Core, Orfen) take a hero alone. Zaken takes
// a party of two. Baium, Frintezza, Antharas and Valakas need a pass, and the pass IS the quest item of the real game
// (Blooded Fabric, the seal of the tomb, the Portal Stone, the Floating Stone). As in the original quest, the hero takes
// the quest from the NPC and then collects N of the items from the named monsters of the named hunting zone; every
// item that drops is one entry. The same pass is bought for Coins of Luck in the Donate shop.
//
// Difficulty, easiest first: Valakas (3 items in one drop, the best chance), Baium, Antharas, Frintezza (the rarest drop).
// Frintezza takes a party of four and the pass of its leader only: the other members need none.
//
// A pass is bound to the character: it lives in game.academy.passes, so it cannot be put on the auction, into the
// warehouse, the mail or a trade. One pass opens one entry.

/** Epic bosses that need a party of at least this many members to be called. */
// A pass boss is not a solo fight: its hit points are sized by this party (worldBosses.js) and it cannot be called alone.
export const PARTY_EPICS = Object.freeze({zaken: 2, freya: 2, baium: 4, frintezza: 4, beleth: 4, antharas: 5, valakas: 6});

/**
 * Steps of the quest of a pass:
 *   talk     {npc, lines}                       press "Поговорить": the NPC's lines are shown
 *   collect  {item, target, amount, chance, zone, mobs, text}   the pass itself drops from the named monsters of the
 *                                                      zone, `amount` at a time; done when `target` have been collected
 */
export const PASS_EPICS = Object.freeze({
    baium: {
        label: 'Баюм',
        minLevel: 76,
        cost: 45,
        title: 'Окровавленная ткань',
        npc: 'Привратник Вихря',
        steps: [
            {type: 'talk', npc: 'Привратник Вихря', lines: [
                'Баюм спит в кристальном склепе, и разбудить его может лишь тот, кто принесёт ему кровь, пролитую на поле боя.',
                'Окровавленную ткань находят на тех, кто пал от рук воинов в диких землях. Она нужна один раз — склеп примет её и закроется.',
            ]},
            {type: 'collect', item: 'Окровавленная ткань', target: 8, amount: 2, chance: 0.10, zone: 'catacomb-dark-omens', mobs: ['Lilim Slayer', 'Nephilim Royal Guard', 'Tomb Guard'],
             text: 'Добудь предметы: Катакомба Тёмных Знамений — Лилим-убийцы, королевские стражи нефилимов и стражи гробниц'},
        ],
    },
    frintezza: {
        label: 'Фринтезза',
        leaderOnly: true,
        minLevel: 80,
        cost: 60,
        title: 'Печать Имперской гробницы',
        npc: 'Хранитель гробницы',
        steps: [
            {type: 'talk', npc: 'Хранитель гробницы', lines: [
                'Имперская гробница закрыта печатью, которую не снять простой силой.',
                'Говорят, печати носят на себе порождения проклятого замка. Одна печать открывает гробницу один раз.',
            ]},
            {type: 'collect', item: 'Печать Имперской гробницы', target: 4, amount: 2, chance: 0.05, zone: 'wall-of-argos', mobs: ['Disciples of Punishment', 'Disciples of Authority'],
             text: 'Добудь предметы: Стена Аргоса — Ученики Наказания и Ученики Власти'},
        ],
    },
    beleth: {
        label: 'Белеф',
        leaderOnly: true,
        minLevel: 78,
        cost: 90,
        title: 'Осколок Кольца подчинения',
        npc: 'Хранитель замка',
        steps: [
            {type: 'talk', npc: 'Хранитель замка', lines: [
                'Белеф заперт в своём замке: врата открывает лишь осколок его же Кольца подчинения.',
                'Осколки носят на себе стражи, что пали на службе у мага. Одного осколка хватает на один вход.',
            ]},
            {type: 'collect', item: 'Осколок Кольца подчинения', target: 6, amount: 2, chance: 0.06, zone: 'giants-cave', mobs: ['Lesser Giant Soldier', 'Lesser Giant Elder', 'Lesser Giant Mage'],
             text: 'Добудь предметы: Пещера гигантов — младшие гиганты-солдаты, старейшины и маги'},
        ],
    },
    antharas: {
        label: 'Антарас',
        minLevel: 78,
        cost: 80,
        title: 'Портальный камень',
        npc: 'Страж долины драконов',
        steps: [
            {type: 'talk', npc: 'Страж долины драконов', lines: [
                'Антарас дремлет в логове, и тропа к нему закрыта для всех без портального камня.',
                'Такие камни носят твари долины. Они редки, а тот, кто тратит силы зря, не получит ни одного.',
            ]},
            {type: 'collect', item: 'Портальный камень', target: 6, amount: 2, chance: 0.07, zone: 'primeval-isle', mobs: ['Velociraptor', 'Ornithomimus'],
             text: 'Добудь предметы: Первобытный остров — велоцирапторы и орнитомимы'},
        ],
    },
    valakas: {
        label: 'Валакас',
        minLevel: 80,
        cost: 100,
        title: 'Плавучий камень',
        npc: 'Хранитель вулкана',
        steps: [
            {type: 'talk', npc: 'Хранитель вулкана', lines: [
                'Валакас спит под вулканом, и огонь бережёт его покой.',
                'Лишь плавучий камень может пронести тебя над потоками лавы. Добудь его у обитателей огненных земель.',
            ]},
            {type: 'collect', item: 'Плавучий камень', target: 9, amount: 3, chance: 0.14, zone: 'hot-springs', mobs: ['Hot Springs Yeti', 'Hot Springs Nepenthes', 'Hot Springs Flava'],
             text: 'Добудь предметы: Горячие источники — йети, непентесы и флавы горячих источников'},
        ],
    },
});

export const passEpicNames = () => Object.keys(PASS_EPICS);
export const needsPass = name => Object.hasOwn(PASS_EPICS, name);
export const partyNeeded = name => PARTY_EPICS[name] || 0;
/** The pass of such a boss is spent from the party leader only. */
export const leaderOnly = name => Boolean(PASS_EPICS[name]?.leaderOnly);

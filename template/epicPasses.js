// Entering an epic raid boss (Lineage II). The open-world raids (Queen Ant, Core, Orfen) take a hero alone. Zaken takes
// a party of two. Baium, Frintezza, Antharas and Valakas need a pass: bought for Coins of Luck in the Donate shop or
// earned with a quest of the Academy (steps: dialogs with the NPC, farming mobs, quest item drops, raid bosses).
// A pass is bound to the character: it lives in game.academy.passes, so it cannot be put on the auction, into the
// warehouse, the mail or a trade.

/** Epic bosses that need a party of at least this many members to be called. */
export const PARTY_EPICS = Object.freeze({zaken: 2});

/**
 * Steps:
 *   talk      {npc, lines}                 press "Поговорить": the NPC's lines are shown, the step is done
 *   mobKills  {target, minLevel}           kill monsters of this level or above in the hunting zones
 *   collect   {item, target, chance, minLevel}  a quest item drops from such monsters with this chance
 *   bossKills {target}                     take part in the kill of ordinary bosses
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
                'Принеси мне окровавленную ткань — её находят на тех, кто пал от рук воинов в диких землях.',
                'Но сперва докажи, что ты способен пережить встречу со спящим демоном.',
            ]},
            {type: 'mobKills', target: 80, minLevel: 70, text: 'Победи монстров 70+ уровня'},
            {type: 'collect', item: 'Окровавленная ткань', target: 6, chance: 0.06, minLevel: 70, text: 'Добудь окровавленную ткань'},
            {type: 'bossKills', target: 3, text: 'Победи обычных боссов'},
            {type: 'talk', npc: 'Привратник Вихря', lines: [
                'Ткань пропитана достаточно. Вихрь откроет тебе путь к склепу.',
                'Помни: Баюм не прощает шума. Иди и не оглядывайся.',
            ]},
        ],
    },
    frintezza: {
        label: 'Фринтезза',
        minLevel: 80,
        cost: 60,
        title: 'Печать Имперской гробницы',
        npc: 'Хранитель гробницы',
        steps: [
            {type: 'talk', npc: 'Хранитель гробницы', lines: [
                'Имперская гробница закрыта печатью, которую не снять простой силой.',
                'Говорят, осколки печати носят на себе порождения проклятого замка.',
                'Собери их — и я впущу тебя к Тёмному маэстро.',
            ]},
            {type: 'mobKills', target: 100, minLevel: 75, text: 'Победи монстров 75+ уровня'},
            {type: 'collect', item: 'Осколок печати гробницы', target: 4, chance: 0.05, minLevel: 75, text: 'Добудь осколки печати'},
            {type: 'bossKills', target: 4, text: 'Победи обычных боссов'},
            {type: 'talk', npc: 'Хранитель гробницы', lines: [
                'Печать собрана. Музыка Фринтеззы зовёт — но не каждый выдержит её до конца.',
            ]},
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
            {type: 'mobKills', target: 120, minLevel: 72, text: 'Победи монстров 72+ уровня'},
            {type: 'collect', item: 'Портальный камень', target: 3, chance: 0.04, minLevel: 72, text: 'Добудь портальные камни'},
            {type: 'bossKills', target: 5, text: 'Победи обычных боссов'},
            {type: 'talk', npc: 'Страж долины драконов', lines: [
                'Камни при тебе. Земной дракон ждёт — и пощады он не знает.',
            ]},
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
                'Лишь плавучий камень может пронести тебя над потоками лавы.',
                'Добудь камни у обитателей огненных земель и докажи, что тебе по силам их жар.',
            ]},
            {type: 'mobKills', target: 150, minLevel: 75, text: 'Победи монстров 75+ уровня'},
            {type: 'collect', item: 'Плавучий камень', target: 3, chance: 0.03, minLevel: 75, text: 'Добудь плавучие камни'},
            {type: 'bossKills', target: 6, text: 'Победи обычных боссов'},
            {type: 'talk', npc: 'Хранитель вулкана', lines: [
                'Камни выдержат жар. Огненный дракон проснётся — будь готов.',
            ]},
        ],
    },
});

export const passEpicNames = () => Object.keys(PASS_EPICS);
export const needsPass = name => Object.hasOwn(PASS_EPICS, name);
export const partyNeeded = name => PARTY_EPICS[name] || 0;

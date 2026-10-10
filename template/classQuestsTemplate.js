// Profession quests, Lineage-style: to take a 1st (level 20), 2nd (level 40) or 3rd (level 76)
// profession of the real class tree (template/l2ClassMeta.js) a player talks to a mentor, completes a checklist of objectives
// against raid bosses, hands in some gold, and is promoted (functions/game/classes/classQuests.js).
//
// Step types (all but `pay` progress by themselves while the quest is active):
//   skillUses   {kind, target}        use skills of that kind in a boss fight
//                                     (kind: any|damage|heal|shield|buff|debuff)
//   bossKills   {target, ...filter}   be among the damage dealers of a boss kill
//   minionKills {target}              land the killing blow on boss minions
//   collect     {item, name, icon, target, chance, ...filter}
//                                     a quest item drops with `chance` from every boss
//                                     kill you took part in
//   pay         {gold, crystals}      hand the mentor gold / crystals (a button)
// Boss filters: boss (name or [names]), minTier, element.
//
// A step's `text` is the line shown in the quest log; the Mini App builds a
// default one from the numbers when it is omitted.

const skillUses = (kind, target, text) => ({type: "skillUses", kind, target, text});
const bossKills = (target, filter = {}, text) => ({type: "bossKills", target, ...filter, text});
const minionKills = (target, text) => ({type: "minionKills", target, text});
const collect = (item, name, icon, target, chance, filter = {}, text) => ({type: "collect", item, name, icon, target, chance, ...filter, text});
const pay = (gold, crystals = 0, text) => ({type: "pay", gold, crystals, text});

import {L2_CLASS_META} from './l2ClassMeta.js';

const REWARD = {
    2: {sp: 150, crystals: 20, items: {skill_scroll: 3}},
    3: {sp: 400, crystals: 60, items: {skill_scroll: 5, ancient_seal: 2}},
    4: {sp: 900, crystals: 120, items: {skill_scroll: 8, ancient_seal: 4}}
};
const LEVEL = {2: 20, 3: 40, 4: 76};
const FEE = {2: 20000, 3: 60000, 4: 200000};

const quest = (to, from, tier, giver, intro, outro, steps) => ({
    id: `promo_${to}`,
    to,
    from,
    tier,
    minLevel: LEVEL[tier],
    giver,
    intro,
    outro,
    steps,
    reward: REWARD[tier],
    // Taking an already-earned profession back after switching away costs this.
    returnFee: {gold: FEE[tier]}
});

// the mentor, the quest item and the test of each combat family
const FAMILIES = {
    warrior: {
        giver: {name: "Командор Эльдрик", title: "Глава Ордена Света", icon: "🛡️"}, item: ["Знак ордена", "🛡️"],
        skill: skillUses("damage", 25, "Покажи выучку: применяй боевые навыки"),
        intro: ru => `Путь «${ru}» не для слабых. Докажи, что твой щит и клинок служат чему-то большему, чем ты сам.`,
        outro: ru => `Орден принял тебя. Носи имя «${ru}» с честью.`
    },
    berserk: {
        giver: {name: "Грош Кровавая Секира", title: "Вождь племени", icon: "🪓"}, item: ["Клык вожака", "🐗"],
        skill: skillUses("damage", 25, "Не жалей себя: применяй боевые навыки"),
        intro: ru => `Сила требует цены. Если не боишься пролить кровь ради удара — ты станешь «${ru}».`,
        outro: ru => `Кровь кипит! Теперь ты настоящий «${ru}».`
    },
    rogue: {
        giver: {name: "Тень Вейла", title: "Мастер гильдии", icon: "🗡️"}, item: ["Тёмный клык", "🦷"],
        skill: skillUses("damage", 25, "Бей первым: применяй боевые навыки"),
        intro: ru => `Гильдия не берёт тех, кто боится крови. Покажи, что можешь ударить первым и исчезнуть — путь «${ru}» откроется.`,
        outro: ru => `Клинок стал продолжением руки. Добро пожаловать в тени, «${ru}».`
    },
    archer: {
        giver: {name: "Следопыт Тарин", title: "Хранитель лесов", icon: "🌲"}, item: ["Перо ловчей птицы", "🪶"],
        skill: skillUses("damage", 30, "Выпусти град стрел: применяй боевые навыки"),
        intro: ru => `Хороший стрелок терпелив и точен. Докажи это с отрядом, и тетива «${ru}» будет твоей.`,
        outro: ru => `Горизонт теперь твоя ладонь, «${ru}». Стреляй не отводя взгляда.`
    },
    mage: {
        giver: {name: "Магистр Лиара", title: "Хозяйка Башни Стихий", icon: "🔮"}, item: ["Ядро силы", "🔮"],
        skill: skillUses("damage", 25, "Слушай стихии: применяй боевые навыки"),
        intro: ru => `Магия не терпит робких. Услышь её голос в бою, затем принеси ядро силы — и станешь «${ru}».`,
        outro: ru => `Стихии слушаются тебя, «${ru}». Не расплескай силу.`
    },
    priest: {
        giver: {name: "Сестра Аурелия", title: "Настоятельница Приюта", icon: "🕊️"}, item: ["Слеза рассвета", "💧"],
        skill: skillUses("heal", 15, "Исцели себя и отряд: применяй исцеляющие навыки"),
        intro: ru => `Исцеляя других, мы исцеляемся сами. Покажи, что умеешь возвращать людей из края гибели, и путь «${ru}» твой.`,
        outro: ru => `Свет в твоих руках, «${ru}». Береги тех, кто тебе доверился.`
    }
};

function stepsOf(tier, to, family, ru) {
    const [token, icon] = FAMILIES[family].item;
    if (tier === 2) {
        return [FAMILIES[family].skill, bossKills(3, {}, "Победи трёх боссов вместе с отрядом"),
            collect(`${to}_token`, token, icon, 5, 0.7, {}, `Добудь: ${token}`), pay(20000, 0, "Внеси плату за обучение")];
    }
    if (tier === 3) {
        return [bossKills(2, {minTier: 2}, "Победи двух сильных боссов (2-й и 3-й ранг)"),
            collect(`${to}_relic`, `${token} · реликвия`, icon, 4, 0.75, {minTier: 2}, `Добудь: ${token} · реликвия`),
            minionKills(15, "Добей 15 существ из свиты боссов"), pay(150000, 100, "Принеси дар наставнику")];
    }
    return [bossKills(3, {minTier: 3}, "Победи трёх боссов 3-го ранга"),
        collect(`${to}_crest`, `Герб «${ru}»`, icon, 5, 0.7, {minTier: 3}, `Добудь: Герб «${ru}»`),
        minionKills(30, "Добей 30 существ из свиты боссов"), FAMILIES[family].skill, pay(500000, 300, "Принеси великий дар наставнику")];
}

const metas = Object.values(L2_CLASS_META);
const keyOf = id => L2_CLASS_META[id].key;

export default metas.filter(meta => meta.level >= 1).sort((a, b) => a.level - b.level).map(meta => {
    const tier = meta.level + 1;
    const family = FAMILIES[meta.family];
    return quest(meta.key, keyOf(meta.parent), tier, family.giver, family.intro(meta.ru), family.outro(meta.ru), stepsOf(tier, meta.key, meta.family, meta.ru));
});

// Lineage-style class tree: every base class has two 2nd professions (level 20)
// and each of those has a 3rd profession (level 40), reached through a quest
// (see classQuestsTemplate.js). Promoted stat blocks are not typed in by hand:
// each one starts from its parent and is *solved* to a power target
// (parent power x TIER_POWER_STEP, measured by classPower, averaged over SOLVE_LEVELS), so a
// branch that trades defence for crit can never come out stronger overall than
// its sibling. test/class-balance.test.js re-checks the result at other levels.
import scaleClassStats from '../functions/game/player/scaleClassStats.js';
import classPower from '../functions/game/player/classPower.js';

export const MAX_EVASION = 140;

// Per-profession multipliers applied after the power solver, written by
// scripts/balance/calibrate.mjs (arena auto-fight round robin): the stat-only solver cannot
// see what a profession's skills do, so the duel results nudge each class towards ~50%.
export const TUNE = {
/* calibration:begin */
  archmage: {attack: 0.82, defence: 0.965, maxHp: 0.82, evasion: 1.581, accuracy: 1.063, block: 0.812, criticalChance: 0.897},
  assassin: {evasion: 0.91, accuracy: 1.038, block: 0.857, criticalChance: 0.793},
  bastion: {attack: 0.737, defence: 0.82, maxHp: 0.672, evasion: 0.967, accuracy: 0.965, block: 0.819, criticalChance: 0.606},
  cleric: {attack: 1.153, defence: 1.025, maxHp: 0.975, evasion: 0.887, accuracy: 1.13, criticalChance: 0.968},
  crusader: {attack: 1.151, maxHp: 1.025, evasion: 1.1, block: 1.103, criticalChance: 0.751},
  elementalist: {evasion: 0.861, accuracy: 1.176, block: 1.032, criticalChance: 0.882},
  hawkeye: {attack: 1.18, maxHp: 0.975, evasion: 1.071, block: 0.833, criticalChance: 0.55},
  inquisitor: {attack: 1.024, maxHp: 0.975, evasion: 1.151, accuracy: 0.891, block: 1.029, criticalChance: 2.347},
  ironclad: {accuracy: 1.048, block: 1.103, criticalChance: 1.254},
  judicator: {maxHp: 1.025, accuracy: 1.146, criticalChance: 1.089},
  phantomDancer: {defence: 1.101, maxHp: 0.922, evasion: 0.8, accuracy: 0.727, block: 2.545, criticalChance: 1.768},
  phantomShot: {attack: 0.82, defence: 1.167, accuracy: 0.96, block: 1.25, criticalChance: 0.82},
  phoenixKnight: {evasion: 1.636, accuracy: 1.183, block: 0.917, criticalChance: 0.819},
  ranger: {attack: 0.943, defence: 1.029, accuracy: 1.177, block: 1.2, criticalChance: 1.256},
  saint: {attack: 1.181, defence: 1.18, maxHp: 1.142, evasion: 1.106, accuracy: 0.865, criticalChance: 0.967},
  shadowBlade: {attack: 1.18, evasion: 1.33, accuracy: 0.633, block: 1.167, criticalChance: 0.942},
  slayer: {attack: 1.179, accuracy: 0.904, block: 0.744, criticalChance: 0.636},
  sniper: {defence: 0.904, accuracy: 1.115, block: 0.8, criticalChance: 0.607},
  soulReaper: {attack: 0.925, maxHp: 1.1, evasion: 0.863, accuracy: 0.866, block: 1.558, criticalChance: 1.283},
  titan: {attack: 0.55, defence: 0.551, maxHp: 0.637, accuracy: 0.667, block: 0.953, criticalChance: 0.61},
  trickster: {attack: 0.821, evasion: 0.862, accuracy: 0.733, block: 1.571, criticalChance: 1.856},
  warbringer: {attack: 1.391, criticalChance: 0.968},
  warden: {attack: 0.838, maxHp: 0.975, accuracy: 0.95, block: 1.183, criticalChance: 0.422},
  warlock: {evasion: 1.417, accuracy: 1.176, block: 1.387, criticalChance: 0.871},
/* calibration:end */
};
export const SOLVE_LEVELS = [20, 40, 70];
export const TIER_POWER_STEP = 1.12;
export const PROMOTE_LEVEL = {2: 20, 3: 40};
const ATTACK_SWING = 0.3;  // focus +1 = +30% attack, focus -1 = -30%
const DEFENCE_SWING = 0.4; // focus +1 = -40% defence, focus -1 = +40%

const round = (value, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

// focus: -1 (all-in on toughness) .. +1 (all-in on damage). The rest are deltas
// on the parent: crit/critDmg/add/inc are additive, the others multiply.
export const CLASS_TREE = {
    warrior: [{
        name: 'crusader', translateName: 'Крестоносец', focus: 0.4, crit: 4, critDmg: 0.05, add: 0.04,
        description: 'Воин света: карающий меч и вера, которая залечивает раны. Хороший урон при высокой живучести.',
        next: {
            name: 'phoenixKnight', translateName: 'Рыцарь-феникс', focus: 0.2, crit: 3, critDmg: 0.05, hpRegen: 1.4,
            description: 'Пылающий рыцарь, возрождающийся из пепла. Почти не падает в бою и бьёт всё сильнее.'
        }
    }, {
        name: 'warden', translateName: 'Страж щита', focus: -0.8, inc: -0.06, blk: 1.25, spd: 0.98,
        description: 'Живая стена. Принимает удары на себя, прикрывает отряд и держит внимание босса.',
        next: {
            name: 'bastion', translateName: 'Хранитель бастиона', focus: -0.6, inc: -0.05, blk: 1.2, hpRegen: 1.5,
            description: 'Несокрушимая крепость в доспехах. Самый надёжный танк рейда.'
        }
    }],
    mage: [{
        name: 'elementalist', translateName: 'Стихийник', focus: 0.7, crit: 6, critDmg: 0.1, mp: 1.15,
        description: 'Повелитель молний и льда. Взрывной урон по цели и ослабление её защиты.',
        next: {
            name: 'archmage', translateName: 'Архимаг', focus: 0.5, crit: 4, critDmg: 0.1, add: 0.04, mp: 1.1,
            description: 'Мастер высшей магии. Метеориты и ледяные оковы решают исход боя.'
        }
    }, {
        name: 'warlock', translateName: 'Чернокнижник', focus: 0.2, inc: -0.06, add: 0.05, mpRegen: 1.15,
        description: 'Тёмный маг, питающийся жизнью врага. Проклятия, вампиризм и стойкость.',
        next: {
            name: 'soulReaper', translateName: 'Жнец душ', focus: 0.3, add: 0.05, crit: 3, hpRegen: 1.3,
            description: 'Добивает раненых врагов и забирает их силу себе.'
        }
    }],
    priest: [{
        name: 'cleric', translateName: 'Целитель', focus: -0.6, mp: 1.25, mpRegen: 1.3, hpRegen: 1.3, add: -0.02,
        description: 'Лекарь с бездонной маной. Быстрые исцеления, благословения и возврат маны.',
        next: {
            name: 'saint', translateName: 'Святой', focus: -0.5, mp: 1.15, mpRegen: 1.2, hpRegen: 1.3,
            description: 'Чудотворец. Могучие исцеления и сияющий щит, которые переживёт любой рейд.'
        }
    }, {
        name: 'inquisitor', translateName: 'Инквизитор', focus: 0.5, add: 0.06, crit: 3,
        description: 'Карающая длань церкви. Священный огонь и добивающий удар по раненому врагу.',
        next: {
            name: 'judicator', translateName: 'Судья света', focus: 0.5, add: 0.05, crit: 3, critDmg: 0.06,
            description: 'Выносит приговор врагам света лучом правосудия.'
        }
    }],
    archer: [{
        name: 'ranger', translateName: 'Следопыт', focus: 0.3, spd: 1.06, acc: 1.1, eva: 1.1,
        description: 'Охотник с неутомимой тетивой. Частые выстрелы и град стрел.',
        next: {
            name: 'hawkeye', translateName: 'Соколиный глаз', focus: 0.3, crit: 4, spd: 1.05, acc: 1.1,
            description: 'Видит каждую слабость цели. Тысячи стрел и убийственные критические попадания.'
        }
    }, {
        name: 'sniper', translateName: 'Снайпер', focus: 0.8, crit: 8, critDmg: 0.15, spd: 0.95,
        description: 'Один выстрел — одна цель. Огромный критический урон и пробитие брони.',
        next: {
            name: 'phantomShot', translateName: 'Призрачный стрелок', focus: 0.6, crit: 6, critDmg: 0.12,
            description: 'Стреляет из теней. Каждая стрела — приговор для босса.'
        }
    }],
    rogue: [{
        name: 'assassin', translateName: 'Убийца', focus: 0.8, crit: 8, critDmg: 0.15,
        description: 'Удар в спину решает всё. Высочайший критический урон и ставка на метки.',
        next: {
            name: 'shadowBlade', translateName: 'Клинок теней', focus: 0.6, crit: 5, critDmg: 0.12, spd: 1.03,
            description: 'Тысяча порезов за миг и казнь из тени.'
        }
    }, {
        name: 'trickster', translateName: 'Плут', focus: -0.3, eva: 1.3, spd: 1.1,
        description: 'Неуловим и дерзок. Уворачивается от ударов и оглушает врага.',
        next: {
            name: 'phantomDancer', translateName: 'Танцор теней', focus: -0.1, eva: 1.25, spd: 1.07,
            description: 'Танец, в котором нельзя попасть. Дымовая завеса и вихрь клинков.'
        }
    }],
    berserk: [{
        name: 'slayer', translateName: 'Рубака', focus: 0.7, add: 0.06,
        description: 'Платит кровью за силу. Мощные серии ударов и боевое безумие.',
        next: {
            name: 'warbringer', translateName: 'Вестник войны', focus: 0.6, add: 0.06, crit: 3,
            description: 'Боевой клич поднимает урон всего отряда... и его собственный.'
        }
    }, {
        name: 'ironclad', translateName: 'Железный воин', focus: -0.6, inc: -0.05,
        description: 'Берсерк в тяжёлых латах. Кровавая броня и вампиризм делают его неубиваемым.',
        next: {
            name: 'titan', translateName: 'Титан', focus: -0.5, inc: -0.05,
            description: 'Гора плоти и стали. Сотрясает землю и не замечает ран.'
        }
    }]
};

// Adds to `bases` everything the tree below them describes.
function promote(parent, spec, tier) {
    const child = {...parent};
    child.name = spec.name;
    child.translateName = spec.translateName;
    child.description = spec.description;
    child.tier = tier;
    child.family = parent.family || parent.name;
    child.parent = parent.name;
    child.promoteLvl = PROMOTE_LEVEL[tier];

    const focus = spec.focus || 0;
    child.attack = round(parent.attack * (1 + ATTACK_SWING * focus));
    child.criticalChance = round(parent.criticalChance + (spec.crit || 0));
    child.criticalDamage = round(parent.criticalDamage + (spec.critDmg || 0));
    child.additionalDamageMul = round(parent.additionalDamageMul + (spec.add || 0), 3);
    child.incomingDamageModifier = round(parent.incomingDamageModifier + (spec.inc || 0), 3);
    child.speed = Math.round(parent.speed * (spec.spd || 1));
    child.accuracy = Math.round(parent.accuracy * (spec.acc || 1));
    // Evasion beyond ~140 is wasted: the hit table already floors hit chance at 27.5% once evasion
    // is 25 above the attacker's accuracy (best base accuracy is 115).
    child.evasion = Math.min(MAX_EVASION, Math.round(parent.evasion * (spec.eva || 1)));
    child.block = Math.round(parent.block * (spec.blk || 1));
    child.maxMp = child.mp = Math.round(parent.maxMp * (spec.mp || 1));
    child.maxCp = child.cp = Math.round(parent.maxCp * (spec.cp || 1));
    child.hpRestoreSpeed = round(parent.hpRestoreSpeed * (spec.hpRegen || 1));
    child.mpRestoreSpeed = round(parent.mpRestoreSpeed * (spec.mpRegen || 1));
    child.cpRestoreSpeed = round(parent.cpRestoreSpeed * (spec.cpRegen || 1));

    // Damage-focused branches trade some defence for attack; toughness focused
    // ones do the opposite. (A class with no defence stat stays at none.)
    child.defence = round(parent.defence * (1 - DEFENCE_SWING * focus));

    // Solve health so the branch lands on the tier's power target. The target is
    // met on average over several levels (geometric mean of child / parent power),
    // because the per-level constants make a single reference level lopsided.
    const parentPower = SOLVE_LEVELS.map(level => classPower(scaleClassStats(parent, level), level));
    const ratio = hp => {
        child.maxHp = child.hp = hp;
        const logs = SOLVE_LEVELS.map((level, i) => Math.log(classPower(scaleClassStats(child, level), level) / parentPower[i]));
        return Math.exp(logs.reduce((sum, value) => sum + value, 0) / logs.length);
    };
    let low = parent.maxHp * 0.2, high = parent.maxHp * 8;
    for (let i = 0; i < 60; i++) {
        const mid = (low + high) / 2;
        if (ratio(mid) < TIER_POWER_STEP) low = mid; else high = mid;
    }
    child.maxHp = child.hp = Math.round((low + high) / 2);

    // Duel calibration (see TUNE above).
    for (const [field, factor] of Object.entries(TUNE[spec.name] || {})) {
        const value = child[field] * factor;
        child[field] = ['maxHp', 'evasion', 'accuracy', 'block'].includes(field) ? Math.round(value) : round(value);
    }
    child.evasion = Math.min(MAX_EVASION, child.evasion);
    child.hp = child.maxHp;

    return child;
}

/** Flat list of every promoted class, parents before their children. */
export function buildPromotedClasses(bases) {
    const result = [];
    for (const base of bases) {
        const branches = CLASS_TREE[base.name];
        if (!branches) continue;
        for (const branch of branches) {
            const second = promote(base, branch, 2);
            result.push(second);
            if (branch.next) result.push(promote(second, branch.next, 3));
        }
    }
    return result;
}

// Profession quests (template/classQuestsTemplate.js): start a quest with a
// mentor, progress it by fighting bosses, hand in the fee, get promoted.
//
// State lives on the player: session.game.classQuest =
//   { active: {to, progress: {stepIndex: n}, startedAt} | null, completed: [class names] }
import classQuests from '../../../template/classQuestsTemplate.js';
import classStats from '../../../template/classStatsTemplate.js';
import changePlayerClass from '../player/changePlayerGameClass.js';
import updatePlayerStats from '../player/updatePlayerStats.js';
import { addMaterial } from '../player/materials.js';

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const classTier = name => number(classStats.find(item => item.name === name)?.tier, 1);
export const classByName = name => classStats.find(item => item.name === name) || null;
export const questFor = to => classQuests.find(item => item.to === to) || null;

export function getClassQuestState(session) {
    const game = session.game;
    if (!game.classQuest || typeof game.classQuest !== 'object') game.classQuest = {};
    const state = game.classQuest;
    if (!Array.isArray(state.completed)) state.completed = [];
    if (state.active === undefined) state.active = null;
    return state;
}

/** The kinds a skill counts as for `skillUses` steps. */
export function skillKinds(skill) {
    const kinds = ['any'];
    if (skill?.isDealDamage) kinds.push('damage');
    if (skill?.isHeal) kinds.push('heal');
    if (skill?.isShield) kinds.push('shield');
    if (skill?.isBuff || skill?.buffs?.length) kinds.push('buff');
    if (skill?.debuff || skill?.debuffs?.length) kinds.push('debuff');
    if (skill?.restoreMp) kinds.push('restore');
    return kinds;
}

function matchesBoss(step, boss) {
    if (step.boss) {
        const names = Array.isArray(step.boss) ? step.boss : [step.boss];
        if (!names.includes(boss.name)) return false;
    }
    if (step.minTier && number(boss.tier, 1) < step.minTier) return false;
    if (step.element && boss.element !== step.element) return false;
    return true;
}

export function stepTarget(step) {
    return step.type === 'pay' ? 1 : number(step.target, 1);
}

export function stepText(step) {
    if (step.text) return step.text;
    const target = stepTarget(step);
    switch (step.type) {
        case 'skillUses': return `Примени навыки в бою: ${target} раз`;
        case 'bossKills': return `Победи боссов: ${target}`;
        case 'minionKills': return `Добей существ из свиты: ${target}`;
        case 'collect': return `Добудь: ${step.name} ×${target}`;
        case 'pay': return `Заплати: ${step.gold || 0} золота${step.crystals ? ` и ${step.crystals} кристаллов` : ''}`;
        default: return 'Выполни поручение';
    }
}

function activeQuest(session) {
    const state = getClassQuestState(session);
    const quest = state.active ? questFor(state.active.to) : null;
    if (!quest) {
        state.active = null;
        return null;
    }
    if (!state.active.progress || typeof state.active.progress !== 'object') state.active.progress = {};
    return {state, quest, progress: state.active.progress};
}

export function isQuestComplete(quest, progress) {
    return quest.steps.every((step, index) => number(progress[index]) >= stepTarget(step));
}

/**
 * Feeds a gameplay event into the active quest. Events:
 *   {type: 'skill', skill}                  a skill was used in a boss fight
 *   {type: 'boss_kill', boss: {name, tier, element}}   the player took part in a boss kill
 *   {type: 'minion_kill', count}            the player killed minions
 * Returns {gains: [{index, text, progress, target, item?}], ready} - empty
 * `gains` means nothing changed.
 */
export function recordQuestEvent(session, event, {random = Math.random} = {}) {
    const found = activeQuest(session);
    if (!found) return {gains: [], ready: false};

    const {quest, progress} = found;
    const gains = [];
    const bump = (index, step, amount, extra = {}) => {
        const target = stepTarget(step);
        const before = number(progress[index]);
        if (before >= target) return;
        progress[index] = Math.min(target, before + amount);
        gains.push({index, text: stepText(step), progress: progress[index], target, ...extra});
    };

    quest.steps.forEach((step, index) => {
        if (event.type === 'skill' && step.type === 'skillUses' && skillKinds(event.skill).includes(step.kind || 'any')) {
            bump(index, step, 1);
        } else if (event.type === 'boss_kill' && matchesBoss(step, event.boss || {})) {
            if (step.type === 'bossKills') bump(index, step, 1);
            else if (step.type === 'collect' && random() < number(step.chance, 1)) bump(index, step, 1, {item: step.name, icon: step.icon});
        } else if (event.type === 'minion_kill' && step.type === 'minionKills') {
            bump(index, step, Math.max(1, number(event.count, 1)));
        }
    });

    return {gains, ready: isQuestComplete(quest, progress)};
}

function startReason(session, quest) {
    const current = session.game.gameClass?.stats?.name || 'noClass';
    if (!quest) return 'unknown_quest';
    if (current !== quest.from) return 'wrong_class';
    if (number(session.game.stats?.lvl, 1) < quest.minLevel) return 'level_too_low';
    return null;
}

export function startClassQuest(session, to) {
    const quest = questFor(to);
    const state = getClassQuestState(session);
    const reason = startReason(session, quest);
    if (reason) return {ok: false, reason};
    if (state.completed.includes(to)) return {ok: false, reason: 'already_mastered'};
    if (state.active) return {ok: false, reason: state.active.to === to ? 'already_active' : 'other_quest_active'};

    state.active = {to, progress: {}, startedAt: Date.now()};
    return {ok: true, quest};
}

export function abandonClassQuest(session) {
    const state = getClassQuestState(session);
    if (!state.active) return {ok: false, reason: 'no_quest'};
    state.active = null;
    return {ok: true};
}

/** Hands in the (first unpaid) `pay` step of the active quest. */
export function payQuestStep(session) {
    const found = activeQuest(session);
    if (!found) return {ok: false, reason: 'no_quest'};
    const {quest, progress} = found;
    const index = quest.steps.findIndex((step, i) => step.type === 'pay' && !number(progress[i]));
    if (index === -1) return {ok: false, reason: 'nothing_to_pay'};

    const step = quest.steps[index];
    const inventory = session.game.inventory;
    if (number(inventory.gold) < number(step.gold)) return {ok: false, reason: 'not_enough_gold', need: step.gold};
    if (number(inventory.crystals) < number(step.crystals)) return {ok: false, reason: 'not_enough_crystals', need: step.crystals};

    inventory.gold = number(inventory.gold) - number(step.gold);
    inventory.crystals = number(inventory.crystals) - number(step.crystals);
    progress[index] = 1;
    return {ok: true, index, ready: isQuestComplete(quest, progress)};
}

function giveReward(session, reward = {}) {
    const inventory = session.game.inventory;
    inventory.sp = number(inventory.sp) + number(reward.sp);
    inventory.gold = number(inventory.gold) + number(reward.gold);
    inventory.crystals = number(inventory.crystals) + number(reward.crystals);
    for (const [key, amount] of Object.entries(reward.items || {})) addMaterial(session, key, amount);
}

/**
 * Promotes the player to `to`: through the finished quest, or - for a
 * profession already earned once - for a returning fee. Enchant levels of the
 * skills the new class inherits are kept. First-time promotions pay the
 * quest reward.
 */
export function promoteClass(session, to, now = Date.now()) {
    const quest = questFor(to);
    const target = classByName(to);
    const state = getClassQuestState(session);
    const reason = startReason(session, quest);
    if (reason) return {ok: false, reason};
    if (!target) return {ok: false, reason: 'unknown_quest'};

    const mastered = state.completed.includes(to);
    const inventory = session.game.inventory;
    let fee = null;
    if (mastered) {
        fee = quest.returnFee;
        if (number(inventory.gold) < number(fee.gold)) return {ok: false, reason: 'not_enough_gold', need: fee.gold};
    } else {
        const found = activeQuest(session);
        if (!found || found.quest.to !== to) return {ok: false, reason: 'quest_not_started'};
        if (!isQuestComplete(found.quest, found.progress)) return {ok: false, reason: 'quest_not_complete'};
    }

    const previousSkills = Array.isArray(session.game.gameClass?.skills) ? session.game.gameClass.skills : [];
    const from = session.game.gameClass.stats.name;
    changePlayerClass(session, target);
    for (const skill of session.game.gameClass.skills) {
        const previous = previousSkills.find(item => item.slot === skill.slot && item.name === skill.name);
        if (previous?.enchantLevel) skill.enchantLevel = previous.enchantLevel;
    }
    updatePlayerStats(session);

    if (fee) inventory.gold = number(inventory.gold) - number(fee.gold);
    if (!mastered) {
        giveReward(session, quest.reward);
        state.completed.push(to);
    }
    state.active = null;
    if (!Array.isArray(session.game.classHistory)) session.game.classHistory = [];
    session.game.classHistory.push({from, to, at: now});

    return {ok: true, className: to, classTitle: target.translateName, reward: mastered ? null : quest.reward, fee};
}

/** Direct children of a class in the tree. */
export function promotionsOf(className) {
    return classStats.filter(item => item.parent === className);
}

function stepView(quest, progress, index) {
    const step = quest.steps[index];
    const target = stepTarget(step);
    const value = Math.min(target, number(progress[index]));
    return {
        index,
        type: step.type,
        text: stepText(step),
        progress: value,
        target,
        done: value >= target,
        manual: step.type === 'pay',
        ...(step.type === 'pay' ? {gold: number(step.gold), crystals: number(step.crystals)} : {}),
        ...(step.type === 'collect' ? {item: step.name, icon: step.icon} : {}),
    };
}

/** Everything the profession screen shows. */
export function getClassQuestView(session) {
    const state = getClassQuestState(session);
    const current = session.game.gameClass?.stats || {};
    const currentName = current.name || 'noClass';
    const level = Math.max(1, number(session.game.stats?.lvl, 1));
    const activeTo = state.active && questFor(state.active.to) ? state.active.to : null;

    const promotions = promotionsOf(currentName).map(target => {
        const quest = questFor(target.name);
        const active = activeTo === target.name;
        const progress = active ? state.active.progress || {} : {};
        const mastered = state.completed.includes(target.name);
        const ready = active && isQuestComplete(quest, progress);
        let status = 'available';
        if (mastered) status = 'mastered';
        else if (ready) status = 'ready';
        else if (active) status = 'active';
        else if (level < quest.minLevel) status = 'locked';
        else if (activeTo) status = 'blocked';

        return {
            to: target.name,
            title: target.translateName,
            description: target.description,
            tier: target.tier,
            minLevel: quest.minLevel,
            status,
            giver: quest.giver,
            intro: quest.intro,
            outro: quest.outro,
            steps: quest.steps.map((_, index) => stepView(quest, progress, index)),
            reward: quest.reward,
            returnFee: quest.returnFee,
        };
    });

    return {
        className: currentName,
        classTitle: current.translateName || currentName,
        tier: classTier(currentName),
        level,
        maxTier: classTier(currentName) >= 4,
        needsBaseClass: currentName === 'noClass',
        completed: [...state.completed],
        promotions,
    };
}

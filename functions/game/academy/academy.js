// The Academy building hands out work:
//   - bounties: three daily and two weekly orders. Their size and reward grow with the Academy's level ("quality");
//   - epic passes: Baium, Frintezza, Antharas and Valakas need a pass (template/epicPasses.js). It is bought for Coins of
//     Luck or earned with a quest of several steps: dialogs, farming monsters, quest item drops, bosses. The quest does not
//     depend on the Academy's level. A pass is bound to the character (it is a counter here, not an item);
//   - the main profession quests of the three promotions (functions/game/classes/classQuests.js) are listed here as well.
//
// State on the player: session.game.academy = {
//   bounties: {day: {key, quality, quests: [...]}, week: {...}},
//   passQuests: {bossName: {progress, startedAt}}, passes: {bossName: count}
// }
import {getEpicTemplate} from '../boss/epicBosses.js';
import {PASS_EPICS, needsPass} from '../../../template/epicPasses.js';
import {spForLevelUp} from '../player/setLevel.js';
import {addMaterial} from '../player/materials.js';
import {getClassQuestView} from '../classes/classQuests.js';

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const BOUNTY_KINDS = Object.freeze({
    mobKills: {event: 'mob_kill', text: 'Победи монстров', base: {day: 25, week: 150}},
    bossKills: {event: 'boss_kill', text: 'Победи боссов', base: {day: 2, week: 8}},
    crafts: {event: 'craft', text: 'Создай предметы в кузне', base: {day: 2, week: 10}},
    enchants: {event: 'enchant', text: 'Успешно заточи предметы', base: {day: 2, week: 10}},
});
const KIND_ORDER = Object.keys(BOUNTY_KINDS);
const DAILY = 3;
const WEEKLY = 2;

export const academyLevel = session => Math.max(1, Math.floor(number(session?.game?.builds?.academy?.currentLvl, 1)));

/** 1..5: the Academy's level in steps of six. Both the size of an order and its reward follow it. */
export const bountyQuality = session => Math.min(5, 1 + Math.floor((academyLevel(session) - 1) / 6));

const dayKey = now => new Date(now).toISOString().slice(0, 10);
function weekKey(now) {
    const date = new Date(now);
    const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - ((date.getUTCDay() + 6) % 7)));
    return monday.toISOString().slice(0, 10);
}

/** Small deterministic generator: the same hero and period always get the same orders. */
function seeded(text) {
    let state = 2166136261;
    for (const char of String(text)) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
    return () => {
        state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0;
        state = Math.imul(state ^ (state >>> 13), 3266489909) >>> 0;
        return ((state ^= state >>> 16) >>> 0) / 4294967296;
    };
}

/** Reward of one order for a hero level: grows with the quality of the Academy. */
export function bountyReward(scope, quality, level) {
    const scopeFactor = scope === 'week' ? 4 : 1;
    const lvl = Math.max(1, number(level, 1));
    const reward = {
        gold: Math.round(lvl * 120 * quality * scopeFactor),
        sp: Math.round(spForLevelUp(lvl) * 0.4 * quality * scopeFactor),
        moonDew: Math.round(6 * quality * scopeFactor),
    };
    if (scope === 'week' && quality >= 2) reward.luckCoins = quality - 1;
    if (quality >= 3) reward.ironOre = Math.round(4 * quality * scopeFactor);
    return reward;
}

function makeQuests(scope, key, quality, level, userId) {
    const random = seeded(`${userId}:${scope}:${key}`);
    const kinds = [...KIND_ORDER];
    const quests = [];
    const count = scope === 'week' ? WEEKLY : DAILY;
    for (let index = 0; index < count && kinds.length; index++) {
        const kind = kinds.splice(Math.floor(random() * kinds.length), 1)[0];
        const target = Math.max(1, Math.round(BOUNTY_KINDS[kind].base[scope] * (0.8 + quality * 0.35)));
        quests.push({id: `${scope}-${index}`, kind, target, progress: 0, claimed: false, reward: bountyReward(scope, quality, level)});
    }
    return quests;
}

export function ensureAcademy(session) {
    const game = session.game;
    if (!game.academy || typeof game.academy !== 'object') game.academy = {};
    const academy = game.academy;
    if (!academy.bounties || typeof academy.bounties !== 'object') academy.bounties = {};
    if (!academy.passQuests || typeof academy.passQuests !== 'object') academy.passQuests = {};
    if (!academy.passes || typeof academy.passes !== 'object') academy.passes = {};
    return academy;
}

/** Orders of the current day and week; a new period replaces the old ones (unclaimed rewards are gone). */
export function refreshBounties(session, now = Date.now()) {
    const academy = ensureAcademy(session);
    const quality = bountyQuality(session);
    const level = number(session.game.stats?.lvl, 1);
    const userId = session.userId ?? 0;
    for (const [scope, key] of [['day', dayKey(now)], ['week', weekKey(now)]]) {
        if (academy.bounties[scope]?.key === key) continue;
        academy.bounties[scope] = {key, quality, quests: makeQuests(scope, key, quality, level, userId)};
    }
    return academy.bounties;
}

/**
 * Counts a gameplay event for the orders and the epic pass quests.
 * Events: mob_kill, boss_kill, craft, enchant. Returns how many steps moved.
 */
export function recordAcademyEvent(session, type, {count = 1, boss = null, mob = null, now = Date.now(), random = Math.random} = {}) {
    if (!session?.game) return 0;
    const academy = ensureAcademy(session);
    refreshBounties(session, now);
    let moved = 0;
    for (const period of Object.values(academy.bounties)) {
        for (const quest of period.quests) {
            if (quest.claimed || BOUNTY_KINDS[quest.kind].event !== type || quest.progress >= quest.target) continue;
            quest.progress = Math.min(quest.target, quest.progress + Math.max(1, number(count, 1)));
            moved++;
        }
    }
    // the pass quests: only the current step moves
    for (const [name, quest] of Object.entries(academy.passQuests)) {
        const step = PASS_EPICS[name]?.steps[quest.step];
        if (!step) continue;
        const target = number(step.target, 1);
        if (step.type === 'mobKills' && type === 'mob_kill' && number(mob?.level) >= number(step.minLevel)) {
            quest.progress = Math.min(target, number(quest.progress) + 1);
            moved++;
        } else if (step.type === 'collect' && type === 'mob_kill' && number(mob?.level) >= number(step.minLevel) && random() < number(step.chance)) {
            quest.progress = Math.min(target, number(quest.progress) + 1);
            moved++;
        } else if (step.type === 'bossKills' && type === 'boss_kill' && !boss?.epic) {
            quest.progress = Math.min(target, number(quest.progress) + 1);
            moved++;
        }
    }
    return moved;
}

function payReward(session, reward) {
    const inventory = session.game.inventory;
    for (const key of ['gold', 'sp', 'moonDew', 'ironOre', 'luckCoins']) {
        if (reward[key]) inventory[key] = number(inventory[key]) + reward[key];
    }
}

export function claimBounty(session, scope, id, now = Date.now()) {
    const academy = ensureAcademy(session);
    refreshBounties(session, now);
    const quest = academy.bounties[scope]?.quests.find(item => item.id === id);
    if (!quest) return {ok: false, reason: 'unknown_bounty'};
    if (quest.claimed) return {ok: false, reason: 'already_claimed'};
    if (quest.progress < quest.target) return {ok: false, reason: 'bounty_not_done'};
    quest.claimed = true;
    payReward(session, quest.reward);
    return {ok: true, reward: quest.reward};
}

// ---- epic passes ----

export const passSteps = name => PASS_EPICS[name]?.steps || [];

/** A step is complete when its target is reached; a dialog step completes by talking. */
const stepTarget = step => (step.type === 'talk' ? 1 : number(step.target, 1));

export function startPassQuest(session, name) {
    if (!needsPass(name)) return {ok: false, reason: 'unknown_epic'};
    const template = getEpicTemplate(name);
    const academy = ensureAcademy(session);
    if (template && number(session.game.stats?.lvl, 1) < template.epic.minLevel) return {ok: false, reason: 'level_too_low', requiredLevel: template.epic.minLevel};
    if (number(academy.passes[name]) > 0) return {ok: false, reason: 'pass_owned'};
    if (academy.passQuests[name]) return {ok: false, reason: 'already_active'};
    academy.passQuests[name] = {step: 0, progress: 0, startedAt: Date.now()};
    return {ok: true};
}

/** Talks to the NPC of a dialog step; the lines are returned for the screen. */
export function talkPassQuest(session, name) {
    const academy = ensureAcademy(session);
    const quest = academy.passQuests[name];
    if (!quest) return {ok: false, reason: 'no_quest'};
    const step = passSteps(name)[quest.step];
    if (!step || step.type !== 'talk') return {ok: false, reason: 'not_a_dialog'};
    const lines = step.lines;
    const npc = step.npc;
    quest.step += 1;
    quest.progress = 0;
    if (quest.step >= passSteps(name).length) {
        delete academy.passQuests[name];
        academy.passes[name] = number(academy.passes[name]) + 1;
        return {ok: true, lines, npc, done: true};
    }
    return {ok: true, lines, npc, done: false};
}

/** Moves on to the next step when the current farming step is complete. */
export function advancePassQuest(session, name) {
    const academy = ensureAcademy(session);
    const quest = academy.passQuests[name];
    if (!quest) return {ok: false, reason: 'no_quest'};
    const step = passSteps(name)[quest.step];
    if (!step || step.type === 'talk') return {ok: false, reason: 'not_a_farm_step'};
    if (number(quest.progress) < stepTarget(step)) return {ok: false, reason: 'quest_not_complete'};
    quest.step += 1;
    quest.progress = 0;
    return {ok: true};
}

/** Claims the pass directly when the quest is complete (the last step is a dialog, see talkPassQuest). */
export function claimPass(session, name) {
    return talkPassQuest(session, name);
}

export const hasEpicPass = (session, name) => number(ensureAcademy(session).passes[name]) > 0;

/** Gives a pass (bought for Coins of Luck). A hero holds one of each. */
export function grantEpicPass(session, name) {
    if (!needsPass(name)) return false;
    const academy = ensureAcademy(session);
    if (number(academy.passes[name]) > 0) return false;
    academy.passes[name] = 1;
    return true;
}

/** Uses the pass when an epic boss is called. */
export function consumeEpicPass(session, name) {
    const academy = ensureAcademy(session);
    if (number(academy.passes[name]) <= 0) return false;
    academy.passes[name] -= 1;
    return true;
}

// ---- the screen ----

export function getAcademyState(session, now = Date.now()) {
    const academy = ensureAcademy(session);
    const bounties = refreshBounties(session, now);
    const level = number(session.game.stats?.lvl, 1);
    return {
        level: academyLevel(session),
        quality: bountyQuality(session),
        bounties: {
            day: {quests: bounties.day.quests, quality: bounties.day.quality, resetsAt: Date.parse(`${bounties.day.key}T00:00:00Z`) + 86400000},
            week: {quests: bounties.week.quests, quality: bounties.week.quality, resetsAt: Date.parse(`${bounties.week.key}T00:00:00Z`) + 7 * 86400000},
        },
        kinds: Object.fromEntries(Object.entries(BOUNTY_KINDS).map(([key, value]) => [key, value.text])),
        passes: Object.entries(PASS_EPICS).map(([name, config]) => {
            const template = getEpicTemplate(name);
            const quest = academy.passQuests[name] || null;
            const steps = config.steps;
            const current = quest ? steps[quest.step] : null;
            return {
                name,
                nameCall: template?.nameCall || name,
                title: config.title,
                npc: config.npc,
                minLevel: number(template?.epic.minLevel),
                owned: number(academy.passes[name]),
                active: Boolean(quest),
                stepIndex: quest ? quest.step : -1,
                stepCount: steps.length,
                step: current ? {
                    type: current.type, npc: current.npc || null, text: current.text || null, item: current.item || null,
                    target: stepTarget(current), progress: current.type === 'talk' ? 0 : number(quest.progress),
                    done: current.type === 'talk' ? true : number(quest.progress) >= stepTarget(current),
                } : null,
                canStart: level >= number(template?.epic.minLevel) && !quest && number(academy.passes[name]) <= 0,
                price: config.cost,
            };
        }),
        classQuests: getClassQuestView(session),
        gold: number(session.game.inventory?.gold),
    };
}

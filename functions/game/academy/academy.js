// The Academy building hands out work:
//   - bounties: three daily and two weekly orders. Their size and reward grow with the Academy's level ("quality");
//   - epic passes: a quest per epic raid boss that gives the pass needed to call it (the reward does not depend on the Academy);
//   - the main profession quests of the three promotions (functions/game/classes/classQuests.js) are listed here as well.
//
// State on the player: session.game.academy = {
//   bounties: {day: {key, quality, quests: [...]}, week: {...}},
//   passQuests: {bossName: {progress, startedAt}}, passes: {bossName: count}
// }
import {getEpicTemplate, epicTemplates} from '../boss/epicBosses.js';
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
export function recordAcademyEvent(session, type, {count = 1, boss = null, now = Date.now()} = {}) {
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
    if (type === 'boss_kill') {
        for (const [name, quest] of Object.entries(academy.passQuests)) {
            const target = passTarget(name);
            if (!target || quest.progress >= target) continue;
            // a pass quest counts ordinary bosses, not the epic raid itself
            if (boss?.epic) continue;
            quest.progress = Math.min(target, quest.progress + 1);
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

/** Ordinary bosses to defeat for a pass: grows with the epic's level gate. */
export const passTarget = name => {
    const template = getEpicTemplate(name);
    return template ? Math.max(3, Math.round(number(template.epic.minLevel, 40) / 4)) : 0;
};
/** Fee in adena handed in with the pass. */
export const passFee = name => {
    const template = getEpicTemplate(name);
    return template ? number(template.epic.minLevel, 40) * 2500 : 0;
};

export function startPassQuest(session, name) {
    const template = getEpicTemplate(name);
    if (!template) return {ok: false, reason: 'unknown_epic'};
    const academy = ensureAcademy(session);
    if (number(session.game.stats?.lvl, 1) < template.epic.minLevel) return {ok: false, reason: 'level_too_low', requiredLevel: template.epic.minLevel};
    if (number(academy.passes[name]) > 0) return {ok: false, reason: 'pass_owned'};
    if (academy.passQuests[name]) return {ok: false, reason: 'already_active'};
    academy.passQuests[name] = {progress: 0, startedAt: Date.now()};
    return {ok: true};
}

export function claimPass(session, name) {
    const academy = ensureAcademy(session);
    const quest = academy.passQuests[name];
    if (!quest) return {ok: false, reason: 'no_quest'};
    if (quest.progress < passTarget(name)) return {ok: false, reason: 'quest_not_complete'};
    const fee = passFee(name);
    const inventory = session.game.inventory;
    if (number(inventory.gold) < fee) return {ok: false, reason: 'not_enough_gold', price: fee};
    inventory.gold = number(inventory.gold) - fee;
    delete academy.passQuests[name];
    academy.passes[name] = number(academy.passes[name]) + 1;
    return {ok: true, fee};
}

export const hasEpicPass = (session, name) => number(ensureAcademy(session).passes[name]) > 0;

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
        passes: epicTemplates().map(template => ({
            name: template.name,
            nameCall: template.nameCall || template.name,
            title: template.title || '',
            minLevel: template.epic.minLevel,
            owned: number(academy.passes[template.name]),
            active: Boolean(academy.passQuests[template.name]),
            progress: number(academy.passQuests[template.name]?.progress),
            target: passTarget(template.name),
            fee: passFee(template.name),
            canStart: level >= template.epic.minLevel && !academy.passQuests[template.name] && number(academy.passes[template.name]) <= 0,
        })),
        classQuests: getClassQuestView(session),
        gold: number(session.game.inventory?.gold),
    };
}

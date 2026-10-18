// The Academy building hands out work:
//   - bounties: three daily reward tracks and two weekly orders for the hero's grade. Quality scales targets/rewards;
//   - epic passes: Baium, Frintezza, Antharas and Valakas need a pass (template/epicPasses.js). It is bought for Coins of
//     Luck or earned with a quest of several steps: dialogs, farming monsters, quest item drops, bosses. The quest does not
//     depend on the Academy's level. A pass is bound to the character (it is a counter here, not an item);
//   - the main profession quests of the three promotions (functions/game/classes/classQuests.js) are listed here as well.
//
// State on the player: session.game.academy = {
//   bounties: {day: {key, quality, quests: [...]}, week: {...}},
//   passQuests: {bossName: {progress, startedAt}}, passes: {bossName: count}
// }
import {runeRate} from '../runes/labRunes.js';
import {getEpicTemplate} from '../boss/epicBosses.js';
import {PASS_EPICS, PARTY_EPICS, needsPass} from '../../../template/epicPasses.js';
import setLevel from '../player/setLevel.js';
import {addMaterial, getMaterialCount, materialInfo} from '../player/materials.js';
import {gainExp, EXP_RATE} from '../player/vitality.js';
import {hasInventoryRoom} from '../builds/palaceCapacity.js';
import {BOUNTY_CATEGORIES, BOUNTY_TITLES, bountyExtras, bountyGradeForLevel} from './bountyRewards.js';
import {getClassQuestView} from '../classes/classQuests.js';
import {grantLoginTicket} from '../login/loginRewards.js';
import {soulCrystalQuestState} from '../equipment/soulCrystalQuest.js';

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const BOUNTY_KINDS = Object.freeze({
    mobKills: {event: 'mob_kill', text: 'Победи монстров', base: {day: 25, week: 150}},
    bossKills: {event: 'boss_kill', text: 'Победи боссов', base: {day: 2, week: 8}},
    crafts: {event: 'craft', text: 'Создай предметы в кузне', base: {day: 2, week: 10}},
    enchants: {event: 'enchant', text: 'Успешно заточи предметы', base: {day: 2, week: 10}},
});
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
export function bountyReward(scope, quality, level, category='experience', className='noClass', target) {
    const scopeFactor = scope === 'week' ? 4 : 1;
    const lvl = Math.max(1, number(level, 1));
    const reward = {
        moonDew: category==='resources'?Math.round(2*(1+0.25*(quality-1))*scopeFactor):0,
    };
    if (scope === 'week' && category==='resources' && quality >= 4) reward.luckCoins = 1;
    if (category==='resources' && quality >= 3) reward.ironOre = Math.round(3*(1+0.25*(quality-1))*scopeFactor);
    return {...reward,...bountyExtras(scope,quality,lvl,category,className,target)};
}

function makeQuests(scope, key, quality, level, userId, className) {
    const random = seeded(`${userId}:${scope}:${key}`);
    const quests = [];
    const count = scope === 'week' ? WEEKLY : DAILY;
    const grade=bountyGradeForLevel(level);
    for (let index = 0; index < count; index++) {
        const category=scope==='week'?BOUNTY_CATEGORIES[index+1]:BOUNTY_CATEGORIES[index];
        const target=Math.max(1,Math.round(BOUNTY_KINDS.mobKills.base[scope]*(0.8+quality*0.35)*(1+random()*0.2)));
        quests.push({id:`${scope}-${index}`,kind:'mobKills',category,grade:grade.name,minMobLevel:grade.lvl.from,
            target,progress:0,claimed:false,reward:bountyReward(scope,quality,level,category,className,target)});
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
        const previous=academy.bounties[scope];
        if (previous?.key===key && previous.version>=2) {
            if(previous.version>=4)continue;
            const first=previous.quests.find(q=>!q.claimed)||previous.quests[0];
            const originalLevel=number(previous.level,number(first?.reward?.gold)/(120*previous.quality*(scope==='week'?4:1))||level);
            const savedGrade=bountyGradeForLevel(first?.minMobLevel||originalLevel);
            const savedLevel=Math.max(savedGrade.lvl.from,Math.min(savedGrade.lvl.to,Math.round(originalLevel)));
            for(const quest of previous.quests) {
                if(quest.claimed)continue;
                quest.reward=bountyReward(scope,previous.quality,savedLevel,quest.category,previous.className||session.game.gameClass?.stats?.name,quest.target);
            }
            previous.level=savedLevel;previous.className ||= session.game.gameClass?.stats?.name;previous.version=4;
            continue;
        }
        const savedLevel=previous?.key===key
            ? Math.max(1,Math.min(85,Math.round(previous.quests?.[0]?.reward?.gold/(120*previous.quality*(scope==='week'?4:1)))||level)) : level;
        const savedQuality=Math.max(1,Math.min(5,Math.floor(number(previous?.key===key?previous.quality:quality,quality))));
        const quests=makeQuests(scope,key,savedQuality,savedLevel,userId,session.game.gameClass?.stats?.name);
        if(previous?.key===key)for(const quest of quests) {
            const old=previous.quests?.find(item=>item.id===quest.id);
            if(!old)continue;
            quest.progress=Math.min(quest.target,Math.floor(number(old.progress)/Math.max(1,number(old.target,1))*quest.target));
            quest.claimed=Boolean(old.claimed);
            if(quest.claimed)quest.reward=old.reward;
        }
        academy.bounties[scope]={key,quality:savedQuality,level:savedLevel,className:session.game.gameClass?.stats?.name,version:4,quests};
    }
    return academy.bounties;
}

/**
 * Counts a gameplay event for the orders and the epic pass quests.
 * Events: mob_kill, boss_kill, craft, enchant. Returns how many steps moved.
 */
/** True when the monster is one the step names: its zone and its name. */
function inHuntOfStep(step, mob) {
    if (step.zone && mob?.zone !== step.zone) return false;
    if (Array.isArray(step.mobs) && step.mobs.length && !step.mobs.includes(mob?.name)) return false;
    return number(mob?.level) >= number(step.minLevel);
}

export function recordAcademyEvent(session, type, {count = 1, boss = null, mob = null, now = Date.now(), random = Math.random} = {}) {
    if (!session?.game) return {moved: 0, drops: []};
    const academy = ensureAcademy(session);
    refreshBounties(session, now);
    let moved = 0;
    const drops = [];
    const amount=Math.max(0,Math.floor(number(count,0)));
    if(!amount)return {moved:0,drops};
    for (const period of Object.values(academy.bounties)) {
        for (const quest of period.quests) {
            if (quest.claimed || BOUNTY_KINDS[quest.kind].event !== type || quest.progress >= quest.target) continue;
            if(quest.minMobLevel && (number(mob?.level)<quest.minMobLevel || Math.abs(number(mob?.level)-number(session.game.stats?.lvl,1))>10))continue;
            quest.progress = Math.min(quest.target, quest.progress + amount);
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
        } else if (step.type === 'collect' && type === 'mob_kill' && inHuntOfStep(step, mob) && random() < number(step.chance) * (1 + runeRate(session, 'quest', now))) {
            // the quest item is the pass itself: it is in the hero's hands the moment it drops
            const amount = Math.max(1, Math.min(number(step.amount, 1), target - number(quest.progress)));
            quest.progress = Math.min(target, number(quest.progress) + amount);
            academy.passes[name] = Math.min(PASS_HOLD_MAX, number(academy.passes[name]) + amount);
            moved++;
            drops.push({pass: name, item: step.item, amount});
            if (quest.progress >= target && quest.step >= PASS_EPICS[name].steps.length - 1) delete academy.passQuests[name];
        } else if (step.type === 'bossKills' && type === 'boss_kill' && !boss?.epic) {
            quest.progress = Math.min(target, number(quest.progress) + 1);
            moved++;
        }
    }
    return {moved, drops};
}

function payReward(session, reward, now) {
    const inventory = session.game.inventory;
    for (const key of ['gold', 'sp', 'moonDew', 'ironOre', 'luckCoins']) {
        if (reward[key]) inventory[key] = number(inventory[key]) + reward[key];
    }
    for(const [key,count] of Object.entries(reward.materials||{}))addMaterial(session,key,count);
    const experience=gainExp(session,reward.exp||0,{now});
    setLevel(session);
    return experience.gained;
}

/** The chance that a claimed bounty also brings a Clan Boss Sigil (the clan boss is called with it). */
export const TOKEN_CHANCE = Object.freeze({day:0.06, week:0.15, daily:0.06, weekly:0.15});

export function claimBounty(session, scope, id, now = Date.now(), random = Math.random) {
    const academy = ensureAcademy(session);
    refreshBounties(session, now);
    const quest = academy.bounties[scope]?.quests.find(item => item.id === id);
    if (!quest) return {ok: false, reason: 'unknown_bounty'};
    if (quest.claimed) return {ok: false, reason: 'already_claimed'};
    if (quest.progress < quest.target) return {ok: false, reason: 'bounty_not_done'};
    const extra=Object.keys(quest.reward.materials||{}).filter(key=>!getMaterialCount(session,key)).length;
    if(extra && !hasInventoryRoom(session,extra))return {ok:false,reason:'inventory_full'};
    quest.claimed = true;
    const gainedExp=payReward(session,quest.reward,now);
    const token = random() < (TOKEN_CHANCE[scope] || 0)
        && (getMaterialCount(session,'clan_boss_token')>0 || hasInventoryRoom(session,1));
    if (token) addMaterial(session, 'clan_boss_token', 1);
    const calendarTicket=(scope==='week'||scope==='weekly')&&random()<0.05?grantLoginTicket(session,now):null;
    return {ok: true, reward:quest.reward,gainedExp,token,calendarTicket};
}

// ---- epic passes ----

export const PASS_HOLD_MAX = 20;

export const passSteps = name => PASS_EPICS[name]?.steps || [];

/** A step is complete when its target is reached; a dialog step completes by talking. */
const stepTarget = step => (step.type === 'talk' ? 1 : number(step.target, 1));

export function startPassQuest(session, name) {
    if (!needsPass(name)) return {ok: false, reason: 'unknown_epic'};
    const template = getEpicTemplate(name);
    const academy = ensureAcademy(session);
    if (template && number(session.game.stats?.lvl, 1) < template.epic.minLevel) return {ok: false, reason: 'level_too_low', requiredLevel: template.epic.minLevel};
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

export const passCount = (session, name) => number(ensureAcademy(session).passes[name]);
export const hasEpicPass = (session, name) => passCount(session, name) > 0;

/** Gives a pass (bought for Coins of Luck). A hero holds several of each, up to PASS_HOLD_MAX. */
export function grantEpicPass(session, name) {
    if (!needsPass(name)) return false;
    const academy = ensureAcademy(session);
    if (number(academy.passes[name]) >= PASS_HOLD_MAX) return false;
    academy.passes[name] = number(academy.passes[name]) + 1;
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

function bountyDto(quest,quality) {
    return {...quest,quality,title:BOUNTY_TITLES[quest.category]||BOUNTY_KINDS[quest.kind]?.text,
        reward:{...quest.reward,displayExp:(quest.reward.exp||0)*EXP_RATE,
            items:Object.entries(quest.reward.materials||{}).map(([key,count])=>({key,count,name:materialInfo(key).name}))}};
}

export function getAcademyState(session, now = Date.now()) {
    const academy = ensureAcademy(session);
    const bounties = refreshBounties(session, now);
    const level = number(session.game.stats?.lvl, 1);
    return {
        level: academyLevel(session),
        quality: bountyQuality(session),
        bounties: {
            day: {quests: bounties.day.quests.map(quest=>bountyDto(quest,bounties.day.quality)), quality: bounties.day.quality, resetsAt: Date.parse(`${bounties.day.key}T00:00:00Z`) + 86400000},
            week: {quests: bounties.week.quests.map(quest=>bountyDto(quest,bounties.week.quality)), quality: bounties.week.quality, resetsAt: Date.parse(`${bounties.week.key}T00:00:00Z`) + 7 * 86400000},
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
                    target: stepTarget(current), amount: number(current.amount, 1), progress: current.type === 'talk' ? 0 : number(quest.progress),
                    done: current.type === 'talk' ? true : number(quest.progress) >= stepTarget(current),
                } : null,
                canStart: level >= number(template?.epic.minLevel) && !quest,
                price: config.cost,
                partyMin: number(PARTY_EPICS[name]),
                leaderOnly: Boolean(config.leaderOnly),
            };
        }),
        classQuests: getClassQuestView(session),
        soulQuest: soulCrystalQuestState(session),
        gold: number(session.game.inventory?.gold),
    };
}

export function availableAcademyQuestCount(session){
    if(!session)return 0;
    const level=number(session.game?.stats?.lvl,1),academy=session.game?.academy||{};
    return getClassQuestView(session).promotions.filter(q=>q.status==='available').length
        +(soulCrystalQuestState(session).canStart?1:0)
        +Object.keys(PASS_EPICS).filter(name=>level>=number(getEpicTemplate(name)?.epic.minLevel)&&!academy.passQuests?.[name]&&!number(academy.passes?.[name])).length;
}

import {isVortexBoss} from '../world/dragonVortex.js';
// Epic raid bosses (Lineage 2): a chat challenges one on purpose, and after a kill it stays away for a
// respawn window - a fixed wait plus a random tail, like the real epic raids. The window is stored per
// chat in chat.epicBosses[name] = {killedAt, respawnAt, kills}. A kill also rolls the boss's epic jewellery.
import bossTemplates from '../../../template/bossTemplate.js';
import L2_BOSS_ART from '../../../webapp/l2-boss-art.js';
import {npcPhotoUrl} from '../../../webapp/art/l2-npc-art.js';
import {needsPass, partyNeeded} from '../../../template/epicPasses.js';
import { findEpicItem, getCatalog, instantiate, canClassUse } from '../equipment/catalog.js';
import {epicWeaponChance} from './worldBosses.js';
import bossPositions from '../../../template/worldBossMap.js';
import {CITIES} from '../../../template/worldMap.js';

/** Separate weapon roll; eligible fighters must meet S84 level and wield a boss's weapon type. */
export function rollEpicWeapon(template,fighters,random=Math.random) {
    if(!template?.epic || random()>=epicWeaponChance(template.name))return null;
    const choices=[];
    for(const fighter of fighters||[]) {
        if(!(fighter.damage>0) || !(fighter.level>=84))continue;
        const items=getCatalog().filter(item=>item.epicWeapon && item.raidBoss===template.name && canClassUse(fighter.className,item));
        if(items.length)choices.push({...fighter,items});
    }
    if(!choices.length)return null;
    let roll=random()*choices.reduce((s,f)=>s+Number(f.damage),0);
    let winner=choices.at(-1);
    for(const fighter of choices){roll-=Number(fighter.damage);if(roll<0){winner=fighter;break;}}
    return {id:winner.id,item:instantiate(winner.items[Math.min(winner.items.length-1,Math.floor(random()*winner.items.length))])};
}

const HOUR_MS = 60 * 60 * 1000;

/** Coins of Luck every fighter gets for killing an epic raid boss: 5 for the easiest, 50 for the hardest. */
export const EPIC_LUCK_COINS = Object.freeze({
    queenAnt: 5, core: 8, orfen: 12, zaken: 18, baium: 25, frintezza: 32, freya: 36, beleth: 38, antharas: 40, freyaExtreme: 48, valakas: 50,
});

export const epicLuckCoins = name => EPIC_LUCK_COINS[name] || 0;

/** The egg every clan with a fighter gets for an epic kill (clan skills need them, see clanPerks.js). */
export const EPIC_EGGS = Object.freeze({
    queenAnt: {key: 'egg_wyvern', count: 1}, core: {key: 'egg_wyvern', count: 1}, orfen: {key: 'egg_wyvern', count: 2},
    zaken: {key: 'egg_dragon', count: 1}, baium: {key: 'egg_dragon', count: 1}, frintezza: {key: 'egg_dragon', count: 2},
    antharas: {key: 'egg_ancient', count: 1}, valakas: {key: 'egg_ancient', count: 1},
    beleth: {key: 'egg_ancient', count: 1}, freya: {key: 'egg_ancient', count: 1}, freyaExtreme: {key: 'egg_ancient', count: 2},
});

export const epicEgg = name => EPIC_EGGS[name] || bossTemplates.find(boss => boss.name === name)?.world?.egg || null;

/** The epics of the game (Queen Ant ... Valakas). */
export const epicTemplates = () => bossTemplates.filter(boss => boss.epic && !boss.world?.raid);

/** The raid bosses of the real data (worldBosses.js): the same fight and respawn window as an epic. */
export const raidTemplates = () => bossTemplates.filter(boss => boss.world?.raid);

export const worldBossTemplates = () => [...epicTemplates(), ...raidTemplates()];

export const getEpicTemplate = name => worldBossTemplates().find(boss => boss.name === name) || null;

/** Wait after a kill, in ms: the fixed hours plus a random share of the window. */
export function respawnDelayMs(template, random = Math.random) {
    const {respawnHours, windowHours} = template.epic;
    return Math.round((respawnHours + random() * windowHours) * HOUR_MS);
}

/** Whether a chat may challenge the boss now, and how long it still has to wait. */
export function epicStatus(chat, name, now = Date.now()) {
    const record = chat?.epicBosses?.[name] || {};
    const respawnAt = Number(record.respawnAt) || 0;
    const remainMs = Math.max(0, respawnAt - now);
    return {available: remainMs === 0, remainMs, respawnAt, killedAt: Number(record.killedAt) || 0, kills: Number(record.kills) || 0};
}

/** Starts the respawn window after a kill. */
export function markEpicKilled(chat, name, {now = Date.now(), random = Math.random} = {}) {
    const template = getEpicTemplate(name);
    if (!template || !chat) return null;
    if (!chat.epicBosses || typeof chat.epicBosses !== 'object') chat.epicBosses = {};
    const previous = chat.epicBosses[name] || {};
    chat.epicBosses[name] = {killedAt: now, respawnAt: now + respawnDelayMs(template, random), kills: (Number(previous.kills) || 0) + 1};
    chat.markModified?.('epicBosses');
    return chat.epicBosses[name];
}

/**
 * Rolls the epic jewellery of a kill: one chance per kill (`jewelChance`), the item going to one fighter
 * with odds in proportion to the damage they dealt. `fighters` is [{id, damage}]; returns {id, item} or null.
 */
export function rollEpicJewel(template, fighters, random = Math.random) {
    const jewel = template?.epic && findEpicItem(template.name);
    const pool = (fighters || []).filter(fighter => Number(fighter.damage) > 0);
    if (!jewel || !pool.length || random() >= template.epic.jewelChance) return null;

    const total = pool.reduce((sum, fighter) => sum + Number(fighter.damage), 0);
    let roll = random() * total;
    let winner = pool[pool.length - 1];
    for (const fighter of pool) {
        roll -= Number(fighter.damage);
        if (roll < 0) { winner = fighter; break; }
    }
    return {id: winner.id, item: instantiate(jewel)};
}

/**
 * What the Mini App lists of the world: every epic and raid boss with where it stands, its level range, its drop and
 * whether it is up. `records` is {name: epicBosses record} read from the hidden chats of the bosses, `fighting`
 * {name: hp share} of the bosses that are being fought now.
 */
export function worldBossList(records = {}, fighting = {}, now = Date.now()) {
    return worldBossTemplates().map(template => {
        const name = template.name;
        const status = epicStatus({epicBosses: {[name]: records[name] || {}}}, name, now);
        const world = template.world || {};
        const position=bossPositions[world.npcId];
        const map=position?{...position,region:[...CITIES].sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y)-Math.hypot(b.x-position.x,b.y-position.y))[0].id}:null;
        const jewel = findEpicItem(name);
        return {
            name,
            map,
            nameCall: template.nameCall,
            title: template.title,
            element: template.element,
            raid: Boolean(world.raid),
            summonRequired:isVortexBoss(world.npcId),
            instanceEntry:Boolean(world.raid&&position?.instance),
            level: world.level || template.epic.minLevel,
            minLevel: template.epic.minLevel,
            maxLevel: template.epic.maxLevel || null,
            location: world.location || '',
            referenceStats: world.reference || null,
            weaponChance: epicWeaponChance(name),
            weapons: getCatalog().filter(item => item.epicWeapon && item.raidBoss === name).map(item => ({name:item.name,kind:item.kind,grade:item.grade,minLevel:84})),
            image: npcPhotoUrl(L2_BOSS_ART[name],256)||L2_BOSS_ART[name]?.image||null,
            respawnHours: template.epic.respawnHours,
            windowHours: template.epic.windowHours,
            jewelChance: template.epic.jewelChance,
            jewel: jewel ? {name: jewel.name, grade: jewel.grade, kind: jewel.kind, lineage: jewel.lineage} : null,
            needsPass: needsPass(name),
            partyMin: partyNeeded(name),
            egg: epicEgg(name),
            drops: (template.drops?.items || []).length,
            fighting: fighting[name] !== undefined,
            hpPercent: fighting[name] ?? null,
            ...status,
        };
    });
}

/** What the Mini App lists: every epic boss, its jewellery and when the chat can fight it. */
export function epicList(chat, now = Date.now()) {
    return epicTemplates().map(template => {
        const jewel = findEpicItem(template.name);
        const status = epicStatus(chat, template.name, now);
        return {
            name: template.name,
            nameCall: template.nameCall,
            title: template.title,
            element: template.element,
            minLevel: template.epic.minLevel,
            location: template.world?.location || '',
            referenceStats: template.world?.reference || null,
            image: npcPhotoUrl(L2_BOSS_ART[template.name],256)||L2_BOSS_ART[template.name]?.image||null,
            respawnHours: template.epic.respawnHours,
            windowHours: template.epic.windowHours,
            jewelChance: template.epic.jewelChance,
            jewel: jewel ? {name: jewel.name, grade: jewel.grade, kind: jewel.kind, lineage: jewel.lineage} : null,
            needsPass: needsPass(template.name),
            partyMin: partyNeeded(template.name),
            weaponChance:epicWeaponChance(template.name),
            weapons:getCatalog().filter(item=>item.epicWeapon && item.raidBoss===template.name).map(item=>({name:item.name,kind:item.kind,grade:item.grade,minLevel:84})),
            ...status,
        };
    });
}

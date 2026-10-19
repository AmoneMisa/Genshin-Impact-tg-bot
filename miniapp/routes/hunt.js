import {isVortexBoss} from '../../functions/game/world/dragonVortex.js';
import {getEpicTemplate} from '../../functions/game/boss/epicBosses.js';
import { sendJson, httpError, guarded } from '../http/response.js';
import { readJsonBody, withLock } from '../http/request.js';
import { authorize, sendResult, assertGoldUnlocked } from '../http/auth.js';
import { selectSoulCrystal, exchangeSeals } from '../../functions/game/equipment/soulCrystals.js';
import { advanceHunt } from '../../functions/game/hunt/huntFight.js';
import { setHuntSupplies } from '../huntSupplies.js';
import { getHuntDropForMiniApp } from '../hunt.js';
import CombatChat from '../../db/models/CombatChat.js';
import { readCombatChat, sendCombatChat } from '../combatChat.js';
import { advanceFieldPvp, fieldPeers, useFieldPvpSkill } from '../../functions/game/hunt/fieldPvp.js';
import http from 'http';
import { requestUrl as parseRequestUrl } from '../requestBoundary.js';
import getSession from '../../functions/getters/getSession.js';
import saveSession from '../../functions/getters/saveSession.js';
import getClan from '../../functions/game/clans/getClan.js';
import { memberName } from '../social.js';
import { getArenaState, attackArena } from '../arena.js';
import { getBossState, getEpicState, summonBossForMiniApp, enterBossFromAtlas, enterBossFromLocation, useBossSkill } from '../boss.js';
import { getZoneLoot, getHuntState, setAutoShotsForMiniApp, startHuntForMiniApp, useHuntSkillForMiniApp, setHotbarForMiniApp, useSpecialForMiniApp, moveHuntForMiniApp, targetHuntForMiniApp } from '../hunt.js';
import { setHuntAttack } from '../../functions/game/hunt/huntFight.js';
import { worldAction, advanceWorld, ensureWorld, bindWorldInstances } from '../../functions/game/world/world.js';
import { worldRequestState } from '../world.js';
import { loadWorldInstances, saveWorldInstances } from '../worldInstances.js';
import { pushAll } from '../notifications.js';

export const arenaState = guarded('arena state', async (req, res, requestUrl) => {
  const context = await authorize(req);
  const mode = requestUrl.searchParams.get('mode') || 'common';
  const arena = await withLock(`${context.chatId}:${context.userId}:arena`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getArenaState(context.session, context.chatId, context.userId, mode);
  });
  return sendJson(res, 200, arena);
});

export const arenaAttack = guarded('arena attack', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!['common', 'expansion'].includes(body.mode)) {
    throw httpError(400, 'mode must be common or expansion');
  }
  if (typeof body.defenderId !== 'string' || !body.defenderId) {
    throw httpError(400, 'defenderId is required');
  }
  const result = await withLock(`${context.chatId}:${context.userId}:arena`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const battle = await attackArena(context.session, context.chatId, context.userId, body.mode, body.defenderId);
    if (battle.ok) await saveSession(context.session);
    return battle;
  });
  return sendResult(res, result, context);
});

// Two kinds of bosses. World bosses (epics and the raid bosses of the real data) stand in their lairs: each fights in
// its own hidden chat (worldBosses.js), shared by everybody. The clan boss is called by a clan with a Clan Boss Sigil
// and fights in the hidden chat of the clan (clanScope.js). Without a clan there is no clan boss (scope 0).
async function bossScope(context, worldName = null) {
  if (worldName) {
    let scope = scopeOfName(String(worldName));
    if (scope === null) throw httpError(404, 'unknown world boss');
    // an instance: the copy of the hero's party (no party: a scope where no boss ever stands)
    if (EPIC_RULES[String(worldName)]?.instance) {
      const partyId = context.session?.game?.party?.id;
      scope = partyId ? instanceScopeId(String(worldName), partyId) : worldScopeId(1);
    }
    if(isVortexBoss(getEpicTemplate(String(worldName))?.world?.npcId)){
      const entry=context.session?.game?.world?.vortexEncounter;
      if(entry?.name===String(worldName))scope=entry.scope;
    }
    return { scope, clan: null, world: String(worldName) };
  }
  const clan = await getClan(Number(context.userId));
  return clan ? { scope: clanScopeId(clan), clan, world: null } : { scope: 0, clan: null, world: null };
}

export const bossState = guarded('boss state', async (req, res, requestUrl) => {
  const context = await authorize(req);
  const { scope, clan, world } = await bossScope(context, requestUrl?.searchParams.get('boss'));
  const boss = await withLock(`${scope}:boss`, async () => {
    context.session = await getSession(scope || context.chatId, context.userId);
    return getBossState(context.session, scope);
  });
  const sigils = getMaterialCount(context.session, 'clan_boss_token');
  return sendJson(res, 200, { ...boss, noClan: !world && !clan, clanName: clan?.name || null, world, sigils });
});

export const bossEpic = guarded('boss epic', async (req, res) => {
  const context = await authorize(req);
  return sendJson(res, 200, await getEpicState(context.session));
});

export const bossSummon = guarded('boss summon', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req).catch(() => ({}));
  const epic = typeof body?.epic === 'string' && body.epic ? body.epic : null;
  const { scope, clan, world } = await bossScope(context, epic);
  if (!world && !clan) return sendResult(res, { ok: false, reason: 'no_clan' }, context);
  const result = await withLock('clan:world',()=>withLock(`${scope}:boss`, async () => {
    context.session = await getSession(scope, context.userId);
    if(body.fromLocation){await loadWorldInstances(context.session);bindWorldInstances(context.session.ownerDocument());advanceWorld(context.session);}
    const summoned = body.fromLocation&&world ? await enterBossFromLocation(context.session,scope,epic) : body.teleport&&world ? await enterBossFromAtlas(context.session,scope,epic) : await summonBossForMiniApp(context.session, scope, epic, { memberCount: clan?.members.length ?? null });
    if (summoned.ok) await saveSession(context.session);
    return summoned;
  }));
  context.session = await getSession(context.chatId, context.userId);
  if (result.ok && clan) {
    const summoner = memberName(context.session);
    const text = `⚔️ ${summoner} призвал(а) кланового босса! Заходи в «Бой», пока он жив.`;
    // the whole clan hears about it, not a single chat
    pushAll(clan.members.map(member => String(member.userId)).filter(id => id !== String(context.userId)).slice(0, 50).map(userId => ({ userId, text })));
  }
  return sendResult(res, result, context);
});

export const bossSkill = guarded('boss skill', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const skillIndex = Number(body.skillIndex);
  if (!Number.isInteger(skillIndex) || skillIndex < 0) {
    throw httpError(400, 'skillIndex must be a non-negative integer');
  }
  const { scope } = await bossScope(context, typeof body.boss === 'string' && body.boss ? body.boss : null);
  const result = await withLock(`${scope}:boss`, async () => {
    context.session = await getSession(scope || context.chatId, context.userId);
    const done = await useBossSkill(context.session, scope, context.userId, skillIndex, typeof body.targetId === 'string' ? body.targetId : null);
    if (done.changed) await saveSession(context.session);
    return done;
  });
  context.session = await getSession(context.chatId, context.userId);
  return sendResult(res, result, context);
});

// Hunting fields. The lock is the inventory one: potions drunk in a fight go through /api/inventory/use.
const huntLock = context => `${context.chatId}:${context.userId}:inventory`;

// Every hunt answer carries the whole screen; mob swings that fell due are applied (and saved) on the way.
async function huntAnswer(context, run, {readOnly=false} = {}) {
  return withLock('clan:world',()=>withLock(huntLock(context), async () => {
    context.session = await getSession(context.chatId, context.userId, {persist:!readOnly});
    await loadWorldInstances(context.session);
    const chat=context.session.ownerDocument();
    bindWorldInstances(chat);
    advanceWorld(context.session);
    const pvpChanged=advanceFieldPvp(chat);
    const result = await run(context.session);
    const hunt = await getHuntState(context.session,Date.now(),fieldPeers(chat,context.session));
    if ((!readOnly && result.ok !== false) || hunt.changed || result.changed || pvpChanged || context.session.game.hunt?.field) {
      // PvP changes other members of the chat (damage, effects, deaths); saveSession only marks the caller dirty.
      if (pvpChanged || result.changed) chat.members.forEach((member, index) => {
        if (member !== context.session && (member.game?.hunt?.field || member.game?.worldPvp)) chat.markModified(`members.${index}`);
      });
      bindWorldInstances(chat);await saveWorldInstances(context.session);
      await saveSession(context.session);
    }
    return { ...result, hunt };
  }));
}

export const huntState = guarded('hunt state', async (req, res) => {
  const context = await authorize(req);
  const result = await huntAnswer(context, async () => ({ ok: true }), {readOnly:true});
  return sendJson(res, 200, result.hunt);
});

export const combatChat = guarded('combat chat',async(req,res)=>{
  const context=await authorize(req);
  const body=req.method==='POST'?await readJsonBody(req):null;
  const channel=body?.channel||parseRequestUrl(req).searchParams.get('channel')||'local';
  const result=await withLock(huntLock(context),async()=>{
    const session=await getSession(context.chatId,context.userId);
    if(body){
      const sent=await sendCombatChat(session,{...body,channel},CombatChat);
      if(!sent.ok)return sent;
      await saveSession(session);
    }
    return readCombatChat(session,channel,CombatChat);
  });
  return sendJson(res,result.ok?200:409,result);
});

export const worldRequest = guarded('world map', async (req,res) => {
  const context=await authorize(req),body=req.method==='POST'?await readJsonBody(req):null;
  if(['quick_travel','siege_register'].includes(body?.action))assertGoldUnlocked(context);
  const result=await withLock('clan:world',()=>withLock(huntLock(context),async()=>{
    context.session=await getSession(context.chatId,context.userId);
    const outcome=await worldRequestState(context.session,body);
    await saveWorldInstances(context.session);
    const hunt=body?await getHuntState(context.session,Date.now(),fieldPeers(context.session.ownerDocument(),context.session)):undefined;
    await saveSession(context.session);
    return {...outcome,hunt};
  }));
  if(req.method==='GET'&&new URL(req.url,'http://local').searchParams.get('live')==='1'){for(const key of ['cities','regions','locations','npcs','shop'])delete result.world[key];result.world.holdings=result.world.holdings.map(({id,owner,siege,contest,canEnter})=>({id,owner,siege,contest,canEnter}));}
  return sendResult(res,result,context);
});

export const huntStart = guarded('hunt start', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await huntAnswer(context, session => {
    const world=ensureWorld(session);
    if(world.mode!=='location'||world.location!==body.zone)return {ok:false,reason:'gatekeeper_required'};
    return startHuntForMiniApp(session,body.zone);
  });
  return sendResult(res, result, context);
});

export const huntLoot = guarded('hunt loot', async (req, res) => {
  const context = await authorize(req), body = await readJsonBody(req);
  context.session = await getSession(context.chatId, context.userId);
  return sendJson(res, 200, getZoneLoot(context.session, String(body.zone || '')));
});

export const huntMove = guarded('hunt move', async (req, res) => {
  const context = await authorize(req), body = await readJsonBody(req);
  return sendResult(res, await huntAnswer(context, session => moveHuntForMiniApp(session, body.point || body.direction)), context);
});

export const huntTarget = guarded('hunt target', async (req, res) => {
  const context = await authorize(req), body = await readJsonBody(req);
  return sendResult(res, await huntAnswer(context, session => targetHuntForMiniApp(session, body.targetId)), context);
});

export const huntAttack = guarded('hunt attack',async(req,res)=>{
  const context=await authorize(req),body=await readJsonBody(req);
  if(typeof body.enabled!=='boolean')throw httpError(400,'enabled must be boolean');
  return sendResult(res,await huntAnswer(context,session=>setHuntAttack(session,body.enabled)),context);
});

export const huntSkill = guarded('hunt skill', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const skillIndex = Number(body.skillIndex);
  if (!Number.isInteger(skillIndex) || skillIndex < 0) throw httpError(400, 'skillIndex must be a non-negative integer');
  const result = await huntAnswer(context, session => body.targetUserId != null
    ? useFieldPvpSkill(session.ownerDocument(),session,body.targetUserId,skillIndex,{force:body.force===true})
    : useHuntSkillForMiniApp(session, skillIndex));
  return sendResult(res, result, context);
});

export const huntSupplies = guarded('hunt supplies', async (req,res) => {
  const context=await authorize(req),body=await readJsonBody(req);
  return sendResult(res,await huntAnswer(context,session=>setHuntSupplies(session,body)),context);
});

export const huntDrop = guarded('hunt drop preview',async(req,res)=>{
  const context=await authorize(req),body=await readJsonBody(req);
  if(typeof body.targetId!=='string')throw httpError(400,'targetId is required');
  return sendResult(res,await huntAnswer(context,session=>getHuntDropForMiniApp(session,body.targetId)),context);
});

export const huntHotbar = guarded('hunt hotbar', async (req, res) => {
  const context = await authorize(req), body = await readJsonBody(req);
  if (!Array.isArray(body.slots)) throw httpError(400, 'slots must be an array');
  return sendResult(res, await huntAnswer(context, session => setHotbarForMiniApp(session, body.slots)), context);
});

export const huntSpecial = guarded('hunt special', async (req, res) => {
  const context = await authorize(req), body = await readJsonBody(req);
  if (typeof body.id !== 'string' || !body.id) throw httpError(400, 'id is required');
  return sendResult(res, await huntAnswer(context, session => useSpecialForMiniApp(session, body.id)), context);
});

export const soulSelect=guarded('soul select',async(req,res)=>{
  const context=await authorize(req),body=await readJsonBody(req);
  const result=await huntAnswer(context,session=>selectSoulCrystal(session,body.color,body.stage));
  return sendResult(res,result,context);
});

export const soulCharge=guarded('soul charge',async(req,res)=>{
  const context=await authorize(req);
  const result=await huntAnswer(context,session=>{const swings=advanceHunt(session);return {...chargeSoulCrystal(session,session.game.hunt?.mob),changed:swings.length>0};});
  return sendResult(res,result,context);
});

export const sealExchange=guarded('seal exchange',async(req,res)=>{
  const context=await authorize(req),body=await readJsonBody(req);assertGoldUnlocked(context);
  const result=await huntAnswer(context,session=>exchangeSeals(session,body.counts));
  return sendResult(res,result,context);
});

export const huntFlee = guarded('hunt flee', async (req, res) => {
  const context = await authorize(req);
  const result = await huntAnswer(context, session => worldAction(session,{action:'escape'}));
  return sendResult(res, result, context);
});

export const shotsAuto = guarded('shots auto', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await huntAnswer(context, session => setAutoShotsForMiniApp(session, body.enabled === true,body.kind??null));
  return sendResult(res, result, context);
});

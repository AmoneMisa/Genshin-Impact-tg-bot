import { sendJson, httpError, guarded } from '../http/response.js';
import { readJsonBody, withLock } from '../http/request.js';
import { authorize, stateFor, sendResult, assertGoldUnlocked, refreshContextSession } from '../http/auth.js';
import { startSoulCrystalQuest } from '../../functions/game/equipment/soulCrystalQuest.js';
import Character from '../../db/models/Character.js';
import { validatePlayerNickname, setPlayerNickname } from '../../functions/game/player/playerName.js';
import { advanceFieldPvp } from '../../functions/game/hunt/fieldPvp.js';
import { myId } from '../../config.js';
import getSession from '../../functions/getters/getSession.js';
import getChatSession from '../../functions/getters/getChatSession.js';
import saveSession from '../../functions/getters/saveSession.js';
import getClan from '../../functions/game/clans/getClan.js';
import { getPlayerCard, stampLastSeen } from '../social.js';
import sendMessage from '../../functions/tgBotFunctions/sendMessage.js';
import { getCharacterState } from '../character.js';
import { prepareBuilds, getBuildsState, startBuildUpgrade, speedupBuildUpgrade, collectBuildResources, changeBuildType, renameBuild } from '../builds.js';
import { getAcademyState, claimBounty, startPassQuest, talkPassQuest, advancePassQuest } from '../../functions/game/academy/academy.js';
import getAliveBoss from '../../functions/game/boss/getBossStatus/getAliveBoss.js';
import { getPlayerProfileState, changePlayerClassForMiniApp, changePlayerGenderForMiniApp, changePlayerRaceForMiniApp, changePlayerSubclassForMiniApp } from '../playerProfile.js';
import { getSkillsState, enchantSkillForMiniApp, learnSkillForMiniApp, routeSkillForMiniApp } from '../skills.js';
import { getClassQuestsState, startClassQuestForMiniApp, useProfessionMarkForMiniApp, payClassQuestForMiniApp, abandonClassQuestForMiniApp, promoteClassForMiniApp } from '../classQuests.js';
import { getFormsState, savePersonalForm } from '../forms.js';
import { getUpdatesState, setUpdatesEnabled } from '../updates.js';
import { normalizeFeedbackMessage, formatFeedbackForDeveloper } from '../feedback.js';
import { getTitlesState, assignTitle } from '../titles.js';
import { activeNotices, pendingMailCount } from '../promo.js';
import { castClassBuff, getClassBuffsState } from '../buffs.js';
import { castL2Buff } from '../l2Buffs.js';
import { playerMailPending } from '../mail.js';
import { getBaseStatsState } from '../../functions/game/player/baseStats.js';
import { bindWorldInstances } from '../../functions/game/world/world.js';
import { loadWorldInstances, saveWorldInstances } from '../worldInstances.js';
import { getAttributesState } from '../../functions/game/equipment/attributes.js';
import { learnPassive } from '../../functions/game/player/passiveSkills.js';
import { getBadges } from '../notifications.js';

const feedbackCooldowns = new Map();

const FEEDBACK_COOLDOWN_MS = 30_000;

export const bootstrap = guarded('bootstrap', async (req, res) => {
  const context = await authorize(req);
  return withLock(`${context.chatId}:bootstrap`, async () => {
  context.session = await getSession(context.chatId, context.userId);
  // Presence for friends lists; throttled inside stampLastSeen.
  if (stampLastSeen(context.session)) {
    try { await saveSession(context.session); } catch (error) { console.warn('last seen stamp failed', error.message); }
  }
  return sendJson(res, 200, stateFor(context));
  });
});

export const updatesState = guarded('updates state', async (req, res) => {
  const context = await authorize(req);
  context.session = await getSession(context.chatId, context.userId);
  return sendJson(res, 200, getUpdatesState(context.session));
});

export const updatesSettings = guarded('updates settings', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (typeof body.enabled !== 'boolean') {
    throw httpError(400, 'enabled must be boolean');
  }

  const result = await withLock(`${context.chatId}:${context.userId}:updates`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const changed = setUpdatesEnabled(context.session, body.enabled);
    if (changed.ok) await saveSession(context.session);
    return changed;
  });

  return sendJson(res, result.ok ? 200 : 409, {
    ...result,
    updates: getUpdatesState(context.session),
    state: stateFor(context),
  });
});

export const feedbackSubmit = guarded('feedback submit', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const normalized = normalizeFeedbackMessage(body.message);
  if (!normalized.ok) {
    throw httpError(400, normalized.reason);
  }

  const cooldownKey = String(context.userId);
  const now = Date.now();
  const lastSentAt = feedbackCooldowns.get(cooldownKey) || 0;
  const waitMs = FEEDBACK_COOLDOWN_MS - (now - lastSentAt);
  if (waitMs > 0) {
    throw httpError(429, `Подождите ${Math.ceil(waitMs / 1000)} сек. перед следующим сообщением`);
  }

  await sendMessage(myId, formatFeedbackForDeveloper({
    message: normalized.message,
    user: context.validated.user,
    chatId: context.chatId,
  }), { disable_notification: true });
  feedbackCooldowns.set(cooldownKey, now);

  return sendJson(res, 200, { ok: true });
});

export const formsState = guarded('forms state', async (req, res) => {
  const context = await authorize(req);
  const forms = await withLock(`${context.chatId}:forms`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    return getFormsState(chat, context.userId);
  });
  return sendJson(res, 200, forms);
});

export const formsSave = guarded('forms save', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await withLock(`${context.chatId}:forms`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    const saved = savePersonalForm(chat, context.userId, body.fields);
    if (saved.ok) await chat.save();
    return saved;
  });
  return sendResult(res, result, context);
});

export const characterState = guarded('character state', async (req, res) => {
  const context = await authorize(req);
  const clan=await getClan(context.userId);
  const result = await withLock(`${context.chatId}:${context.userId}:character`, async () => {
    return getCharacterState(context.session, { chatId: context.chatId, chatType: context.validated.chatType, user: context.validated.user,clanName:clan?.name });
  });
  return sendJson(res, 200, result);
});

export const playerProfileState = guarded('player profile state', async (req, res) => {
  const context = await authorize(req);
  const profile = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getPlayerProfileState(context.session);
  });
  return sendJson(res, 200, profile);
});

export const playerProfileClass = guarded('player profile class', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (typeof body.className !== 'string' || !body.className) {
    throw httpError(400, 'className is required');
  }

  const result = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const changed = changePlayerClassForMiniApp(context.session, body.className);
    if (changed.ok) await saveSession(context.session);
    return changed;
  });

  return sendResult(res, result, context);
});

export const playerProfileGender = guarded('player profile gender', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (typeof body.gender !== 'string' || !body.gender) {
    throw httpError(400, 'gender is required');
  }

  const result = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const changed = changePlayerGenderForMiniApp(context.session, body.gender);
    if (changed.ok) await saveSession(context.session);
    return changed;
  });

  return sendResult(res, result, context);
});

export const playerProfileNickname = guarded('player profile nickname',async(req,res)=>{
  const context=await authorize(req),body=await readJsonBody(req);
  const checked=validatePlayerNickname(body?.nickname);
  if(!checked.ok)return sendJson(res,409,checked);
  const result=await withLock(`${context.chatId}:${context.userId}:inventory`,async()=>{
    context.session=await getSession(context.chatId,context.userId);
    const taken=await Character.findOne({'data.game.nicknameKey':checked.key,userId:{$ne:Number(context.userId)}},{_id:1}).lean();
    if(taken)return {ok:false,reason:'nickname_taken'};
    const game=context.session.game,previous={nickname:game.nickname,nicknameKey:game.nicknameKey};
    const changed=setPlayerNickname(context.session,checked.nickname);
    try{await saveSession(context.session);}catch(error){game.nickname=previous.nickname;game.nicknameKey=previous.nicknameKey;if(error.code===11000)return {ok:false,reason:'nickname_taken'};throw error;}
    return changed;
  });
  return sendResult(res,result,context);
});

export const playerProfileRace = guarded('player profile race', async (req,res)=>{
  const context=await authorize(req),body=await readJsonBody(req);
  if(typeof body.race!=='string')throw httpError(400,'race is required');
  const result=await withLock(context.chatId,async()=>{
    context.session=await getSession(context.chatId,context.userId);
    const changed=changePlayerRaceForMiniApp(context.session,body.race);
    if(changed.ok)await saveSession(context.session);
    return changed;
  });
  return sendResult(res,result,context);
});

export const playerProfileSubclass = guarded('player profile subclass', async (req,res)=>{
  const context=await authorize(req),body=await readJsonBody(req);
  if(!['add','switch','remove'].includes(body.action) || (body.action==='add'&&typeof body.className!=='string') || (['switch','remove'].includes(body.action)&&!Number.isInteger(body.index)))throw httpError(400,'invalid subclass action');
  const result=await withLock(context.chatId,async()=>{
    context.session=await getSession(context.chatId,context.userId);
    const changed=changePlayerSubclassForMiniApp(context.session,body);
    if(changed.ok)await saveSession(context.session);
    return changed;
  });
  return sendResult(res,result,context);
});

export const playerSkillsState = guarded('player skills state', async (req, res) => {
  const context = await authorize(req);
  const skills = await withLock(`${context.chatId}:${context.userId}:skills`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getSkillsState(context.session);
  });
  return sendJson(res, 200, skills);
});

export const playerSkillsEnchant = guarded('player skills enchant', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  const slot = body.id != null ? 0 : Number(body.slot);
  if (!Number.isInteger(slot) || slot < 0) {
    throw httpError(400, 'slot must be a non-negative integer');
  }

  const result = await withLock(`${context.chatId}:${context.userId}:skills`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const enchanted = enchantSkillForMiniApp(context.session, slot, {id:body.id,mode:body.mode,route:body.route});
    if (enchanted.ok) await saveSession(context.session);
    return enchanted;
  });

  return sendResult(res, result, context);
});

export const playerSkillsLearn = guarded('player skills learn', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  const slot = Number(body.slot);
  if (!Number.isInteger(slot) || slot < 0) {
    throw httpError(400, 'slot must be a non-negative integer');
  }

  const result = await withLock(`${context.chatId}:${context.userId}:skills`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const learned = learnSkillForMiniApp(context.session, slot);
    if (learned.ok) await saveSession(context.session);
    return learned;
  });

  return sendResult(res, result, context);
});

export const playerSkillsRoute = guarded('player skills route', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  assertGoldUnlocked(context);
  const slot = Number(body.slot);
  if (!Number.isInteger(slot) || slot < 0) {
    throw httpError(400, 'slot must be a non-negative integer');
  }
  if (typeof body.route !== 'string' || !body.route) {
    throw httpError(400, 'route is required');
  }

  const result = await withLock(`${context.chatId}:${context.userId}:skills`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const changed = routeSkillForMiniApp(context.session, slot, body.route);
    if (changed.ok) await saveSession(context.session);
    return changed;
  });

  return sendResult(res, result, context);
});

export const classQuestsState = guarded('class quests state', async (req, res) => {
  const context = await authorize(req);
  const quests = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return getClassQuestsState(context.session);
  });
  return sendJson(res, 200, quests);
});

export const classQuestsAction = guarded('class quests action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (!['start', 'mark', 'pay', 'abandon', 'promote'].includes(body.action)) {
    throw httpError(400, 'action must be start, mark, pay, abandon or promote');
  }
  if (['start', 'mark', 'promote'].includes(body.action) && (typeof body.to !== 'string' || !body.to)) {
    throw httpError(400, 'to is required');
  }
  if (['pay', 'promote'].includes(body.action)) assertGoldUnlocked(context);

  const result = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const actions = {
      start: () => startClassQuestForMiniApp(context.session, body.to),
      mark: () => useProfessionMarkForMiniApp(context.session, body.to),
      pay: () => payClassQuestForMiniApp(context.session),
      abandon: () => abandonClassQuestForMiniApp(context.session),
      promote: () => promoteClassForMiniApp(context.session, body.to),
    };
    const outcome = actions[body.action]();
    if (outcome.ok) await saveSession(context.session);
    return outcome;
  });

  return sendResult(res, result, context);
});

export const noticesState = guarded('notices', async (req, res) => {
  await authorize(req);
  return sendJson(res, 200, { notices: await activeNotices() });
});

export const classBuffsState = guarded('class buffs state', async (req, res) => {
  const context = await authorize(req);
  const buffs = await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const changed=advanceFieldPvp(context.session.ownerDocument());
    const result=getClassBuffsState(context.session);
    if(changed||context.session.needsSave)await saveSession(context.session);
    return result;
  });
  return sendJson(res, 200, buffs);
});

export const classBuffsCast = guarded('class buffs cast', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (typeof body.buffId !== 'string' || !['string', 'number', 'undefined'].includes(typeof body.targetId)) {
    throw httpError(400, 'buffId is required');
  }
  const result = await withLock('clan:world',()=>withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    await loadWorldInstances(context.session);
    bindWorldInstances(context.session.ownerDocument());
    const advanced=advanceFieldPvp(context.session.ownerDocument());
    const cast = (body.buffId.startsWith('l2:') || body.buffId.startsWith('scryde:')) ? castL2Buff(context.session,body.buffId,body.targetId??null,{force:body.force===true}) : castClassBuff(context.session, body.buffId, body.targetId ?? null);
    const buffs=getClassBuffsState(context.session);
    if (cast.ok||advanced||context.session.needsSave){await saveWorldInstances(context.session);await saveSession(context.session);}
    return { ...cast, buffs };
  }));
  return sendResult(res, result, context);
});

// The passives screen also shows the base characteristics (STR, DEX, ...) and the element of the gear.
const passivesPayload = session => ({
  ...getPassivesState(session),
  characteristics: getBaseStatsState(session),
  attributes: getAttributesState(session),
});

export const passivesState = guarded('passives state', async (req, res) => {
  const context = await authorize(req);
  const state = await withLock(`${context.chatId}:passives`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    return passivesPayload(context.session);
  });
  return sendJson(res, 200, state);
});

export const passivesLearn = guarded('passives learn', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const result = await withLock(`${context.chatId}:passives`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const learned = learnPassive(context.session, String(body.id || ''));
    if (learned.ok) await saveSession(context.session);
    return { ...learned, passives: passivesPayload(context.session) };
  });
  return sendResult(res, result, context);
});

export const badges = guarded('badges', async (req, res) => {
  const context = await authorize(req);
  await withLock(context.chatId, async () => {
    context.session = await getSession(context.chatId, context.userId);
    if (stampLastSeen(context.session)) await saveSession(context.session);
  });
  const chat = await getChatSession(context.chatId);
  let clan = null;
  try { clan = await getClan(Number(context.userId)); } catch { clan = null; }
  let bossAlive = false;
  // the boss is the boss of the clan
  if (clan) {
    try { bossAlive = Boolean(await getAliveBoss(clanScopeId(clan))); } catch { bossAlive = false; }
  }
  return sendJson(res, 200, getBadges(chat, context.userId, clan, { session: context.session, bossAlive, mail: pendingMailCount(context.session) + playerMailPending(chat, context.userId) }));
});

export const playerCard = guarded('player card', async (req, res, requestUrl) => {
  const context = await authorize(req);
  const targetId = requestUrl.searchParams.get('userId') || String(context.userId);
  const chat = await getChatSession(context.chatId);
  const targetClan = await getClan(Number(targetId));
  const viewerClan=await getClan(Number(context.userId));
  const card = getPlayerCard(chat, targetId, context.userId, { clanName: targetClan?.name||null,targetInClan:Boolean(targetClan),viewerClan });
  if (!card) return sendJson(res, 404, { error: 'Игрок не найден в этом чате', reason: 'unknown_player' });
  return sendJson(res, 200, card);
});

export const titlesState = guarded('titles state', async (req, res) => {
  const context = await authorize(req);
  const titles = await withLock(`${context.chatId}:titles`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    return getTitlesState(context.chatId, context.userId, chat);
  });
  return sendJson(res, 200, titles);
});

export const titlesAssign = guarded('titles assign', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const payload = await withLock(`${context.chatId}:titles`, async () => {
    const chat = await getChatSession(context.chatId);
    refreshContextSession(context, chat);
    const result = await assignTitle(chat, context.userId, body.title);
    const titles = await getTitlesState(context.chatId, context.userId, chat);
    refreshContextSession(context, chat);
    return { result, titles };
  });

  return sendJson(res, payload.result.ok ? 200 : 409, {
    ...payload.result,
    titles: payload.titles,
    state: stateFor(context),
  });
});

export const buildsState = guarded('builds state', async (req, res) => {
  const context = await authorize(req);
  const builds = await withLock(`${context.chatId}:${context.userId}:builds`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const changed = prepareBuilds(context.session);
    if (changed) await saveSession(context.session);
    return getBuildsState(context.session);
  });
  return sendJson(res, 200, builds);
});

export const academyState = guarded('academy state', async (req, res) => {
  const context = await authorize(req);
  const state = await withLock(`${context.chatId}:${context.userId}:builds`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const view = getAcademyState(context.session);
    await saveSession(context.session);
    return view;
  });
  return sendJson(res, 200, state);
});

export const academyAction = guarded('academy action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  const actions = new Set(['claim', 'pass_start', 'pass_talk', 'pass_next','soul_start']);
  if (!actions.has(body.action)) throw httpError(400, 'Unknown academy action');
  const result = await withLock(`${context.chatId}:${context.userId}:builds`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const outcome = body.action === 'soul_start'?startSoulCrystalQuest(context.session,body.color):body.action === 'claim' ? claimBounty(context.session, String(body.scope || ''), String(body.id || ''))
      : body.action === 'pass_start' ? startPassQuest(context.session, String(body.name || ''))
        : body.action === 'pass_talk' ? talkPassQuest(context.session, String(body.name || ''))
          : advancePassQuest(context.session, String(body.name || ''));
    if (outcome.ok) await saveSession(context.session);
    return { ...outcome, academy: getAcademyState(context.session) };
  });
  return sendResult(res, result, context);
});

export const buildsAction = guarded('builds action', async (req, res) => {
  const context = await authorize(req);
  const body = await readJsonBody(req);
  if (body.action === 'upgrade') assertGoldUnlocked(context);
  if (typeof body.buildName !== 'string' || !body.buildName) {
    throw httpError(400, 'buildName is required');
  }
  if (!new Set(['upgrade', 'speedup', 'collect', 'change_type', 'rename']).has(body.action)) {
    throw httpError(400, 'Unknown building action');
  }

  const result = await withLock(`${context.chatId}:${context.userId}:builds`, async () => {
    context.session = await getSession(context.chatId, context.userId);
    const prepared = prepareBuilds(context.session);
    let updated;
    if (body.action === 'upgrade') updated = startBuildUpgrade(context.session, body.buildName);
    else if (body.action === 'speedup') updated = speedupBuildUpgrade(context.session, body.buildName);
    else if (body.action === 'collect') updated = collectBuildResources(context.session, body.buildName);
    else if (body.action === 'change_type') updated = changeBuildType(context.session, body.buildName, body.typeName);
    else updated = renameBuild(context.session, body.buildName, body.name);
    if (prepared || updated.ok) await saveSession(context.session);
    return updated;
  });
  return sendResult(res, result, context);
});

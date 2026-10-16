import {randomUUID} from 'node:crypto';
import {memberName} from './social.js';
import {limitPlayerName} from '../functions/game/player/playerName.js';

export const CHAT_LIMIT=200;
export const CHAT_HISTORY=80;
export const CHAT_INTERVAL=1000;

/** Scope is derived solely from the authenticated character, never from client room/party IDs. */
export function combatChatScope(session,channel) {
  if(channel==='party')return session.game?.party?.id ? 'party:'+session.game.party.id : null;
  if(channel!=='local')return null;
  const game=session.game,field=game?.hunt?.field;
  if(!field||!game.hunt.zone)return null;
  const chat=session.ownerDocument?.();
  if(!chat)return null;
  return JSON.stringify(['local',String(chat.chatId),game.world?.instanceId||'',game.hunt.zone,field.room]);
}

export async function readCombatChat(session,channel,store) {
  const scope=combatChatScope(session,channel);
  if(!scope)return {ok:false,reason:channel==='party'?'no_party':'chat_unavailable'};
  const record=await store.findById(scope).lean();
  // New party members see messages from their current membership only.
  const since=channel==='party'?Number(session.game.party.joinedAt)||0:0;
  return {ok:true,channel,scope,messages:(record?.messages||[]).filter(row=>row.at>=since).slice(-CHAT_HISTORY).map(row=>({...row,name:limitPlayerName(row.name)}))};
}

export async function sendCombatChat(session,body,store,now=Date.now()) {
  const channel=body?.channel,scope=combatChatScope(session,channel);
  if(!scope)return {ok:false,reason:channel==='party'?'no_party':'chat_unavailable'};
  if(typeof body.text!=='string')return {ok:false,reason:'chat_text'};
  const text=body.text.replace(/[\u0000-\u001f\u007f]/g,' ').trim();
  if(!text||text.length>CHAT_LIMIT)return {ok:false,reason:'chat_text'};
  if(now-Number(session.game.combatChatAt||0)<CHAT_INTERVAL)return {ok:false,reason:'chat_rate'};
  const message={id:randomUUID(),userId:String(session.userId),name:memberName(session),text,at:now};
  await store.updateOne({_id:scope},{$push:{messages:{$each:[message],$slice:-CHAT_HISTORY}},$set:{expiresAt:new Date(now+7*24*60*60*1000)}},{upsert:true});
  session.game.combatChatAt=now;
  return {ok:true,message};
}

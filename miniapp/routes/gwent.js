import { authorize } from '../http/auth.js';
import { guarded, sendJson } from '../http/response.js';
import { readJsonBody, withLock } from '../http/request.js';
import getChatSession from '../../functions/getters/getChatSession.js';
import { gwentState, gwentAction, gwentFingerprint } from '../gwent.js';
import { gwentAppBase, addGwentLinks, pushGwentInvite, pushGwentPlay } from '../gwent-sharing.js';
import { gwentAppLink } from '../../webapp/gwent-links.js';

async function handle(req, res, mutation) {
  const context = await authorize(req);
  const body = mutation ? await readJsonBody(req, 16384) : null;
  const params = new URL(req.url,'http://localhost').searchParams;
  const result = await withLock(`${context.chatId}:gwent`, async () => {
    const chat = await getChatSession(context.chatId);
    let changed = mutation;
    if (!chat.members.some(m=>String(m.userId)===String(context.userId))) { chat.members.push(context.session.toObject?.() || context.session); changed = true; }
    const before = gwentFingerprint(chat);
    const result = mutation ? gwentAction(chat, context.userId, body) : gwentState(chat, context.userId,Date.now(),{watch:params.get('watch'),invite:params.get('invite')});
    // Moves are always stored with the chat. A plain read is stored only when it changed something
    // (a heartbeat, an expiry, a timeout), so the 2.5 s polling does not rewrite the whole chat.
    if (changed || gwentFingerprint(chat) !== before) await chat.save();
    return result;
  });
  const base = await gwentAppBase();
  addGwentLinks(result,base,context.chatId);
  if(result.ok!==false && result.notifyInvite){
    const notification=result.notifyInvite;delete result.notifyInvite;
    try {result.notificationSent=await pushGwentInvite(notification,gwentAppLink(base,context.chatId,'invite',notification.id));}
    catch {result.notificationSent=false;}
  }
  if(result.ok!==false && result.notifyPlay){
    const notification=result.notifyPlay;delete result.notifyPlay;
    // Fire and forget: a failed message must not delay or fail the move.
    pushGwentPlay(notification,gwentAppLink(base,context.chatId,'play',notification.matchId)).catch(()=>{});
  }
  return sendJson(res, result.ok === false ? 409 : 200, result);
}
export const gwentRead = guarded('gwent state', (req, res) => handle(req, res, false));
export const gwentWrite = guarded('gwent action', (req, res) => handle(req, res, true));

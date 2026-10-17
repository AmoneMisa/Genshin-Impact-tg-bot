import bot from '../bot.js';
import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import { pushTo } from './notifications.js';
import { translateFor } from './language.js';
import { gwentAppLink } from '../webapp/gwent-links.js';

/** Main Mini Apps use the bot URL itself; named apps retain their own path. */
export function gwentBaseForBot(me, shortName = '') {
  if (!/^[a-zA-Z0-9_]+$/.test(me?.username || '')) return null;
  if (shortName) return /^[a-zA-Z0-9_]+$/.test(shortName) ? `https://t.me/${me.username}/${shortName}` : null;
  return me.has_main_web_app === true ? `https://t.me/${me.username}` : null;
}

let basePromise = null, baseExpiresAt = 0;
export async function gwentAppBase() {
  if (!basePromise || Date.now() >= baseExpiresAt) {
    baseExpiresAt = Date.now() + 5 * 60_000;
    basePromise = bot.getMe().then(me => gwentBaseForBot(me, process.env.MINI_APP_SHORT_NAME))
      .catch(() => {baseExpiresAt=Date.now()+30_000;return null;});
  }
  return basePromise;
}
export function addGwentLinks(data, base, chatId = null) {
  const decorate = invitation => ({...invitation,url:gwentAppLink(base,chatId,'invite',invitation.id)});
  if (data.invitation) data.invitation=decorate(data.invitation);
  if (data.incoming) data.incoming=data.incoming.map(decorate);
  if (data.outgoing) data.outgoing=data.outgoing.map(decorate);
  return data;
}
/** Called only after an authenticated, explicit push_invite action was persisted. */
export async function pushGwentInvite(notification, url, {send=sendMessage,push=pushTo,translate=translateFor}={}) {
  const text = `${notification.fromName} приглашает вас сыграть в гвинт. Приглашение действует 15 минут.`;
  const label = await translate(notification.userId,'Открыть приглашение');
  return push(notification.userId,text,{translate,send:(id,message)=>send(id,message,url?{reply_markup:{inline_keyboard:[[{text:label,url}]]}}:undefined)});
}

const PLAY_TEXT = {
  turn: name => `Ваш ход в гвинте против ${name}. На ход даётся 5 минут.`,
  start: name => `${name} начинает с вами матч в гвинт. На ход даётся 5 минут.`,
  rematch: name => `${name} предлагает реванш в гвинте.`,
};
/** Called only for a player who is not in the app, after the move was persisted. */
export async function pushGwentPlay(notification, url, {send=sendMessage,push=pushTo,translate=translateFor}={}) {
  const text = (PLAY_TEXT[notification.kind] || PLAY_TEXT.turn)(notification.fromName);
  const label = await translate(notification.userId,'Открыть игру');
  return push(notification.userId,text,{translate,send:(id,message)=>send(id,message,url?{reply_markup:{inline_keyboard:[[{text:label,url}]]}}:undefined)});
}

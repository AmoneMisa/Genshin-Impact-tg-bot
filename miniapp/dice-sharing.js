import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import { pushTo } from './notifications.js';
import { translateFor } from './language.js';
import { diceAppLink } from '../webapp/dice-links.js';

const TEXT = {
  invite: name => `${name} приглашает вас сыграть в кости. Приглашение действует 15 минут.`,
  rematch: name => `${name} предлагает реванш в костях. Приглашение действует 15 минут.`,
  raise: name => `${name} повышает ставку в костях. Ответьте, пока идёт игра.`,
  start: name => `${name} принял ваше приглашение: игра в кости началась.`,
};

/** Adds the shareable link to every invitation of an answer. */
export function addDiceLinks(data, base) {
  const decorate = invitation => ({ ...invitation, url: diceAppLink(base, invitation.id) });
  if (data.invitation) data.invitation = decorate(data.invitation);
  if (data.incoming) data.incoming = data.incoming.map(decorate);
  if (data.outgoing) data.outgoing = data.outgoing.map(decorate);
  return data;
}

/** A Telegram message for a player who is not in the app, sent only after the action was saved. */
export async function pushDiceNotice(notice, url, { send = sendMessage, push = pushTo, translate = translateFor } = {}) {
  const text = (TEXT[notice.kind] || TEXT.invite)(notice.fromName);
  const label = await translate(notice.userId, 'Открыть игру');
  return push(notice.userId, text, { translate, send: (id, message) => send(id, message, url ? { reply_markup: { inline_keyboard: [[{ text: label, url }]] } } : undefined) });
}

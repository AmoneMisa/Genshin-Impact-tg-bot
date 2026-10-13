import bot from '../bot.js';
import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import sendMiniAppLauncher from './launcher.js';
import {isOwner,canUnstack,unstackGame} from './adminAccess.js';
import {runChatTool} from './adminTools.js';
import {withLock} from '../functions/general/chatLock.js';

export function registerAdminCommands(){
 let username;
 const addressed=async msg=>{
  const target=/^\/\w+@(\w+)/.exec(msg.text||'')?.[1];
  if(!target)return true;
  username??=(await bot.getMe()).username.toLowerCase();return target.toLowerCase()===username;
 };
 bot.onText(/^\/admin(?:@\w+)?\s*$/,async msg=>{
  if(!isOwner(msg.from?.id)||!await addressed(msg))return;
  await sendMiniAppLauncher(msg,{admin:true});
 });
 bot.onText(/^\/(?:unstack|reset_point_game|reset_elements_game)(?:@\w+)?(?:\s+\w+)?\s*$/,async msg=>{
  if(!['group','supergroup'].includes(msg.chat.type)||!await addressed(msg))return;
  const membership=await bot.getChatMember(msg.chat.id,msg.from.id);
  if(!canUnstack(membership.status))return;
  const tool=unstackGame(msg.text);
  const text=tool?(await withLock(msg.chat.id,()=>runChatTool(msg.chat.id,tool))).message:'Выбери игру: /unstack 21 или /unstack elements.';
  await sendMessage(msg.chat.id,text,{...(msg.message_thread_id?{message_thread_id:msg.message_thread_id}:{})});
 });
}

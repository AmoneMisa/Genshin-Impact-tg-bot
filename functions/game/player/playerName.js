export const PLAYER_NAME_MAX=16;

/** Game names are derived from Telegram today; never mutate the Telegram profile. */
export function limitPlayerName(value,fallback='Игрок') {
  return Array.from(String(value??'').replace(/\s+/gu,' ').trim()||fallback).slice(0,PLAYER_NAME_MAX).join('');
}
export function playerName(member,fallbackUser=null) {
  const user=member?.userChatData?.user||fallbackUser||member||{};
  return limitPlayerName(member?.game?.nickname||user.first_name||user.firstName||user.username||`Игрок ${member?.userId??user.id??''}`);
}

export function validatePlayerNickname(value){
  if(typeof value!=='string')return {ok:false,reason:'invalid_nickname'};
  const nickname=value.trim().normalize('NFC');
  if(!nickname||Array.from(nickname).length>PLAYER_NAME_MAX||!/^[-\p{L}\p{N}_]+$/u.test(nickname))return {ok:false,reason:'invalid_nickname'};
  return {ok:true,nickname,key:nickname.normalize('NFKC').toLocaleLowerCase('ru-RU')};
}
export function setPlayerNickname(session,value){
  const checked=validatePlayerNickname(value);if(!checked.ok)return checked;
  session.game.nickname=checked.nickname;session.game.nicknameKey=checked.key;
  return {ok:true,nickname:checked.nickname};
}

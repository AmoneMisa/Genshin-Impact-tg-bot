import test from 'node:test';
import assert from 'node:assert/strict';
import {playerName,limitPlayerName,validatePlayerNickname,setPlayerNickname} from '../functions/game/player/playerName.js';
import Character from '../db/models/Character.js';
import {memberName} from '../miniapp/social.js';
import {combatEventText,lootEventTexts} from '../webapp/combat-chat.js';

test('chosen character nickname wins over Telegram and survives a character save/load',()=>{
 const session={userId:1,userChatData:{user:{first_name:'Telegram Name'}},game:{}};
 assert.equal(setPlayerNickname(session,'Белый_Маг').ok,true);
 assert.equal(playerName(session),'Белый_Маг');assert.equal(memberName(session),'Белый_Маг');
 const saved=JSON.parse(JSON.stringify(session));assert.equal(playerName(saved),'Белый_Маг');
 assert.equal(session.userChatData.user.first_name,'Telegram Name');
});
test('nicknames validate Unicode length and characters; invalid input never changes the name',()=>{
 const session={game:{nickname:'Before'}};
 for(const value of ['',null,'a'.repeat(17),'<script>','Two Names','A\nB'])assert.equal(setPlayerNickname(session,value).ok,false);
 assert.equal(session.game.nickname,'Before');
 assert.equal(validatePlayerNickname('Я'.repeat(16)).ok,true);
 assert.equal(validatePlayerNickname('a'.repeat(16)).ok,true);
 assert.equal(validatePlayerNickname(' Hero_123 ').nickname,'Hero_123');
 assert.equal(validatePlayerNickname('HERO').key,validatePlayerNickname('hero').key);
 assert.equal(Array.from(limitPlayerName('🧙'.repeat(17))).length,16);
 assert.equal(playerName({first_name:'a'.repeat(30)}).length,16);
});
test('nickname uniqueness is indexed on the shared character, excluding unset names',()=>{
 const index=Character.schema.indexes().find(([keys])=>keys['data.game.nicknameKey']);
 assert.equal(index[1].unique,true);assert.deepEqual(index[1].partialFilterExpression,{'data.game.nicknameKey':{$type:'string'}});
});
test('combat event lines use actual amounts and distinct miss, evade and healing outcomes',()=>{
 assert.equal(combatEventText({kind:'incoming',actor:'Орк',target:'Hero',amount:120}),'Орк → Hero: наносит урон 120.');
 assert.equal(combatEventText({kind:'outgoing',actor:'Hero',target:'Орк',amount:99}),'Hero → Орк: наносит урон 99.');
 assert.equal(combatEventText({kind:'miss',actor:'Hero',target:'Орк'}),'Hero → Орк: промах.');
 assert.equal(combatEventText({kind:'evade',actor:'Орк',target:'Hero'}),'Орк → Hero: уворот.');
 assert.equal(combatEventText({kind:'heal',actor:'Hero',target:'Ally',amount:50}),'Hero → Ally: восстанавливает 50 HP.');
});

test('loot journal distinguishes received currency and items and ignores empty rewards',()=>{
 assert.deepEqual(lootEventTexts({gold:120,items:[{item:'iron',name:'Iron Ore',amount:2},{item:'moonDew',name:'Лунная роса',amount:3},{name:'Empty',amount:0}]}),['Получено 120 адены.','Вы получили Iron Ore ×2.','Получено 3 Лунная роса.']);
 assert.deepEqual(lootEventTexts({gold:0,items:[]}),[]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {isOwner,canUnstack,unstackGame} from '../miniapp/adminAccess.js';
import {myId} from '../config.js';
import {resolveGameChatId} from '../miniapp/telegramAuth.js';
test('only configured owner has bot administration rights',()=>{
 assert.equal(isOwner(myId),true);assert.equal(isOwner(String(myId)),true);
 for(const id of [undefined,null,0,myId+1])assert.equal(isOwner(id),false);
});
test('unstack belongs only to administrators of the addressed chat',()=>{
 for(const status of ['administrator','creator'])assert.equal(canUnstack(status),true);
 for(const status of ['member','restricted','left','kicked',undefined])assert.equal(canUnstack(status),false);
 assert.equal(unstackGame('/unstack 21'),'reset_point');assert.equal(unstackGame('/unstack@bot elements'),'reset_elements');
 assert.equal(unstackGame('/unstack all'),null);assert.equal(unstackGame('/reset_point_game'),'reset_point');
});
test('signed admin launcher preserves game chat selection',()=>{
 assert.equal(resolveGameChatId({startParam:'admin_chat_-123',user:{id:myId}}),-123);
});

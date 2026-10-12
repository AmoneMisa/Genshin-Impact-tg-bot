import test from 'node:test';
import assert from 'node:assert/strict';
import {lockScope} from '../miniapp/lockScope.js';
import {featuresForTab} from '../webapp/nav.js';
import {getClassQuestsState} from '../miniapp/classQuests.js';
import {getClassBuffsState} from '../miniapp/buffs.js';
import {generateHoroscopeForMiniApp,shareHoroscopeForMiniApp,updateHoroscopeSettings,getHoroscopeState} from '../miniapp/horoscope.js';
test('profession requests accept numeric Telegram chat ids in the shared lock',()=>{
 for(const id of [-100123456789,123456789])assert.equal(lockScope(id),String(id));
 assert.equal(lockScope('-100123:horoscope'),'-100123');
 assert.equal(lockScope('clan:42'),'clan:42');
 const session={game:{gameClass:{stats:{name:'humanMystic'}},stats:{lvl:47},inventory:{}}};
 assert.ok(getClassQuestsState(session).promotions.length);
});
test('class buffs have skill names while their inventory potion names remain intact',()=>{
 const session={game:{gameClass:{stats:{name:'warrior',mp:1000,maxMp:1000}},stats:{lvl:50},effects:[],inventory:{},equipmentStats:{}}};
 const buffs=getClassBuffsState(session).buffs;
 assert.ok(buffs.length);
 for(const buff of buffs)assert.doesNotMatch(buff.name,/Potion|Зелье/);
});
test('horoscope is in games only',()=>{
 assert.equal(featuresForTab([{id:'horoscope'}],'hero').length,0);
 assert.equal(featuresForTab([{id:'horoscope'}],'games').length,1);
});
test('sharing uses the generated result once and failed delivery remains retryable',async()=>{
 const hero={userChatData:{user:{first_name:'Player'}}};const sent=[];
 assert.equal((await shareHoroscopeForMiniApp(hero,{send:async()=>{throw Error('unexpected');}})).reason,'no_prediction');
 await generateHoroscopeForMiniApp(hero,{generate:async()=> '♈ Овен: Редкий дроп ждёт тебя.',now:100});
 await assert.rejects(shareHoroscopeForMiniApp(hero,{send:async()=>{throw Error('offline');}}),/offline/);
 assert.equal(getHoroscopeState(hero).shared,false);
 await shareHoroscopeForMiniApp(hero,{send:async text=>sent.push(text),now:200});
 assert.equal(sent.length,1);assert.match(sent[0],/Player.*гороскоп\n♈/);
 assert.equal((await shareHoroscopeForMiniApp(hero,{send:async text=>sent.push(text)})).reason,'already_shared');
 updateHoroscopeSettings(hero,{sign:'pisces'});
 assert.equal(getHoroscopeState(hero).text,'');
 assert.equal((await shareHoroscopeForMiniApp(hero,{send:async()=>{}})).reason,'no_prediction');
});

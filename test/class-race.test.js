import test from 'node:test';
import assert from 'node:assert/strict';
import {L2_CLASS_META,raceOf} from '../template/l2ClassMeta.js';
import {CLASS_RACE,playerRace} from '../webapp/class-race.js';
import {createMiniAppState} from '../miniapp/state.js';
test('every client race follows the actual High Five profession ancestry',()=>{
  assert.equal(Object.keys(CLASS_RACE).length,Object.keys(L2_CLASS_META).length);
  for(const [id,meta] of Object.entries(L2_CLASS_META)) assert.equal(playerRace({className:meta.key}),raceOf(Number(id)));
  assert.equal(playerRace({className:'constructor'}),null);
  assert.equal(playerRace({race:'__proto__',className:'unknown'}),null);
  assert.equal(playerRace({race:'elf',className:'archmage'}),'elf');
  for(const [id,meta] of Object.entries(L2_CLASS_META)) {
    const session={game:{stats:{lvl:24},inventory:{},gameClass:{stats:{name:meta.key,hp:10,maxHp:10}}}};
    assert.equal(createMiniAppState(session,{}).player.race,raceOf(Number(id)));
  }
});

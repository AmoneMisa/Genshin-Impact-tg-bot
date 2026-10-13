import test from 'node:test';
import assert from 'node:assert/strict';
import L2 from '../template/l2Classes.js';
import CLIENT from '../template/l2SkillGroups.js';
import {skillClientIconType,skillDisplayGroup} from '../functions/game/player/skillDisplayGroup.js';
import {skillBookHtml} from '../webapp/skill-book.js';

test('client categories cover every exported class skill and every normal level',()=>{
 assert.equal(Object.keys(CLIENT.skills).length,984);
 assert.equal(CLIENT.verifiedRows,42936);
 for(const [id,s] of Object.entries(L2.skills))for(let level=1;level<=s.levels;level++){
  assert.notEqual(skillClientIconType({id,level}),null,`${id}:${level}`);
 }
});
test('High Five categories override misleading operation, effects and skill names',()=>{
 assert.equal(skillDisplayGroup({id:146,level:1,op:'P',name:'Anti Magic',effects:['Buff']}),'ability');
 assert.equal(skillDisplayGroup({id:194,level:1,op:'P',effects:['Lucky']}),'ability');
 assert.equal(skillDisplayGroup({id:1320,level:1,op:'P',effects:['OpenCommonRecipeBook']}),'equipment');
 assert.equal(skillDisplayGroup({id:1322,level:1}),'item');
 assert.equal(skillDisplayGroup({id:239,level:0,availableLevel:2}),'equipment');
 assert.equal(skillDisplayGroup({id:1068,level:1}),'reinforce');
 assert.equal(skillDisplayGroup({id:1230,level:1}),'magic');
});
test('enchant routes use the client skill level and can move skills between sections',()=>{
 assert.equal(skillDisplayGroup({id:1230,level:28},{route:1,level:1}),'magic');
 assert.equal(skillDisplayGroup({id:1230,level:28},{route:3,level:1}),'weaken');
 assert.equal(skillDisplayGroup({id:254,level:11}),'physical');
 assert.equal(skillDisplayGroup({id:254,level:11},{route:1,level:30}),'weaken');
 assert.equal(skillDisplayGroup({id:1230,level:28},{route:3,level:0}),'magic');
});
test('missing client data has an explicit generic section rather than inferred categories',()=>{
 assert.equal(skillClientIconType({id:999999,level:1}),null);
 assert.equal(skillDisplayGroup({id:999999,op:'P',name:'Weapon Mastery'}),'otherPassive');
 assert.equal(skillDisplayGroup({id:999999,effects:['Buff']}),'otherActive');
 assert.equal(skillClientIconType({id:1230,level:999}),null);
});
test('skill book renders all client sections without losing item, clan or unknown skills',()=>{
 const groups=['physical','magic','reinforce','weaken','clan','item','toggle','transform','otherActive','equipment','ability','race','occupation','clanPassive','itemPassive','otherPassive'];
 const book=groups.map((group,index)=>({id:index+1,name:group,level:1,group,kind:index<9?'magic':'passive'}));
 for(const [tab,expected] of [['active',groups.slice(0,9)],['passive',groups.slice(9)]]){
  const html=skillBookHtml({book},tab);
  for(const group of expected)assert.ok(html.includes(`data-skill-group="${group}"`),group);
  assert.equal((html.match(/data-skill-id=/g)||[]).length,expected.length);
 }
});

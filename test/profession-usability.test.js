import test from 'node:test';
import assert from 'node:assert/strict';
import {getPassivesState,syncAutomaticPassives} from '../functions/game/player/passiveSkills.js';
import {getClassQuestView,startClassQuest,activeClassQuestSummary} from '../functions/game/classes/classQuests.js';
import {createMiniAppFeatures,createMiniAppState} from '../miniapp/state.js';
const player = level => ({game:{stats:{lvl:level},gameClass:{stats:{name:'humanMystic'}},inventory:{sp:0,gold:0,moonDew:0}}});
test('Expertise is granted at the level boundary without SP and remains idempotent',()=>{
  const hero=player(19);syncAutomaticPassives(hero);
  assert.equal(hero.game.l2Passives?.[239]||0,0);
  hero.game.stats.lvl=20;
  const expertise=getPassivesState(hero).passives.find(p=>p.id==='239');
  assert.equal(expertise.level,1);assert.equal(expertise.automatic,true);
  assert.equal(expertise.current,'D');assert.equal(expertise.canLearn,false);
  hero.game.stats.lvl=40;syncAutomaticPassives(hero);syncAutomaticPassives(hero);
  assert.equal(hero.game.l2Passives[239],2);assert.equal(hero.game.inventory.sp,0);
});
test('human wizard has its own branches and quest acquisition navigation',()=>{
  const hero=player(20),wizard=getClassQuestView(hero).promotions.find(p=>p.to==='humanWizard');
  assert.match(wizard.description,/Некроманта/);assert.doesNotMatch(wizard.description,/молний и льда/);
  assert.equal(wizard.steps.find(p=>p.item).navigation.feature,'boss');
  assert.match(wizard.steps.find(p=>p.item).source,/рейдовых/);
  assert.equal(activeClassQuestSummary(hero),null);
  startClassQuest(hero,'humanWizard');
  assert.equal(activeClassQuestSummary(hero).navigation.feature,'boss');
  assert.equal(createMiniAppState(hero,{chatId:1,userId:2}).activeQuest.to,'humanWizard');
});
test('admin feature requires the server owner flag to be exactly true',()=>{
  for (const isAdmin of [false,undefined,'true',1]) assert.equal(createMiniAppFeatures({chatId:1,userId:2,isAdmin}).some(f=>f.id==='admin'),false);
  assert.equal(createMiniAppFeatures({chatId:1,userId:2,isAdmin:true}).some(f=>f.id==='admin'),true);
});

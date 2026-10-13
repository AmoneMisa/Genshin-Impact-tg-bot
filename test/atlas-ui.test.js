import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasHtml,movementHtml} from '../webapp/atlas-ui.js';
const state={player:{city:'gludin',mode:'city',hp:100},gold:60000,scrolls:1,cities:[{id:'gludin',name:'Глудин'},{id:'giran',name:'Гиран'}],locations:[],quickTravel:{cities:[{id:'giran',gold:60000}],locations:[]}};
test('atlas separates map tools from movement and uses shared heading and folder tabs',()=>{
 const html=atlasHtml();assert.match(html,/game-dialog-panel map-dialog/);assert.match(html,/game-dialog-heading/);assert.match(html,/ui-folder-tabs/);assert.match(html,/data-game-rules/);
 assert.doesNotMatch(html,/data-shops|data-fight|data-escape|data-leave|atlas-hint|Reality of Lineage/);
 assert.equal((html.match(/data-movement>/g)||[]).length,1);
});
test('teleport requires a selected destination, uses the server price and checks funds and restrictions',()=>{
 assert.match(movementHtml(state),/data-quick-confirm disabled/);
 const options={selected:{kind:'city',id:'giran'}};
 assert.doesNotMatch(movementHtml(state,options),/data-quick-confirm disabled/);
 assert.match(movementHtml({...state,gold:59999},options),/data-quick-confirm disabled/);
 assert.match(movementHtml(state,{...options,blocked:'В бою'}),/data-quick-confirm disabled/);
 assert.match(movementHtml({...state,player:{...state.player,hp:0}},options),/data-quick-confirm disabled/);
 assert.match(movementHtml(state,{selected:{kind:'city',id:'unknown'}}),/data-quick-confirm disabled/);
});
test('scroll tab preserves return and contextual exit without offering exit in town',()=>{
 assert.doesNotMatch(movementHtml(state,{tab:'scroll'}),/data-leave/);
 assert.match(movementHtml({...state,player:{...state.player,mode:'hall'}},{tab:'scroll'}),/Выйти из холла/);
 assert.match(movementHtml({...state,scrolls:0},{tab:'scroll'}),/data-escape disabled/);
 assert.match(movementHtml({...state,player:{...state.player,mode:'road'}},{tab:'scroll'}),/data-leave disabled/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { TATTOO_RULES, tattooStats, tattooPreview, applyTattoo, removeTattoo, buyDye } from '../webapp/design/tattoo-model.js';

const state = () => ({base:{STR:22,DEX:21,CON:27,INT:41,WIT:20,MEN:39},symbols:[],stock:{'int-men':30,'wit-men':30,'con-str':30},gold:3000000,aa:2000000});
test('tattoos consume materials and currency; removal restores stats and half the dyes',()=>{
  const value=state();assert.equal(applyTattoo(value,'wit-men').ok,true);
  assert.equal(value.stock['wit-men'],20);assert.equal(value.gold,3000000-TATTOO_RULES.applyFee);
  assert.equal(tattooStats(value.base,value.symbols).WIT,24);assert.equal(tattooStats(value.base,value.symbols).MEN,35);
  assert.equal(removeTattoo(value,0).ok,true);assert.equal(value.stock['wit-men'],25);
  assert.deepEqual(tattooStats(value.base,value.symbols),value.base);
  assert.equal(value.gold,3000000-TATTOO_RULES.applyFee-TATTOO_RULES.removeFee);
});
test('bonus cap clips gains independently while full penalties still apply',()=>{
  const value=state();applyTattoo(value,'wit-men');applyTattoo(value,'wit-men');
  const totals=tattooStats(value.base,value.symbols);assert.equal(totals.WIT,25);assert.equal(totals.MEN,31);
  assert.equal(tattooPreview(value,'wit-men').allowed,false);
});
test('blocked actions do not mutate state: slots, inventory, gold and minimum stat',()=>{
  for(const patch of [{symbols:['int-men','wit-men','con-str']},{stock:{'wit-men':9}},{gold:0},{base:{STR:22,DEX:21,CON:27,INT:41,WIT:20,MEN:4}}]){
    const value={...state(),...patch},before=structuredClone(value);
    assert.equal(applyTattoo(value,'wit-men').ok,false);assert.deepEqual(value,before);
  }
  const value=state();assert.equal(applyTattoo(value,'invalid').ok,false);
  assert.equal(removeTattoo(value,0).ok,false);applyTattoo(value,'wit-men');value.gold=0;
  const before=structuredClone(value);assert.equal(removeTattoo(value,0).ok,false);assert.deepEqual(value,before);
});
test('dyes are bought for Ancient Adena at the real High Five price; fees are adena',()=>{
  assert.equal(TATTOO_RULES.dyePriceAa,174000);assert.equal(TATTOO_RULES.applyFee,628000);assert.equal(TATTOO_RULES.removeFee,125600);
  const value=state();assert.equal(buyDye(value,'wit-men',10).ok,true);
  assert.equal(value.stock['wit-men'],40);assert.equal(value.aa,2000000-1740000);
  const before=structuredClone(value);assert.equal(buyDye(value,'wit-men',2).ok,false);assert.equal(buyDye(value,'bad',1).ok,false);assert.equal(buyDye(value,'wit-men',0).ok,false);
  assert.deepEqual(value,before);
});

import test from 'node:test';import assert from 'node:assert/strict';import {NAV_TABS,featuresForTab} from '../webapp/nav.js';
test('settings contain only settings and promo codes; all other features remain accessible',()=>{
 const ids=['language','selfMute','chatSettings','promo','mail','help','updates','feedback','admin','shop','exchange','luckShop','auction','brandNew'];const features=ids.map(id=>({id}));
 assert.deepEqual(featuresForTab(features,'more').map(f=>f.id),['language','selfMute','chatSettings','promo']);
 for(const id of ids)assert.equal(NAV_TABS.filter(tab=>featuresForTab(features,tab.id).some(f=>f.id===id)).length,1,id);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {getLuckShopState,buyLuckItem} from '../miniapp/luck.js';
import {getCatalog} from '../functions/game/equipment/catalog.js';
import {DAY_MS} from '../functions/game/equipment/timedItems.js';
import {itemArtKey,itemArtSources} from '../webapp/art/items-art.js';
import {isEnchantable} from '../functions/game/equipment/enchantItem.js';

const now=Date.UTC(2026,9,12);
const player=()=>({game:{stats:{lvl:90},gameClass:{stats:{name:'mage'}},inventory:{luckCoins:1000,equipment:{items:[]}}}});
test('only epic jewelry is sold, Freya variants have different prices, every jewel has source art and details',()=>{
  const offers=getLuckShopState(player(),now).items.filter(i=>i.group==='epic');
  assert.ok(offers.length>=10);
  for(const offer of offers){
    assert.equal(offer.artItem.mainType,'jewelry');
    assert.ok(offer.description.length>0);
    assert.ok(offer.stats.length>0);
    assert.equal(offer.enchant,8);
    assert.equal(offer.shadow,true);
    const key=offer.artItem.lineage.icon.toLowerCase().replaceAll('.','-');
    assert.equal(itemArtKey('amulet',offer.artItem),key);
    assert.match(itemArtSources(key).src,/^\/art\/l2\/.*\.webp$/);
  }
  assert.ok(offers.find(i=>i.id==='timed:epic:freyaExtreme').cost>offers.find(i=>i.id==='timed:epic:freya').cost);
});
test('a direct purchase cannot bypass the ban on weapons and cloaks',()=>{
  const s=player();
  const blocked=getCatalog().filter(i=>i.epic&&i.mainType!=='jewelry');
  assert.ok(blocked.length>0);
  for(const item of blocked)assert.equal(buyLuckItem(s,'timed:'+item.id,now).reason,'unknown_item');
  assert.equal(s.game.inventory.luckCoins,1000);
  assert.equal(s.game.inventory.equipment.items.length,0);
});
test('a purchased epic is bound, shadow, +8 for seven days and repeat purchase extends the same copy',()=>{
  const s=player(),id='timed:epic:freyaExtreme';
  assert.equal(buyLuckItem(s,id,now).ok,true);
  const item=s.game.inventory.equipment.items[0];
  assert.equal(item.enchant,8);
  assert.equal(item.shadow,true);
  assert.equal(item.bound,true);
  assert.equal(isEnchantable(item),false);
  assert.equal(item.expiresAt,now+7*DAY_MS);
  assert.equal(s.game.inventory.luckCoins,890);
  assert.equal(buyLuckItem(s,id,now+DAY_MS).extended,true);
  assert.equal(item.expiresAt,now+14*DAY_MS);
  assert.equal(s.game.inventory.equipment.items.length,1);
});

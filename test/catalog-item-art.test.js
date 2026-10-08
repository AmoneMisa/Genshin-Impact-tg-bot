import test from 'node:test';
import assert from 'node:assert/strict';
import {getCatalog,instantiate} from '../functions/game/equipment/catalog.js';
import {CATALOG_ITEM_ART} from '../webapp/art/catalog-item-art.js';
import {itemArtKey,ITEM_ART_KEYS} from '../webapp/art/items-art.js';
import {normalizeLootKind} from '../webapp/loot-renderer.js';

test('reviewed named paintings reach inventory instances without a new API field',()=>{
  const catalog=getCatalog();
  for(const art of CATALOG_ITEM_ART){
    const definition=catalog.find(item=>item.id===art.id);
    assert.ok(definition,art.id);
    const item=instantiate(definition,10);
    assert.equal(itemArtKey(normalizeLootKind(item),item),art.key);
    const {name,grade,kind,category}=item;
    assert.equal(itemArtKey(normalizeLootKind(item),{name,grade,kind,category}),art.key);
    assert.ok(ITEM_ART_KEYS.includes(art.key));
  }
});
test('named item art never leaks into other grades, names or armour types',()=>{
  for(const art of CATALOG_ITEM_ART){
    for(const changed of [{...art,name:'unknown item'},{...art,grade:'unknown'},{...art,kind:'unknown'},{...art,category:'unknown'}]){
      assert.notEqual(itemArtKey(normalizeLootKind(changed),changed),art.key);
    }
  }
  assert.equal(new Set(CATALOG_ITEM_ART.map(item=>item.key)).size,CATALOG_ITEM_ART.length);
});
test('every current catalogue item selects allowlisted art while replacement is incomplete',()=>{
  for(const item of getCatalog())assert.ok(ITEM_ART_KEYS.includes(itemArtKey(normalizeLootKind(item),item)),item.id);
});

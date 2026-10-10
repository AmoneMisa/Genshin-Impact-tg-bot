import test from 'node:test';
import assert from 'node:assert/strict';
import {getCatalog,instantiate} from '../functions/game/equipment/catalog.js';
import {CATALOG_ITEM_ART} from '../webapp/art/catalog-item-art.js';
import {itemArtKey,ITEM_ART_KEYS} from '../webapp/art/items-art.js';
import {normalizeLootKind} from '../webapp/loot-renderer.js';
import {L2_ITEM_IDENTITIES,L2_MATERIAL_ART,l2IconUrl} from '../webapp/art/l2-icon-art.js';

test('preserved named paintings reach inventory instances with the common L2 treatment',()=>{
  const catalog=getCatalog();
  for(const art of CATALOG_ITEM_ART){
    const definition=catalog.find(item=>item.id===art.id);
    assert.ok(definition,art.id);
    const item=instantiate(definition,10);
    const expected=art.key;
    assert.ok(expected,item.name);
    assert.equal(itemArtKey(normalizeLootKind(item),item),expected);
    const {name,grade,kind,category}=item;
    assert.equal(itemArtKey(normalizeLootKind(item),{name,grade,kind,category}),expected);
    assert.ok(ITEM_ART_KEYS.includes(art.key));
  }
});
test('named item art never leaks into other grades, names or armour types',()=>{
  for(const art of CATALOG_ITEM_ART){
    const expected=itemArtKey(normalizeLootKind(art),art);
    for(const changed of [{...art,name:'unknown item'},{...art,grade:'unknown'},{...art,kind:'unknown'},{...art,category:'unknown'}]){
      assert.notEqual(itemArtKey(normalizeLootKind(changed),changed),art.key);
      assert.notEqual(itemArtKey(normalizeLootKind(changed),changed),expected);
    }
  }
  assert.equal(new Set(CATALOG_ITEM_ART.map(item=>item.key)).size,CATALOG_ITEM_ART.length);
});
test('all three SA colours have published icons for levels 0 through 17',()=>{
  for(const colour of ['red','green','blue'])for(let stage=0;stage<=17;stage++){
    assert.ok(l2IconUrl(L2_MATERIAL_ART[`soul_${colour}_${stage}`]),`${colour} ${stage}`);
  }
});
test('every current catalogue item selects allowlisted painted or original art',()=>{
  for(const item of getCatalog()){
    const key=itemArtKey(normalizeLootKind(item),item);
    assert.ok(l2IconUrl(key)||ITEM_ART_KEYS.includes(key),item.id);
  }
});
test('all custom epic weapons retain their own weapon paintings, never client boots',()=>{
  for(const item of getCatalog().filter(item=>item.epicWeapon)){
    assert.equal(itemArtKey(normalizeLootKind(item),item),'epic-weapon-'+item.epicWeapon);
    const identity=[item.name,item.grade,item.kind,item.category].map(v=>String(v||'').trim().toLowerCase()).join('|');
    assert.equal(L2_ITEM_IDENTITIES[identity],undefined);
  }
});

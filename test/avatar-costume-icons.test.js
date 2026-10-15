import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,statSync} from 'node:fs';
import {AVATAR_COSTUME_VARIANTS} from '../webapp/art/avatar-costume-art.js';
import {AVATAR_COSTUME_ICONS,avatarCostumeIconUrl} from '../webapp/art/avatar-costume-icons.js';

test('every published custom costume has one compact shared shop icon',()=>{
  const costumes=new Set(AVATAR_COSTUME_VARIANTS.map(item=>item.costumeId));
  assert.deepEqual(new Set(AVATAR_COSTUME_ICONS.map(item=>item.costumeId)),costumes);
  assert.equal(AVATAR_COSTUME_ICONS.length,costumes.size);
  for(const item of AVATAR_COSTUME_ICONS){
    assert.ok(['brown','violet'].includes(item.background));
    for(const size of [64,128,256]){
      const url=avatarCostumeIconUrl(item.costumeId,size);
      const file=new URL('../webapp'+url,import.meta.url);
      assert.ok(existsSync(file),url);
      assert.ok(statSync(file).size<size*250,url+' compact image budget');
    }
  }
});
test('shop icon lookup rejects unsupported sizes and arbitrary paths',()=>{
  for(const key of ['unknown','../crimson-dawn','<img src=x>',null,undefined])assert.equal(avatarCostumeIconUrl(key),null);
  for(const size of [0,32,512,'64',NaN])assert.equal(avatarCostumeIconUrl('coral-bay-breeze',size),null);
});

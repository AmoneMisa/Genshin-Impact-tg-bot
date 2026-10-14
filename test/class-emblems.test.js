import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLASS_EMBLEMS} from '../webapp/art/l2-class-emblems.js';
import {classEmblemHtml} from '../webapp/class-emblem.js';

test('the header uses the named Human Knight emblem, independent of avatar race and gender',()=>{
 for(const gender of ['male','female']){
  const html=classEmblemHtml({className:'humanKnight',classTitle:'Рыцарь-человек',gender,race:'human'});
  assert.match(html,/src="\/art\/l2-classes\/knight.webp"/);
  assert.doesNotMatch(html,/avatars|portraits|art\/classes|heroes/);
 }
});
test('every mapped emblem exists and unavailable classes stay explicit instead of using portraits',()=>{
 for(const key of Object.values(CLASS_EMBLEMS))assert.ok(fs.existsSync('webapp/art/l2-classes/'+key+'.webp'));
 const html=classEmblemHtml({className:'maleSoldier',classTitle:'Солдат-камаэль'});
 assert.match(html,/ui-icon-missing/);assert.doesNotMatch(html,/<img/);
});

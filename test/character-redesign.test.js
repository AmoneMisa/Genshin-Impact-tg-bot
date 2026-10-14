import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import hennas from '../template/hennaData.js';
import symbols from '../template/hennaSymbols.js';
import {renderCharacterTab} from '../webapp/character.js';

test('all High Five dyes have a separate client symbol identity and original symbol pixels',()=>{
 for(const h of hennas){const s=symbols[h.dye];assert.ok(s);assert.match(s.icon,/^icon-etc_(str|dex|con|int|wit|men)_symbol_i0[01]$/);assert.ok(fs.existsSync('webapp/art/henna/'+s.icon+'.webp'));}
 assert.equal(symbols[4445].symbol,1);assert.equal(symbols[4445].icon,'icon-etc_str_symbol_i00');
});
test('equipment presents armor left, jewelry right, weapons below and symbol icons without dye art or permanent labels',()=>{
 const data={player:{level:40,classTitle:'Воин'},equipment:{items:[]},tattoos:[{dye:4445,symbol:symbols[4445],stats:{STR:1,CON:-3}}]};
 const html=renderCharacterTab(data,'equipment');
 const left=html.split('character-slots left')[1].split('character-slots right')[0];
 assert.deepEqual([...left.matchAll(/data-character-slot="([^"]+)"/g)].map(m=>m[1]),['head','up','down','hands','legs','cloak','shirt','belt']);
 assert.match(html,/art\/henna\/icon-etc_str_symbol_i00.webp/);assert.doesNotMatch(html,/hena_i|STR \+1|Слот свободен/);
 assert.equal((html.match(/class="ui-button ui-icon-button" data-character-action/g)||[]).length,4);
});
test('permanent clan bonuses belong to passives and effects have no permanent-bonus navigation panel',()=>{
 const data={skills:{book:[]},clanPassives:[{id:370,name:'Clan Body',stat:'HP',bonus:'+3%'}],equipment:{items:[]},buffs:{buffs:[]}};
 assert.match(renderCharacterTab(data,'skills',{skillTab:'passive'}),/Клан/);
 assert.doesNotMatch(renderCharacterTab(data,'effects'),/Постоянные бонусы|Clan Body/);
});

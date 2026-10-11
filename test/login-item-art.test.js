import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loginItemArt} from '../webapp/art/login-item-art.js';
import {materialIcon} from '../webapp/material-icons.js';
import {renderLootArt} from '../webapp/loot-renderer.js';

test('all coupon kinds have distinct raster identities and published images',()=>{
    const kinds=['shots','fame','fishing','buff','shadow_weapon','shadow_armor','shadow_jewelry','box','resurrection','rune_drop','rune_exp','rune_craft'];
    const identities=new Set();
    for(const kind of kinds){
        const key=`login_${kind}_S`,html=loginItemArt(key);
        assert.equal(materialIcon(key),html);
        assert.ok(!/<svg|\p{Extended_Pictographic}/u.test(html));
        const sources=[...html.matchAll(/src="([^"]+)"/g)].map(m=>m[1]);
        assert.ok(sources.length>0);
        for(const src of sources)assert.ok(fs.existsSync(`webapp${src}`),src);
        identities.add(sources.join('|'));
    }
    assert.equal(identities.size,kinds.length);
    assert.equal(loginItemArt('login_<script>_S'),'');
});
test('shadow weapons and epic jewelry expose the shared pink frame without framing normal copies',()=>{
    for(const item of [{kind:'sword',shadow:true},{kind:'ring',epic:true,shadow:true}]){
        assert.match(renderLootArt(item),/loot-art-2d is-shadow-item/);
        assert.doesNotMatch(renderLootArt({...item,shadow:false}),/is-shadow-item/);
    }
    assert.match(materialIcon('login_shadow_weapon_C'),/is-shadow-item/);
});

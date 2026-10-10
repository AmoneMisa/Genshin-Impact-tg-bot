import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import skills from '../template/classSkillsTemplate.js';
import fishing from '../template/fishingData.js';
import {LS_SKILLS} from '../functions/game/equipment/lifestoneSkills.js';
import {PASSIVES} from '../functions/game/player/passiveSkills.js';
import {CLAN_SKILLS} from '../functions/game/clans/clanPerks.js';
import {L2_SKILL_ART,L2_FISHING_ART,l2SkillIcon,l2ExtraUrl} from '../webapp/art/l2-extra-art.js';
import {materialIcon} from '../webapp/material-icons.js';
import {hotbar,statusIcons} from '../webapp/boss-hud.js';
import {playerEffectsDto} from '../miniapp/bossEffects.js';
test('all current class, passive, clan and augmentation skills resolve to published WebP originals',()=>{
 const keys=[...Object.values(skills).flat().map(s=>s.name),...LS_SKILLS.map(s=>s.id),...PASSIVES.map(s=>s.id),...CLAN_SKILLS.map(s=>s.name)];
 for(const key of keys){assert.ok(L2_SKILL_ART[key],key);assert.match(l2SkillIcon(key),/\.webp/);}
 for(const key of new Set([...Object.values(L2_SKILL_ART),...Object.values(L2_FISHING_ART)]))for(const size of [32,64,128]){
  const bytes=fs.readFileSync('webapp'+l2ExtraUrl(key,size));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
 assert.equal(l2ExtraUrl('../../private'),null);
});
test('buffs use their canonical High Five icons even when their status kind is shared',()=>{
 const ids={might:1068,shield:1040,haste:1086,focus:1077,guidance:1240,'death-whisper':1242,'wind-walk':1204};
 for(const [key,id] of Object.entries(ids))assert.equal(L2_SKILL_ART[key],'icon-skill'+String(id).padStart(4,'0'));
 const effects=playerEffectsDto([{name:'addDamageToBoss',potionId:'might'},{name:'addDamageToBoss',potionId:'guidance'}]);
 assert.match(statusIcons(effects),/skill1068/);assert.match(statusIcons(effects),/skill1240/);
 for(const skill of LS_SKILLS)assert.equal(L2_SKILL_ART[skill.id],{active:'icon-skill3123',passive:'icon-skill3238',chance:'icon-skill3080'}[skill.kind]);
 assert.match(hotbar([{name:'Грозовая стужа',index:1,isDamage:true,canUse:true}]),/skill1340/);
});
test('every fish, rod, shot, recipe, proof and fish product has its item icon',()=>{
 const ids=new Set([...Object.keys(fishing.items),...fishing.rods.map(r=>r.item),...Object.values(fishing.shots),fishing.proofItem,...fishing.recipes.map(r=>r[0]),...Object.values(fishing.capsules).flat().map(r=>r[0])]);
 for(const id of ids){assert.ok(L2_FISHING_ART['l2_'+id],String(id));assert.match(materialIcon('l2_'+id),/\/art\/l2-extra\//);}
 const rods=fishing.rods.map(r=>L2_FISHING_ART['l2_'+r.item]);assert.equal(new Set(rods).size,6);
});

// Import a local snapshot of L2J Mobius CT2.6 High Five; numerical combat scaling stays project-specific.
import fs from 'node:fs';
import path from 'node:path';
import equipment from '../../template/equipmentTemplate.js';
const root=path.resolve(process.argv[2]||'.tmp/l2-high-five');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const attrs=text=>Object.fromEntries([...text.matchAll(/([\w]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const crystalXml=fs.readFileSync('scripts/l2j/data/LevelUpCrystalData.xml','utf8');
const crystalIds={};
for(const [i,m] of [...crystalXml.matchAll(/<item itemId="(\d+)" level="(\d+)" leveledItemId="(\d+)"/g)].entries())if(+m[2]<=17)crystalIds[m[1]]={color:i<18?'red':i<36?'green':'blue',stage:+m[2]};
const absorption={};
for(const m of crystalXml.matchAll(/<item npcId="(\d+)">(?:\s*<!-- (.*?) -->)?([\s\S]*?)<\/item>/g))absorption[m[1]]={name:m[2]||m[1],rules:[...m[3].matchAll(/<detail ([^>]+)\/>/g)].map(d=>{const a=attrs(d[1]);return {chance:+a.chance,manual:a.skill==='true',maxStage:a.maxLevel===undefined?null:+a.maxLevel,stages:(a.levelList||'').split(',').filter(s=>s.trim()).map(Number),scope:a.absorbType||'LAST_HIT'};})};
const weapons=new Map();
for(const file of walk(path.join(root,'items')).filter(f=>f.endsWith('.xml')&&!f.includes(`${path.sep}custom${path.sep}`)))for(const m of fs.readFileSync(file,'utf8').matchAll(/<item id="(\d+)" type="Weapon" name="([^"]+)">([\s\S]*?)<\/item>/g))weapons.set(m[1],{id:m[1],name:m[2].replaceAll('&apos;',"'"),description:m[3].match(/<!-- ([\s\S]*?) -->/)?.[1]||'',skills:[...m[3].matchAll(/<skill id="(\d+)" level="(\d+)"/g)].map(s=>({id:+s[1],level:+s[2]}))});
const aliases={"Heaven's Divider":'Heavens Divider','Demon Dagger':"Demon's Dagger",Sarnga:'Sarunga', 'Vesper Sheutjeh':'Vesper Shooter'};
const names=new Set(Object.values(equipment.lineage.weapons).flat().map(w=>w.name));
for(const alias of Object.values(aliases))names.add(alias);
const normalized=s=>s.replaceAll("'",'');
const saWeapons={};
for(const file of walk(path.join(root,'multisell')).filter(f=>f.endsWith('.xml')))for(const m of fs.readFileSync(file,'utf8').matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g)){
  const ingredients=[...m[1].matchAll(/<ingredient ([^>]+)\/>/g)].map(i=>attrs(i[1]));
  const crystal=ingredients.map(i=>crystalIds[i.id]).find(Boolean),base=ingredients.map(i=>weapons.get(i.id)).find(w=>w&&(names.has(w.name)||crystal?.stage===17));
  if(!crystal||!base)continue;
  const products=[...m[1].matchAll(/<production ([^>]+)\/>/g)].map(i=>attrs(i[1]));
  for(const product of products){const result=weapons.get(product.id);if(!result||!normalized(result.name).startsWith(normalized(base.name)+' - '))continue;
    const label=result.name.split(' - ').slice(1).join(' - '),id=label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    saWeapons[base.name]??=[];
    if(!saWeapons[base.name].some(o=>o.id===id))saWeapons[base.name].push({id,label,...crystal,itemId:+result.id,skills:result.skills,description:result.description.replace(/<Soul Crystal Enhancement>\.?\s*/,'').trim()});
  }
}
const skillMap=new Map();
if(fs.existsSync(path.join(root,'skills')))for(const file of walk(path.join(root,'skills')).filter(f=>f.endsWith('.xml')))for(const s of fs.readFileSync(file,'utf8').matchAll(/<skill id="(\d+)"[^>]*>([\s\S]*?)<\/skill>/g))skillMap.set(+s[1],s[2]);
for(const options of Object.values(saWeapons))for(const o of options){
  o.effects=[];o.procs=[];
  for(const skill of o.skills){
    const body=skillMap.get(skill.id)||'',tables=Object.fromEntries([...body.matchAll(/<table name="([^"]+)">([^<]+)<\/table>/g)].map(t=>[t[1],t[2].trim().split(/\s+/)]));
    const value=v=>Number(v?.startsWith('#')?tables[v]?.[skill.level-1]:v);
    const tag=name=>value(body.match(new RegExp('<'+name+'>([^<]+)</'+name+'>'))?.[1]?.trim());
    const passive=body.includes('<operateType>P</operateType>');
    if(passive)for(const e of body.matchAll(/<(add|mul|sub) stat="([^"]+)">([\s\S]*?)<\/(?:add|mul|sub)>/g)){
      const numeric=e[3].match(/<value>([^<]+)<\/value>/)?.[1]||e[3].trim(),n=value(numeric);
      if(Number.isFinite(n))o.effects.push({op:e[1],stat:e[3].includes('behind=')?'backCritRate':e[2],value:n});
    }
    if(!passive&&body)o.procs.push({id:skill.id,chance:Number.isFinite(tag('activateRate'))?tag('activateRate'):100,seconds:tag('abnormalTime')||10,power:tag('power')||0,effects:[...body.matchAll(/<effect name="([^"]+)"/g)].map(e=>e[1]),drain:value(body.match(/<effect name="HpDrain">\s*<power>([^<]+)</)?.[1]||'0'),stats:[...body.matchAll(/<(add|mul|sub) stat="([^"]+)">([^<]+)<\/(?:add|mul|sub)>/g)].map(e=>({op:e[1],stat:e[2],value:value(e[3].trim())})).filter(e=>Number.isFinite(e.value))});
    const vamp=body.match(/<effect name="VampiricAttack">[\s\S]*?<power>([^<]+)</)?.[1];
    if(vamp)o.effects.push({op:'add',stat:'vampiric',value:value(vamp)});
    o.hpBelow=Math.min(o.hpBelow||100,+body.match(/<player hp="(\d+)"/)?.[1]||100);
  }
}
for(const [original,alias] of Object.entries(aliases))if(saWeapons[alias])saWeapons[original]=saWeapons[alias];
for(const options of Object.values(saWeapons))for(const o of options)if(o.id==='quick-recovery'&&!o.effects.length)o.effects.push({op:'mul',stat:'mReuse',value:1-(+o.description.match(/(\d+)%/)?.[1]||0)/100});
fs.writeFileSync('template/soulCrystalSource.js',`// Generated from L2J Mobius CT2.6 HighFive (snapshot 2026-10-10). Rebuild with scripts/l2j/import-sa-catacombs.mjs.\nexport const ABSORPTION=${JSON.stringify(absorption,null,2)};\nexport const SA_WEAPONS=${JSON.stringify(saWeapons,null,2)};\n`);
// Spawn membership and real NPC data, with the same conversion used by extract.mjs.
const levels=new Map([...fs.readFileSync(path.join(root,'experience.xml'),'utf8').matchAll(/<experience level="(\d+)" tolevel="(\d+)"/g)].map(m=>[+m[1],+m[2]]));
const npcMap=new Map();
for(const file of fs.readdirSync(root).filter(f=>/^\d+-\d+\.xml$/.test(f)))for(const m of fs.readFileSync(path.join(root,file),'utf8').matchAll(/<npc id="(\d+)" level="(\d+)" type="Monster"(?: name="([^"]*)")?[^>]*>([\s\S]*?)<\/npc>/g)){
  const b=m[4],num=(re,f=0)=>Number(b.match(re)?.[1]??f),level=+m[2],goldItem=b.match(/<item id="57" min="(\d+)" max="(\d+)" chance="([\d.]+)"/);
  const drops=[...b.matchAll(/<group chance="([\d.]+)">([\s\S]*?)<\/group>/g)].flatMap(g=>[...g[2].matchAll(/<item id="(636[012])" min="(\d+)" max="(\d+)" chance="([\d.]+)"/g)].map(d=>({key:{6360:'seal_blue',6361:'seal_green',6362:'seal_red'}[d[1]],min:+d[2],max:+d[3],chance:+g[1]*+d[4]/100})));
  npcMap.set(m[1],{id:m[1],name:m[3],level,expShare:Math.max(.0000001,Math.round(num(/<acquire exp="([\d.]+)"/)/(levels.get(level+1)-levels.get(level))*1e7)/1e7),hp:num(/hp="([\d.]+)"/),pAtk:num(/physical="([\d.]+)" magical/),mAtk:num(/magical="([\d.]+)" random/),pDef:num(/<defence physical="([\d.]+)"/),accuracy:num(/accuracy="([\d.]+)"/),crit:num(/critical="([\d.]+)"/),attackSpeed:num(/attackSpeed="([\d.]+)"/,253),element:'dark',dropElement:'dark',gold:goldItem?{chance:70,min:+goldItem[1],max:+goldItem[2]}:null,drops});
}
const zoneNames=[['CatacombOfTheHeretic','catacomb-heretic','Катакомбы Еретиков',30,40],['CatacombOfTheBranded','catacomb-branded','Катакомбы Отлучённых',40,51],['CatacombOfTheApostate','catacomb-apostate','Катакомбы Отступников',50,60],['CatacombOfTheWitch','catacomb-witch','Катакомбы Ведьм',60,70],['CatacombOfDarkOmens','catacomb-dark-omens','Катакомбы Тёмных Знамений',70,80],['CatacombOfTheForbiddenPath','catacomb-forbidden-path','Катакомбы Запретного Пути',70,80]];
const catacombs=zoneNames.map(([file,id,title,entryMin,entryMax])=>{const text=fs.readFileSync(path.join(root,file+'.xml'),'utf8'),counts=new Map();for(const m of text.matchAll(/<npc id="(\d+)"/g))counts.set(m[1],(counts.get(m[1])||0)+1);const mobs=[...counts].map(([npcId,count])=>({mob:npcMap.get(npcId),count})).filter(i=>i.mob?.hp>0&&i.mob.name).sort((a,b)=>b.count-a.count).slice(0,8).map(i=>i.mob).sort((a,b)=>a.level-b.level);if(mobs.length<3)throw Error('Missing NPCs: '+id);return {id,title,kind:'catacomb',entryMin,entryMax,min:mobs[0].level,max:mobs.at(-1).level,level:mobs[mobs.length>>1].level,mobs};});
fs.writeFileSync('template/catacombsTemplate.js',`// Generated from L2J Mobius CT2.6 HighFive spawn/NPC data. Combat scaling is the project's HUNT scale.\nexport default ${JSON.stringify(catacombs,null,2)};\n`);
console.log(JSON.stringify({saWeapons:Object.keys(saWeapons).length,missing:[...names].filter(n=>!saWeapons[n]),skillFiles:[...new Set(Object.values(saWeapons).flat().flatMap(o=>o.skills.map(s=>`${String(Math.floor(s.id/100)*100).padStart(5,'0')}-${String(Math.floor(s.id/100)*100+99).padStart(5,'0')}.xml`)))],catacombs:catacombs.map(z=>({id:z.id,mobs:z.mobs.length,seals:z.mobs.filter(m=>m.drops.length).length}))},null,2));

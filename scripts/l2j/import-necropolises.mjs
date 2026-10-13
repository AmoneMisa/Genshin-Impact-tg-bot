// H5 source snapshot: Mobius 9fb01cb20513e55190cdde8d91e41be2c0914f84.
// Uses original NPC stats/spawns and the project's existing shared teleport tariff.
import fs from 'node:fs';
import path from 'node:path';
import cats from '../../template/catacombsTemplate.js';
import {CITIES,REGIONS,LOCATIONS,CITY_NPCS} from '../../template/worldMap.js';
const root=path.resolve('.tmp/world-source/spawns'),npcRoot=path.resolve('.tmp/hf-npcs');
const attr=s=>Object.fromEntries([...s.matchAll(/([\w]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const npcs=new Map();
for(const file of fs.readdirSync(npcRoot))if(file.endsWith('.xml'))for(const m of fs.readFileSync(path.join(npcRoot,file),'utf8').matchAll(/<npc\s([^>]+)>([\s\S]*?)<\/npc>/g))npcs.set(attr(m[1]).id,{...attr(m[1]),body:m[2]});
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const points=new Map();
for(const file of walk(root))for(const m of fs.readFileSync(file,'utf8').matchAll(/<npc\s([^>]+)\/?\s*>/g)){const a=attr(m[1]);if(a.x&&a.y)points.set(a.id,{x:+a.x,y:+a.y});}
const defs=[
 ['NecropolisOfSacrifice','sacrifice','Некрополь Жертвоприношений',31095],
 ['NecropolisOfThePilgrims','pilgrims','Некрополь Пилигримов',31096],
 ['NecropolisOfWorship','worship','Некрополь Поклонения',31097],
 ['NecropolisOfThePatriots','patriots','Некрополь Патриотов',31098],
 ['NecropolisOfDevotion','devotion','Некрополь Посвящения',31099],
 ['NecropolisOfMartyrdom','martyrdom','Некрополь Мучеников',31100],
 ['NecropolisOfTheSaints','saints','Некрополь Святых',31101],
 ['NecropolisOfTheDisciples','disciples','Некрополь Учеников',31102],
];
const curves=fs.readFileSync('.tmp/l2-high-five/experience.xml','utf8');
const xp=new Map([...curves.matchAll(/<experience level="(\d+)" tolevel="(\d+)"/g)].map(m=>[+m[1],+m[2]]));
function mob(id){const n=npcs.get(id),b=n?.body;if(!b)return null;const tag=name=>attr(b.match(new RegExp('<'+name+'\\s([^>]+)'))?.[1]||'');const v=tag('vitals'),a=tag('attack'),d=tag('defence'),ac=tag('acquire'),level=+n.level;
 const drops=[...b.matchAll(/<group chance="([\d.]+)">([\s\S]*?)<\/group>/g)].flatMap(g=>[...g[2].matchAll(/<item id="(636[012])" min="(\d+)" max="(\d+)" chance="([\d.]+)"/g)].map(i=>({key:{6360:'seal_blue',6361:'seal_green',6362:'seal_red'}[i[1]],min:+i[2],max:+i[3],chance:+g[1]*+i[4]/100})));
 return +v.hp>0?{id,name:n.name,level,hp:+v.hp,pAtk:+a.physical,mAtk:+a.magical,pDef:+d.physical,accuracy:+a.accuracy,crit:+a.critical,attackSpeed:+a.attackSpeed||253,expShare:+ac.exp/(xp.get(level+1)-xp.get(level)),element:'dark',dropElement:'dark',gold:null,drops}:null;
}
const added=defs.map(([file,key,title,gk])=>{const xml=fs.readFileSync(path.join(root,'Catacombs',file+'.xml'),'utf8'),ids=new Map();for(const m of xml.matchAll(/<npc id="(\d+)"/g))ids.set(m[1],(ids.get(m[1])||0)+1);const mobs=[...ids].sort((a,b)=>b[1]-a[1]).map(([id])=>mob(id)).filter(Boolean).slice(0,8).sort((a,b)=>a.level-b.level);if(mobs.length<3||!points.has(String(gk)))throw Error('Missing source '+file);return {id:'necropolis-'+key,title,kind:'catacomb',dungeonType:'necropolis',min:mobs[0].level,max:mobs.at(-1).level,level:mobs[mobs.length>>1].level,mobs,entrance:points.get(String(gk)),sourceFile:file+'.xml'};});
fs.writeFileSync('template/necropolisesTemplate.js','// Original H5 NPC/spawn data; encounter scaling follows the existing hunting engine.\nexport default '+JSON.stringify(added,null,2)+';\n');
const locations=LOCATIONS.filter(l=>!l.id.startsWith('necropolis-'));
for(const z of added){const {x,y}=z.entrance,region=[...CITIES].sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0].id;locations.push({id:z.id,name:z.title,x,y,region,polygon:[[x-500,y-500],[x+500,y-500],[x+500,y+500],[x-500,y+500]],levelMin:z.min,levelMax:z.max,teleportGold:20000,floors:1,dungeonType:'necropolis',mob:{id:z.mobs[0].id,name:z.mobs[0].name,level:z.mobs[0].level}});}
for(const [i,z] of cats.entries()){const l=locations.find(l=>l.id===z.id),p=points.get(String(31120+i));if(l&&p){Object.assign(l,p,{dungeonType:'catacomb',polygon:[[p.x-500,p.y-500],[p.x+500,p.y-500],[p.x+500,p.y+500],[p.x-500,p.y+500]]});l.region=[...CITIES].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0].id;}}
fs.writeFileSync('template/worldMap.js','// Original H5 entrance coordinates; selection polygons and teleport tariffs are project policy.\n'+Object.entries({CITIES,REGIONS,LOCATIONS:locations,CITY_NPCS}).map(([k,v])=>'export const '+k+'='+JSON.stringify(v)+';').join('\n')+'\n');
console.log('Imported 8 necropolises; linked 14 Seven Signs entrances.');

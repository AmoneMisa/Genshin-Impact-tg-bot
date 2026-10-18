// Register an encoded, reviewed location without changing its dungeon network.
import fs from 'node:fs';
const rows=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const {id,title,environment,names}=rows[0];
if(rows.length!==3||new Set(rows.map(r=>r.section)).size!==3)throw new Error('Three reviewed sections required');
for(const file of ['webapp/scene-catalog.js','template/huntExploration.js']){
 let source=fs.readFileSync(file,'utf8');
 if(source.includes('"id":'+JSON.stringify(id)))throw new Error('Already registered: '+id);
 const entry=file.includes('scene-catalog')?{id,title,category:'hunting',environment,asset:id}:{id,names};
 source=source.replace('\n]);','\n  '+JSON.stringify(entry)+',\n]);');
 fs.writeFileSync(file,source);
}
const exploration='test/hunt-exploration.test.js';
let source=fs.readFileSync(exploration,'utf8').replace(/thirty-six painted zones/, 'painted zones');
source=source.replace(/assert.equal\(HUNT_EXPLORATION.length,(\d+)\)/,(_,n)=>`assert.equal(HUNT_EXPLORATION.length,${Number(n)+1})`);
fs.writeFileSync(exploration,source);
const scenes='test/scene-expansion.test.js';
source=fs.readFileSync(scenes,'utf8').replace(/covers thirty-two hunting studies/, 'covers individual hunting studies');
source=source.replace(/map\(s=>s.id\)\)\.size,(\d+)\)/,(_,n)=>`map(s=>s.id)).size,${Number(n)+1})`)
 .replace(/\{hunting:(\d+),/,(_,n)=>`{hunting:${Number(n)+1},`);
fs.writeFileSync(scenes,source);
console.log('Registered',id);

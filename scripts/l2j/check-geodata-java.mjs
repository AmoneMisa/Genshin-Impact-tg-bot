import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {L2jRegion} from '../../functions/game/world/l2jGeodata.js';
import source from '../../data/l2j-geodata/source.js';
const out=path.resolve('.tmp/geodata/java-oracle');fs.mkdirSync(out,{recursive:true});
const reference='art-source/geodata/engine';
execFileSync(process.env.JAVAC||'javac',['-d',out,...['Cell.java','IBlock.java','FlatBlock.java','ComplexBlock.java','MultilayerBlock.java'].map(n=>reference+'/'+n),'scripts/l2j/GeoProbe.java'],{stdio:'pipe',timeout:60000});
let total=0;
for(const [id,entry] of Object.entries(source.regions)){
 const file=path.resolve('data/l2j-geodata/'+entry.file),region=new L2jRegion(gunzipSync(fs.readFileSync(file))),[rx,ry]=id.split('_').map(Number);
 const counts=[0,0,0],points=[];
 for(let block=0;block<65536;block++){
  const type=region.bytes[region.offsets[block]];if(counts[type]>=8)continue;counts[type]++;
  const lx=Math.floor(block/256)*8+(block%7),ly=block%256*8+(block%5),x=(rx-20)*32768+lx*16+8,y=(ry-18)*32768+ly*16+8;
  for(const z of [-10000,-4000,-1000,0,4000])points.push({x,y,z,lx,ly});
 }
 const sample=path.join(out,id+'.csv');fs.writeFileSync(sample,points.map(p=>[p.x,p.y,p.z].join(',')).join('\n'));
 const output=execFileSync(process.env.JAVA||'java',['-Xmx256m','-cp',out,'GeoProbe',file,sample],{encoding:'utf8',timeout:30000}).trim().split(/\r?\n/);
 assert.equal(output.length,points.length,id);
 points.forEach((p,i)=>{const actual=region.cell(p.lx,p.ly,p.z);assert.equal(output[i],actual.z+','+actual.nswe,id+': '+JSON.stringify(p));});
 total+=points.length;console.log(`PASS original Java ${id}: ${points.length} samples, block kinds ${counts.join('/')}`);
}
console.log(`PASS ${total} raw native height/NSWE samples against unmodified High Five Java blocks`);

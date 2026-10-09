import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {paintedArtJobs} from '../scripts/blender/art.js';

test('hunt delivery has 39 unique assets with two mobile sizes where required',()=>{
 const jobs=JSON.parse(fs.readFileSync('art-source/hunt-ui/jobs.json','utf8'));
 assert.equal(jobs.length,39);assert.equal(new Set(jobs.map(j=>j.key)).size,39);
 assert.equal(jobs.filter(j=>j.priority===1).length,11);
 for(const job of jobs){
  assert.match(job.prompt,/No text/);
  if(job.group==='icon'||job.group==='mob')assert.deepEqual(job.outputs.map(p=>Number(p.match(/-(\d+)\.webp$/)[1])),[128,256]);
  if(job.group==='icon'){assert.equal(job.transparent,true);assert.match(job.prompt,/Neutral desaturated gold/);}
 }
 const reviewed=JSON.parse(fs.readFileSync('art-source/hunt-ui/reviewed.json','utf8').replace(/^\uFEFF/,''));
 assert.equal(paintedArtJobs().length,jobs.filter(j=>reviewed.includes(j.key)).reduce((n,j)=>n+j.outputs.length,0));
});

test('painted conversion selects reviewed assets only and blocks outside paths',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'painted-art-test-'));
 const folder=path.join(root,'art-source/hunt-ui');fs.mkdirSync(folder,{recursive:true});
 const plan=[{key:'a',group:'icon',source:'art-source/a.png',outputs:['webapp/art/icons/a-128.webp','webapp/art/icons/a-256.webp']},{key:'unreviewed',source:'missing.png',outputs:[]}];
 const save=()=>fs.writeFileSync(path.join(folder,'jobs.json'),JSON.stringify(plan));
 try{
  save();fs.writeFileSync(path.join(folder,'reviewed.json'),'["a"]');fs.writeFileSync(path.join(root,'art-source/a.png'),'fixture');
  assert.deepEqual(paintedArtJobs(root).map(j=>j.size),[128,256]);
  plan[0].outputs=['../outside.webp'];save();assert.throws(()=>paintedArtJobs(root),/Invalid painted destination/);
  plan[0].source='../outside.png';save();assert.throws(()=>paintedArtJobs(root),/Invalid painted source/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

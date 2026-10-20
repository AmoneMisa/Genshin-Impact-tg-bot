import test from 'node:test';
import assert from 'node:assert/strict';
import {drawAtlasTiles} from '../webapp/atlas-map-art.js';

function fixture(width=320){
 const scale=width/65536,center={x:117129,y:76917},height=800;
 return {width,height,project:p=>({x:(p.x-center.x)*scale+width/2,y:(p.y-center.y)*scale+height/2}),unproject:p=>({x:(p.x-width/2)/scale+center.x,y:(p.y-height/2)/scale+center.y})};
}
for(const width of [320,390,1100])test(`atlas ${width}px: visible tile loading settles within the image cache`,()=>{
 const options=fixture(width),limit=width<700?12:24,cache=new Map(),pending=[],drawn=[];let requests=0;
 const ctx={drawImage(image,...bounds){assert.ok(bounds.every(Number.isFinite));drawn.push(image);}};
 const pic=url=>{
  if(cache.has(url)){const image=cache.get(url);cache.delete(url);cache.set(url,image);return image;}
  if(cache.size>=limit)cache.delete(cache.keys().next().value);
  const image={complete:false,naturalWidth:0};cache.set(url,image);pending.push(image);requests++;return image;
 };
 drawAtlasTiles(ctx,{...options,pic});
 for(let frame=0;pending.length&&frame<100;frame++){
  Object.assign(pending.shift(),{complete:true,naturalWidth:256});
  drawAtlasTiles(ctx,{...options,pic});
 }
 assert.equal(pending.length,0,'image.onload redraws must stop requesting evicted visible tiles');
 assert.ok(requests>0&&requests<=limit,'bounded decoding and memory');assert.ok(drawn.length);
 const settled=requests;drawAtlasTiles(ctx,{...options,pic});assert.equal(requests,settled);
 assert.ok([...cache.keys()].every(url=>url.endsWith(width<700?'-mobile.webp':'.webp')));
});

test('atlas ignores invalid or empty viewports and bounds source enumeration at extreme zoom',()=>{
 const ctx={drawImage(){throw new Error('not loaded');}},options=fixture();let requests=0;
 for(const unproject of [()=>({x:Infinity,y:0}),()=>({x:NaN,y:0})])drawAtlasTiles(ctx,{...options,unproject,pic(){requests++;}});
 drawAtlasTiles(ctx,{...options,width:0,pic(){requests++;}});assert.equal(requests,0);
 drawAtlasTiles(ctx,{...options,unproject:p=>({x:p.x?Number.MAX_VALUE:-Number.MAX_VALUE,y:p.y?Number.MAX_VALUE:-Number.MAX_VALUE}),pic(){requests++;return null;}});
 assert.ok(requests<=12,'no iteration across an unbounded world-coordinate rectangle');
});

import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/package.json'),sharp=require('sharp');

export async function extractHeroMedallion(source,destination) {
const W=165,H=140;
const {data,info}=await sharp(source).extract({left:0,top:0,width:W,height:H}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const mask=Buffer.alloc(W*H);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const i=(y*W+x)*4,d=Math.hypot(x-44,y-44);
 const allowed=d<62||(y<42&&x>=44&&y<=48-(x-90)*.55)||(x<45&&y>74&&x<51-(y-80)*.65);
 const gold=data[i]>38&&data[i]-data[i+1]>3&&data[i+1]-data[i+2]>7&&data[i]-data[i+2]>20;
 if(data[i+3]&&(d<=43.5||allowed&&gold))mask[y*W+x]=255;
}
// Close tiny texture holes without using color thresholds as the final alpha.
let alpha=await sharp(mask,{raw:{width:W,height:H,channels:1}}).dilate(1).erode(1).greyscale().raw().toBuffer();
if(alpha.length!==W*H)throw Error('Mask must be one channel');
// Retain only the object attached to the medallion; remove every detached fragment.
const seen=new Uint8Array(W*H),queue=[44*W+44];seen[queue[0]]=1;
for(let p=0;p<queue.length;p++){const v=queue[p],x=v%W,y=Math.floor(v/W);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,n=yy*W+xx;if(xx>=0&&yy>=0&&xx<W&&yy<H&&!seen[n]&&alpha[n]){seen[n]=1;queue.push(n);}}}
for(let i=0;i<alpha.length;i++)if(!seen[i])alpha[i]=0;
// Fill enclosed holes: dark patina is part of the opaque gold, never transparent.
const exterior=new Uint8Array(W*H),flood=[];
for(let x=0;x<W;x++)for(const y of [0,H-1]){const i=y*W+x;if(!alpha[i]&&!exterior[i]){exterior[i]=1;flood.push(i);}}
for(let y=0;y<H;y++)for(const x of [0,W-1]){const i=y*W+x;if(!alpha[i]&&!exterior[i]){exterior[i]=1;flood.push(i);}}
for(let p=0;p<flood.length;p++){const v=flood[p],x=v%W,y=Math.floor(v/W);for(const [dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){const xx=x+dx,yy=y+dy,n=yy*W+xx;if(xx>=0&&yy>=0&&xx<W&&yy<H&&!exterior[n]&&!alpha[n]){exterior[n]=1;flood.push(n);}}}
for(let i=0;i<alpha.length;i++)if(!alpha[i]&&!exterior[i])alpha[i]=255;
// Remove source-background pixels introduced only at the outside edge by closing.
const pruned=Buffer.from(alpha);
for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){const i=y*W+x;if(alpha[i]&&!mask[i]&&[i-1,i+1,i-W,i+W].some(n=>!alpha[n]))pruned[i]=0;}
for(let i=0;i<alpha.length;i++)data[i*4+3]=Math.min(data[i*4+3],pruned[i]);
await sharp(data,{raw:info}).png().toFile(destination);

}

import {isoPoint,isoMatrix,isoSceneBounds} from './hunt-isometric.js';
import {paintedRoomScene,roomArtField} from './room-scene-art.js';
import {combatTheme,colorHex} from './combat-environment.js';
import {paintLocationDetails} from './room-details.js';
import {paintedProp,paintedStoneFloor,roomPropHeight} from './room-props-art.js';
import {roomObstacleProps,obstacleStoneOutline} from './room-obstacles.js';

const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;};
const path=(ctx,points)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();};
const tone=(color,delta)=>colorHex((Math.max(0,Math.min(255,(color>>16)+delta))<<16)|(Math.max(0,Math.min(255,((color>>8)&255)+delta))<<8)|Math.max(0,Math.min(255,(color&255)+delta)));
const noise=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
let grain=null;
function stoneGrain(){
 if(grain)return grain;grain=canvas(64,64);const c=grain.getContext('2d');
 for(let i=0;i<900;i++){c.fillStyle=i%3?'rgba(218,210,188,.18)':'rgba(0,0,0,.3)';c.fillRect(noise(i,1)*64,noise(i,3)*64,1+noise(i,6)*2,1+noise(i,9)*2);}
 return grain;
}

/** Static Canvas2D paintings, uploaded once. Coordinates are the same collision footprints.
 * Padding retains offscreen scenery when the HTML world is panned or zoomed.
 */
export function paintRoom(field,viewport){
 field=roomArtField(field);
 const theme=combatTheme(field.environment),m=isoMatrix(viewport);
 const padX=Math.ceil(Math.max(0,m.a-viewport.width/2)+80),padY=Math.ceil(Math.max(0,m.b+120-viewport.height/2)+64);
 const bounds={x:-padX,y:-padY,width:Math.ceil(viewport.width+padX*2),height:Math.ceil(viewport.height+padY*2)};
 const floor=canvas(bounds.width,bounds.height),ctx=floor.getContext('2d');ctx.translate(padX,padY);
 const p=(x,y)=>isoPoint({x,y},viewport),quad=(x,y,w,h)=>[p(x,y),p(x+w,y),p(x+w,y+h),p(x,y+h)];
 const room=quad(0,0,1,1),center=p(.5,.5);
 const seed=[...(field.sceneKey||field.environment||'')+':'+(field.room||'')].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))|0,0);
 const sceneArt=paintedRoomScene(field.environment,{compact:viewport.width<480,sceneKey:field.sceneKey});
 if(sceneArt){
  const artBounds=isoSceneBounds(viewport);
  ctx.drawImage(sceneArt,artBounds.x,artBounds.y,artBounds.width,artBounds.height);
  const props=roomObstacleProps(field.walls).map(w=>paintProp(w,viewport,theme,w.index,field.environment));
  return {floor,bounds,props};
 }
 // A soft contact shadow replaces the bright edge of a floating board.
 for(let i=16;i>0;i-=2){ctx.fillStyle='rgba(0,0,0,.018)';path(ctx,room.map(v=>({x:center.x+(v.x-center.x)*(1+i/160),y:center.y+(v.y-center.y)*(1+i/160)+8})));ctx.fill();}
 path(ctx,room);ctx.save();ctx.clip();
 const wash=ctx.createLinearGradient(center.x-m.a,0,center.x+m.a,m.b*2);wash.addColorStop(0,tone(theme.floor,-17));wash.addColorStop(.6,tone(theme.floor,4));wash.addColorStop(1,tone(theme.floor,-12));ctx.fillStyle=wash;ctx.fillRect(-padX,-padY,bounds.width,bounds.height);
 if(theme.indoor){
  const stone=field.environment!=='ship'&&paintedStoneFloor();
  if(stone){
   ctx.save();ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);for(let x=0;x<2;x++)for(let y=0;y<2;y++)ctx.drawImage(stone,x/2,y/2,.5,.5);ctx.restore();
   ctx.fillStyle=colorHex(theme.floor);ctx.globalAlpha=.48;ctx.fillRect(-padX,-padY,bounds.width,bounds.height);ctx.globalAlpha=1;
  }
  // Staggered slabs, inset edges, small chips and irregular mineral lines.
  if(!stone)for(let y=0;y<18;y++)for(let x=-1;x<11;x++){
   const ox=x/10+(y%2?.05:0),oy=y/18,tile=quad(ox+.002,oy+.003,.096,.05),v=noise(x,y);
   const shade=ctx.createLinearGradient(tile[0].x,tile[0].y,tile[2].x,tile[2].y);
   shade.addColorStop(0,tone(theme.floor,Math.round(v*15)-4));shade.addColorStop(1,tone(theme.floor,Math.round(v*15)-12));
   path(ctx,tile);ctx.fillStyle=shade;ctx.fill();ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=1;ctx.stroke();
   ctx.beginPath();ctx.moveTo(tile[3].x,tile[3].y-.5);ctx.lineTo(tile[0].x,tile[0].y-.5);ctx.lineTo(tile[1].x,tile[1].y-.5);ctx.strokeStyle='rgba(210,208,186,.12)';ctx.lineWidth=.7;ctx.stroke();
   if(v>.6){const a=p(ox+.025,oy+.012),b=p(ox+.07,oy+.042);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo((a.x+b.x)/2+3,(a.y+b.y)/2-2);ctx.lineTo(b.x,b.y);ctx.strokeStyle='rgba(8,10,12,.24)';ctx.stroke();}
  }
  // An off-centre, damaged ritual inlay rather than a mirrored arena emblem.
  const seal=p(.34+noise(seed,2)*.12,.38+noise(seed,3)*.13),rx=m.a*.22,ry=m.b*.22;
  ctx.strokeStyle=tone(theme.trim,-26);ctx.lineWidth=1.3;ctx.globalAlpha=.55;
  for(const scale of [1,.84]){ctx.beginPath();ctx.ellipse(seal.x,seal.y,rx*scale,ry*scale,0,.32,4.95);ctx.stroke();}
  for(let i=0;i<7;i++){const angle=i*.69+.45;ctx.beginPath();ctx.moveTo(seal.x+Math.cos(angle)*rx*.7,seal.y+Math.sin(angle)*ry*.7);ctx.lineTo(seal.x+Math.cos(angle+.08)*rx*.92,seal.y+Math.sin(angle+.08)*ry*.92);ctx.stroke();}ctx.globalAlpha=1;
 }else{
  // Sparse deterministic brushwork keeps open terrain organic rather than tiled.
  for(let i=0;i<1100;i++){const x=noise(i,1),y=noise(i,8),a=p(x,y);ctx.fillStyle=tone(theme.floor,Math.round(noise(i,4)*36)-18);ctx.globalAlpha=.22;ctx.beginPath();ctx.ellipse(a.x,a.y,2+noise(i,9)*9,1+noise(i,5)*3,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  const track=[p(.5,1),p(.43,.76),p(.55,.5),p(.48,.25),p(.5,0)];ctx.beginPath();ctx.moveTo(track[0].x,track[0].y);for(let i=1;i<track.length;i++)ctx.lineTo(track[i].x,track[i].y);ctx.lineWidth=38;ctx.lineCap='round';ctx.strokeStyle=tone(theme.trim,-38);ctx.globalAlpha=.15;ctx.stroke();ctx.globalAlpha=1;
  if(['springs','marsh'].includes(field.environment)){const a=p(.77,.3),water=ctx.createRadialGradient(a.x,a.y,4,a.x,a.y,95);water.addColorStop(0,tone(theme.accent,-30));water.addColorStop(1,tone(theme.floor,-8));ctx.fillStyle=water;ctx.beginPath();ctx.ellipse(a.x,a.y,100,43,-.15,0,Math.PI*2);ctx.fill();ctx.strokeStyle=tone(theme.accent,-10);ctx.globalAlpha=.4;ctx.lineWidth=1;for(const r of [.6,.8]){ctx.beginPath();ctx.ellipse(a.x-9,a.y,100*r,43*r,-.15,.4,2.7);ctx.stroke();}ctx.globalAlpha=1;}
 }
 paintLocationDetails(ctx,field.environment,p,quad,theme,seed);
 // Baked pools of torchlight are static, including in reduced motion / Canvas mode.
 for(const w of field.walls||[])if(w.kind==='pillar'){
  const a=p(w.x+w.w/2,w.y+w.h/2),glow=ctx.createRadialGradient(a.x,a.y,2,a.x,a.y,90);glow.addColorStop(0,field.environment==='necropolis'?'rgba(114,185,171,.16)':'rgba(220,156,64,.2)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(a.x-90,a.y-90,180,180);
 }
 const vignette=ctx.createRadialGradient(center.x,center.y,70,center.x,center.y,m.a);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(2,4,9,.48)');ctx.fillStyle=vignette;ctx.fillRect(-padX,-padY,bounds.width,bounds.height);ctx.restore();
 const props=roomObstacleProps(field.walls).map(w=>paintProp(w,viewport,theme,w.index,field.environment));
 return {floor,bounds,props};
}

function paintProp(w,viewport,theme,index,environment){
 const p=(x,y)=>isoPoint({x,y},viewport),base=[p(w.x,w.y),p(w.x+w.w,w.y),p(w.x+w.w,w.y+w.h),p(w.x,w.y+w.h)];
 const height=(w.kind==='pillar'?125:w.kind==='tree'?150:w.kind==='sarcophagus'?45:55)*(w.heightScale||1);
 const minX=Math.min(...base.map(p=>p.x))-72,minY=Math.min(...base.map(p=>p.y))-height-24,maxX=Math.max(...base.map(p=>p.x))+72,maxY=Math.max(...base.map(p=>p.y))+24;
 const image=canvas(maxX-minX,maxY-minY),ctx=image.getContext('2d');ctx.translate(-minX,-minY);
 const depth=10+(w.x+w.y+w.w+w.h)*10;
 const art=paintedProp(w.kind,environment);
 if(art){
  const foot=p(w.x+w.w/2,w.y+w.h/2),artHeight=roomPropHeight(w.kind,index)*(w.heightScale||1),scale=artHeight/art.height;
  const artWidth=art.width*scale;
  // Atlas cells share a root anchor. Shadows are painted beneath the same server footprint.
  ctx.save();ctx.translate(foot.x,foot.y);ctx.scale(1,.45);const contact=ctx.createRadialGradient(0,0,1,0,0,35);contact.addColorStop(0,'rgba(0,0,0,.5)');contact.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=contact;ctx.fillRect(-35,-35,70,70);ctx.restore();
  ctx.save();
  // Match the scene's material and light; bake once, with no per-frame filters.
  ctx.filter=({volcanic:'saturate(.45) brightness(.58) sepia(.25)',cavern:'saturate(.45) brightness(.65)',marsh:'saturate(.6) brightness(.65)',necropolis:'saturate(.5) brightness(.72)',catacomb:'sepia(.18) brightness(.85)',desert:'saturate(.6) sepia(.5)',woodland:'brightness(.85)'})[environment]||'none';
  ctx.translate(foot.x,foot.y);ctx.scale(w.kind==='rock'||w.kind==='tree'?(index%2?-1:1):1,1);
  ctx.drawImage(art.image,art.x,art.y,art.width,art.height,-art.anchorX*scale,-art.anchorY*scale,artWidth,artHeight);ctx.restore();
  return {canvas:image,x:minX,y:minY,depth,occlusion:{left:Math.min(...base.map(p=>p.x))-3,right:Math.max(...base.map(p=>p.x))+3,top:foot.y-height,bottom:Math.max(...base.map(p=>p.y))}};
 }
 function face(points,start,end){path(ctx,points);const g=ctx.createLinearGradient(points[0].x,points[0].y,points[2].x+12,points[2].y);g.addColorStop(0,start);g.addColorStop(1,end);ctx.fillStyle=g;ctx.fill();ctx.save();ctx.clip();
  const stone=paintedStoneFloor();
  if(stone&&w.kind==='wall'&&points.length===4){const a=points[3],b=points[2],c=points[0];ctx.save();ctx.transform(b.x-a.x,b.y-a.y,c.x-a.x,c.y-a.y,a.x,a.y);ctx.globalAlpha=.28;ctx.drawImage(stone,0,0,1,1);ctx.restore();}
  ctx.fillStyle=ctx.createPattern(stoneGrain(),'repeat');ctx.globalAlpha=.45;ctx.fillRect(minX,minY,maxX-minX,maxY-minY);ctx.restore();ctx.strokeStyle='rgba(6,8,12,.35)';ctx.lineWidth=.6;ctx.stroke();}
 function slab(x,y,width,length,z,h){
  const b=[p(x,y),p(x+width,y),p(x+width,y+length),p(x,y+length)].map(a=>({x:a.x,y:a.y-z})),t=b.map(a=>({x:a.x,y:a.y-h}));
  face([b[1],b[2],t[2],t[1]],tone(theme.side,-7),tone(theme.side,9));face([b[2],b[3],t[3],t[2]],tone(theme.front,8),tone(theme.front,-9));face(t,tone(theme.top,8),tone(theme.top,-10));
  ctx.beginPath();ctx.moveTo(t[3].x,t[3].y);ctx.lineTo(t[2].x,t[2].y);ctx.lineTo(t[1].x,t[1].y);ctx.strokeStyle=tone(theme.trim,-7);ctx.globalAlpha=.5;ctx.stroke();ctx.globalAlpha=1;
  return {b,t};
 }
 const foot=p(w.x+w.w/2,w.y+w.h/2);ctx.beginPath();ctx.ellipse(foot.x,foot.y+3,Math.max(10,(Math.max(...base.map(a=>a.x))-Math.min(...base.map(a=>a.x)))*.45),8,0,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fill();
 if(w.kind==='pillar'){
  slab(w.x-.006,w.y-.006,w.w+.012,w.h+.012,0,8);slab(w.x,w.y,w.w,w.h,8,8);
  const shaft=slab(w.x+.008,w.y+.008,w.w-.016,w.h-.016,16,72);
  // Recessed vertical grooves and relief bands break up flat cuboid faces.
  for(let i=1;i<4;i++){const a=p(w.x+.008+(w.w-.016)*i/4,w.y+w.h-.008);ctx.beginPath();ctx.moveTo(a.x,a.y-22);ctx.lineTo(a.x,a.y-80);ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=2.5;ctx.stroke();ctx.strokeStyle='rgba(210,206,178,.16)';ctx.lineWidth=.7;ctx.stroke();}
  slab(w.x+.004,w.y+.004,w.w-.008,w.h-.008,86,7);slab(w.x-.006,w.y-.006,w.w+.012,w.h+.012,93,7);slab(w.x-.009,w.y-.009,w.w+.018,w.h+.018,100,5);
  const a=shaft.b[2],flame={x:a.x,y:a.y-42},glow=ctx.createRadialGradient(flame.x,flame.y,1,flame.x,flame.y,24);glow.addColorStop(0,tone(theme.accent,20)+'65');glow.addColorStop(1,tone(theme.accent,0)+'00');ctx.fillStyle=glow;ctx.fillRect(flame.x-24,flame.y-24,48,48);
  ctx.fillStyle='#171b1d';ctx.fillRect(flame.x-3,flame.y+3,6,13);ctx.beginPath();ctx.moveTo(flame.x-6,flame.y+4);ctx.lineTo(flame.x+6,flame.y+4);ctx.lineTo(flame.x+3,flame.y+9);ctx.lineTo(flame.x-3,flame.y+9);ctx.closePath();ctx.fill();
  ctx.fillStyle=colorHex(theme.accent);ctx.beginPath();ctx.moveTo(flame.x,flame.y-13);ctx.quadraticCurveTo(flame.x+10,flame.y+5,flame.x,flame.y+5);ctx.quadraticCurveTo(flame.x-8,flame.y+1,flame.x,flame.y-13);ctx.fill();
 }else if(w.kind==='tree'){
  const a=p(w.x+w.w/2,w.y+w.h/2);ctx.strokeStyle='#302d23';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(a.x-4,a.y-34,a.x+2,a.y-72);ctx.stroke();
  for(let i=0;i<26;i++){const x=a.x+(noise(i,index)*2-1)*31,y=a.y-51-noise(i,index+3)*43,r=9+noise(i,index+8)*9;const leaf=ctx.createRadialGradient(x-3,y-4,1,x,y,r);leaf.addColorStop(0,tone(theme.top,-6+noise(i,4)*12));leaf.addColorStop(1,tone(theme.side,-5));ctx.fillStyle=leaf;const points=Array.from({length:9},(_,j)=>{const angle=j*Math.PI*2/9,scale=.75+noise(i,j)*.35;return {x:x+Math.cos(angle)*r*scale,y:y+Math.sin(angle)*r*scale};});path(ctx,points);ctx.fill();
   ctx.strokeStyle=tone(theme.trim,-12);ctx.globalAlpha=.18;ctx.lineWidth=.8;for(let k=0;k<8;k++){const dx=(noise(i,k+13)*2-1)*r*.7,dy=(noise(i,k+22)*2-1)*r*.6;ctx.beginPath();ctx.moveTo(x+dx,y+dy);ctx.lineTo(x+dx+3,y+dy-2);ctx.stroke();}ctx.globalAlpha=1;
  }
 }else if(w.kind==='rock'){
  const width=Math.max(28,Math.max(...base.map(a=>a.x))-Math.min(...base.map(a=>a.x))),outline=obstacleStoneOutline(foot,width,height,index);
  const fill=ctx.createLinearGradient(foot.x-width*.3,foot.y-height,foot.x+width*.3,foot.y);fill.addColorStop(0,tone(theme.top,-5));fill.addColorStop(1,tone(theme.side,3));path(ctx,outline);ctx.fillStyle=fill;ctx.fill();
  ctx.beginPath();ctx.moveTo(outline[6].x,outline[6].y);ctx.quadraticCurveTo(foot.x-7,foot.y-height*.6,outline[9].x,outline[9].y);ctx.strokeStyle=tone(theme.trim,-25);ctx.globalAlpha=.25;ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1;
 }else{
  const box=slab(w.x,w.y,w.w,w.h,0,height);
  if(w.kind==='sarcophagus'){
   slab(w.x-.003,w.y-.003,w.w+.006,w.h+.006,height-3,5);const a=p(w.x+w.w/2,w.y+w.h/2);ctx.strokeStyle=tone(theme.trim,-6);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x-8,a.y-height);ctx.lineTo(a.x+8,a.y-height);ctx.moveTo(a.x,a.y-height-6);ctx.lineTo(a.x,a.y-height+6);ctx.stroke();
  }
 }
 return {canvas:image,x:minX,y:minY,depth,occlusion:{left:Math.min(...base.map(p=>p.x))-3,right:Math.max(...base.map(p=>p.x))+3,top:Math.min(...base.map(p=>p.y))-height,bottom:Math.max(...base.map(p=>p.y))}};
}

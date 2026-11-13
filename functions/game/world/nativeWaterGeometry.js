import source from '../../../template/nativeWorld.js';
import {pointInPolygon} from './navigation.js';

const SIZE=4096,index=new Map();
const zones=source.water.map((zone,order)=>{
 const xs=zone.polygon.map(p=>p[0]),ys=zone.polygon.map(p=>p[1]);
 const record={...zone,order,minZ:Math.min(zone.minZ,zone.maxZ),maxZ:Math.max(zone.minZ,zone.maxZ),left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};
 for(let x=Math.floor(record.left/SIZE);x<=Math.floor(record.right/SIZE);x++)for(let y=Math.floor(record.top/SIZE);y<=Math.floor(record.bottom/SIZE);y++){
  const key=x+':'+y,list=index.get(key)||[];list.push(record);index.set(key,list);
 }
 return record;
});
export const nativeWaterContains=(zone,p)=>p.x>=zone.left&&p.x<=zone.right&&p.y>=zone.top&&p.y<=zone.bottom&&p.z>=zone.minZ&&p.z<=zone.maxZ&&(zone.shape==='Cuboid'||pointInPolygon(p,zone.polygon));
/** Return every overlapping source volume; their order is not a fabricated surface. */
export function nativeWaterZones(point){
 if(![point?.x,point?.y,point?.z].every(Number.isFinite))return [];
 return (index.get(Math.floor(point.x/SIZE)+':'+Math.floor(point.y/SIZE))||[]).filter(z=>nativeWaterContains(z,point));
}
export const nativeInWater=point=>nativeWaterZones(point).length>0;
/** One source coordinate unit above an inclusive high-Z face is outside water.
 * This is a derived navigation target, never a new source spawn or volume. */
export const nativeWaterSurface=point=>Boolean(point&&!nativeInWater(point)&&nativeWaterZones({...point,z:point.z-1}).length);
export const nativeWaterPoint=(from,to,t)=>({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,z:from.z+(to.z-from.z)*t});
/** Exact volume-edge intersections, for entry/exit timing even between sparse polls.
 * Union overlapping water intervals: adjacent source volumes never refill breath. */
export function nativeWaterSpans(from,to){
 if(![from?.x,from?.y,from?.z,to?.x,to?.y,to?.z].every(Number.isFinite))return null;
 const candidates=zones.filter(z=>Math.max(from.x,to.x)>=z.left&&Math.min(from.x,to.x)<=z.right&&Math.max(from.y,to.y)>=z.top&&Math.min(from.y,to.y)<=z.bottom&&Math.max(from.z,to.z)>=z.minZ&&Math.min(from.z,to.z)<=z.maxZ);
 const cuts=new Set([0,1]),dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
 const add=t=>{if(t>0&&t<1&&Number.isFinite(t))cuts.add(t);};
 for(const zone of candidates){
  if(dz){add((zone.minZ-from.z)/dz);add((zone.maxZ-from.z)/dz);}
  if(zone.shape==='Cuboid'){
   if(dx){add((zone.left-from.x)/dx);add((zone.right-from.x)/dx);}
   if(dy){add((zone.top-from.y)/dy);add((zone.bottom-from.y)/dy);}
  }else for(let i=0,j=zone.polygon.length-1;i<zone.polygon.length;j=i++){
   const a=zone.polygon[j],b=zone.polygon[i],ex=b[0]-a[0],ey=b[1]-a[1],cross=dx*ey-dy*ex;if(!cross)continue;
   const ax=a[0]-from.x,ay=a[1]-from.y,u=(ax*dy-ay*dx)/cross;if(u>=0&&u<=1)add((ax*ey-ay*ex)/cross);
  }
 }
 const sorted=[...cuts].sort((a,b)=>a-b),spans=[];
 for(let i=1;i<sorted.length;i++){
  const start=sorted[i-1],end=sorted[i],point=nativeWaterPoint(from,to,(start+end)/2),water=candidates.some(z=>nativeWaterContains(z,point)),previous=spans.at(-1);
  if(previous?.water===water)previous.end=end;else spans.push({start,end,water});
 }
 return spans;
}

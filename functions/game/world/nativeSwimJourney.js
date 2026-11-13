import rules from '../../../template/nativeWaterRules.js';
import source from '../../../data/l2j-geodata/source.js';
import {worldGeodata,geoCell} from './l2jGeodata.js';
import {nativeGroundBlock} from './nativeGround.js';
import {nativeInWater,nativeWaterPoint,nativeWaterSurface,nativeWaterZones} from './nativeWaterGeometry.js';

export const nativeSwimDistance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
const finite=p=>[p?.x,p?.y,p?.z].every(Number.isFinite);
/** A real free interval between stored surfaces. Swimming never snaps to the
 * closest roof, adds a fake ground layer, or erases a wall/holding/door. */
export function nativeFluidCell(point,{geo=worldGeodata,allowed=p=>!nativeGroundBlock(p,{swimming:true})}={}){
 if(!finite(point)||!allowed(point))return null;
 const layers=geo.layers(geoCell(point.x),geoCell(point.y)).sort((a,b)=>a.z-b.z),floor=layers.filter(l=>l.z<=point.z).at(-1),ceiling=layers.find(l=>l.z>point.z);
 return floor?.nswe?{...floor,ceiling:ceiling?.z??Infinity,gx:geoCell(point.x),gy:geoCell(point.y),water:nativeInWater(point)}:null;
}
export function nativeSwimSegment(from,to,{geo=worldGeodata,allowed=p=>!nativeGroundBlock(p,{swimming:true})}={}){
 if(!finite(from)||!finite(to)||Math.hypot(to.x-from.x,to.y-from.y)<1||Math.hypot(to.x-from.x,to.y-from.y)>rules.maxClickXY+1e-7)return false;
 const count=Math.ceil(nativeSwimDistance(from,to)/8);if(count>16384)return false;
 let previous=nativeFluidCell(from,{geo,allowed}),wet=false;if(!previous)return false;
 for(let i=0;i<=count;i++){
  const point=nativeWaterPoint(from,to,i/count),cell=nativeFluidCell(point,{geo,allowed});if(!cell)return false;
  wet ||= cell.water||nativeWaterSurface(point);
  // Dry portions are checked against their stored surface. The tolerance is
  // the pinned H5 grounded increase limit, not permission to cross a slab.
  if(!cell.water&&!nativeWaterSurface(point)&&Math.abs(point.z-cell.z)>40)return false;
  const dx=cell.gx-previous.gx,dy=cell.gy-previous.gy,mask=(dx>0?1:dx<0?2:0)|(dy>0?4:dy<0?8:0);
  if(Math.abs(dx)>1||Math.abs(dy)>1||(previous.nswe&mask)!==mask)return false;
  if(!dx&&!dy&&(previous.z!==cell.z||previous.ceiling!==cell.ceiling))return false;
  if(dx&&dy){
   for(const [gx,gy,bit]of [[previous.gx,cell.gy,dx>0?1:2],[cell.gx,previous.gy,dy>0?4:8]]){
    const side=nativeFluidCell({x:gx*16+8,y:gy*16+8,z:point.z},{geo,allowed});if(!side||(side.nswe&bit)!==bit)return false;
   }
  }
  previous=cell;
 }
 return wet;
}
/** Source 700-unit cap uses XY, truncating scaled XYZ deltas as Java does. */
export function nativeSwimDestination(from,to){
 if(!finite(from)||!finite(to))return null;
 const xy=Math.hypot(to.x-from.x,to.y-from.y);if(xy<1)return null;
 if(nativeInWater(from)&&xy>rules.maxClickXY){const ratio=rules.maxClickXY/xy;return {x:from.x+Math.trunc((to.x-from.x)*ratio),y:from.y+Math.trunc((to.y-from.y)*ratio),z:from.z+Math.trunc((to.z-from.z)*ratio)};}
 return {...to};
}
/** Depth is a server-owned mode; map clicks still supply XY only. */
export function nativeSwimAim(from,point,depth='level',{geo=worldGeodata}={}){
 const target={x:point.x,y:point.y,z:from.z},cell=nativeFluidCell(target,{geo});if(!cell)return target;
 if(depth==='bottom')target.z=cell.z;
 if(depth==='surface'){
  const volumes=nativeWaterZones(target).length?nativeWaterZones(target):nativeWaterZones({...target,z:target.z-1});
  if(volumes.length)target.z=Math.min(Math.max(...volumes.map(z=>z.maxZ))+1,cell.ceiling-1);
 }
 return target;
}
export function createNativeSwimJourney(from,target,{now,speed,allowed}={}){
 const to=nativeSwimDestination(from,target);if(!to||![now,speed].every(Number.isFinite)||!(speed>0)||!nativeSwimSegment(from,to,{allowed}))return null;
 const distance=nativeSwimDistance(from,to);
 return {kind:'walk',routeGeometry:'l2j-geodata',location:null,city:null,until:now+Math.ceil(distance/speed*1000),native:{commit:source.commit,swimming:true,swimSpeed:speed,point:{...from},legStart:{...from},path:[to],index:0,moveAt:now,remaining:distance}};
}
export function advanceNativeSwimJourney(trip,now,speed,{allowed,swimSpeed,onSegment}={}){
 const r=trip.native,from=r.point,to=r.path?.[0],startAt=r.moveAt;if(!finite(from)||!finite(to)||r.path.length!==1||![r.remaining,startAt].every(Number.isFinite)||!Number.isInteger(r.index)||r.index<0||r.index>1){r.blocked='path_blocked';return false;}
 const elapsed=Math.max(0,now-startAt);r.moveAt=Math.max(startAt,now);if(r.blocked)return false;if(r.index===1)return true;
 if(!nativeSwimSegment(r.legStart,to,{allowed})){r.blocked='path_blocked';return false;}
 const length=nativeSwimDistance(r.legStart,to),progress=length?nativeSwimDistance(r.legStart,from)/length:1,expected=nativeWaterPoint(r.legStart,to,progress);
 if(progress>1+1e-7||nativeSwimDistance(expected,from)>1e-5){r.blocked='path_blocked';return false;}
 const velocity=speed>0?Math.max(0,nativeInWater(from)?swimSpeed??r.swimSpeed:speed):0,distance=nativeSwimDistance(from,to),travel=Math.min(distance,elapsed/1000*velocity);let point=distance?nativeWaterPoint(from,to,travel/distance):to;
 const arrived=travel>=distance-1e-9,at=velocity>0?Math.min(now,startAt+travel/velocity*1000):now;
 const stoppedAt=onSegment?.(from,point,startAt,at);
 if(Number.isFinite(stoppedAt)&&stoppedAt>=startAt&&stoppedAt<at){point=nativeWaterPoint(from,point,(stoppedAt-startAt)/(at-startAt));r.point={...point};r.remaining=nativeSwimDistance(point,to);r.blocked='dead';return false;}
 r.point={...point};r.remaining=Math.max(0,distance-travel);
 if(arrived){r.index=1;r.point={...to};trip.until=at;}else trip.until=velocity>0?now+Math.ceil(r.remaining/velocity*1000):null;
 return arrived;
}

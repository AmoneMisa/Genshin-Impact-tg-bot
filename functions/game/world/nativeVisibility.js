// Static GeoEngine.canSeeTarget from the pinned H5 core (MIT).
// Missing data is rejected; dynamic doors/fences require a separate veto.
import {geoCell,geoWorld,worldGeodata} from './l2jGeodata.js';

/** GridLineIterator3D: integer half-errors and the original dominant-axis ties. */
export function* nativeSightRay(from,to){
 let {x,y,z}=from;const dx=Math.abs(to.x-x),dy=Math.abs(to.y-y),dz=Math.abs(to.z-z),sx=x<to.x?1:-1,sy=y<to.y?1:-1,sz=z<to.z?1:-1;
 const axis=dx>=dy&&dx>=dz?'x':dy>=dx&&dy>=dz?'y':'z',length=Math.max(dx,dy,dz);let a=Math.trunc(length/2),b=a;
 yield {x,y,z};
 for(let i=0;i<length;i++){
  if(axis==='x'){x+=sx;a+=dy;if(a>=dx){y+=sy;a-=dx;}b+=dz;if(b>=dx){z+=sz;b-=dx;}}
  else if(axis==='y'){y+=sy;a+=dx;if(a>=dy){x+=sx;a-=dy;}b+=dz;if(b>=dy){z+=sz;b-=dy;}}
  else{z+=sz;a+=dx;if(a>=dz){x+=sx;a-=dz;}b+=dy;if(b>=dz){y+=sy;b-=dz;}}
  yield {x,y,z};
 }
}

export function nativeStaticSight(from,to,{geo=worldGeodata,allowed=()=>true,maxCells=512,maxSteps=32768}={}){
 if(![from?.x,from?.y,from?.z,to?.x,to?.y,to?.z].every(Number.isFinite))return false;
 let a={gx:geoCell(Math.trunc(from.x)),gy:geoCell(Math.trunc(from.y))},b={gx:geoCell(Math.trunc(to.x)),gy:geoCell(Math.trunc(to.y))};
 const start=geo.losCell(a.gx,a.gy,Math.trunc(from.z)),end=geo.losCell(b.gx,b.gy,Math.trunc(to.z));if(!start||!end||!allowed(from)||!allowed(to))return false;
 let fromZ=start.z,toZ=end.z;
 if(a.gx===b.gx&&a.gy===b.gy)return fromZ===toZ;
 if(Math.max(Math.abs(a.gx-b.gx),Math.abs(a.gy-b.gy))>maxCells||Math.abs(fromZ-toZ)>maxSteps)return false;
 if(toZ>fromZ){[a,b]=[b,a];[fromZ,toZ]=[toZ,fromZ];}
 const nearest=(x,y,z)=>geo.losCell(x,y,z)?.z;
 function losZ(px,py,pz,x,y,nswe){
  const origin={gx:px,gy:py},check=(nx,ny,mask)=>{const c=geo.losCell(nx,ny,pz,origin);return Boolean(c&&(c.nswe&mask)===mask);};
  const dx=x-px,dy=y-py;
  const open=(!dx||!dy||(check(px,py+dy,dx>0?1:2)&&check(px+dx,py,dy>0?4:8)))&&check(px,py,nswe);
  const cell=geo.losCell(x,y,pz);return cell?(open?cell.z:cell.higherZ):undefined;
 }
 let previous={x:a.gx,y:a.gy,z:fromZ},previousZ=fromZ,index=0,first=true;
 for(const current of nativeSightRay(previous,{x:b.gx,y:b.gy,z:toZ})){
  if(first){first=false;continue;}
  if(current.x===previous.x&&current.y===previous.y)continue;
  const dx=Math.sign(current.x-previous.x),dy=Math.sign(current.y-previous.y),nswe=(dx>0?1:dx<0?2:0)|(dy>0?4:dy<0?8:0);
  const z=losZ(previous.x,previous.y,previousZ,current.x,current.y,nswe),limit=(index<2?fromZ:current.z)+48;
  if(!Number.isFinite(z)||z>limit||!allowed({x:geoWorld(current.x),y:geoWorld(current.y),z:current.z}))return false;
  if(dx&&dy){
   const vertical=losZ(previous.x,previous.y,previousZ,previous.x,previous.y+dy,dy>0?4:8),horizontal=losZ(previous.x,previous.y,previousZ,previous.x+dx,previous.y,dx>0?1:2);
   const vNear=nearest(previous.x,previous.y+dy,current.z),hNear=nearest(previous.x+dx,previous.y,current.z);
   if(![vertical,horizontal,vNear,hNear].every(Number.isFinite)||vertical>limit||horizontal>limit||vertical>vNear||horizontal>hNear)return false;
  }
  previous=current;previousZ=z;index++;
 }
 return true;
}

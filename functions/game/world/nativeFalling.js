import {nativeStep} from './nativeNavigation.js';
import {geoCell,worldGeodata} from './l2jGeodata.js';

/** Explicit descent only. A stored ceiling must not replace the first stored
 * floor below an open ledge. This never adds a virtual height or alters the
 * grounded walker/spawn policy. Every selected landing is an original layer. */
export function nativeFallingStep(geo,from,dx,dy,allowed=()=>true){
 const ordinary=nativeStep(geo,from,dx,dy,allowed);if(ordinary)return ordinary;
 const x=from.gx+dx,y=from.gy+dy,raw=geo.cell(x,y,from.z);
 if(!raw||raw.z-from.z<=40)return null;
 const layers=geo.layers?.(x,y)||[];if(layers.some(c=>Math.abs(c.z-from.z)<=40))return null;
 const below=layers.filter(c=>c.z<from.z).sort((a,b)=>b.z-a.z)[0];if(!below)return null;
 const exact={cell:(gx,gy,z)=>gx===x&&gy===y&&z===from.z?below:geo.cell(gx,gy,z)};
 return nativeStep(exact,from,dx,dy,allowed);
}
export function nativeFallEdge(from,to,{geo=worldGeodata,allowed=()=>true}={}){
 if(![from?.x,from?.y,from?.z,to?.x,to?.y,to?.z].every(Number.isFinite)||to.z>=from.z)return false;
 const gx=geoCell(from.x),gy=geoCell(from.y),tx=geoCell(to.x),ty=geoCell(to.y),source=geo.cell(gx,gy,from.z);
 if(!source||source.z!==from.z||!allowed(from))return false;
 const next=nativeFallingStep(geo,{gx,gy,...source},tx-gx,ty-gy,allowed);
 return Boolean(next&&next.gx===tx&&next.gy===ty&&next.z===to.z);
}

import {geoCell,geoWorld,worldGeodata} from './l2jGeodata.js';

const directions=[[1,0,1],[-1,0,2],[0,1,4],[0,-1,8],[1,1,5],[1,-1,9],[-1,1,6],[-1,-1,10]];
const key=(x,y,z)=>((x+65536)*131072+y+65536)*65536+z+32768;
function push(heap,item){let i=heap.length;heap.push(item);while(i){const p=(i-1)>>1;if(heap[p].score<=item.score)break;heap[i]=heap[p];i=p;}heap[i]=item;}
function pop(heap){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(heap[c].score>=last.score)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;}

/** Static ground traversal only. Reject absent layers instead of inventing a layer-gap height. */
export function nativeStep(geo,from,dx,dy,allowed=()=>true){
 const nswe=(dx>0?1:dx<0?2:0)|(dy>0?4:dy<0?8:0);
 if(!nswe||Math.abs(dx)>1||Math.abs(dy)>1||(from.nswe&nswe)!==nswe)return null;
 const x=from.gx+dx,y=from.gy+dy,cell=geo.cell(x,y,from.z);
 // 40 is GeoEngine.HEIGHT_INCREASE_LIMIT in the pinned High Five core.
 if(!cell||!cell.nswe||cell.z-from.z>40||!allowed({x:geoWorld(x),y:geoWorld(y),z:cell.z}))return null;
 if(dx&&dy){
  const vertical=geo.cell(from.gx,from.gy+dy,from.z),horizontal=geo.cell(from.gx+dx,from.gy,from.z);
  if(!vertical||!horizontal||!(vertical.nswe&(dx>0?1:2))||!(horizontal.nswe&(dy>0?4:8)))return null;
  if(vertical.z-from.z>40||horizontal.z-from.z>40)return null;
  if(!allowed({x:geoWorld(from.gx),y:geoWorld(from.gy+dy),z:vertical.z})||!allowed({x:geoWorld(from.gx+dx),y:geoWorld(from.gy),z:horizontal.z}))return null;
 }
 return {gx:x,gy:y,...cell};
}

/** Every crossed cell is checked; simplification must never turn a path into a wall shortcut. */
export function nativeSegment(from,to,{geo=worldGeodata,allowed=()=>true,maxCells=16384,reversible=false}={}){
 if(![from?.x,from?.y,from?.z,to?.x,to?.y,to?.z].every(Number.isFinite))return null;
 const gx=geoCell(from.x),gy=geoCell(from.y),tx=geoCell(to.x),ty=geoCell(to.y),first=geo.cell(gx,gy,from.z),last=geo.cell(tx,ty,to.z);
 if(!first||!last||!first.nswe||!last.nswe||!allowed({...from,z:first.z})||!allowed({...to,z:last.z}))return null;
 const dx=Math.abs(tx-gx),dy=Math.abs(ty-gy),sx=Math.sign(tx-gx),sy=Math.sign(ty-gy);
 if(Math.max(dx,dy)>maxCells)return null;
 let node={gx,gy,...first},error=dx-dy;const cells=[];
 while(node.gx!==tx||node.gy!==ty){
  const twice=error*2;let mx=0,my=0;
  if(twice>-dy){error-=dy;mx=sx;}
  if(twice<dx){error+=dx;my=sy;}
  node=nativeStep(geo,node,mx,my,allowed);if(!node)return null;
  cells.push({x:geoWorld(node.gx),y:geoWorld(node.gy),z:node.z});
 }
 if(node.z!==last.z)return null;
 // A cell centre is an intermediate point, never a replacement for the requested endpoint.
 cells.push({x:to.x,y:to.y,z:last.z});
 if(reversible&&!nativeSegment({...to,z:last.z},{...from,z:first.z},{geo,allowed,maxCells}))return null;
 return cells;
}

function simplify(from,path,options){
 const result=[];let index=0,previous=from;
 while(index<path.length){
  // A bounded look-ahead keeps import/runtime work predictable on long zig-zag routes.
  let end=Math.min(path.length-1,index+64);
  while(end>index&&!nativeSegment(previous,path[end],options))end--;
  const point=path[end];if(Math.hypot(point.x-previous.x,point.y-previous.y)>1e-9)result.push(point);
  previous=point;index=end+1;
 }
 return result;
}

/** Bounded A* on native (x,y,height) nodes. Separate bridge/cave layers cannot share a search key. */
export function findNativePath(from,to,{geo=worldGeodata,allowed=()=>true,maxNodes=12000,margin=256,stride=8,reversible=false,heuristicWeight=1}={}){
 // Offline route compilation may prefer progress toward the destination over shortest distance.
 // This only orders the bounded queue; every accepted edge still checks all native cells.
 const weight=Number.isFinite(heuristicWeight)?Math.max(1,Math.min(4,heuristicWeight)):1;
 const options={geo,allowed,reversible},start=geo.point(from),target=geo.point(to);
 if(!start||!target)return {ok:false,reason:'geodata_missing'};
 if(!start.nswe||!target.nswe||!allowed(start)||!allowed(target))return {ok:false,reason:'path_blocked'};
 const direct=nativeSegment(start,target,options);
 if(direct){const path=simplify(start,direct,options);return {ok:true,start,path,visited:0};}
 const sx=geoCell(start.x),sy=geoCell(start.y),tx=geoCell(target.x),ty=geoCell(target.y);
 const bounds={left:Math.min(sx,tx)-margin,right:Math.max(sx,tx)+margin,top:Math.min(sy,ty)-margin,bottom:Math.max(sy,ty)+margin};
 if([sx,sy,tx,ty].some(n=>n< -65536||n>=65536))return {ok:false,reason:'geodata_missing'};
 const heuristic=(x,y)=>{const dx=Math.abs(tx-x),dy=Math.abs(ty-y);return weight*(Math.max(dx,dy)+(Math.SQRT2-1)*Math.min(dx,dy));};
 const first={gx:sx,gy:sy,z:start.z,nswe:start.nswe,cost:0,score:heuristic(sx,sy),parent:null};
 const heap=[],nodes=new Map([[key(sx,sy,start.z),first]]);push(heap,first);let visited=0;
 while(heap.length&&visited<maxNodes){
  const current=pop(heap);if(current.closed||nodes.get(key(current.gx,current.gy,current.z))!==current)continue;
  current.closed=true;visited++;
  const close=Math.max(Math.abs(current.gx-tx),Math.abs(current.gy-ty))<=stride;
  if(close&&nativeSegment({x:geoWorld(current.gx),y:geoWorld(current.gy),z:current.z},target,options)){
   const path=[];for(let n=current;n.parent;n=n.parent)path.push({x:geoWorld(n.gx),y:geoWorld(n.gy),z:n.z});
   path.reverse();path.push({x:target.x,y:target.y,z:target.z});
   return {ok:true,start,path:simplify(start,path,options),visited};
  }
  for(const [dx,dy] of directions){
   const x=current.gx+dx*stride,y=current.gy+dy*stride;if(x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom)continue;
   let next;
   if(stride===1){
    next=nativeStep(geo,current,dx,dy,allowed);
    if(next&&reversible){const back=nativeStep(geo,next,-dx,-dy,allowed);if(!back||back.z!==current.z)next=null;}
   }
   else{
    const segment=nativeSegment({x:geoWorld(current.gx),y:geoWorld(current.gy),z:current.z},{x:geoWorld(x),y:geoWorld(y),z:current.z},options);
    if(segment){const cell=geo.cell(x,y,segment.at(-1).z);next={gx:x,gy:y,...cell};}
   }
   if(!next)continue;
   const id=key(x,y,next.z),cost=current.cost+(dx&&dy?Math.SQRT2:1)*stride,old=nodes.get(id);
   if(old&&old.cost<=cost)continue;
   const node={...next,cost,score:cost+heuristic(x,y),parent:current};nodes.set(id,node);push(heap,node);
  }
 }
 return {ok:false,reason:visited>=maxNodes?'geodata_search_limit':'path_blocked',visited};
}

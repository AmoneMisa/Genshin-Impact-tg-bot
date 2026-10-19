// Bounded pathfinding on authored surface collisions, never native L2 geodata.
// At most 9 rooms, each with the same 32x32 resolution as local navigation.
import {insideObstacle} from './navigation.js';
import {planFieldCrossing} from './continuousField.js';
const N=32,WIDTH=N*3;
function clear(a,b,walls){
 return !walls.some(w=>{
  let low=0,high=1;
  for(const [axis,min,max] of [['x',w.x,w.x+w.w],['y',w.y,w.y+w.h]]){
   const d=b[axis]-a[axis];
   if(Math.abs(d)<1e-10){if(a[axis]<min||a[axis]>max)return false;continue;}
   const p=(min-a[axis])/d,q=(max-a[axis])/d;low=Math.max(low,Math.min(p,q));high=Math.min(high,Math.max(p,q));
  }
  return low<=high;
 });
}
export function surfacePathClear(from,path,walls=[]){
 let previous=from;
 for(const point of path){if(!clear(previous,point,walls))return false;previous=point;}
 return !insideObstacle(from,walls);
}
function simplify(start,path,walls){
 const result=[];let from=start,index=0;
 while(index<path.length){let end=path.length-1;while(end>index&&!clear(from,path[end],walls))end--;
  const point=path[end];if(Math.hypot(point.x-from.x,point.y-from.y)>1e-10)result.push(point);from=point;index=end+1;
 }
 return result;
}
// A small binary heap avoids sorting the whole frontier for each of up to 9216 nodes.
function push(heap,item){let i=heap.length;heap.push(item);while(i){const p=(i-1)>>1;if(heap[p].score<=item.score)break;heap[i]=heap[p];i=p;}heap[i]=item;}
function pop(heap){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(heap[c].score>=last.score)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;}

/** One saved leg per cardinal crossing. No client-supplied room, floor or zone is accepted. */
export function surfaceRouteStep(legs){
 const [leg,next]=legs;
 return {path:leg.path,crossing:next?{room:next.room,exit:leg.path.at(-1),entry:next.start,destination:next.path.at(-1),route:legs.slice(1)}:null};
}

/** Only trusted server callers choose the cell-local stopping range. */
export function planSurfaceApproach(field,target,range,layout,current,work=null){
 if(!Number.isFinite(range)||range<=0)return null;
 return planSurfaceRoute(field,target,layout,current,{range,work});
}

export function planSurfaceRoute(field,point,layout,current,{range=null,work=null}={}){
 if(![field.x,field.y,point?.x,point?.y].every(Number.isFinite))return null;
 if(field.x<0||field.x>1||field.y<0||field.y>1)return null;
 const rooms=layout.rooms.filter(r=>Math.abs(r.col-current.col)<=1&&Math.abs(r.row-current.row)<=1);
 const byCell=new Map(rooms.map(r=>[`${r.col-current.col}:${r.row-current.row}`,r]));
 const offset=v=>v>=0&&v<=1?0:Math.floor(v),dx=offset(point.x),dy=offset(point.y);
 const destination=byCell.get(`${dx}:${dy}`);if(!destination)return null;
 const walls=rooms.flatMap(r=>(r.id===current.id?field.walls||[]:r.walls||[]).map(w=>({...w,x:w.x+r.col-current.col,y:w.y+r.row-current.row})));
 if(insideObstacle(field,walls)||insideObstacle(point,walls))return null;
 const approach=range!==null;
 if(approach){
  const distance=Math.hypot(field.x-point.x,field.y-point.y),share=Math.min(1,range/Math.max(1e-10,distance));
  const stand={x:point.x+(field.x-point.x)*share,y:point.y+(field.y-point.y)*share};
  if(clear(stand,point,walls)){const direct=planSurfaceRoute(field,stand,layout,current,{work});if(direct)return direct;if(work?.deferred)return null;}
 }
 // Preserve a clear direct walk, including the exact transverse border coordinate.
 if(!approach&&dx===0&&dy===0&&clear(field,point,walls))return {path:[{x:point.x,y:point.y}],crossing:null};
 const direct=planFieldCrossing(field,point,layout,current);
 if(!approach&&direct&&clear(field,point,walls))return {path:[direct.exit],crossing:{...direct,route:[{room:direct.room,start:direct.entry,path:[direct.destination]}]}};
 // A caller may limit expensive searches across a crowd. Direct walking needs no search token.
 if(work){if(work.remaining<=0){work.deferred=true;return null;}work.remaining--;}
 const key=(x,y)=>(y+N)*WIDTH+x+N;
 const xy=k=>({x:k%WIDTH-N,y:Math.floor(k/WIDTH)-N});
 const center=k=>{const p=xy(k);return {x:(p.x+.5)/N,y:(p.y+.5)/N};};
 const node=(p,x,y)=>key(x*N+Math.max(0,Math.min(N-1,Math.floor((p.x-x)*N))),y*N+Math.max(0,Math.min(N-1,Math.floor((p.y-y)*N))));
 const start=node(field,0,0),goal=node(point,dx,dy),end=xy(goal),cache=new Map();
 const openCell=k=>{
  if(cache.has(k))return cache.get(k);
  const p=xy(k),ok=p.x>=-N&&p.x<2*N&&p.y>=-N&&p.y<2*N&&byCell.has(`${Math.floor(p.x/N)}:${Math.floor(p.y/N)}`)&&!insideObstacle(center(k),walls);
  cache.set(k,ok);return ok;
 };
 if(!openCell(start)||!clear(field,center(start),walls)||(!approach&&(!openCell(goal)||!clear(center(goal),point,walls))))return null;
 const heuristic=k=>{if(approach){const p=center(k);return Math.max(0,Math.hypot(p.x-point.x,p.y-point.y)-range)*N;}const p=xy(k);return Math.abs(p.x-end.x)+Math.abs(p.y-end.y);};
 const firingPoint=k=>{
  const p=center(k),d=Math.hypot(p.x-point.x,p.y-point.y);if(d>range+Math.SQRT2/N)return null;
  const share=Math.min(1,range/Math.max(1e-10,d)),stand=d<=range?p:{x:point.x+(p.x-point.x)*share,y:point.y+(p.y-point.y)*share};
  const grid=xy(k),x=Math.floor(grid.x/N),y=Math.floor(grid.y/N);
  return stand.x>=x&&stand.x<=x+1&&stand.y>=y&&stand.y<=y+1&&clear(p,stand,walls)&&clear(stand,point,walls)?stand:null;
 };
 const frontier=[],cost=new Map([[start,0]]),came=new Map(),closed=new Set();push(frontier,{key:start,score:heuristic(start)});
 while(frontier.length){
  const k=pop(frontier).key;if(closed.has(k))continue;
  const stand=approach?firingPoint(k):null;
  if(approach?Boolean(stand):k===goal){
   const nodes=[k];while(nodes.at(-1)!==start)nodes.push(came.get(nodes.at(-1)));nodes.reverse();
   const endGrid=xy(k),landing=approach?stand:point,landingRoom=approach?byCell.get(`${Math.floor(endGrid.x/N)}:${Math.floor(endGrid.y/N)}`):destination;
   const points=[{x:field.x,y:field.y,cell:current},...nodes.map(k=>{const p=center(k),grid=xy(k);return {...p,cell:byCell.get(`${Math.floor(grid.x/N)}:${Math.floor(grid.y/N)}`)};}),{...landing,cell:landingRoom}];
   const legs=[{room:current.id,start:{x:field.x,y:field.y},path:[]}];
   for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],ax=a.cell.col-current.col,ay=a.cell.row-current.row,bx=b.cell.col-current.col,by=b.cell.row-current.row;
    if(a.cell!==b.cell){
     const t=ax!==bx?((bx>ax?ax+1:ax)-a.x)/(b.x-a.x):((by>ay?ay+1:ay)-a.y)/(b.y-a.y);
     const edge={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
     legs.at(-1).path.push({x:edge.x-ax,y:edge.y-ay});legs.push({room:b.cell.id,start:{x:edge.x-bx,y:edge.y-by},path:[]});
    }
    legs.at(-1).path.push({x:b.x-bx,y:b.y-by});
   }
   for(const leg of legs){const room=rooms.find(r=>r.id===leg.room),x=room.col-current.col,y=room.row-current.row;
    leg.path=simplify(leg.start,leg.path,walls.map(w=>({...w,x:w.x-x,y:w.y-y})));
    // A zero-distance final leg still owns the exact selected endpoint.
    if(!leg.path.length)leg.path=[{...leg.start}];
   }
   // Bound saved intent even for deliberately winding authored collision layouts.
   return legs.length<=64?surfaceRouteStep(legs):null;
  }
  closed.add(k);const grid=xy(k);
  for(const [x,y] of [[grid.x+1,grid.y],[grid.x-1,grid.y],[grid.x,grid.y+1],[grid.x,grid.y-1]]){
   if(x< -N||x>=2*N||y< -N||y>=2*N)continue;
   const next=key(x,y),value=cost.get(k)+1;
   if(closed.has(next)||!openCell(next)||value>=(cost.get(next)??Infinity)||!clear(center(k),center(next),walls))continue;
   came.set(next,k);cost.set(next,value);push(frontier,{key:next,score:value+heuristic(next)});
  }
 }
 return null;
}

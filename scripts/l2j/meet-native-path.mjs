import {geoCell,geoWorld} from '../../functions/game/world/l2jGeodata.js';
import {nativeSegment} from '../../functions/game/world/nativeNavigation.js';

const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const id=p=>`${geoCell(p.x)}:${geoCell(p.y)}:${p.z}`;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function push(heap,n){let i=heap.length;heap.push(n);while(i){const p=(i-1)>>1;if(heap[p].score<=n.score)break;heap[i]=heap[p];i=p;}heap[i]=n;}
function pop(heap){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(heap[c].score>=last.score)break;heap[i]=heap[c];i=c;}heap[i]=last;}return first;}
const trace=n=>{const points=[];for(;n;n=n.parent)points.push(n.point);return points.reverse();};

/** Reuse the known component as source trails, retaining every walked segment. */
export function nativeMeetingSeeds(city,hub,roads,fields){
 const same=(a,b)=>a&&b&&['x','y','z'].every(k=>a[k]===b[k]);
 const known=new Map([[city,{point:hub,path:[],cost:0}]]),open=[city],seeds=[];
 while(open.length){
  open.sort((a,b)=>known.get(b).cost-known.get(a).cost);const at=open.pop(),prefix=known.get(at);
  for(const r of Object.values(roads).filter(r=>r.available&&r.returnPath)){
   const forward=r.fromCity===at,back=r.toCity===at;if(!forward&&!back)continue;
   const from=forward?r.from:r.to,to=forward?r.to:r.from,next=forward?r.toCity:r.fromCity,path=forward?r.path:r.returnPath;
   if(!same(prefix.point,from))continue;
   const cost=prefix.cost+r.distance;if(cost>=(known.get(next)?.cost??Infinity))continue;
   const joined=[...prefix.path,...path];if(joined.length>512)continue;
   known.set(next,{point:to,path:joined,cost});open.push(next);
  }
 }
 for(const [at,prefix] of known){
  if(prefix.path.length)seeds.push({id:'town:'+at,from:hub,path:prefix.path});
  for(const [id,r] of Object.entries(fields).filter(([,r])=>r.available&&r.city===at)){
   if(same(prefix.point,r.from)&&prefix.path.length+r.path.length<=512)seeds.push({id:'field:'+id,from:hub,path:[...prefix.path,...r.path]});
  }
 }
 return seeds;
}

/** Offline two-frontier search. A meeting joins exact, reversible native segments,
 * including when each frontier samples a different cell-grid phase. Seeds are
 * existing verified trails from the same source hub, never teleport edges.
 */
export function meetNativePath(from,to,{geo,allowed=()=>true,stride=8,refine=false,maxNodes=240000,margin=2048,heuristicWeight=2,fromSeeds=[],toSeeds=[]}={}){
 const start=geo.point(from),target=geo.point(to),options={geo,allowed,reversible:true};
 if(!start||!target)return {ok:false,reason:'geodata_missing',visited:0};
 if(!start.nswe||!target.nswe||!allowed(start)||!allowed(target))return {ok:false,reason:'path_blocked',visited:0};
 if(!Number.isInteger(stride)||stride<1||stride>16||!Number.isInteger(maxNodes)||maxNodes<1)throw new Error('Invalid meeting search budget');
 const steps=refine?[...new Set([stride,Math.max(1,Math.floor(stride/2)),Math.max(1,Math.floor(stride/4)),1])]:[stride];
 const span=stride*2*16,bucket=p=>`${Math.floor(p.x/span)}:${Math.floor(p.y/span)}`;
 const bounds={left:Math.min(start.x,target.x)-margin*16,right:Math.max(start.x,target.x)+margin*16,top:Math.min(start.y,target.y)-margin*16,bottom:Math.max(start.y,target.y)+margin*16};
 const weight=Math.max(1,Math.min(4,heuristicWeight));
 const same=(a,b)=>a&&b&&['x','y','z'].every(k=>a[k]===b[k]);
 const goals=(origin,seeds)=>[origin,...seeds.filter(s=>same(s.from,origin)).flatMap(s=>s.path||[])];
 function frontier(origin,targets,seeds){
  const heuristic=p=>{let best=Infinity;for(const q of targets){const d=(p.x-q.x)**2+(p.y-q.y)**2;if(d<best)best=d;}return Math.sqrt(best);};
  const f={heap:[],nodes:new Map(),buckets:new Map(),best:origin,nearest:heuristic(origin),heuristic};
  function add(point,parent,cost){
   const key=id(point),old=f.nodes.get(key);if(old&&old.cost<=cost)return old;
   const node={point,parent,cost,score:cost+weight*heuristic(point),closed:false};
   f.nodes.set(key,node);push(f.heap,node);
   const bin=bucket(point),list=f.buckets.get(bin)||[];list.push(node);f.buckets.set(bin,list);return node;
  }
  const root=add(origin,null,0);
  for(const seed of seeds){
   if(!seed?.path?.length||!['x','y','z'].every(k=>seed.from?.[k]===origin[k]))continue;
   let previous=root;
   for(const point of seed.path){
    if(!nativeSegment(previous.point,point,options))throw new Error('Unverified meeting seed');
    previous=add(point,previous,previous.cost+distance(previous.point,point));
   }
  }
  f.add=add;return f;
 }
 const fronts=[frontier(start,goals(target,toSeeds),fromSeeds),frontier(target,goals(start,fromSeeds),toSeeds)];
 let visited=0;
 while(visited<maxNodes){
  let expanded=false;
  for(let side=0;side<2&&visited<maxNodes;side++){
   const own=fronts[side],other=fronts[1-side];let node;
   while(own.heap.length){const n=pop(own.heap);if(!n.closed&&own.nodes.get(id(n.point))===n){node=n;break;}}
   if(!node)continue;expanded=true;node.closed=true;visited++;
   const p=node.point,remaining=own.heuristic(p);if(remaining<own.nearest){own.nearest=remaining;own.best=p;}
   const bx=Math.floor(p.x/span),by=Math.floor(p.y/span),near=[];
   for(let x=bx-1;x<=bx+1;x++)for(let y=by-1;y<=by+1;y++)for(const n of other.buckets.get(`${x}:${y}`)||[]){
    if(other.nodes.get(id(n.point))===n&&distance(p,n.point)<=span)near.push(n);
   }
   near.sort((a,b)=>distance(p,a.point)-distance(p,b.point));
   for(const match of near.slice(0,16))if(nativeSegment(p,match.point,options)){
    const a=side?match:node,b=side?node:match;
    const points=[...trace(a),...trace(b).reverse()],path=[];let previous=points[0],index=1;
    while(index<points.length){let end=Math.min(points.length-1,index+64);while(end>index&&!nativeSegment(previous,points[end],options))end--;
     if(distance(previous,points[end])>1e-9||previous.z!==points[end].z){path.push(points[end]);previous=points[end];}index=end+1;
    }
    return {ok:true,start,path,visited};
   }
   for(const [dx,dy] of directions)for(const step of steps){
    const point={x:geoWorld(geoCell(p.x)+dx*step),y:geoWorld(geoCell(p.y)+dy*step),z:p.z};
    if(point.x<bounds.left||point.x>bounds.right||point.y<bounds.top||point.y>bounds.bottom)continue;
    const segment=nativeSegment(p,point,options);if(!segment)continue;
    const next=segment.at(-1);own.add(next,node,node.cost+distance(p,next));break;
   }
  }
  if(!expanded)return {ok:false,reason:'path_blocked',visited,best:fronts.map(f=>f.best)};
 }
 return {ok:false,reason:'geodata_search_limit',visited,best:fronts.map(f=>f.best)};
}

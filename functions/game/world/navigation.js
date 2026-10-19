// Bounded A* on prepared collision rectangles. Coordinates are normalized per room.
export const ROOM_SIZE = 2000;
const N = 32;
export const insideObstacle=(p,walls=[])=>walls.some(w=>p.x>=w.x&&p.x<=w.x+w.w&&p.y>=w.y&&p.y<=w.y+w.h);
/** Only used when spawning or migrating a room layout, never to bypass movement. */
export function nearestOpenPoint(point,walls=[]){
    if(!insideObstacle(point,walls))return {x:point.x,y:point.y};
    let best=null,dist=Infinity;
    for(let x=1;x<N-1;x++)for(let y=1;y<N-1;y++){
        const p={x:(x+.5)/N,y:(y+.5)/N},d=Math.hypot(p.x-point.x,p.y-point.y);
        if(d<dist&&!insideObstacle(p,walls)){best=p;dist=d;}
    }
    return best||{x:.5,y:.95};
}
export function findPath(from, to, walls = [],{margin=.02}={}) {
    if (![from.x,from.y,to.x,to.y].every(Number.isFinite) || to.x < margin || to.x > 1-margin || to.y < margin || to.y > 1-margin) return null;
    const cell = p => ({x: Math.min(N-1,Math.floor(p.x*N)), y: Math.min(N-1,Math.floor(p.y*N))});
    const blocked = (x,y) => x<0||y<0||x>=N||y>=N||walls.some(w => (x+.5)/N >= w.x && (x+.5)/N <= w.x+w.w && (y+.5)/N >= w.y && (y+.5)/N <= w.y+w.h);
    if (walls.some(w => to.x >= w.x && to.x <= w.x+w.w && to.y >= w.y && to.y <= w.y+w.h)) return null;
    const a=cell(from),b=cell(to),key=(x,y)=>y*N+x, start=key(a.x,a.y),goal=key(b.x,b.y);
    const open=[start],came=new Map(),cost=new Map([[start,0]]),score=k=>cost.get(k)+Math.abs(k%N-b.x)+Math.abs(Math.floor(k/N)-b.y);
    const closed=new Set();
    while(open.length) {
        open.sort((x,y)=>score(y)-score(x)); const k=open.pop();
        if(k===goal){const nodes=[];let p=k;while(p!==start){nodes.push({x:(p%N+.5)/N,y:(Math.floor(p/N)+.5)/N});p=came.get(p);}nodes.reverse();nodes.push({...to});return nodes;}
        if(closed.has(k))continue;closed.add(k);
        const x=k%N,y=Math.floor(k/N);
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,nk=key(nx,ny);if(blocked(nx,ny)||closed.has(nk))continue;const c=cost.get(k)+1;if(c<(cost.get(nk)??Infinity)){cost.set(nk,c);came.set(nk,k);open.push(nk);}}
    }
    return null;
}

export function advancePath(actor, now, speed, size=ROOM_SIZE) {
    const elapsed=Math.max(0,(now-(actor.moveAt??now))/1000);actor.moveAt=now;
    travelPath(actor,elapsed*Math.max(0,speed)/size);
    return !actor.path?.length;
}

/** Return unused walking distance so crossing a cell cannot grant a free extra step. */
export function travelPath(actor,budget){
    while(actor.path?.length && budget>0){const p=actor.path[0],dx=p.x-actor.x,dy=p.y-actor.y,d=Math.hypot(dx,dy);if(d<=budget){actor.x=p.x;actor.y=p.y;budget-=d;actor.path.shift();}else{actor.x+=dx/d*budget;actor.y+=dy/d*budget;budget=0;}}
    return budget;
}

export function pointInPolygon(point, polygon) {
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {const a=polygon[i],b=polygon[j];if((a[1]>point.y)!==(b[1]>point.y)&&point.x<(b[0]-a[0])*(point.y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}
    return inside;
}

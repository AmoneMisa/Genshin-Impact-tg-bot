import {combatTheme,colorHex} from './combat-environment.js';
import {roomSceneUrl,roomArtField} from './room-scene-art.js';
import {roomPropSprite,roomPropHeight} from './room-props-art.js';
// One projection for terrain, actors, effects and inverse pointer picking. Game coordinates stay unchanged.
export function isoMatrix(viewport) {
  const width=Math.max(1,viewport.width),height=Math.max(1,viewport.height);
  // A traversable room extends past a phone's edges; camera pan reveals its aisles.
  const a=Math.max(280,Math.min(640,Math.max(width*.85,height*.64)));
  const b=a/Math.sqrt(3);
  return {a,b,c:-a,d:b,e:width/2,f:height/2-b};
}
export function isoPoint(point,viewport,camera={}) {
  const m=isoMatrix(viewport),zoom=camera.zoom||1,cx=viewport.width/2,cy=viewport.height/2;
  const x=m.a*point.x+m.c*point.y+m.e,y=m.b*point.x+m.d*point.y+m.f;
  return {x:cx+(x-cx)*zoom+(camera.x||0),y:cy+(y-cy)*zoom+(camera.y||0)};
}
// Art anchors: N(768,150), E(1408,520), S(768,890), W(128,520).
// A uniform screen-space image retains the painted relief instead of flattening it.
export function isoSceneBounds(viewport){
 const m=isoMatrix(viewport),scale=m.a/640;
 return {x:m.e-768*scale,y:viewport.height/2-520*scale,width:1536*scale,height:1024*scale};
}
/** Keep panning inside the painted extent; an explicitly zoomed-out room stays centred. */
export function clampRoomCamera(camera,viewport,stream=null){
 let bounds=isoSceneBounds(viewport);
 if(stream?.tiles?.length){
  const corners=stream.tiles.flatMap(t=>[[0,0],[1,0],[1,1],[0,1]].map(([x,y])=>isoPoint({x:x+t.dx,y:y+t.dy},viewport)));
  const left=Math.min(...corners.map(p=>p.x))-40,top=Math.min(...corners.map(p=>p.y))-40;
  bounds={x:left,y:top,width:Math.max(...corners.map(p=>p.x))+40-left,height:Math.max(...corners.map(p=>p.y))+40-top};
 }
 const zoom=camera.zoom||1,cx=viewport.width/2,cy=viewport.height/2;
 const axis=(value,start,size,center,extent)=>{
  const lower=extent-(center+(start+size-center)*zoom),upper=-(center+(start-center)*zoom);
  return lower>upper?(lower+upper)/2:Math.max(lower,Math.min(upper,value||0));
 };
 return {zoom,x:axis(camera.x,bounds.x,bounds.width,cx,viewport.width),y:axis(camera.y,bounds.y,bounds.height,cy,viewport.height)};
}
export function isoPick(point,viewport,camera={}) {
  const m=isoMatrix(viewport),zoom=camera.zoom||1,cx=viewport.width/2,cy=viewport.height/2;
  const sx=(point.x-cx-(camera.x||0))/zoom+cx-m.e;
  const sy=(point.y-cy-(camera.y||0))/zoom+cy-m.f;
  return {x:(sx/m.a+sy/m.b)/2,y:(sy/m.b-sx/m.a)/2};
}
const points=list=>list.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

/** Move labels only; avatars and their hit areas stay at authoritative positions. */
export function isoLabelOffsets(actors,viewport){
  const offsets=new Map(),placed=[];
  const overlap=(a,b)=>a.x<b.x+b.w+3&&a.x+a.w+3>b.x&&a.y<b.y+b.h+3&&a.y+a.h+3>b.y;
  const bodies=actors.map(a=>{const p=isoPoint(a,viewport);return {id:a.id,x:p.x-24,y:p.y-50,w:48,h:48};});
  for(const actor of actors){
    const p=isoPoint(actor,viewport),w=108,h=actor.labelHeight||28;
    let best=null;
    for(const dy of [0,-16,-32,-48,-64])for(const dx of [0,-30,30,-60,60]){
      const desired=p.x-w/2+dx;
      const x=p.x>=0&&p.x<=viewport.width?Math.max(4,Math.min(viewport.width-w-4,desired)):desired,y=p.y-54-h+dy;
      const rect={x,y,w,h};
      const collisions=placed.filter(r=>overlap(rect,r)).length+bodies.filter(b=>b.id!==actor.id&&overlap(rect,b)).length;
      const score=collisions*1000+Math.abs(dy)+Math.abs(dx)*.5+(y<4?200:0);
      if(!best||score<best.score)best={rect,score,x:x-(p.x-w/2),y:dy};
    }
    placed.push(best.rect);offsets.set(actor.id,{x:best.x,y:best.y});
  }
  return offsets;
}

/** Static SVG terrain: no WebGL, simulation loop or per-tile event listeners. */
export function isoTerrain(field,viewport) {
  if(field.continuous){
    const m=isoMatrix(viewport),outline=points([[0,0],[1,0],[1,1],[0,1]].map(([x,y])=>isoPoint({x,y},viewport)));
    return `<svg class="hunt-isometric-terrain" style="z-index:-100" viewBox="0 0 ${viewport.width} ${viewport.height}" aria-hidden="true">`+field.continuous.tiles.map(t=>{
      const id=`terrain-${field.continuous.space||'surface'}-${t.id}`,tile=isoTerrain({...field,...t,continuous:null,streamTile:true},viewport);
      return `<g data-terrain-cell="${t.id}" transform="translate(${m.a*t.dx+m.c*t.dy},${m.b*t.dx+m.d*t.dy})"><defs><clipPath id="${id}"><polygon points="${outline}"/></clipPath></defs><g clip-path="url(#${id})">${tile}</g></g>`;
    }).join('')+'</svg>';
  }
  field=roomArtField(field);
  const theme=combatTheme(field.environment);
  const project=p=>isoPoint(p,viewport);
  const prism=(x,y,w,h,height,kind='wall')=>{
    const floor=[project({x,y}),project({x:x+w,y}),project({x:x+w,y:y+h}),project({x,y:y+h})];
    const top=floor.map(p=>({x:p.x,y:p.y-height}));
    return `<g class="hunt-iso-${kind}"><polygon class="iso-shadow" points="${points(floor.map(p=>({x:p.x+6,y:p.y+5})))}"/><polygon class="iso-side" style="fill:${colorHex(theme.side)}" points="${points([floor[1],floor[2],top[2],top[1]])}"/><polygon class="iso-front" style="fill:${colorHex(theme.front)}" points="${points([floor[2],floor[3],top[3],top[2]])}"/><polygon class="iso-top" style="fill:${colorHex(theme.top)}" points="${points(top)}"/></g>`;
  };
  const floor=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}].map(project);
  const tiles=[];
  const divisions=field.streamTile?2:8;
  for(let x=0;x<divisions;x++)for(let y=0;y<divisions;y++)tiles.push(`<polygon class="iso-tile" style="fill:${colorHex((x*3+y*7)%5===0?theme.light:theme.floor)}" points="${points([{x:x/divisions,y:y/divisions},{x:(x+1)/divisions,y:y/divisions},{x:(x+1)/divisions,y:(y+1)/divisions},{x:x/divisions,y:(y+1)/divisions}].map(project))}"/>`);
  // Low perimeter walls leave the actual doors open; raised obstacles use the server's collision rectangles.
  const walls=(field.walls||[]).map((w,i)=>{
    const art=roomPropSprite(w.kind,field.environment);
    if(!art)return prism(w.x,w.y,w.w,w.h,58,'wall');
    const foot=project({x:w.x+w.w/2,y:w.y+w.h/2}),height=roomPropHeight(w.kind,i),scale=height/art.height;
    const base=[{x:w.x,y:w.y},{x:w.x+w.w,y:w.y},{x:w.x+w.w,y:w.y+w.h},{x:w.x,y:w.y+w.h}].map(project);
    return `<g class="hunt-iso-prop hunt-iso-${w.kind}"><polygon points="${points(base)}" fill="${colorHex(theme.front)}" opacity=".5"/><svg x="${foot.x-art.anchorX*scale}" y="${foot.y-art.anchorY*scale}" width="${art.width*scale}" height="${height}" viewBox="${art.x} ${art.y} ${art.width} ${art.height}" overflow="hidden"><image href="${art.url}" width="1536" height="1024"/></svg></g>`;
  });
  const url=roomSceneUrl(field.environment,{compact:viewport.width<480,sceneKey:field.sceneKey}),bounds=isoSceneBounds(viewport);
  const painting=url?`<image href="${url}" x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" preserveAspectRatio="none"/>`:'';
  return `<svg class="hunt-isometric-terrain" viewBox="0 0 ${viewport.width} ${viewport.height}" aria-hidden="true"><polygon class="iso-base" points="${points(floor.map(p=>({x:p.x,y:p.y+12})))}"/><polygon class="iso-floor" points="${points(floor)}"/>${tiles.join('')}${painting}${walls.join('')}</svg>`;
}

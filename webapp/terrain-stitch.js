// Static image compositing only. These joins never define walkable geography.
export const TERRAIN_BLEND=.045;
export function terrainStitchPlan(tiles){
 const cells=new Map(tiles.map(t=>[`${t.dx}:${t.dy}`,t])),edges=[],corners=[];
 for(const tile of tiles){
  const right=cells.get(`${tile.dx+1}:${tile.dy}`),below=cells.get(`${tile.dx}:${tile.dy+1}`),diagonal=cells.get(`${tile.dx+1}:${tile.dy+1}`);
  if(right)edges.push({axis:'x',at:tile.dx+1,start:tile.dy,a:tile,b:right});
  if(below)edges.push({axis:'y',at:tile.dy+1,start:tile.dx,a:tile,b:below});
  if(right&&below&&diagonal)corners.push({x:tile.dx+1,y:tile.dy+1,a:tile,b:right,c:below,d:diagonal});
 }
 return {edges,corners};
}

/** Reuse the same nine ground sources for clipped blends; props are drawn exactly once. */
export function streamedTerrain(field,viewport,{matrix:m,project,layers}){
 const tiles=field.continuous.tiles,plan=terrainStitchPlan(tiles),prefix=`terrain-${field.continuous.space||'surface'}`;
 const polygon=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([x,y])=>{const p=project({x,y});return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;}).join(' ');
 const transform=t=>`translate(${m.a*t.dx+m.c*t.dy},${m.b*t.dx+m.d*t.dy})`;
 const id=t=>`${prefix}-${t.id}`,use=t=>`<use href="#${id(t)}-ground" transform="${transform(t)}"/>`;
 const parts=new Map(tiles.map(t=>[t.id,layers(t)])),defs=[],base=[],joins=[],props=[];
 const gradients=new Map(),world=`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`;
 function mask(name,axis,at,rect){
  const key=axis+at;let gradient=gradients.get(key);
  if(axis&&!gradient){
   gradient=`${prefix}-gradient-${axis}-${String(at).replace('-','n')}`;gradients.set(key,gradient);
   defs.push(`<linearGradient id="${gradient}" gradientUnits="userSpaceOnUse" x1="${axis==='x'?at-TERRAIN_BLEND:0}" y1="${axis==='y'?at-TERRAIN_BLEND:0}" x2="${axis==='x'?at+TERRAIN_BLEND:0}" y2="${axis==='y'?at+TERRAIN_BLEND:0}"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>`);
  }
  // The outer region owns the exact edge; gradient masks extend beyond it to avoid a second antialiased edge.
  const pad=axis ? .004 : 0,paint={x:rect.x-pad,y:rect.y-pad,w:rect.w+2*pad,h:rect.h+2*pad};
  const corners=[[paint.x,paint.y],[paint.x+paint.w,paint.y],[paint.x+paint.w,paint.y+paint.h],[paint.x,paint.y+paint.h]].map(([x,y])=>project({x,y}));
  const left=Math.min(...corners.map(p=>p.x))-1,top=Math.min(...corners.map(p=>p.y))-1;
  const width=Math.max(...corners.map(p=>p.x))-left+1,height=Math.max(...corners.map(p=>p.y))-top+1;
  // Allocate masks only around the narrow join, never around the whole streamed world.
  defs.push(`<mask id="${name}" maskUnits="userSpaceOnUse" x="${left}" y="${top}" width="${width}" height="${height}"><g transform="${world}"><rect x="${paint.x}" y="${paint.y}" width="${paint.w}" height="${paint.h}" fill="${axis?'url(#'+gradient+')':'#fff'}"/></g></mask>`);
  return name;
 }
 for(const tile of tiles){
  defs.push(`<g id="${id(tile)}-ground">${parts.get(tile.id).ground}</g><clipPath id="${id(tile)}-clip"><polygon points="${polygon(tile.dx,tile.dy,1,1)}"/></clipPath>`);
  base.push(`<g data-terrain-cell="${tile.id}" clip-path="url(#${id(tile)}-clip)">${use(tile)}</g>`);
 }
 for(const [i,edge] of plan.edges.entries()){
  const clip=`${prefix}-edge-${i}`,b=TERRAIN_BLEND,rect=edge.axis==='x'?{x:edge.at-b,y:edge.start,w:2*b,h:1}:{x:edge.start,y:edge.at-b,w:1,h:2*b};
  // A group mask composites the pair first. A clip applied per child would darken its antialiased edge.
  joins.push(`<g data-terrain-blend="edge" mask="url(#${mask(clip+'-region',null,0,rect)})">${use(edge.a)}<g mask="url(#${mask(clip+'-mask',edge.axis,edge.at,rect)})">${use(edge.b)}</g></g>`);
 }
 for(const [i,corner] of plan.corners.entries()){
  const clip=`${prefix}-corner-${i}`,b=TERRAIN_BLEND,rect={x:corner.x-b,y:corner.y-b,w:2*b,h:2*b},x=mask(clip+'-x','x',corner.x,rect),y=mask(clip+'-y','y',corner.y,rect);
  // Two row crossfades, followed by a column crossfade: all four images meet without a hard vertex.
  joins.push(`<g data-terrain-blend="corner" mask="url(#${mask(clip+'-region',null,0,rect)})">${use(corner.a)}<g mask="url(#${x})">${use(corner.b)}</g><g mask="url(#${y})">${use(corner.c)}<g mask="url(#${x})">${use(corner.d)}</g></g></g>`);
 }
 for(const tile of [...tiles].sort((a,b)=>a.dx+a.dy-b.dx-b.dy))props.push(`<g data-terrain-props="${tile.id}" transform="${transform(tile)}">${parts.get(tile.id).props}</g>`);
 return `<svg class="hunt-isometric-terrain" style="z-index:-100" viewBox="0 0 ${viewport.width} ${viewport.height}" aria-hidden="true"><defs>${defs.join('')}</defs>${base.join('')}${joins.join('')}${props.join('')}</svg>`;
}

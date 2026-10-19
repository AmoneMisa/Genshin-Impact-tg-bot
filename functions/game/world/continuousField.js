import {FIELD_POPULATIONS} from '../../../template/fieldPopulations.js';

/** Visual cells are authored. Native source bounds remain metadata, never collision/geodata. */
export function continuousField(zone,layout){
 const model=FIELD_POPULATIONS[zone?.id];
 return Boolean(model?.source.coordinateSpace==='surface'&&!zone.instance&&zone.kind!=='catacomb'&&model.floors.length===1&&layout.rooms.length>1);
}

export function fieldStream(zone,layout,current){
 if(!continuousField(zone,layout))return null;
 return {space:zone.id,geometry:'adapted',col:current.col,row:current.row,
  // Rendering metadata does not own actors; resident populations remain in persistent banks.
  tiles:layout.rooms.filter(r=>Math.abs(r.col-current.col)<=1&&Math.abs(r.row-current.row)<=1).map(r=>({
   id:r.id,dx:r.col-current.col,dy:r.row-current.row,environment:r.environment,walls:r.walls,
   sceneKey:`${zone.id}:${r.id}:floor-1`
  }))};
}

/** One adjacent cell per request. Neither a zone nor a floor can be supplied by the client. */
export function planFieldCrossing(field,point,layout,current){
 if(![point.x,point.y].every(Number.isFinite))return null;
 const dx=point.x<0?-1:point.x>1?1:0,dy=point.y<0?-1:point.y>1?1:0;
 if(Math.abs(dx)+Math.abs(dy)!==1)return null;
 const destination={x:point.x-dx,y:point.y-dy};
 if(destination.x<0||destination.x>1||destination.y<0||destination.y>1)return null;
 const to=layout.rooms.find(r=>r.col===current.col+dx&&r.row===current.row+dy);if(!to)return null;
 const t=dx?((dx>0?1:0)-field.x)/(point.x-field.x):((dy>0?1:0)-field.y)/(point.y-field.y);
 const exit={x:dx?(dx>0?1:0):field.x+(point.x-field.x)*t,y:dy?(dy>0?1:0):field.y+(point.y-field.y)*t};
 const entry={x:exit.x-dx,y:exit.y-dy};
 return {room:to.id,exit,entry,destination};
}

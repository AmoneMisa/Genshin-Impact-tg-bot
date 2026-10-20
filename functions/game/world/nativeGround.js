import nativeWorld from '../../../template/nativeWorld.js';
import holdings from '../../../template/worldHoldings.js';
import {pointInPolygon} from './navigation.js';

const SIZE=4096,index=new Map();
function add(record){
 const xs=record.polygon.map(p=>p[0]),ys=record.polygon.map(p=>p[1]),padding=record.kind==='water'?0:16;
 Object.assign(record,{left:Math.min(...xs)-padding,right:Math.max(...xs)+padding,top:Math.min(...ys)-padding,bottom:Math.max(...ys)+padding});
 for(let x=Math.floor(record.left/SIZE);x<=Math.floor(record.right/SIZE);x++)for(let y=Math.floor(record.top/SIZE);y<=Math.floor(record.bottom/SIZE);y++){
  const key=x+':'+y,list=index.get(key)||[];list.push(record);index.set(key,list);
 }
}
// Ground trails cannot open an unimplemented door, swim, or enter a holding through its walls.
for(const door of nativeWorld.doors)add({...door,kind:'door',minZ:door.minZ-16,maxZ:door.maxZ+16});
for(const zone of nativeWorld.water)add({...zone,kind:'water'});
for(const holding of holdings.filter(h=>h.kind==='castle'||h.kind==='fort'))add({...holding,kind:'holding',minZ:-Infinity,maxZ:Infinity});

export function nativeGroundBlock(point){
 if(![point?.x,point?.y,point?.z].every(Number.isFinite))return 'geodata_missing';
 for(const r of index.get(Math.floor(point.x/SIZE)+':'+Math.floor(point.y/SIZE))||[]){
  if(point.x<r.left||point.x>r.right||point.y<r.top||point.y>r.bottom||point.z<r.minZ||point.z>r.maxZ)continue;
  if(r.kind==='water'&&r.shape!=='Cuboid'&&!pointInPolygon(point,r.polygon))continue;
  return r.kind==='water'?'swimming_required':r.kind==='door'?'door_state_required':'holding_region_required';
 }
 return null;
}
export const nativeGroundAllowed=point=>!nativeGroundBlock(point);

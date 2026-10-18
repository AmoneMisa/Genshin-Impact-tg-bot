// Keep dense source spawn populations on the server; bound DOM labels on phones.
export function visibleFieldMobs(field,limit=24){
 return [...field.mobs].sort((a,b)=>Number(b.instanceId===field.target)-Number(a.instanceId===field.target)||Math.hypot(a.x-field.x,a.y-field.y)-Math.hypot(b.x-field.x,b.y-field.y)).slice(0,limit);
}

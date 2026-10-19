// Keep dense source spawn populations on the server; bound DOM labels on phones.
export function visibleFieldMobs(field,limit=24){
 return [...field.mobs].sort((a,b)=>Number(b.instanceId===field.target)-Number(a.instanceId===field.target)||Math.hypot(a.x-field.x,a.y-field.y)-Math.hypot(b.x-field.x,b.y-field.y)).slice(0,limit);
}
export function visibleFieldPlayers(players,field,limit=16,target=null){
 return [...players].sort((a,b)=>Number(String(b.userId)===String(target))-Number(String(a.userId)===String(target))||Math.hypot(a.x-field.x,a.y-field.y)-Math.hypot(b.x-field.x,b.y-field.y)).slice(0,limit);
}

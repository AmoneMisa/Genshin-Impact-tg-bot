/** A source polygon gives a Z interval, not a guessed floor. Reject ambiguity. */
export function sourceTerritoryLayer(geo,node,minZ,maxZ,allowed){
 if(![node?.x,node?.y,minZ,maxZ].every(Number.isFinite)||minZ>maxZ)return null;
 const low=geo.point({...node,z:minZ}),high=geo.point({...node,z:maxZ});
 return low&&high&&low.z===high.z&&low.z>=minZ&&low.z<=maxZ&&low.nswe&&allowed(low)?low:null;
}

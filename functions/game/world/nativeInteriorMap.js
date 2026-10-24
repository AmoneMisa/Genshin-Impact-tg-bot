import maps from '../../../template/nativeInteriorMaps.js';
import {worldGeodata} from './l2jGeodata.js';
/** A roof is a stored higher layer, not an authored depth threshold. */
export function nativeInteriorMap(id,point,sourceFloor){
 const map=maps.geodataCommit===worldGeodata.manifest.commit&&(maps.maps[id+':f'+sourceFloor]||maps.maps[id]);if(!map||!point)return null;
 const floor=worldGeodata.point(point),roof=worldGeodata.point({...point,z:32767});
 return floor&&roof&&roof.z>floor.z?{asset:map.asset,bounds:map.bounds}:null;
}

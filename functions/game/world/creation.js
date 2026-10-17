import {SETTLEMENTS,CREATION_POINTS} from '../../../template/worldSettlements.js';
import {classIdOf,raceOf} from '../../../template/l2ClassMeta.js';

/** A first class choice creates the character at a real H5 creation point. Paid changes never call this. */
export function placeNewCharacter(session,className,{now=Date.now(),random=Math.random}={}){
 const id=classIdOf(className),points=CREATION_POINTS[id],race=raceOf(id),city=SETTLEMENTS.find(c=>c.starterRace===race);
 if(!city||!points?.length)return false;
 const point=points[Math.min(points.length-1,Math.floor(Math.max(0,random())*points.length))];
 session.game.world={version:2,mode:'city',city:city.id,location:null,x:.5+(point.x-city.x)/city.size,y:.5+(point.y-city.y)/city.size,
  z:point.z,path:[],moveAt:now,locks:{},creation:{classId:id,...point}};
 return true;
}

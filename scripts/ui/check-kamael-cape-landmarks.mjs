import {readFileSync} from 'node:fs';
import {AVATAR_COSTUME_RIGS} from '../../webapp/art/avatar-costume-rigs.js';
import {deformCostumePoint} from '../../webapp/avatar-costume-rig.js';
const reviews=JSON.parse(readFileSync('art-source/avatars/kamael-capes/motion.json','utf8'));
const failures=[];
for(const [key,review]of Object.entries(reviews)){
  const rig=structuredClone(AVATAR_COSTUME_RIGS['/art/avatars/collections/v1/'+key]);
  if(!rig.capeReview){
    if(review.propPaths){
      rig.fixedAreas=rig.fixedAreas.filter(area=>!rig.poseReview.accessoryAreas.some(prop=>JSON.stringify(area)===JSON.stringify(prop)));
      rig.fixedAreas.push(...(review.propAreas||[]).map(area=>[...area,.008]));
      rig.fixedPaths.push(...review.propPaths);
    }
    for(let i=0;i<2;i++){
      const [sx,sy]=rig.poseReview.shoulders[i],[hx,hy]=rig.poseReview.hands[i];
      const guard=[Math.min(sx,hx)-.12,sy-.025,Math.max(sx,hx)+.12,Math.max(sy,hy)+.065,.015];
      if(rig.fixedAreas.some(area=>area.every((v,i)=>Math.abs(v-guard[i])<1e-8))){
        rig.fixedAreas=rig.fixedAreas.filter(area=>!area.every((v,i)=>Math.abs(v-guard[i])<1e-8));
        rig.fixedPaths.push([sx,sy,hx,hy,.035]);
      }
    }
    rig.cloth.push(...review.clothRegions);rig.fixedAreas.push([...review.ornament,.006]);rig.clothStart=Math.min(rig.clothStart,review.clothStart);
  }
  const motions=review.reviewPoints.map(([x,y])=>{
    const values=Array.from({length:30},(_,i)=>deformCostumePoint(x,y,rig,i/4)[0]);
    return (Math.max(...values)-Math.min(...values))*320;
  });
  if(Math.max(...motions)<=.5)failures.push({key,motions});
}
console.log(JSON.stringify({reviewed:Object.keys(reviews).length,failures}));
if(failures.length)process.exitCode=1;

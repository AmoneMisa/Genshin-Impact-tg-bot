import fs from 'node:fs';
import {createHash} from 'node:crypto';
import data from '../../template/ferryData.js';
import {ferryPlans,initialFerryClock,advanceFerryClock} from '../../functions/game/world/ferryClock.js';
const plans=ferryPlans(data),state=initialFerryClock(data),checkpoints=[];
// Pure engine snapshots prevent replaying decades of voyages on a live request.
// This is an acceleration index, not an end date: later times can resume its last snapshot.
for(let at=0;at<=Date.UTC(2035,0,1);at+=90*86400000){
 advanceFerryClock(data,plans,state,at);checkpoints.push(structuredClone(state));
}
fs.writeFileSync('template/ferryCalendar.js','// Generated source-script clock checkpoints; server-only. Rebuild when ferry definitions change.\nexport default '+JSON.stringify({dataSha256:createHash('sha256').update(JSON.stringify(data)).digest('hex'),checkpoints})+';\n');
console.log(checkpoints.length,'ferry clock checkpoints');

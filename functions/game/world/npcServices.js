import {GRACIA_CITIES,GRACIA_NPCS} from '../../../template/graciaTravel.js';
export function nearIshuma(session){
 const w=session.game.world,c=GRACIA_CITIES.find(c=>c.id===w?.city),n=GRACIA_NPCS.find(n=>n.service==='ishuma'&&n.city===w?.city);
 return Boolean(w?.mode==='city'&&c&&n&&!w.path?.length&&session.game.gameClass?.stats?.hp>0&&Math.hypot(w.x-(.5+(n.x-c.x)/c.size),w.y-(.5+(n.y-c.y)/c.size))*c.size<=180);
}

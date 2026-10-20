/** Source vehicle paths and shared BoatManager harbor flags. No timers or player data. */
export function ferryPlans(data){
 const plans={};
 for(const port of Object.values(data.ports)){
  const frames=[{point:{...port.dock},at:0}];let previous=port.dock,at=0,cruiseMs=0;
  for(const [index,name] of port.pathNames.entries()){
   if(index===port.pathNames.length-1&&name.endsWith('_DOCK'))cruiseMs=at;
   for(const row of data.paths[name]){const point={x:row[0],y:row[1],z:row[2]};at+=Math.ceil(Math.hypot(point.x-previous.x,point.y-previous.y,point.z-previous.z)/row[3]*1000);frames.push({point,at});previous=point;}
  }
  if(!cruiseMs)cruiseMs=at;
  plans[port.id]={frames,cruiseMs,approachMs:at-cruiseMs,duration:at};
 }
 return plans;
}
export function initialFerryClock(data){
 return {at:0,harbors:Object.fromEntries(data.vessels.map(v=>[data.ports[v.ports[0]].harbor,true])),ships:data.vessels.map(v=>({vessel:v.id,port:v.ports[0],phase:'dock',dockAt:0,nextAt:v.initialDockMs}))};
}
/** Busy-source checks repeat every five seconds; skip only checks with no possible release. */
export function advanceFerryClock(data,plans,state,until,{onDock=()=>{},onVoyage=()=>{}}={}){
 const vessels=Object.fromEntries(data.vessels.map(v=>[v.id,v]));
 for(;;){
  const ship=state.ships.reduce((a,b)=>a.nextAt<=b.nextAt?a:b);
  if(ship.nextAt>until)break;
  const at=ship.nextAt,port=data.ports[ship.port],vessel=vessels[ship.vessel];state.at=at;
  if(ship.phase==='dock'){
   state.harbors[port.harbor]=false;
   ship.trip={port:port.id,departureAt:at,cruiseEndAt:at+plans[port.id].cruiseMs};
   ship.phase='cruise';ship.nextAt=ship.trip.cruiseEndAt;continue;
  }
  const destination=data.ports[port.destination];
  if(ship.phase==='cruise'||ship.phase==='waiting'){
   if(state.harbors[destination.harbor]){
    const releases=state.ships.filter(s=>s.phase==='dock'&&data.ports[s.port].harbor===destination.harbor).map(s=>s.nextAt);
    const release=releases.length?Math.min(...releases):at+5000;
    ship.phase='waiting';ship.nextAt=at+Math.max(1,Math.ceil((release-at)/5000))*5000;continue;
   }
   ship.trip.approachAt=at;ship.trip.until=at+plans[port.id].approachMs;
   ship.phase='approach';ship.nextAt=ship.trip.until;continue;
  }
  onVoyage({...ship.trip,vessel:ship.vessel,destination:destination.id});
  ship.port=destination.id;ship.phase='dock';ship.dockAt=at;ship.nextAt=at+vessel.dockMs;delete ship.trip;
  state.harbors[destination.harbor]=true;
  onDock({port:ship.port,vessel:ship.vessel,dockAt:at,departureAt:ship.nextAt});
 }
 state.at=until;return state;
}

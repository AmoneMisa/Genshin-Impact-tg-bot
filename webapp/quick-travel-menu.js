export const QUICK_TRAVEL_SECTIONS = [
  {id:'cities',label:'Города'}, {id:'hunting',label:'Охота'}, {id:'catacombs',label:'Катакомбы и некрополи'}, {id:'raids',label:'Рейд-боссы'}, {id:'epics',label:'Эпические боссы'}, {id:'quests',label:'Квестовые монстры'},
];
export const QUICK_TRAVEL_LEVELS = [
  {id:'all',label:'Все уровни'},
  {id:'1',label:'1–19',min:1,max:19}, {id:'20',label:'20–39',min:20,max:39},
  {id:'40',label:'40–59',min:40,max:59}, {id:'60',label:'60–75',min:60,max:75},
  {id:'76',label:'76+',min:76,max:Infinity},
];
/** Use server quotes only; list all regions independently of the atlas viewport. */
export function quickTravelDestinations(state, section='cities', level='all') {
  if(section==='raids'||section==='epics')return (state.bosses||[]).filter(b=>Boolean(b.raid)===(section==='raids')).map(b=>({...b,id:b.name,name:b.nameCall||b.name,kind:'boss',gold:0,region:b.map?.region,levelMin:b.level,levelMax:b.level,missingSpawn:!b.map,unavailable:b.instanceEntry||!b.map||(!b.available&&!b.fighting)})).sort((a,b)=>a.levelMin-b.levelMin);
  if(section==='quests')return (state.questTargets||[]).flatMap(q=>{const quote=state.quickTravel?.locations?.find(l=>l.id===q.location);return quote?[{...q,gold:quote.gold,kind:'quest'}]:[];});
  if(section==='cities'){
   const quotes=state.quickTravel?.cities||[],walking=(state.nativeWalkCities||[]).filter(id=>!quotes.some(q=>q.id===id)).map(id=>({id,gold:null,unavailable:true,walkingOnly:true}));
   return [...quotes,...walking].flatMap(quote=>{
    const city=state.cities.find(c=>c.id===quote.id);
    return city && (city.id!==state.player.city||state.player.mode!=='city') ? [{...city,...quote,kind:'city'}] : [];
   });
  }
  const band=QUICK_TRAVEL_LEVELS.find(b=>b.id===level)||QUICK_TRAVEL_LEVELS[0];
  const quotes=state.quickTravel?.locations||[];
  // A restricted teleport must not hide a server-advertised walking destination.
  const walking=Object.keys(state.nativeWalk||{}).filter(id=>!quotes.some(q=>q.id===id)).map(id=>({id,gold:null,unavailable:true,walkingOnly:true}));
  return [...quotes,...walking].flatMap(quote=>{
    const place=state.locations.find(l=>l.id===quote.id);
    if(!place||place.instance)return [];
    const catacomb=place.id.startsWith('catacomb-')||place.id.startsWith('necropolis-');
    if((section==='catacombs')!==catacomb)return [];
    if(section==='hunting'&&band.min&&(place.levelMin<band.min||place.levelMin>band.max))return [];
    return [{...place,...quote,kind:'location'}];
  }).sort((a,b)=>a.levelMin-b.levelMin||a.name.localeCompare(b.name,'ru'));
}

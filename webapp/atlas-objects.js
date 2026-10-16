export const dungeonLocation=l=>l.dungeonType||l.id.startsWith('catacomb-')||l.id.startsWith('necropolis-');
/** The same atlas coordinates and categories are used in both world and region views. */
export function atlasObjects(state,layer,region,world=false){
 if(layer==='gracia')return []; // Artwork is available; no transport coordinates have been imported.
 const visible=l=>world||l.region===region;
 if(layer==='raids'||layer==='epics')return (state.bosses||[]).filter(b=>b.map&&visible(b.map)&&Boolean(b.raid)===(layer==='raids')).map(b=>({...b,...b.map,id:b.name,label:b.nameCall||b.name,kind:'boss',levelMin:b.level,levelMax:b.level}));
 if(layer==='quests')return (state.questTargets||[]).filter(visible).map(q=>({...q,label:q.name,kind:'quest'}));
 if(layer==='holdings')return (state.holdings||[]).filter(visible).map(h=>({...h,label:h.name,kind:'holding'}));
 return (state.locations||[]).filter(l=>visible(l)&&(layer==='special'?l.instance:!l.instance&&(layer==='dungeons'?dungeonLocation(l):!dungeonLocation(l)))).map(l=>({...l,label:l.name,kind:'location'}));
}

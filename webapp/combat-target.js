// Classic Lineage II con bands: Prima official guide, creature name colours.
// https://lineage2ertheia.com/css/images/placeholders/Lineage%20Ii%20-%20Prima%20Game%20Guide%202004.pdf
export function targetCon(mobLevel,playerLevel){
 const diff=Number(mobLevel)-Number(playerLevel);
 return diff<=-9?'blue':diff<=-6?'light-blue':diff<=-3?'green':diff<=2?'white':diff<=5?'yellow':diff<=8?'pink':'red';
}
export function shortMobName(name,max=18){
 const chars=Array.from(String(name||''));
 return chars.length<=max?chars.join(''):chars.slice(0,max-1).join('')+'…';
}

import fs from 'node:fs';
import {getZones} from '../../functions/game/hunt/huntMobs.js';
import {LOCATION_LEVELS,LEVEL_SOURCE} from '../../template/locationLevels.js';
import {LOCATIONS} from '../../template/worldMap.js';
import {roomLayout} from '../../functions/game/hunt/huntRooms.js';
import {continuousField} from '../../functions/game/world/continuousField.js';
import {nativeFieldSupported,placeNativeActor} from '../../functions/game/world/nativeFieldSpace.js';
import {nativeGroundBlock} from '../../functions/game/world/nativeGround.js';
import {worldGeodata,geoRegionId} from '../../functions/game/world/l2jGeodata.js';

const xyz=p=>['x','y','z'].every(k=>Number.isFinite(p?.[k]));
const missingRegions=new Set(),blocked=[],rows=[],territories=[];
for(const zone of getZones().filter(z=>!z.instance&&!continuousField(z,roomLayout(z))&&!nativeFieldSupported(z.id))){
 const model=LOCATION_LEVELS[zone.id],location=LOCATIONS.find(l=>l.id===zone.id),floors=[];
 for(const floor of model.floors){
  let fixed=0,valid=0,territory=0,unknown=0;
  for(const room of floor.rooms)for(const spawn of room.spawns||[]){
   if(spawn.coordinateSource!=='point'){
    if(spawn.polygon?.length>=3&&Number.isFinite(spawn.minZ)&&Number.isFinite(spawn.maxZ)){
     territory+=spawn.count;const xs=spawn.polygon.map(p=>p[0]),ys=spawn.polygon.map(p=>p[1]),regions=[];
     for(let x=Math.floor(Math.min(...xs)/32768);x<=Math.floor(Math.max(...xs)/32768);x++)for(let y=Math.floor(Math.min(...ys)/32768);y<=Math.floor(Math.max(...ys)/32768);y++){
      const region=`${x+20}_${y+18}`;regions.push(region);if(!worldGeodata.manifest.regions[region])missingRegions.add(region);
     }
     territories.push({zone:zone.id,floor:floor.number,npcId:spawn.id,count:spawn.count,sourceFile:spawn.sourceFile||spawn.file,sourceGroup:spawn.sourceGroup,regions});
    }else unknown+=spawn.count;
    continue;
   }
   fixed+=spawn.count;
   if(xyz(spawn)&&placeNativeActor({},spawn)){valid+=spawn.count;continue;}
   const region=xyz(spawn)?geoRegionId(spawn.x,spawn.y):null,ground=xyz(spawn)?worldGeodata.point(spawn):null;
   if(region&&!worldGeodata.manifest.regions[region])missingRegions.add(region);
   const issues=[!xyz(spawn)?'source_coordinates_missing':!ground?'geodata_missing':!ground.nswe?'nswe_blocked':null,xyz(spawn)?nativeGroundBlock(spawn):null,ground?nativeGroundBlock(ground):null].filter(Boolean);
   blocked.push({zone:zone.id,floor:floor.number,room:room.id,npcId:spawn.id,count:spawn.count,source:{x:spawn.x,y:spawn.y,z:spawn.z,file:spawn.file||spawn.sourceFile},region,ground,issues:[...new Set(issues)]});
  }
  // A stored teleport destination does not prove its approach or a stair path.
  const destinations=(floor.transports||[]).filter(t=>xyz(t.source)).map(t=>({floor:t.floor,mode:t.mode,source:t.source}));
  floors.push({floor:floor.number,title:floor.title,fixed,valid,territory,unknown,destinations});
 }
 rows.push({id:zone.id,name:zone.title,native:nativeFieldSupported(zone.id),entry:xyz(location)&&Boolean(location.entrySource||location.dungeonEntranceSource)?{x:location.x,y:location.y,z:location.z,source:location.entrySource||location.dungeonEntranceSource}:null,floors});
}
const total=key=>rows.reduce((n,r)=>n+r.floors.reduce((m,f)=>m+f[key],0),0),floorCount=rows.reduce((n,r)=>n+r.floors.length,0);
const report={npcSourceCommit:LEVEL_SOURCE.commit,geodataCommit:worldGeodata.manifest.commit,zoneCount:rows.length,floorCount,counts:{fixed:total('fixed'),validFixed:total('valid'),territory:total('territory'),unknown:total('unknown')},missingRegions:[...missingRegions].sort(),zones:rows,blocked,territories};
fs.writeFileSync('docs/interior-geodata-readiness.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('docs/interior-geodata-readiness.md',[
 '# Подземные и многоуровневые участки: исходные точки и геодата','',
 `После переноса поверхностных зон и проверенных подземных участков остаются **${rows.length}** других неинстансовых зон каталога, **${floorCount}** этажей/участков. Они пока используют адаптированные комнаты в общем Атласе. Этот отчёт проверяет исходные данные для следующего переноса, а не объявляет комнаты бесшовными. Внутренние приватные этажи существующих зон также попадают в проверку исходных точек.`, '',
 `Из **${total('fixed')}** фиксированных исходных мест наземная проверка допускает **${total('valid')}**. Дополнительно сохранены **${total('territory')}** мест в полигонах; их выбор и запретные области требуют отдельной проверки, центры не считаются спавнами. Без полного подтверждения координат — **${total('unknown')}** мест.`, '',
 '| Зона | Этажей | Наземная проверка фиксированных мест | В полигонах | Не подтверждены координаты | Исходный XYZ входа | Записаны XYZ назначения транспорта |',
 '| --- | ---: | ---: | ---: | ---: | --- | ---: |',
 ...rows.map(r=>`| ${r.name} | ${r.floors.length} | ${r.floors.reduce((n,f)=>n+f.valid,0)}/${r.floors.reduce((n,f)=>n+f.fixed,0)} | ${r.floors.reduce((n,f)=>n+f.territory,0)} | ${r.floors.reduce((n,f)=>n+f.unknown,0)} | ${r.entry?'Есть':'Не подтверждён'} | ${r.floors.reduce((n,f)=>n+f.destinations.length,0)} |`),'',
 `Отсутствующие бинарные регионы для фиксированных точек и прямоугольников охвата полигонов: ${report.missingRegions.map(s=>'`'+s+'`').join(', ')||'нет'}. Охват полигонов консервативен; наличие бинарного региона не доказывает пригодность слоя или межэтажного пути.`, '',
 'Полный список отклонённых точек, исходные XYZ, найденные слои, этажи и причины находится в [JSON](interior-geodata-readiness.json). Вода, закрытые двери, владения и отсутствующая геодата не обходятся переносом NPC. Правило высоты соответствует Spawn.java: при расхождении не менее 300 сохраняется исходный Z; это не делает разные слои соединёнными.', '',
 'Следующие проверки нужны отдельно для каждого участка: исходный внешний подход, реальный внутренний вход, лестницы/прыжки/телепортеры, слои геодаты, состояния дверей, сохранение NPC и приватных миров. Координаты назначения телепорта не подменяют координаты NPC взаимодействия. Например, путь Хеллбаунд → Стальная цитадель проходит через UrbanArea; наличие точки Джериана не разрешает телепорт к нему с поверхности.', '',
 'Воспроизведение: `node scripts/ui/report-interior-geodata.mjs`. Отчёт использует текущую консервативную наземную проверку; четыре сценарных двери Хеллбаунда не открываются офлайн без доверенного этапа.',''
].join('\n'));
console.log(JSON.stringify({zones:rows.length,floors:floorCount,...report.counts,missingRegions:report.missingRegions}));

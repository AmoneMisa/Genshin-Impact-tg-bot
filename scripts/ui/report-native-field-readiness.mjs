import fs from 'node:fs';
import registry from '../../template/nativeFieldPilot.js';
import routes from '../../template/nativeRoutes.js';
import islands from '../../template/nativeIslandRoutes.js';
import {LOCATION_LEVELS} from '../../template/locationLevels.js';
import {getZones} from '../../functions/game/hunt/huntMobs.js';
import {roomLayout} from '../../functions/game/hunt/huntRooms.js';
import {continuousField} from '../../functions/game/world/continuousField.js';
import {placeNativeActor} from '../../functions/game/world/nativeFieldSpace.js';
import {worldGeodata} from '../../functions/game/world/l2jGeodata.js';
import {nativeGroundBlock} from '../../functions/game/world/nativeGround.js';
import {sampleNativeTerritory,nativeTerritorySource} from '../../functions/game/world/nativeSpawnTerritory.js';
const zones=getZones().filter(z=>!z.instance&&continuousField(z,roomLayout(z))),blocked=[],blockedAreas=[],count=a=>a.reduce((n,s)=>n+s.count,0);
const names={geodata_missing:'Нет подтверждённого слоя геодаты',nswe_blocked:'Закрытый слой NSWE',swimming_required:'Требуется плавание',door_state_required:'Нужно состояние двери',holding_region_required:'Территория владения',spawn_height_gap:'Расхождение высоты не допускает коррекцию Spawn.java (< 300)'};
const rows=zones.map(zone=>{
 const slots=LOCATION_LEVELS[zone.id]?.floors.flatMap(f=>f.rooms.flatMap(r=>r.spawns||[]))||[];
 const fixed=slots.filter(s=>s.coordinateSource==='point'),areas=slots.filter(s=>s.coordinateSource!=='point'&&s.polygon?.length>=3&&Number.isFinite(s.minZ)&&Number.isFinite(s.maxZ));
 const unknown=slots.filter(s=>!fixed.includes(s)&&!areas.includes(s)),invalid=fixed.filter(s=>!placeNativeActor({},s));
 let seed=42;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(const source of areas){
  const rejected={},record=reason=>{if(reason)rejected[reason]=(rejected[reason]||0)+1;};
  const point=sampleNativeTerritory(nativeTerritorySource(zone.id,source),{random,
   geo:{point:p=>{const g=worldGeodata.point(p);record(!g?'geodata_missing':!g.nswe?'nswe_blocked':g.z>source.maxZ?'above_max_z':null);return g;}},
   allowed:p=>{const reason=nativeGroundBlock(p);record(reason);return !reason;}});
  if(!point)blockedAreas.push({zone:zone.id,npcId:source.id,count:source.count,sourceFile:source.file||source.sourceFile||null,sourceGroup:source.sourceGroup,polygon:source.polygon,minZ:source.minZ,maxZ:source.maxZ,rejected});
 }
 for(const source of invalid){
  const ground=worldGeodata.point(source),issues=[];
  if(!ground)issues.push('geodata_missing');
  else {if(!ground.nswe)issues.push('nswe_blocked');if(Math.abs(ground.z-source.z)>=300)issues.push('spawn_height_gap');}
  issues.push(nativeGroundBlock(source));if(ground)issues.push(nativeGroundBlock(ground));
  blocked.push({zone:zone.id,npcId:source.id,source:{x:source.x,y:source.y,z:source.z},sourceFile:source.file||source.sourceFile||null,ground,issues:[...new Set(issues.filter(Boolean))]});
 }
 const supported=Object.hasOwn(registry.fields,zone.id),route=Boolean(routes.routes[zone.id]?.available);
 const state=supported?'Мировой бой подключён':!route?'Нужен отдельный островной или сценарный вход':invalid.length?'Есть неподтверждённые наземные спавны':blockedAreas.some(a=>a.zone===zone.id)?'Ограниченный поиск наземных точек не прошёл проверку':areas.length?'Проверка и перенос исходного населения':unknown.length||!slots.length?'Нет подтверждённого исходного размещения':'Фиксированные точки готовы к переносу';
 return {id:zone.id,name:zone.title||zone.name||zone.id,route,islandRoute:Boolean(islands.routes[zone.id]?.available),fixed:count(fixed),validFixed:count(fixed)-count(invalid),areas:count(areas),unknown:count(unknown),state};
});
const issues=Object.fromEntries(Object.keys(names).map(key=>[key,blocked.filter(b=>b.issues.includes(key)).length]).filter(([,n])=>n));
fs.writeFileSync('docs/native-field-readiness.json',JSON.stringify({sourceCommit:registry.source.commit,geodataCommit:worldGeodata.manifest.commit,zoneCount:zones.length,nativeFieldCount:Object.keys(registry.fields).length,zones:rows,blocked,blockedAreas},null,2)+'\n');
fs.writeFileSync('docs/native-field-readiness.md',[
 '# Следующие участки мировой карты','',
 `Аудит **${zones.length}** наземных зон текущего каталога. Мировой бой подключён у **${Object.keys(registry.fields).length}** участков; [реестр и проверенные позиции](native-field-registry.md). Наличие адаптированных комнат, картинки или дороги не считается переносом населения в мировые координаты.`, '',
 '| Зона | Наземный подход | Подтверждено фиксированных позиций | Количество в исходных областях | Без подтверждённого размещения | Следующий этап |','| --- | --- | ---: | ---: | ---: | --- |',
 ...rows.map(r=>`| ${r.name} | ${r.islandRoute?'От островного причала':r.route?'Да':'Нет'} | ${r.validFixed}/${r.fixed} | ${r.areas} | ${r.unknown} | ${r.state} |`),'',
 '## Фиксированные точки, не допускаемые текущим наземным движком','',
 `В ещё не перенесённых зонах обнаружено **${blocked.length}** таких записей. Все исходные XYZ, NPC, файлы, найденные слои и причины доступны в [машиночитаемой сверке](native-field-readiness.json). Одна запись может иметь несколько причин.`, '',
 '| Причина | Записей |','| --- | ---: |',...Object.entries(issues).map(([key,n])=>`| ${names[key]} | ${n} |`),'',
 '## Области с исчерпанным наземным поиском','',
 '| Зона / исходная группа | NPC | Мест | Причины отклонённых геопроб |','| --- | ---: | ---: | --- |',
 ...blockedAreas.map(a=>`| ${a.zone} / ${a.sourceGroup} | ${a.npcId} | ${a.count} | ${Object.entries(a.rejected).map(([reason,n])=>(names[reason]||reason)+': '+n).join('; ')||'Исчерпаны предложения внутри полигона'} |`),'',
 'Проверка использует фиксированное зерно 42 и пределы H5 для ограниченного поиска; это воспроизводимый отказ наземного движка, а не доказательство отсутствия всех возможных точек. Для ещё не подключённых зон успешная проба не подтверждает перенос исходных запретных областей или сценарного AI. Полные исходные полигоны и причины отказа доступны в JSON.','',
 'Эти исходные координаты не заменяются ближайшими проходимыми точками. Области появления сохраняют исходные полигоны и диапазоны Z; их центры использованы только для разбиения старой адаптированной сетки. Мировой выбор точек в исходных полигонах уже подключён у зарегистрированных участков. Для остальных зон нужны проверка исходных запретных областей, охвата геодаты и отдельный перенос с проверкой лимитов населения. Центр полигона не считается точным спавном.', '',
 'Подземелья, многоэтажные пространства, транспорт, Грация, специальные AI и общий банк NPC требуют отдельных этапов. Эта таблица не оценивает полноту всего мира High Five. Воспроизведение: `node scripts/ui/report-native-field-readiness.mjs`.',''
].join('\n'));
console.log(`${zones.length} surface zones; ${Object.keys(registry.fields).length} native combat fields; ${blocked.length} blocked fixed positions`,issues);

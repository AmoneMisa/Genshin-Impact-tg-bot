import fs from 'node:fs';
import assert from 'node:assert/strict';
import {getZones} from '../../functions/game/hunt/huntMobs.js';
import {LOCATION_LEVELS} from '../../template/locationLevels.js';
import {roomLayout,adjacent} from '../../functions/game/hunt/huntRooms.js';
import {levelTransitions} from '../../functions/game/hunt/locationLevels.js';
import {continuousField} from '../../functions/game/world/continuousField.js';
import {roomSceneUrl} from '../../webapp/room-scene-art.js';
import nativeRoutes from '../../template/nativeRoutes.js';

const zones=getZones().filter(z=>!z.instance),rows=[];
let rooms=0,floors=0,transitions=0;
const pictures=new Set();
for(const zone of zones){
 const model=LOCATION_LEVELS[zone.id];assert.ok(model,zone.id+' source population');
 let localRooms=0,localTransitions=0;
 for(const level of model.floors){
  const layout=roomLayout(zone,level.number),ids=new Set(layout.rooms.map(r=>r.id));
  assert.equal(ids.size,layout.rooms.length,zone.id+' unique rooms');
  assert.ok(ids.has(layout.startId));
  const reached=new Set([layout.startId]);let previous=-1;
  while(previous!==reached.size){previous=reached.size;for(const r of layout.rooms)if(layout.rooms.some(a=>reached.has(a.id)&&adjacent(a,r)))reached.add(r.id);}
  assert.equal(reached.size,ids.size,zone.id+' connected authored rooms');
  for(const endpoint of levelTransitions(zone.id,{floor:level.number,room:layout.startId,x:.5,y:.5}).destinations){
   assert.ok(model.floors.some(f=>f.number===endpoint.floor),zone.id+' destination floor');
   assert.ok(ids.has(endpoint.room),zone.id+' departure room');
   assert.ok([endpoint.point?.x,endpoint.point?.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1),zone.id+' adapted departure point');
   localTransitions++;
  }
  for(const compact of [true,false]){
   const url=roomSceneUrl(level.environment,{sceneKey:`${zone.id}:${layout.startId}:floor-${level.number}`,compact});
   assert.ok(fs.existsSync('webapp'+url),url);
   assert.ok(fs.statSync('webapp'+url).size<(compact?180000:800000),url+' mobile budget');pictures.add(url);
  }
  floors++;localRooms+=layout.rooms.length;
 }
 rooms+=localRooms;transitions+=localTransitions;
 rows.push({zone,surface:continuousField(zone,roomLayout(zone)),floors:model.floors.length,rooms:localRooms,transitions:localTransitions});
}
const surface=rows.filter(r=>r.surface),separate=rows.filter(r=>!r.surface);
const lines=[
 '# Проверка обработки базовой карты','',
 'Результаты последнего полного прогона: [проверка 20 октября 2026](map-processing-validation.md).', '',
 `Проверены все **${zones.length}** неинстансовые зоны текущего Атласа: **${floors}** этажей/участков, **${rooms}** комнаты и **${transitions}** направленных переходов между этажами. Проверка не утверждает полноту всех территорий и сценариев оригинальной High Five.`, '',
 `Все **${surface.length}** наземных зон используют непрерывную ходьбу внутри локации, соседние банки NPC и общее отображение. Остальные **${separate.length}** зоны сохраняют отдельные комнаты, этажи и проверяемые входы. Для них отсутствие наземного потока является правилом разделения пространств, а не пропущенным подключением.`, '',
 `Проверены существование **${pictures.size}** вариантов окружения и ограничения размера: менее 180 КБ для мобильного изображения, 800 КБ для большого. На каждом этаже проверены уникальность комнат, достижимость от входа, существование целевого этажа и исходной комнаты локального перехода. Локальные сетки и точки переходов адаптированы и не выдаются за геодату.`, '',
 'Устранён цикл повторной загрузки тайлов Атласа при обзоре поселений: видимая детализация ограничена ёмкостью существующего кеша — 12 тайлов на узком экране, 24 на широком. Приоритет получают тайлы у центра; на краях остаётся обзорная карта. Отсутствующие исходные тайлы не подменяются новой географией. Проверка загрузки: `node --test test/atlas-map-art.test.js`; восемь мирных поселений и управление без Canvas: `node scripts/ui/check-world-settlements.mjs`; Грация и Ишума: `node scripts/ui/check-missing-world.mjs`.', '',
 '## Локации','',
 '| Локация | Пространство | Этажи/участки | Комнаты | Межэтажные переходы |',
 '| --- | --- | ---: | ---: | ---: |',
 ...rows.map(r=>`| ${r.zone.title} | ${r.surface?'Наземный поток':'Отдельное'} | ${r.floors} | ${r.rooms} | ${r.transitions} |`), '',
 '## Что препятствует полной бесшовной карте','',
 `После базовой обработки подключён отдельный официальный набор геодаты L2J High Five. Локаций с проверенными наземными путями и связями через исходные городские точки: ${Object.values(nativeRoutes.routes).filter(r=>r.available).length}. Подробности: [геодата и первые связи](native-geodata.md). Высоты и NSWE проверяются по бинарным файлам; охват NPC и полигоны выбора Атласа не выдаются за геодату.`, '',
 'Региональная склейка остаётся частичной: адаптированные комнаты и их население ещё не перенесены целиком в мировые клетки. На соединительных путях пока нет боя. Дальние маршруты внутри локальных охотничьих сеток за окном девяти участков и единая композиция окружения также остаются отдельными задачами. Атлас сохраняет единую навигацию и существующие серверные проверки входа.', '',
 '## Сценарии вне базовой обработки карты','',
 'Не завершены мировая кампания Хеллбаунда, сценарии Тулли/Найи, полные фазы Seeds, кормление и приручение на Ферме зверей, подклассовая цепочка с посмертными сундуками и награда за семь драконов Гилмора. Наличие этажей, исходных NPC и входов не считается реализацией этих сценариев. Подробности: [расширение мира](missing-world-coverage.md) и [условное население](conditional-populations.md).', '',
 '## Воспроизведение','',
 '`node scripts/ui/report-map-processing.mjs` проверяет структуру и обновляет этот отчёт. `node --test test/surface-location-coverage.test.js test/location-levels.test.js` проверяет серверное сохранение, исходное население и разделение пространств. `node scripts/ui/check-location-levels.mjs` проверяет реальные экраны всех этажей на 320/390/1100 px; отдельные режимы проверяют работу без WebGL, Phaser и рисунков окружения. Набор зон можно задать через `LOCATION_LEVEL_ZONE`.', ''
];
fs.writeFileSync('docs/map-processing.md',lines.join('\n'));
console.log(`${zones.length} zones; ${surface.length} continuous, ${separate.length} separate; ${floors} floors; ${rooms} rooms; ${transitions} floor transitions; ${pictures.size} pictures`);

import fs from 'node:fs';
import {LOCATION_LEVELS} from '../../template/locationLevels.js';
import {LOCATIONS} from '../../template/worldMap.js';
import registry from '../../template/nativeFieldPilot.js';
import ports from '../../template/nativeFloorTransports.js';
import routes from '../../template/nativeRoutes.js';

// Inventory of this game's catalog, not a claim to cover the entire H5 world.
const labels={
 dungeon_native_movement_and_gates:'Подключение геодаты и исходных зиккуратов (свободный вход)',
 swimming_and_vertical_routes:'Плавание и переходы между ярусами',
 swimming_ship_and_zaken_scenario:'Водный подход, корабль и сценарий Закена',
 church_drop_mirrors_and_doors:'Спуск из церкви, зеркала и двери Пагана',
 hellbound_private_scenario:'Приватный сценарий башен Хеллбаунда',
 gracia_private_scenario:'Сценарий Семени и доступ на Грацию',
 epic_admission_and_instance:'Перенос покоев эпика в мировую геодату с сохранением допуска',
 native_population_and_routes:'Перенос населения и проверка маршрутов',
};
function pending(id,location){
 if(location?.dungeonType)return 'dungeon_native_movement_and_gates';
 if(id==='garden-of-eva')return 'swimming_and_vertical_routes';
 if(id==='devils-isle')return 'swimming_ship_and_zaken_scenario';
 if(id==='pagan-temple')return 'church_drop_mirrors_and_doors';
 if(['steel-citadel','tower-of-infinitum','tully-workshop','tower-of-naia'].includes(id))return 'hellbound_private_scenario';
 if(id.startsWith('seed-of-'))return 'gracia_private_scenario';
 return 'native_population_and_routes';
}
const rows=Object.entries(LOCATION_LEVELS).map(([id,model])=>{
 const location=LOCATIONS.find(l=>l.id===id),native=registry.fields[id],reviewed=native?(native.reviewedFloors||native.floors||[1]):[];
 const deferred=model.floors.filter(f=>!reviewed.includes(f.number)).map(f=>({floor:f.number,title:f.title,boss:f.boss||null,reason:f.boss?'epic_admission_and_instance':pending(id,location)}));
 const scripted=Object.values(ports.zones[id]||{}).flatMap(p=>Array.isArray(p)?p:[p]).flatMap(p=>p.targets.filter(t=>t.scenarioRequired).map(t=>({npcId:p.npcId,list:t.list,index:t.index,scenario:t.scenarioRequired,source:t.source})));
 return {id,name:location?.name||id,nativePopulation:Boolean(native),catalogFloors:model.floors.map(f=>f.number),reviewedFloors:reviewed,deferredFloors:deferred,catalogSourcePlaces:model.floors.flatMap(f=>f.rooms).flatMap(r=>r.spawns||[]).reduce((n,s)=>n+s.count,0),nativeSourcePlaces:native?.count||0,unavailablePlaces:native?.unavailableCount||0,sourceGaps:native?.sourceGaps||[],guardedScenarioRoutes:scripted,groundApproach:Boolean(routes.routes[id]&&!routes.routes[id].unavailable)};
});
const totals={catalogZones:rows.length,nativePopulationZones:rows.filter(r=>r.nativePopulation).length,adaptedPopulationZones:rows.filter(r=>!r.nativePopulation).length,reviewedFloors:rows.reduce((n,r)=>n+r.reviewedFloors.length,0),deferredFloors:rows.reduce((n,r)=>n+r.deferredFloors.length,0),partialPopulationZones:rows.filter(r=>r.unavailablePlaces>0).length,guardedScenarioRoutes:rows.reduce((n,r)=>n+r.guardedScenarioRoutes.length,0)};
const globalPending=['Общий серверный банк населения для нескольких игроков','Специальный AI и динамические миньоны по исходным скриптам','Плавание и исходная вертикальная физика','Приватные и эпические сценарии с проверками доступа и выхода'];
fs.writeFileSync('docs/world-map-completion.json',JSON.stringify({sourceCommit:registry.source.commit,geodataCommit:routes.geodataCommit,totals,globalPending,zones:rows},null,2)+'\n');
fs.writeFileSync('docs/world-map-completion.md',[
 '# Состояние переноса мировой карты','',
 `В каталоге **${totals.catalogZones}** локации. Исходное население в мировых координатах подключено у **${totals.nativePopulationZones}**, из них **${totals.partialPopulationZones}** имеют явно сохранённые недоступные места. Ещё **${totals.adaptedPopulationZones}** используют адаптированные банки. Подключённые этажи и наземные участки: **${totals.reviewedFloors}**; **${totals.deferredFloors}** этажей остаются за пределами переноса, включая отдельные покои эпиков. Это не процент готовности: один этаж или сценарий может требовать больше работы, чем наземная зона.`,
 '', 'Наличие дороги или картинки не означает завершение локации. Подключённое население не означает готовность всех скриптов, миньонов, дверей и приватных сценариев. Вся карта пока не завершена. Этот отчёт охватывает текущий игровой каталог, а не все территории оригинального High Five.','',
 '## Неперенесённые этажи','',
 '| Локация | Подключённые этажи | Остались | Необходимая работа |','| --- | --- | --- | --- |',
 ...rows.filter(r=>r.deferredFloors.length).map(r=>`| ${r.name} | ${r.reviewedFloors.join(', ')||'—'} | ${r.deferredFloors.map(f=>f.floor).join(', ')} | ${[...new Set(r.deferredFloors.map(f=>labels[f.reason]))].join('; ')} |`),
 '', '## Ограничения подключённых участков','',
 ...rows.filter(r=>r.unavailablePlaces||r.guardedScenarioRoutes.length).map(r=>`- ${r.name}: ${r.unavailablePlaces?`исходных мест, недоступных наземному движку: ${r.unavailablePlaces}`:''}${r.unavailablePlaces&&r.guardedScenarioRoutes.length?'; ':''}${r.guardedScenarioRoutes.length?`направлений, требующих отдельного сценария: ${r.guardedScenarioRoutes.length}`:''}.`),
 '', '## Общая оставшаяся работа','',...globalPending.map(s=>'- '+s+'.'),
 '', 'Полные исходные ограничения, списки этажей и происхождение закрытых направлений — в [машиночитаемом отчёте](world-map-completion.json). Подробности спавнов — в [реестре населения](native-field-registry.md), вода и владения — в [проверке наземного размещения](native-field-readiness.md).','',
 'Воспроизведение: `node scripts/ui/report-world-map-completion.mjs`. Данные берутся из действующих каталога, реестра и исходных списков переходов; перечень оставшихся сценариев служит планом работ, а не разрешением обходить ограничения.','',
].join('\n'));
console.log(totals);

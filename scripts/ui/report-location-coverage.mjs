import fs from 'node:fs';
import {getZones} from '../../functions/game/hunt/huntMobs.js';
import {roomEnvironment} from '../../functions/game/hunt/huntRooms.js';
import {roomSceneUrl} from '../../webapp/room-scene-art.js';
import {HUNT_EXPLORATION} from '../../template/huntExploration.js';

const zones=getZones().map(zone=>{
 const url=roomSceneUrl(roomEnvironment(zone),{sceneKey:zone.id+':r0c0'});
 return {...zone,url,individual:url?.split('/').at(-1)===zone.id+'-v1.webp'||url?.split('/').at(-1)===zone.id+'-v2.webp'};
});
const individual=zones.filter(z=>z.individual),shared=zones.filter(z=>!z.individual);
const label=zone=>zone.title||zone.name||zone.id;
const lines=[
 '# Покрытие охотничьих локаций', '',
 `Индивидуальные рисунки: **${individual.length} из ${zones.length}** зон, включая подземелья и инстансы. Общие тематические фоны: **${shared.length}**.`, '',
 'Это оценка окружения, а не подтверждение полной реализации всех механик High Five. Локальные комнаты и рисунки являются художественной адаптацией, не оригинальной геодатой.', '',
 '## Индивидуальное окружение', '',
 '| Локация | Исследуемых участков / вариантов |', '| --- | --- |',
 ...individual.map(zone=>`| ${label(zone)} | ${HUNT_EXPLORATION.find(z=>z.id===zone.id)?.names.length||1} |`), '',
 '## Остаётся индивидуально оформить', '',
 ...shared.map(zone=>`- ${label(zone)} (${zone.id})`), '',
 'Отчёт обновляется командой `node scripts/ui/report-location-coverage.mjs`.', '',
 'Последняя серия: земли Вуку, крепость Брека, Улей, Берег Аллигаторов и застава Тимак. По три связанных исследуемых участка на зону, desktop 1536×1024 и mobile 768×512. Превью: [пять охотничьих локаций](hunting-continuation.jpg); полные промпты и происхождение: `webapp/art/world/scenes/hunting-continuation.source.js`; игровые референсы: `art-source/location-references/hunting-continuation/sources.json`.', '',
 '«Земли орков Вуку» — существующее название зоны проекта, а не подтверждённое отдельное имя оригинальной локации. Для рисунков использован референс почвы и растительности Нейтральной зоны; исходные координаты Атласа не менялись. Брека изображена открытой холмистой местностью без выдуманной крепости, Улей — лугами с небольшим домом под соломенной крышей. Точная хроника исходных скриншотов не установлена; они используются только как художественные референсы.', '',
];
fs.writeFileSync('docs/location-coverage.md',lines.join('\n'));
console.log(`${individual.length}/${zones.length} individual hunting environments; ${shared.length} shared`);

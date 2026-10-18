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
 'Последняя серия: Равнины Славы, Поля Резни и Болото Криков. По три связанных исследуемых участка на зону, desktop 1536×1024 и mobile 768×512. Превью: [локации Адена и Руны](aden-rune-hunting.jpg); полные промпты и происхождение: `webapp/art/world/scenes/aden-rune-hunting.source.js`; игровые скриншоты и ссылки: `art-source/location-references/aden-rune-hunting/sources.js`.', '',
 'Палитра, каменистые склоны Равнин Славы, хвойные поляны и фрагмент стены Разорённого замка у Полей Резни, кольцевые заводи Болота Криков сверены с игровыми скриншотами L2Vika. Точная хроника снимков не подтверждена: они используются только для окружения. Названия участков — описания адаптированных комнат, не оригинальные топонимы. Координаты Атласа, цены телепорта, NPC, дроп и награды этой серией не меняются. Стена на рисунке не создаёт новый вход во владение.', '',
 'Проверка серии: `EXPLORATION_ZONES=plains-of-glory,fields-of-massacre,swamp-of-screams node scripts/ui/check-hunt-exploration.mjs`. Все три зоны проверены на 320/390/1100 px с сенсорным управлением и reduced motion; общий рендер дополнительно проверен на 320 px без WebGL, без Phaser и при недоступных рисунках. Проверены переходы, возврат, разные сцены, видимость персонажа, отсутствие переполнения и очистка окна. Изображения ограничены 180 КБ для mobile и 800 КБ для desktop.', '',
 'Предыдущая серия: земли Вуку, крепость Брека, Улей, Берег Аллигаторов и застава Тимак. Превью: [пять охотничьих локаций](hunting-continuation.jpg); полные промпты и происхождение: `webapp/art/world/scenes/hunting-continuation.source.js`; игровые референсы: `art-source/location-references/hunting-continuation/sources.json`.', '',
 '«Земли орков Вуку» — существующее название зоны проекта, а не подтверждённое отдельное имя оригинальной локации. Для рисунков использован референс почвы и растительности Нейтральной зоны; исходные координаты Атласа не менялись. Брека изображена открытой холмистой местностью без выдуманной крепости, Улей — лугами с небольшим домом под соломенной крышей. Точная хроника исходных скриншотов не установлена; они используются только как художественные референсы.', '',
];
fs.writeFileSync('docs/location-coverage.md',lines.join('\n'));
console.log(`${individual.length}/${zones.length} individual hunting environments; ${shared.length} shared`);

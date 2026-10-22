import fs from 'node:fs';
import assert from 'node:assert/strict';
import registry from '../../template/nativeFieldPilot.js';
import {LOCATION_LEVELS} from '../../template/locationLevels.js';
import {LOCATIONS,CITIES} from '../../template/worldMap.js';
import {WORLD_EXTENSION} from '../../template/worldExtension.js';
import {placeNativeActor} from '../../functions/game/world/nativeFieldSpace.js';
const entries=Object.entries(registry.fields),total=entries.reduce((n,[,m])=>n+m.count,0);
const rows=entries.map(([id,m])=>{
 const slots=LOCATION_LEVELS[id].floors[0].rooms.flatMap(r=>r.spawns||[]),valid=slots.filter(s=>placeNativeActor({},s));
 assert.equal(valid.length,slots.length,`${id}: missing original ground spawn`);
 assert.equal(slots.reduce((n,s)=>n+s.count,0),m.count);
 return `| ${WORLD_EXTENSION.find(r=>r.zone.id===id)?.zone.title||LOCATIONS.find(l=>l.id===id)?.name||id} | ${CITIES.find(c=>c.id===m.city)?.name||m.city} | ${m.count} | ${m.npcIds.join(', ')} | ${valid.length}/${slots.length} |`;
});
fs.writeFileSync('docs/native-field-registry.md',[
 '# Исходное население в мировом Атласе','',
 `Подключено **${entries.length}** наземных участков, **${total}** фиксированных позиций. Каждая строка использует исходные XY, проверенный слой геодаты и отдельное сохраняемое население. Список относится к мировому бою, а не ко всем зонам каталога.`, '',
 '| Участок | Городский маршрут | Позиций | Исходные NPC | Проверены по геодате |','| --- | --- | ---: | --- | --- |',...rows,'',
 'Реестр: `template/nativeFieldPilot.js`. Скорости бега и дальности обычных атак импортируются из закреплённых XML High Five; SHA-256 каждого файла сохраняется. Источники каждой позиции и возрождения находятся в `template/locationLevels.js`. Произвольные точки вместо исходных не создаются. Коррекция высоты наземного спавна следует исходному `Spawn.java`: строго меньше 300 единиц.', '',
 '`node --test test/native-field-registry.test.js` проверяет каждую зарегистрированную зону: исходные позиции, границу DTO, отсутствие дубликатов, сохранение/загрузку, пеший возврат в город и возвращение с прежними HP и instanceId. `NATIVE_PILOT_ZONE=<id> node scripts/ui/check-native-field-pilot.mjs` проверяет бой, добычу, ходьбу и возврат на 320/390/1100 px, без Canvas и без изображений.', '',
 'Отчёт воспроизводится: `node scripts/ui/report-native-fields.mjs`. Его успешное построение подтверждает исходные позиции, но не заменяет серверные и браузерные проверки. Полная видимость GeoEngine, специальные умения исходного AI, мировое PvP и общий банк NPC для всех игроков остаются отдельными этапами. Подробнее: [мировая охота и ограничения](native-field-pilot.md).',''
].join('\n'));
console.log(`${entries.length} native combat fields; ${total} verified fixed ground positions`);

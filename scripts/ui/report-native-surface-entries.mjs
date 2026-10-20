import fs from 'node:fs';
import entries from '../../template/nativeSurfaceEntries.js';
import routes from '../../template/nativeRoutes.js';
import {LOCATIONS,CITIES} from '../../template/worldMap.js';
const lines=['# Дополнительные наземные входы High Five','',
 'Пути соединяют исходного городского хранителя портала с именованной NORMAL-точкой High Five. Высоты, NSWE, водные и дверные ограничения проверяются в обе стороны. Телепорт сохраняет исходного NPC, цену и общие скидки High Five. Чужой хранитель не получает этот маршрут по совпадению региона.','',
 '| Локация | Город | Исходные XYZ | Обычный тариф, адена | Длина пешего пути |','| --- | --- | --- | ---: | ---: |',
 ...Object.entries(entries).map(([id,e])=>`| ${LOCATIONS.find(l=>l.id===id)?.name||id} | ${CITIES.find(c=>c.id===e.region)?.name||e.region} | ${e.x}, ${e.y}, ${e.z} | ${e.teleportGold} | ${routes.routes[id]?.available?Math.round(routes.routes[id].distance):'не подтверждён'} |`),'',
 'Исходные маршруты закреплены на коммите Mobius 9fb01cb20513e55190cdde8d91e41be2c0914f84; у каждой точки указан файл, имя назначения, NPC и SHA-256. Квадрат выбора вокруг обновлённой точки — явно помеченный авторский охват Атласа; он не объявляется геодатой. Комнаты охоты пока сохраняют адаптированное окружение. При уходе и повторном входе сервер восстанавливает один банк NPC, включая HP и идентификаторы.','',
 'Добавление: `python scripts/l2j/import-native-surface-entries.py ID`, затем `node scripts/l2j/build-native-routes.mjs ID`. Публиковать источник вместе с маршрутом следует только после успешной проверки прохода. Бюджеты поиска игровых действий при этом не увеличиваются.','',
 'Ограничение: запись Орен → Ivory Tower содержит `castleId=4`. По исходному `entity/teleporter/TeleportHolder.java` это запрещает телепорт во время осады замка Орена. Проверка состояния этой осады ещё не подключена к расчёту маршрута; импортёр явно отклоняет такие записи. Новый подход к Ivory Tower этим этапом не опубликован.','',
 'Проверки: `node --test test/native-surface-entries.test.js test/native-travel.test.js test/native-town-travel.test.js`; `NATIVE_FIRST_ZONE=ID NATIVE_SECOND_ZONE=ДРУГАЯ_СВЯЗАННАЯ_ЗОНА node scripts/ui/check-native-world.mjs` — мобильные и широкая ширины, отсутствие Canvas, остановка, восстановление, физический вход/выход из охоты, очистка попапов и таймеров.','',
 'Обновление отчёта: `node scripts/ui/report-native-surface-entries.mjs`. [Геодата и ограничения](native-geodata.md).',''];
fs.writeFileSync('docs/native-surface-roads.md',lines.join('\n'));console.log(Object.keys(entries).length,'source surface entrances');

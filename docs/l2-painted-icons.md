# Прежние картины в оформлении L2

Подготовлены 256 отдельных иконок из сохранённых больших картин: оружие, эпическое оружие, броня, щиты, бижутерия и дополнительные варианты экипировки. Исходные картины в `webapp/art/items/v1/` и `art-source/items/` не изменены.

Галерея: `docs/l2-painted-icons-preview.html`. Плащи вынесены в отдельный раздел. Броня имеет зелёный фон, оружие и щиты — красный. Коллекция для новых сетов: `webapp/art/items/l2-style/collection.zip`. Имена предметов и стабильные ключи файлов перечислены в `webapp/art/items/l2-style/manifest.json`. Привязки к новым сетам не создаются: их пользователь распределит отдельно.

Каждая иконка — готовый квадратный WebP 32×32 с фоном внутри изображения. В архиве также есть увеличения 64×64 и отдельный фон. В игре используются увеличения 128/256/512 ближайшим пикселем того же изображения 32×32. Новое оформление подключено к прежним картинам; отсутствующие картины по-прежнему используют клиентские L2-иконки.

Общая основа фонов: тёмная кожа — бордовая для оружия и щитов, зелёная для брони, холодная бирюзовая для бижутерии, свет сверху слева, затемнение справа внизу, тонкая латунная квадратная рамка. Клинки и посохи располагаются по диагонали; остальные предметы сохраняют композицию. Иконки экспортируются из одного компонента интерфейса размером 32×32: предмет в области 30×30, фон экипировки: hue-rotate 115° / насыщенность 0.55; бижутерии: hue-rotate 165° / насыщенность 0.55; насыщенность предмета 0.82, яркость 1.18, контраст 1.14, небольшая тень. Это оформление существующих картин, без создания новых форм предметов.

Фон создан встроенным imagegen и сохранён в `art-source/l2-style/slot-background.png`. Промпт:

> Generate ONE square empty background plate for a 32 x 32 pixel Lineage II High Five style inventory icon. No item, no weapon, no armor, no symbols, no text. Dark antique burgundy-brown near-black background, very subtle muted warm red light at upper left fading to black at lower right, finely painted aged leather texture, extremely restrained thin dark brass beveled square border at the outer edge, sharp corners. The center must be empty and quiet for a separately layered existing equipment painting. Classic 2000s fantasy MMORPG inventory UI appearance, sober muted palette, readable at 32 pixels. Square 1:1 composition. Not ornate, no glowing gems, no decorative corner flourishes, no transparency.

Полный справочник High Five: `docs/l2-high-five-equipment-preview.html` — 217 конфигураций комплектов из 21 XML, включая PvP-варианты, и 35 записей плащей. Для всех частей найден оригинальный ассет. В справочнике видны состав, альтернативные части и идентификаторы предметов; комплектный архив `webapp/art/l2/high-five-equipment.zip` содержит 285 оригинальных иконок 32×32 и полный манифест. Это исходные иконки L2 для тех комплектов, которых среди наших прежних картин нет.

Источник списка: [L2J Mobius High Five, stats/armorsets](https://gitlab.com/MobiusDevelopment/L2J_Mobius/-/tree/9fb01cb20513e55190cdde8d91e41be2c0914f84/L2J_Mobius_CT_2.6_HighFive/dist/game/data/stats/armorsets). Снимок совпадает с использованным для предметов. Импорт: `node scripts/l2j/import-local-icons.mjs <icons> <items>`, публикация `python scripts/l2j/convert-local-icons.py`, справочник `python scripts/l2j/build-hf-equipment-preview.py`.

Для воспроизведения: `node scripts/items/build-l2-style.mjs`, затем `python scripts/items/convert-l2-style.py`. Для первого шага нужны пути Playwright и Chrome в `PLAYWRIGHT_PACKAGE` / `DESIGN_BROWSER`.

Исправлена ошибка выбора сапог для 14 проектных эпических оружий: прежняя нормализация удаляла все кириллические буквы, после чего пустое имя совпадало с чужим предметом. Теперь нормализация сохраняет буквы Unicode, совпадения ограничены типом предмета, а проектные эпики используют свои картины. Это проверяется на всём списке эпического оружия.

Проверены формат всех WebP, размеры 32×32, загрузка всех 256 иконок в галерее и отсутствие переполнения на 320/390/1100 px. Проверяются также настоящие окна торговцев, инвентаря и группы.

# Изображения из локальных ассетов Lineage II

Источник: предоставленная пользователем папка `C:/Users/kubai/Desktop/icons/` (6340 PNG). Названия файлов сопоставлены с `icon` в XML предметов L2J Mobius CT 2.6 High Five. Список исходных файлов и размеров: `art-source/l2-redraw/sources.json`.

Готовые картины оружия, брони и щитов не заменялись. Новые оригинальные иконки подключены к материалам, реальному дропу, рецептам, краскам, свиткам, кристаллам, зарядам, самоцветам, печатям, кристаллам души, валютам, зельям и бижутерии. Один клиентский рисунок может использоваться несколькими предметами, как в L2; ступень SA и грейд остаются в названии предмета. Краски не получают искусственный цветовой фильтр.

Публикуются lossless WebP 128/256/512. Увеличение ближайшим пикселем сохраняет исходные пиксели, без дорисовки или изменения цвета. Это оригинальные небольшие клиентские иконки, а не новые картины высокого разрешения. Для игровых яиц использованы существующие картинки Basilisk Egg и Dragon Egg; игровые свойства не менялись. Для проектного Magic Necklace выбран ближайший образ Blessed Necklace — точного совпадения названия в клиенте нет.

Категории дропа получили свои значки на охоте и в инвентаре. В группе используются клиентские значки подбора предмета, кубика и короны лидера; для очереди — базовая круговая стрелка WebP. Новая эмблема группы изображает трёх героев. Торговцы получили пять независимых баннеров 3:2 и иконки разделов; оружие и броня на прилавках используют прежние готовые картины.

Для 78 предметов оружия, брони и щитов, у которых собственной картины не было, добавлены клиентские иконки. Они выбираются только после проверки существующей готовой картины. Полное соответствие названий и ближайшие аналоги для проектных названий записаны в `art-source/l2-redraw/missing-equipment.json`; игровые названия, грейды и свойства сохранены.

## Новые иллюстрации

Режим: встроенный imagegen, отдельный вызов на каждое изображение. Оригиналы сохранены в `art-source/l2-redraw/merchants/*.png` и `art-source/l2-redraw/party-emblem.png`. Мобильные WebP: `webapp/art/merchants/` и `webapp/art/icons/party-emblem-*`.

Общий промпт баннеров: «ONE landscape 3:2 dark medieval fantasy MMORPG merchant banner inspired by Lineage II; detailed realistic painted fantasy game illustration; warm gold highlights, muted teal shadows and bronze palette; NPC readable focal point on right third; no text, letters, frame or UI». Сцены:

- Weapons: human male weapon merchant, leather apron, oak counter, one longsword, bow, staff; Talking Island / Lector.
- Armor: weathered human male armor merchant, steel breastplate on stand, gloves, boots, shield; Jackson.
- Jewelry: silver-haired female elven merchant, green dress, velvet trays with rings, earrings and necklace; Silvia.
- Alchemist: elderly stocky dwarf woman, silver braids, spectacles, maroon apron, gemstones, recipe books and varnish bottles.
- Mammon: short stocky dwarven merchant, burgundy hooded robe, human eyes in shadow, ancient stone counter, Ancient Adena, beads, scrolls, blue candle; Seven Signs catacomb alcove.

Промпт эмблемы: «ONE square transparent background raster UI inventory icon; exactly three medieval fantasy hero busts within antique bronze ring: central armored knight, hooded archer on left, robed mage on right; detailed painted game interface art, teal-black inner circle, readable at 24 pixels, 10% transparent margin, actual alpha outside ring; no text or extra icons».

## Воспроизведение и проверка

1. `node scripts/l2j/import-local-icons.mjs <папка PNG> <папка XML предметов>`.
2. `python scripts/l2j/convert-local-icons.py`.
3. `python scripts/l2j/build-merchant-art.py`.
4. `python scripts/l2j/build-icon-preview.py` — автономная галерея `docs/l2-assets-preview.html`.
5. `node scripts/ui/check-l2-assets.mjs` с путями Playwright и браузера в `PLAYWRIGHT_PACKAGE` / `DESIGN_BROWSER`.

Проверяются существование и формат всех подключённых WebP, пять торговцев, изображения в инвентаре, режимы добычи и видимость группы, ошибки загрузки и переполнение на 320/390/1100 px. Дополнительно проверены SA, катакомбы и PvP через `scripts/ui/check-soul-crystals.mjs`. CP теперь также отображается над HP в инвентаре и группе. Результат полного набора тестов указан в отчёте об изменениях.

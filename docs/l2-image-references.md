# Изображения: что нужно нарисовать и что заменить на Lineage 2

Сгенерировано `scripts/l2j/image-references.mjs` из данных L2J Mobius CT 2.6 High Five. Колонка «Референс L2» — настоящее имя предмета и
имя его иконки в клиенте (`icon.<имя>`, файл `Icon.<имя>` пакета интерфейса; размер оригинала 32×32). Игра рисует иконки 128/256 px
(`webapp/art/icons`, `webapp/art/items/v1`), поэтому референс нужен как образец силуэта и цвета, а не как готовый файл.

## 1. Нужно нарисовать (новые)

### 1.1 Торговцы (экран «Торговцы»)

Баннер 3:2 на торговца (как у зон охоты) и иконка раздела.

| Торговец | Игровой id | Образ из L2 (NPC High Five) | Что сидит на прилавке |
| --- | --- | --- | --- |
| Торговец оружием | weapons | Lector, Weapon Merchant (Talking Island); Altran, Pinter — кузнецы | мечи, луки, посохи без грейда, D, C |
| Торговец доспехами | armor | Jackson, Armor Merchant | шлемы, нагрудники, перчатки, сапоги, щиты |
| Торговец бижутерией | jewelry | Silvia, Accessory Merchant | кольца, серьги, ожерелья |
| Лавка мастеров | alchemist | Blueprint Seller (Dwarf), Mineral Trader | самоцветы D/C/B, книги рецептов, лак Маммона |
| Торговец Маммона | mammon | Merchant of Mammon, Priest of Dawn, Blacksmith of Mammon (Aden, Seven Signs) | самоцветы A/S, свитки заточки, свитки ОП |

### 1.2 Группа

Эмблема экрана и три значка режима добычи (как в окне группы L2: «Looting Method»).

| Что | Игровой id | Референс L2 |
| --- | --- | --- |
| Эмблема группы | party | кнопка «Party Matching» системного меню L2: три силуэта героев в круге |
| Режим «Нашедшему» | finders | Finder's Keepers (меню группы) |
| Режим «Случайно» | random | Random (в L2 — кубик) |
| Режим «По очереди» | turn | By Turn (стрелка по кругу) |
| Лидер | leader | значок лидера группы в рамке Party |

### 1.3 Категории дропа

Иконка заголовка группы в списке дропа и в инвентаре.

| Категория | Id | Референс L2 |
| --- | --- | --- |
| Снаряжение целиком | full | Short Sword — `weapon_small_sword_i00` |
| Части и камни для сборки | piece | Sealed Dynasty Breast Plate Piece — `etc_plate_silver_i00` |
| Рецепты | recipe | Recipe: Willow Staff — `etc_recipe_white_i00` |
| Свитки заточки | scroll | Scroll: Enchant Weapon (S-Grade) — `etc_scroll_of_enchant_weapon_i05` |
| Камни жизни | lifestone | Life Stone - Level 76 — `etc_mineral_general_i03` |
| Камни атрибутов | attribute | Fire Stone — `etc_fire_stone_i00` |
| Камни печати | seal | Blue Seal Stone — `etc_water_rune_i00` |
| Краски | dye | Dye of STR (Str+1 Con-1) — `etc_str_hena_i00` |
| Кристаллы | crystal | Crystal (S-Grade) — `etc_crystal_gold_i00` |
| Материалы | material | Iron Ore — `etc_lump_gray_i00` |
| Расходники | consumable | Greater Healing Potion — `etc_potion_scarlet_i00` |
| Травы | herb | Herb of Life — `—` |
| Прочее | other | Adena — `etc_adena_i00` |

### 1.4 Предметы, у которых нет своей иконки (показывается общий значок)

| Предмет (реальный) | Где продаётся | Иконка L2 |
| --- | --- | --- |
| Gemstone D | Лавка мастеров / Маммон | `etc_crystal_ball_silver_i00` |
| Gemstone C | Лавка мастеров / Маммон | `etc_crystal_ball_green_i00` |
| Gemstone B | Лавка мастеров / Маммон | `etc_bead_green_i00` |
| Gemstone A | Лавка мастеров / Маммон | `etc_bead_red_i00` |
| Gemstone S | Лавка мастеров / Маммон | `etc_bead_silver_i00` |
| Blank Scroll | Маммон / Лавка мастеров | `etc_scroll_gray_i00` |
| Mammon's Varnish Enhancer | Маммон / Лавка мастеров | `etc_mammon_varnish_i00` |
| SP Scroll (Low-Grade) | Маммон / Лавка мастеров | `etc_sp_scroll1_i00` |
| SP Scroll (Medium-Grade) | Маммон / Лавка мастеров | `etc_sp_scroll2_i00` |
| SP Scroll (High Grade) | Маммон / Лавка мастеров | `etc_sp_scroll3_i00` |
| Recipe: … (книга рецепта, одна общая иконка + цвет грейда) | Лавка мастеров | `etc_recipe_white_i00` |

### 1.5 Предметы каталога без картины

Снаряжение, для которого в `webapp/art/items/v1` нет пары `catalog-<грейд>-<тип>-128/256.webp`.

Не хватает: **95** из 238.

| Грейд | Id каталога | Название | Иконка L2 |
| --- | --- | --- | --- |
| C | `C:weapon:oneHandedSword` | Samurai Longsword | `weapon_samurai_longsword_i00` |
| C | `C:weapon:twoHandedSword` | Berserker Blade | `weapon_berserker_blade_i00` |
| C | `C:weapon:dagger` | Crystal Dagger | `weapon_crystal_dagger_i00` |
| C | `C:weapon:mace` | Demon's Staff | `weapon_demons_staff_i00` |
| C | `C:weapon:bow` | Eminence Bow | `weapon_eminence_bow_i00` |
| C | `C:weapon:crossbow` | Sharpshooter | `weapon_taslam_i00` |
| C | `C:weapon:blunt` | Yaksa Mace | `weapon_yaksa_mace_i00` |
| C | `C:weapon:fists` | Fisted Blade | `weapon_fist_blade_i00` |
| C | `C:armor:heavy:helmet` | Chain Helmet | `armor_helmet_i00` |
| C | `C:armor:robe:helmet` | Karmian Circlet | — (ближайший образец того же слота и грейда) |
| C | `C:armor:heavy:gloves` | Chain Gauntlets | — (ближайший образец того же слота и грейда) |
| C | `C:armor:robe:gloves` | Karmian Gloves | `armor_t53_g_i00` |
| C | `C:armor:heavy:greaves` | Chain Gaiters | `armor_t48_l_i00` |
| C | `C:armor:heavy:boots` | Chain Boots | `armor_t48_b_i00` |
| C | `C:armor:robe:boots` | Karmian Boots | `armor_t53_b_i00` |
| C | `C:armor:heavy:body` | Chain Breastplate | — (ближайший образец того же слота и грейда) |
| C | `C:armor:robe:fullBody` | Karmian Robe | — (ближайший образец того же слота и грейда) |
| C | `C:shield:bigShield` | Full Plate Shield | `shield_full_plate_shield_i00` |
| C | `C:shield:sigill` | Mystic Sigil | — (ближайший образец того же слота и грейда) |
| C | `C:jewelry:ring` | Blessed Ring | `accessary_blessed_ring_i00` |
| C | `C:jewelry:earring` | Nassen's Earring | `accessary_nassens_earing_i00` |
| C | `C:jewelry:necklace` | Necklace of Binding | — (ближайший образец того же слота и грейда) |
| S | `S:weapon:oneHandedSword` | Forgotten Blade | `weapon_forgotten_blade_i00` |
| S | `S:weapon:twoHandedSword` | Heaven's Divider | `weapon_heavens_divider_i00` |
| S | `S:weapon:dagger` | Angel Slayer | `weapon_angel_slayer_i00` |
| S | `S:weapon:mace` | Arcana Mace | `weapon_arcana_mace_i00` |
| S | `S:weapon:bow` | Draconic Bow | `weapon_draconic_bow_i00` |
| S | `S:weapon:crossbow` | Sarnga | — (ближайший образец того же слота и грейда) |
| S | `S:weapon:blunt` | Dragon Hunter Axe | `weapon_dragon_hunter_axe_i00` |
| S | `S:weapon:fists` | Claw of Ashton Family | `weapon_demon_splinter_i00` |
| S | `S:armor:heavy:helmet` | Imperial Crusader Helmet | `armor_helmet_i00` |
| S | `S:armor:light:helmet` | Draconic Leather Helmet | `armor_leather_helmet_i00` |
| S | `S:armor:robe:helmet` | Major Arcana Circlet | `armor_circlet_i00` |
| S | `S:armor:heavy:gloves` | Imperial Crusader Gauntlets | `armor_t88_g_i00` |
| S | `S:armor:robe:gloves` | Major Arcana Gloves | `armor_t90_g_i00` |
| S | `S:armor:heavy:greaves` | Imperial Crusader Gaiters | `armor_t88_l_i00` |
| S | `S:armor:heavy:boots` | Imperial Crusader Boots | `armor_t88_b_i00` |
| S | `S:armor:light:boots` | Draconic Leather Boots | `armor_t89_b_i00` |
| S | `S:armor:robe:boots` | Major Arcana Boots | `armor_t90_b_i00` |
| S | `S:armor:heavy:body` | Imperial Crusader Breastplate | `armor_t88_u_i00` |
| S | `S:armor:light:fullBody` | Draconic Leather Armor | `armor_t89_ul_i00` |
| S | `S:armor:robe:fullBody` | Major Arcana Robe | `armor_t90_ul_i00` |
| S | `S:shield:bigShield` | Imperial Crusader Shield | `shield_imperial_crusader_shield_i00` |
| S | `S:shield:sigill` | Arcana Sigil | `arcana_sigil_i00` |
| S | `S:jewelry:ring` | Tateossian Ring | `accessory_tateossian_ring_i00` |
| S | `S:jewelry:earring` | Tateossian Earring | `accessory_tateossian_earring_i00` |
| S | `S:jewelry:necklace` | Tateossian Necklace | `accessory_tateossian_necklace_i00` |
| S84 | `S84:weapon:oneHandedSword` | Vesper Cutter | `weapon_vesper_cutter_i00` |
| S84 | `S84:weapon:twoHandedSword` | Vesper Slasher | `weapon_vesper_slasher_i00` |
| S84 | `S84:weapon:dagger` | Vesper Shaper | `weapon_vesper_shaper_i00` |
| S84 | `S84:weapon:mace` | Vesper Caster | `weapon_vesper_caster_i00` |
| S84 | `S84:weapon:bow` | Vesper Thrower | `weapon_vesper_thrower_i00` |
| S84 | `S84:weapon:crossbow` | Vesper Sheutjeh | — (ближайший образец того же слота и грейда) |
| S84 | `S84:weapon:blunt` | Vesper Retributer | `weapon_vesper_retributer_i00` |
| S84 | `S84:weapon:fists` | Vesper Fighter | `weapon_vesper_fighter_i00` |
| S84 | `S84:armor:heavy:helmet` | Vesper Helmet | `armor_helmet_i00` |
| S84 | `S84:armor:light:helmet` | Vesper Leather Helmet | `armor_leather_helmet_i00` |
| S84 | `S84:armor:robe:helmet` | Vesper Magic Circlet | — (ближайший образец того же слота и грейда) |
| S84 | `S84:armor:heavy:gloves` | Vesper Gauntlets | — (ближайший образец того же слота и грейда) |
| S84 | `S84:armor:light:gloves` | Vesper Leather Gloves | `armor_t95_g_i00` |
| S84 | `S84:armor:robe:gloves` | Vesper Magic Gloves | — (ближайший образец того же слота и грейда) |
| S84 | `S84:armor:heavy:greaves` | Vesper Gaiters | `armor_t94_l_i00` |
| S84 | `S84:armor:heavy:boots` | Vesper Boots | `armor_t94_b_i00` |
| S84 | `S84:armor:light:boots` | Vesper Leather Boots | `armor_t95_b_i00` |
| S84 | `S84:armor:robe:boots` | Vesper Magic Boots | — (ближайший образец того же слота и грейда) |
| S84 | `S84:armor:heavy:body` | Vesper Breastplate | `armor_t94_u_i00` |
| S84 | `S84:armor:light:fullBody` | Vesper Leather Armor | — (ближайший образец того же слота и грейда) |
| S84 | `S84:armor:robe:fullBody` | Vesper Magic Robe | — (ближайший образец того же слота и грейда) |
| S84 | `S84:shield:bigShield` | Vesper Shield | `weapon_vesper_verteidiger_i01` |
| S84 | `S84:shield:sigill` | Vesper Sigil | `verper_sigil_i00` |
| S84 | `S84:jewelry:ring` | Vesper Ring | `vesper_ring_i00` |
| S84 | `S84:jewelry:earring` | Vesper Earring | `vesper_earring_i00` |
| S84 | `S84:jewelry:necklace` | Vesper Necklace | `vesper_necklace_i00` |
| B | `epic:queenAnt` | Ring of Queen Ant | `accessory_ring_of_queen_ant_i00` |
| A | `epic:core` | Ring of Core | `accessory_ring_of_core_i00` |
| A | `epic:orfen` | Earring of Orfen | `accessory_earring_of_orfen_i00` |
| S | `epic:zaken` | Zaken's Earring | — (ближайший образец того же слота и грейда) |
| S | `epic:baium` | Ring of Baium | `accessory_ring_of_baium_i00` |
| S | `epic:antharas` | Earring of Antharas | `accessory_earring_of_antaras_i00` |
| S | `epic:valakas` | Necklace of Valakas | `accessory_necklace_of_valakas_i00` |
| S | `epic:frintezza` | Frintezza's Necklace | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:shadow-scythe` | Коса ночного затмения | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:solar-scythe` | Коса солнечного рассвета | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:prism-sword` | Меч радужного света | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:lifeblade` | Клинок алой жизни | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:rainbow-scythe` | Коса семи стихий | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:astral-sword` | Меч звёздной бездны | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:eclipse-greatsword` | Двуручный меч затмения | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:solar-bow` | Лук солнечного венца | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:tide-trident` | Посох приливов | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:wind-staff` | Посох небесного вихря | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:nature-axe` | Секира древнего леса | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:song-staff` | Посох звёздной песни | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:crystal-crossbow` | Арбалет кристального шторма | — (ближайший образец того же слота и грейда) |
| S84 | `epic-weapon:dragon-claws` | Когти огненного дракона | — (ближайший образец того же слота и грейда) |

## 2. Заменить на оригиналы Lineage 2

Эти изображения уже есть в игре, но нарисованы «по мотивам». Список — что перерисовать под настоящие иконки L2.

### 2.1 Расходники и материалы (`webapp/art/icons`)

| Файл игры | Ключи | Референс L2 по грейдам |
| --- | --- | --- |
| `scroll-*.webp` | `scroll_<грейд>` | D: `etc_scroll_of_enchant_weapon_i01`<br>C: `etc_scroll_of_enchant_weapon_i02`<br>B: `etc_scroll_of_enchant_weapon_i03`<br>A: `etc_scroll_of_enchant_weapon_i04`<br>S: `etc_scroll_of_enchant_weapon_i05` |
| `scroll-blessed-*.webp` | `blessed_<грейд>` | D: `etc_blessed_scrl_of_ench_wp_d_i01`<br>C: `etc_blessed_scrl_of_ench_wp_c_i02`<br>B: `etc_blessed_scrl_of_ench_wp_b_i03`<br>A: `etc_blessed_scrl_of_ench_wp_a_i04`<br>S: `etc_blessed_scrl_of_ench_wp_s_i05` |
| `scroll-safe-*.webp` | `safe_<тип>_<грейд>` | Crystal Scroll: `etc_scroll_of_enchant_weapon_i01`; в L2 есть «Ancient Crystal Enchant» (иконка по названию в клиенте) |
| `crystal-*.webp` | `crystal_<грейд>` | D: `etc_crystal_blue_i00`<br>C: `etc_crystal_green_i00`<br>B: `etc_crystal_red_i00`<br>A: `etc_crystal_silver_i00`<br>S: `etc_crystal_gold_i00` |
| `lifestone-*.webp` | `lifestone_<ступень>_<грейд>` | Life Stone - Level 46: `etc_mineral_general_i00`<br>Mid-Grade Life Stone - Level 46: `etc_mineral_special_i00`<br>High-Grade Life Stone - Level 46: `etc_mineral_rare_i00`<br>Top-Grade Life Stone - Level 46: `etc_mineral_unique_i00` |
| `attr-stone/crystal/jewel-*.webp` | `attr_<ступень>_<стихия>` | Fire Stone: `etc_fire_stone_i00`<br>Water Stone: `etc_water_stone_i00`<br>Fire Crystal: `etc_gem_red_i00`<br>Fire Jewel: `etc_crystal_ball_silver_i00` |
| `soulshot-*.webp` | `soulshot_<грейд>` | Soulshot: No Grade: `etc_spirit_bullet_white_i00`<br>Soulshot (D-Grade): `etc_spirit_bullet_blue_i00`<br>Soulshot (S-Grade): `etc_spirit_bullet_gold_i00` |
| `spiritshot-*.webp` | `spiritshot_<грейд>` | Spiritshot: No Grade: `etc_spell_shot_white_i00`<br>Spiritshot (D-Grade): `etc_spell_shot_blue_i00`<br>Spiritshot (S-Grade): `etc_spell_shot_gold_i00` |
| `blessed-spiritshot-*.webp` | `blessed_spiritshot_<грейд>` | Blessed Spiritshot: No Grade: `etc_spell_shot_white_i01`<br>Blessed Spiritshot (D-Grade): `etc_spell_shot_blue_i01`<br>Blessed Spiritshot (S-Grade): `etc_spell_shot_gold_i01` |
| `gem-*.webp` | `craft_gem_<грейд>` (самоцветы) | Gemstone D: `etc_crystal_ball_silver_i00`<br>Gemstone C: `etc_crystal_ball_green_i00`<br>Gemstone B: `etc_bead_green_i00`<br>Gemstone A: `etc_bead_red_i00`<br>Gemstone S: `etc_bead_silver_i00` |
| `binder/leather/fiber-*.webp` | `craft_binder/leather/fiber_<грейд>` | Stem: `etc_branch_gold_i00`<br>Leather: `etc_leather_i00`<br>Thread: `etc_skein_white_i00`<br>Cokes: `etc_oil_pot_black_i00`<br>Varnish of Purity: `etc_potion_clear_i00` |
| (камни печати рисуются кристаллом) | `seal_blue/green/red` | Blue Seal Stone: `etc_water_rune_i00`<br>Green Seal Stone: `etc_wind_rune_i00`<br>Red Seal Stone: `etc_fire_rune_i00`<br>Ancient Adena: `etc_ancient_adena_i00` |
| (кристаллы души рисуются кристаллом) | `soul_<цвет>_<ступень>` | Red Soul Crystal - Stage 1: `etc_soul_stone_i00`<br>Green Soul Crystal - Stage 1: `etc_soul_stone_i02`<br>Blue Soul Crystal - Stage 1: `etc_soul_stone_i01`<br>Red Soul Crystal - Stage 13: `—` |
| `egg-*.webp` | `egg_wyvern/dragon/ancient` | в L2 таких предметов нет (яйца придуманы проектом): оставить или заменить на Dragon Scale / Wyvern Skin из материалов рейдов |

### 2.2 Валюты

| Валюта | Где в игре | Референс L2 |
| --- | --- | --- |
| Адена (золото) | кошелёк, цены | Adena — `etc_adena_i00` |
| Древняя адена (AA) | кошелёк торговцев, распечатка | Ancient Adena — `etc_ancient_adena_i00` |
| Кристаллы грейда | материалы, заточка | Crystal (D-Grade) — `etc_crystal_blue_i00` |

### 2.3 Снаряжение (`webapp/art/items/v1/catalog-*`)

Все картины каталога нарисованы «по типу», а не с реального предмета. Для каждого предмета с реальным соответствием — иконка оригинала:

| Грейд | Предмет | Id | Иконка L2 |
| --- | --- | --- | --- |
| NG | Long Sword | `noGrade:weapon:oneHandedSword` | `weapon_long_sword_i00` |
| NG | Zweihander | `noGrade:weapon:twoHandedSword` | `weapon_zweihander_i00` |
| NG | Sword Breaker | `noGrade:weapon:dagger` | `weapon_sword_breaker_i00` |
| NG | Willow Staff | `noGrade:weapon:mace` | `weapon_willow_staff_i00` |
| NG | Composite Bow | `noGrade:weapon:bow` | `weapon_composition_bow_i00` |
| NG | Wooden Crossbow | `noGrade:weapon:crossbow` | — |
| NG | Club | `noGrade:weapon:blunt` | `weapon_club_i00` |
| NG | Viper Fang | `noGrade:weapon:fists` | `weapon_vipers_canine_i00` |
| NG | Bronze Helmet | `noGrade:armor:heavy:helmet` | `armor_helmet_i00` |
| NG | Wooden Helmet | `noGrade:armor:light:helmet` | `armor_leather_helmet_i00` |
| NG | Devotion Circlet | `noGrade:armor:robe:helmet` | — |
| NG | Bronze Gauntlets | `noGrade:armor:heavy:gloves` | — |
| NG | Wooden Gloves | `noGrade:armor:light:gloves` | — |
| NG | Devotion Gloves | `noGrade:armor:robe:gloves` | — |
| NG | Bronze Gaiters | `noGrade:armor:heavy:greaves` | `armor_t34_l_i00` |
| NG | Bronze Boots | `noGrade:armor:heavy:boots` | — |
| NG | Wooden Boots | `noGrade:armor:light:boots` | — |
| NG | Devotion Boots | `noGrade:armor:robe:boots` | — |
| NG | Bronze Breastplate | `noGrade:armor:heavy:body` | `armor_t34_u_i00` |
| NG | Wooden Armor | `noGrade:armor:light:fullBody` | — |
| NG | Devotion Robe | `noGrade:armor:robe:fullBody` | — |
| NG | Bone Shield | `noGrade:shield:bigShield` | `shield_bone_shield_i00` |
| NG | Buckler | `noGrade:shield:smallShield` | `shield_buckler_i00` |
| NG | Apprentice Sigil | `noGrade:shield:sigill` | — |
| NG | Blue Coral Ring | `noGrade:jewelry:ring` | `accessary_blue_coral_ring_i00` |
| NG | Coral Earring | `noGrade:jewelry:earring` | `accessary_coral_earing_i00` |
| NG | Magic Necklace | `noGrade:jewelry:necklace` | — |
| D | Elven Long Sword | `D:weapon:oneHandedSword` | `weapon_elven_long_sword_i00` |
| D | Claymore | `D:weapon:twoHandedSword` | `weapon_claymore_i00` |
| D | Mithril Dagger | `D:weapon:dagger` | `weapon_mithril_dagger_i00` |
| D | Ghost Staff | `D:weapon:mace` | `weapon_ghost_staff_i00` |
| D | Strengthened Long Bow | `D:weapon:bow` | — |
| D | Cranequin | `D:weapon:crossbow` | `weapon_hunting_gun_i00` |
| D | Titan Hammer | `D:weapon:blunt` | `weapon_giants_hammer_i00` |
| D | Bich'Hwa | `D:weapon:fists` | `weapon_bichhwa_i00` |
| D | Brigandine Helmet | `D:armor:heavy:helmet` | `armor_leather_helmet_i00` |
| D | Manticore Skin Helmet | `D:armor:light:helmet` | — |
| D | Elven Mithril Circlet | `D:armor:robe:helmet` | — |
| D | Brigandine Gauntlets | `D:armor:heavy:gloves` | `armor_t43_g_i00` |
| D | Manticore Skin Gloves | `D:armor:light:gloves` | `armor_t42_g_i00` |
| D | Elven Mithril Gloves | `D:armor:robe:gloves` | — |
| D | Brigandine Gaiters | `D:armor:heavy:greaves` | `armor_t43_l_i00` |
| D | Brigandine Boots | `D:armor:heavy:boots` | `armor_t43_b_i00` |
| D | Manticore Skin Boots | `D:armor:light:boots` | `armor_t42_b_i00` |
| D | Elven Mithril Boots | `D:armor:robe:boots` | `armor_t51_b_i00` |
| D | Brigandine Breastplate | `D:armor:heavy:body` | — |
| D | Manticore Skin Armor | `D:armor:light:fullBody` | — |
| D | Elven Mithril Robe | `D:armor:robe:fullBody` | — |
| D | Square Shield | `D:shield:bigShield` | `shield_square_shield_i00` |
| D | Plate Shield | `D:shield:smallShield` | `shield_plate_shield_i00` |
| D | Mithril Sigil | `D:shield:sigill` | — |
| D | Mithril Ring | `D:jewelry:ring` | `accessary_mithril_ring_i00` |
| D | Omen Beast's Eye Earring | `D:jewelry:earring` | `accessary_onyxbeastseye_earing_i00` |
| D | Elven Necklace | `D:jewelry:necklace` | `accessary_elven_necklace_i00` |
| C | Samurai Longsword | `C:weapon:oneHandedSword` | `weapon_samurai_longsword_i00` |
| C | Berserker Blade | `C:weapon:twoHandedSword` | `weapon_berserker_blade_i00` |
| C | Crystal Dagger | `C:weapon:dagger` | `weapon_crystal_dagger_i00` |
| C | Demon's Staff | `C:weapon:mace` | `weapon_demons_staff_i00` |
| C | Eminence Bow | `C:weapon:bow` | `weapon_eminence_bow_i00` |
| C | Sharpshooter | `C:weapon:crossbow` | `weapon_taslam_i00` |
| C | Yaksa Mace | `C:weapon:blunt` | `weapon_yaksa_mace_i00` |
| C | Fisted Blade | `C:weapon:fists` | `weapon_fist_blade_i00` |
| C | Chain Helmet | `C:armor:heavy:helmet` | `armor_helmet_i00` |
| C | Drake Leather Helmet | `C:armor:light:helmet` | — |
| C | Karmian Circlet | `C:armor:robe:helmet` | — |
| C | Chain Gauntlets | `C:armor:heavy:gloves` | — |
| C | Drake Leather Gloves | `C:armor:light:gloves` | `armor_t21_g_i00` |
| C | Karmian Gloves | `C:armor:robe:gloves` | `armor_t53_g_i00` |
| C | Chain Gaiters | `C:armor:heavy:greaves` | `armor_t48_l_i00` |
| C | Chain Boots | `C:armor:heavy:boots` | `armor_t48_b_i00` |
| C | Drake Leather Boots | `C:armor:light:boots` | `armor_t21_b_i00` |
| C | Karmian Boots | `C:armor:robe:boots` | `armor_t53_b_i00` |
| C | Chain Breastplate | `C:armor:heavy:body` | — |
| C | Drake Leather Armor | `C:armor:light:fullBody` | `armor_t21_ul_i00` |
| C | Karmian Robe | `C:armor:robe:fullBody` | — |
| C | Full Plate Shield | `C:shield:bigShield` | `shield_full_plate_shield_i00` |
| C | Tower Shield | `C:shield:smallShield` | `shield_tower_shield_i00` |
| C | Mystic Sigil | `C:shield:sigill` | — |
| C | Blessed Ring | `C:jewelry:ring` | `accessary_blessed_ring_i00` |
| C | Nassen's Earring | `C:jewelry:earring` | `accessary_nassens_earing_i00` |
| C | Necklace of Binding | `C:jewelry:necklace` | — |
| B | Sword of Damascus | `B:weapon:oneHandedSword` | `weapon_sword_of_damascus_i00` |
| B | Guardian Sword | `B:weapon:twoHandedSword` | `weapon_guardians_sword_i00` |
| B | Demon Dagger | `B:weapon:dagger` | — |
| B | Staff of Evil Spirits | `B:weapon:mace` | `weapon_staff_of_evil_sprit_i00` |
| B | Bow of Peril | `B:weapon:bow` | `weapon_hazard_bow_i00` |
| B | Hell Hound | `B:weapon:crossbow` | `weapon_hell_hound_i00` |
| B | Ice Storm Hammer | `B:weapon:blunt` | `weapon_ice_storm_hammer_i00` |
| B | Arthro Nail | `B:weapon:fists` | `weapon_arthro_nail_i00` |
| B | Avadon Helmet | `B:armor:heavy:helmet` | — |
| B | Avadon Leather Helmet | `B:armor:light:helmet` | — |
| B | Avadon Magic Circlet | `B:armor:robe:helmet` | — |
| B | Avadon Gauntlets | `B:armor:heavy:gloves` | — |
| B | Avadon Leather Gloves | `B:armor:light:gloves` | — |
| B | Avadon Magic Gloves | `B:armor:robe:gloves` | — |
| B | Avadon Gaiters | `B:armor:heavy:greaves` | `armor_t66_l_i00` |
| B | Avadon Boots | `B:armor:heavy:boots` | — |
| B | Avadon Leather Boots | `B:armor:light:boots` | — |
| B | Avadon Magic Boots | `B:armor:robe:boots` | — |
| B | Avadon Breastplate | `B:armor:heavy:body` | `armor_t66_u_i00` |
| B | Avadon Leather Armor | `B:armor:light:fullBody` | `armor_t67_ul_i00` |
| B | Avadon Magic Robe | `B:armor:robe:fullBody` | — |
| B | Dark Dragon Shield | `B:shield:bigShield` | `shield_dark_dragon_shield_i00` |
| B | Masterpiece Shield | `B:shield:smallShield` | `shield_masterpiece_shield_i00` |
| B | Sage Sigil | `B:shield:sigill` | — |
| B | Sage's Ring | `B:jewelry:ring` | `accessary_sages_ring_i00` |
| B | Sage's Earring | `B:jewelry:earring` | `accessary_sages_earing_i00` |
| B | Sage's Necklace | `B:jewelry:necklace` | `accessary_sages_necklace_i00` |
| A | Sirra's Blade | `A:weapon:oneHandedSword` | `weapon_sirr_blade_i00` |
| A | Sword of Ipos | `A:weapon:twoHandedSword` | `weapon_sword_of_ipos_i00` |
| A | Naga Storm | `A:weapon:dagger` | `weapon_naga_storm_i00` |
| A | Cabrio's Hand | `A:weapon:mace` | `weapon_hand_of_cabrio_i00` |
| A | Soul Bow | `A:weapon:bow` | `weapon_soul_bow_i00` |
| A | Reaper | `A:weapon:crossbow` | `weapon_soul_shooter_i00` |
| A | Doom Crusher | `A:weapon:blunt` | `weapon_doom_crusher_i00` |
| A | Dragon Grinder | `A:weapon:fists` | `weapon_dragon_grinder_i00` |
| A | Dark Crystal Helmet | `A:armor:heavy:helmet` | `armor_helmet_i00` |
| A | Tallum Leather Helmet | `A:armor:light:helmet` | — |
| A | Majestic Magic Circlet | `A:armor:robe:helmet` | — |
| A | Dark Crystal Gauntlets | `A:armor:heavy:gloves` | — |
| A | Tallum Leather Gloves | `A:armor:light:gloves` | — |
| A | Majestic Magic Gloves | `A:armor:robe:gloves` | — |
| A | Dark Crystal Gaiters | `A:armor:heavy:greaves` | `armor_t74_l_i00` |
| A | Dark Crystal Boots | `A:armor:heavy:boots` | `armor_t15_b_i00` |
| A | Tallum Leather Boots | `A:armor:light:boots` | — |
| A | Majestic Magic Boots | `A:armor:robe:boots` | — |
| A | Dark Crystal Breastplate | `A:armor:heavy:body` | `armor_t74_u_i00` |
| A | Tallum Leather Armor | `A:armor:light:fullBody` | `armor_t78_ul_i00` |
| A | Majestic Magic Robe | `A:armor:robe:fullBody` | — |
| A | Shield of Nightmare | `A:shield:bigShield` | `shield_shield_of_nightmare_i00` |
| A | Shield of Nightmare II | `A:shield:smallShield` | — |
| A | Majestic Sigil | `A:shield:sigill` | — |
| A | Majestic Ring | `A:jewelry:ring` | `accessary_inferno_ring_i00` |
| A | Majestic Earring | `A:jewelry:earring` | `accessary_inferno_earing_i00` |
| A | Majestic Necklace | `A:jewelry:necklace` | `accessary_inferno_necklace_i00` |
| S | Forgotten Blade | `S:weapon:oneHandedSword` | `weapon_forgotten_blade_i00` |
| S | Heaven's Divider | `S:weapon:twoHandedSword` | `weapon_heavens_divider_i00` |
| S | Angel Slayer | `S:weapon:dagger` | `weapon_angel_slayer_i00` |
| S | Arcana Mace | `S:weapon:mace` | `weapon_arcana_mace_i00` |
| S | Draconic Bow | `S:weapon:bow` | `weapon_draconic_bow_i00` |
| S | Sarnga | `S:weapon:crossbow` | — |
| S | Dragon Hunter Axe | `S:weapon:blunt` | `weapon_dragon_hunter_axe_i00` |
| S | Claw of Ashton Family | `S:weapon:fists` | `weapon_demon_splinter_i00` |
| S | Imperial Crusader Helmet | `S:armor:heavy:helmet` | `armor_helmet_i00` |
| S | Draconic Leather Helmet | `S:armor:light:helmet` | `armor_leather_helmet_i00` |
| S | Major Arcana Circlet | `S:armor:robe:helmet` | `armor_circlet_i00` |
| S | Imperial Crusader Gauntlets | `S:armor:heavy:gloves` | `armor_t88_g_i00` |
| S | Draconic Leather Gloves | `S:armor:light:gloves` | `armor_t89_g_i00` |
| S | Major Arcana Gloves | `S:armor:robe:gloves` | `armor_t90_g_i00` |
| S | Imperial Crusader Gaiters | `S:armor:heavy:greaves` | `armor_t88_l_i00` |
| S | Imperial Crusader Boots | `S:armor:heavy:boots` | `armor_t88_b_i00` |
| S | Draconic Leather Boots | `S:armor:light:boots` | `armor_t89_b_i00` |
| S | Major Arcana Boots | `S:armor:robe:boots` | `armor_t90_b_i00` |
| S | Imperial Crusader Breastplate | `S:armor:heavy:body` | `armor_t88_u_i00` |
| S | Draconic Leather Armor | `S:armor:light:fullBody` | `armor_t89_ul_i00` |
| S | Major Arcana Robe | `S:armor:robe:fullBody` | `armor_t90_ul_i00` |
| S | Imperial Crusader Shield | `S:shield:bigShield` | `shield_imperial_crusader_shield_i00` |
| S | Imperial Guard Shield | `S:shield:smallShield` | — |
| S | Arcana Sigil | `S:shield:sigill` | `arcana_sigil_i00` |
| S | Tateossian Ring | `S:jewelry:ring` | `accessory_tateossian_ring_i00` |
| S | Tateossian Earring | `S:jewelry:earring` | `accessory_tateossian_earring_i00` |
| S | Tateossian Necklace | `S:jewelry:necklace` | `accessory_tateossian_necklace_i00` |
| S80 | Dynasty Sword | `S80:weapon:oneHandedSword` | `weapon_dynasty_blade_i00` |
| S80 | Dynasty Blade | `S80:weapon:twoHandedSword` | `weapon_dynasty_twohand_sword_i00` |
| S80 | Dynasty Knife | `S80:weapon:dagger` | `weapon_dynasty_dagger_i00` |
| S80 | Dynasty Mace | `S80:weapon:mace` | `weapon_dynasty_staff_i00` |
| S80 | Dynasty Bow | `S80:weapon:bow` | `weapon_dynasty_bow_i00` |
| S80 | Dynasty Crossbow | `S80:weapon:crossbow` | `weapon_dynasty_crossbow_i00` |
| S80 | Dynasty Crusher | `S80:weapon:blunt` | `weapon_dynasty_crusher_i00` |
| S80 | Dynasty Bagh-Nakh | `S80:weapon:fists` | `weapon_dynasty_jamadhr_i00` |
| S80 | Dynasty Helmet | `S80:armor:heavy:helmet` | `armor_helmet_i00` |
| S80 | Dynasty Leather Helmet | `S80:armor:light:helmet` | `armor_leather_helmet_i00` |
| S80 | Dynasty Magic Circlet | `S80:armor:robe:helmet` | — |
| S80 | Dynasty Gauntlets | `S80:armor:heavy:gloves` | — |
| S80 | Dynasty Leather Gloves | `S80:armor:light:gloves` | `armor_t92_g_i00` |
| S80 | Dynasty Magic Gloves | `S80:armor:robe:gloves` | — |
| S80 | Dynasty Gaiters | `S80:armor:heavy:greaves` | `armor_t91_l_i00` |
| S80 | Dynasty Boots | `S80:armor:heavy:boots` | `armor_t91_b_i00` |
| S80 | Dynasty Leather Boots | `S80:armor:light:boots` | `armor_t92_b_i00` |
| S80 | Dynasty Magic Boots | `S80:armor:robe:boots` | — |
| S80 | Dynasty Breastplate | `S80:armor:heavy:body` | `armor_t91_u_i00` |
| S80 | Dynasty Leather Armor | `S80:armor:light:fullBody` | `armor_t92_u_i00` |
| S80 | Dynasty Magic Robe | `S80:armor:robe:fullBody` | — |
| S80 | Dynasty Shield | `S80:shield:bigShield` | `shield_dynasty_shield_i00` |
| S80 | Dynasty Guard Shield | `S80:shield:smallShield` | — |
| S80 | Dynasty Sigil | `S80:shield:sigill` | `dynasty_sigil_i00` |
| S80 | Dynasty Ring | `S80:jewelry:ring` | `accessary_dynasty_ring_i00` |
| S80 | Dynasty Earring | `S80:jewelry:earring` | — |
| S80 | Dynasty Necklace | `S80:jewelry:necklace` | `accessary_dynasty_necklace_i00` |
| S84 | Vesper Cutter | `S84:weapon:oneHandedSword` | `weapon_vesper_cutter_i00` |
| S84 | Vesper Slasher | `S84:weapon:twoHandedSword` | `weapon_vesper_slasher_i00` |
| S84 | Vesper Shaper | `S84:weapon:dagger` | `weapon_vesper_shaper_i00` |
| S84 | Vesper Caster | `S84:weapon:mace` | `weapon_vesper_caster_i00` |
| S84 | Vesper Thrower | `S84:weapon:bow` | `weapon_vesper_thrower_i00` |
| S84 | Vesper Sheutjeh | `S84:weapon:crossbow` | — |
| S84 | Vesper Retributer | `S84:weapon:blunt` | `weapon_vesper_retributer_i00` |
| S84 | Vesper Fighter | `S84:weapon:fists` | `weapon_vesper_fighter_i00` |
| S84 | Vesper Helmet | `S84:armor:heavy:helmet` | `armor_helmet_i00` |
| S84 | Vesper Leather Helmet | `S84:armor:light:helmet` | `armor_leather_helmet_i00` |
| S84 | Vesper Magic Circlet | `S84:armor:robe:helmet` | — |
| S84 | Vesper Gauntlets | `S84:armor:heavy:gloves` | — |
| S84 | Vesper Leather Gloves | `S84:armor:light:gloves` | `armor_t95_g_i00` |
| S84 | Vesper Magic Gloves | `S84:armor:robe:gloves` | — |
| S84 | Vesper Gaiters | `S84:armor:heavy:greaves` | `armor_t94_l_i00` |
| S84 | Vesper Boots | `S84:armor:heavy:boots` | `armor_t94_b_i00` |
| S84 | Vesper Leather Boots | `S84:armor:light:boots` | `armor_t95_b_i00` |
| S84 | Vesper Magic Boots | `S84:armor:robe:boots` | — |
| S84 | Vesper Breastplate | `S84:armor:heavy:body` | `armor_t94_u_i00` |
| S84 | Vesper Leather Armor | `S84:armor:light:fullBody` | — |
| S84 | Vesper Magic Robe | `S84:armor:robe:fullBody` | — |
| S84 | Vesper Shield | `S84:shield:bigShield` | `weapon_vesper_verteidiger_i01` |
| S84 | Vesper Guard Shield | `S84:shield:smallShield` | — |
| S84 | Vesper Sigil | `S84:shield:sigill` | `verper_sigil_i00` |
| S84 | Vesper Ring | `S84:jewelry:ring` | `vesper_ring_i00` |
| S84 | Vesper Earring | `S84:jewelry:earring` | `vesper_earring_i00` |
| S84 | Vesper Necklace | `S84:jewelry:necklace` | `vesper_necklace_i00` |
| B | Ring of Queen Ant | `epic:queenAnt` | `accessory_ring_of_queen_ant_i00` |
| A | Ring of Core | `epic:core` | `accessory_ring_of_core_i00` |
| A | Earring of Orfen | `epic:orfen` | `accessory_earring_of_orfen_i00` |
| S | Zaken's Earring | `epic:zaken` | — |
| S | Ring of Baium | `epic:baium` | `accessory_ring_of_baium_i00` |
| S | Earring of Antharas | `epic:antharas` | `accessory_earring_of_antaras_i00` |
| S | Necklace of Valakas | `epic:valakas` | `accessory_necklace_of_valakas_i00` |
| S | Frintezza's Necklace | `epic:frintezza` | — |
| S84 | Коса ночного затмения | `epic-weapon:shadow-scythe` | — |
| S84 | Коса солнечного рассвета | `epic-weapon:solar-scythe` | — |
| S84 | Меч радужного света | `epic-weapon:prism-sword` | — |
| S84 | Клинок алой жизни | `epic-weapon:lifeblade` | — |
| S84 | Коса семи стихий | `epic-weapon:rainbow-scythe` | — |
| S84 | Меч звёздной бездны | `epic-weapon:astral-sword` | — |
| S84 | Двуручный меч затмения | `epic-weapon:eclipse-greatsword` | — |
| S84 | Лук солнечного венца | `epic-weapon:solar-bow` | — |
| S84 | Посох приливов | `epic-weapon:tide-trident` | — |
| S84 | Посох небесного вихря | `epic-weapon:wind-staff` | — |
| S84 | Секира древнего леса | `epic-weapon:nature-axe` | — |
| S84 | Посох звёздной песни | `epic-weapon:song-staff` | — |
| S84 | Арбалет кристального шторма | `epic-weapon:crystal-crossbow` | — |
| S84 | Когти огненного дракона | `epic-weapon:dragon-claws` | — |

### 2.4 Старые линии без привязки к каталогу

В `webapp/art/items/v1` лежат серии, которых нет в каталоге (`amulet-*`, `anklets-*`, `bracers-*`, `armor-nightweave`, `armor-opal`, …). Они не соответствуют ни одному предмету L2; либо заменить иконками реальных предметов (амулеты — Talisman/Cloak; браслеты — Bracelet), либо убрать из выдачи.

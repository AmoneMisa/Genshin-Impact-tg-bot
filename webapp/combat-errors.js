// Shared hunting and Atlas combat feedback.
export const COMBAT_REASONS = {
  chest_too_far:'Подойди к сундуку. Возможно, его уже открыли.',
  chest_level:'Уровень персонажа не подходит для этого сундука.',
  chest_casting:'Сундук уже открывается.',
  chest_unlock_unavailable:'Сначала изучи доступный твоему классу навык Unlock.',
  chest_key_required:'Недостаточно ключей для открытия сундука.',
  not_enough_sp:'Недостаточно SP.',

  vortex_required:'Сначала призовите босса через Dragon Vortex в Долине Драконов.',
  vortex_bone_required:'Нужна Large Dragon Bone для призыва.',
  vortex_cooldown:'Dragon Vortex восстанавливается одну минуту после призыва.',room_in_combat:'Нельзя уйти из комнаты, пока монстры в бою: сначала победи их или отступи.',room_not_adjacent:'В эту комнату нельзя пройти напрямую.',no_active_crystal:'Выбери кристалл души.',no_soul_crystal:'Этот кристалл уже израсходован.',soul_level:'Прокачка кристаллов доступна с 40 уровня.',soul_max_stage:'Кристалл достиг 17 уровня.',soul_wrong_mob:'Душа этого монстра не подходит для текущей ступени.',soul_hp:'Используй кристалл, когда HP монстра будет не выше 50%.',soul_already_charged:'Кристалл уже использован на этом монстре.',invalid_seals:'Недостаточно камней печати.',
  effect_betray:'На тебе предательство.',effect_distrust:'На тебе смятение.',
  pvp_invalid_target:'Игрок недоступен для нападения.',pvp_not_here:'Игрок покинул локацию.',pvp_out_of_range:'Подойди ближе к игроку.',pvp_force_required:'Для атаки мирного игрока включи принудительную атаку.',pvp_stunned:'Ты оглушён.',pvp_silenced:'Магия заблокирована молчанием.',
  unknown_zone: 'Такой зоны нет.',
  already_fighting: 'Ты уже сражаешься.',
  dead: 'Персонаж погиб и ещё не воскрес.',
  no_combat_class: 'Сначала выбери класс.',
  no_mob: 'Врага уже нет.',
  invalid_skill: 'Навык больше недоступен.',
  skill_locked: 'Навык откроется на более высоком уровне.',
  not_enough_resource: 'Недостаточно HP или MP для навыка.',
  cooldown: 'Навык ещё в откате.',
  no_ammo:'Закончились стрелы или болты.',
  effect_blocked:'Состояние персонажа не позволяет выполнить действие.',
  path_blocked:'К этой точке нельзя пройти.',
  combat_data_missing:'Для этого действия ещё нет проверенных данных дальности.',
};
COMBAT_REASONS.pvp_line_of_sight='Цель скрыта за препятствием.';
Object.assign(COMBAT_REASONS,{objectives_remaining:'Сначала уничтожьте цели этого участка.',seed_quest_required:'Сначала возьми задание Тепиоса.',seed_mark_required:'Нужен знак Кецеруса первой или второй ступени.',seed_assembly_required:'Соберите объединение групп у входа.',seed_assembly_missing:'Объединение уже недоступно. Проверь код лидера.',seed_raid_size:'Количество игроков не соответствует выбранному маршруту.',seed_entry_required:'Внутрь входит собранная экспедиция.',location_path_required:'Пройдите по маршруту через предыдущую локацию.',hellbound_stage_required:'Башня откроется на 11-м этапе освобождения Хеллбаунда.',hellbound_pass_required:'Каждому участнику требуется благословение для прохода.',stairs_required:'Подойди к лестнице на карте комнаты.',invalid_floor:'Этот переход недоступен.',ship_required:'Сначала пройди к кораблю через Остров Дьявола.',party_not_ready:'Вся группа должна подойти ко входу и выйти из боя.',instance_party_required:'Вход открывает лидер готовой группы.',candle_too_far:'Подойди к свече.',candle_already_lit:'Эта свеча уже зажжена.',quick_travel_combat:'Сначала выйди из боя.',npc_too_far:'Подойди к хранителю портала.'});
Object.assign(COMBAT_REASONS,{no_party:'Ты не состоишь в группе.',not_leader:'Это действие доступно лидеру группы.',target_in_party:'Игрок уже состоит в группе.',already_member:'Игрок уже в вашей группе.',party_full:'Группа заполнена.',unknown_player:'Игрок недоступен.',not_member:'Игрок не в вашей группе.',invalid_supplies:'Проверь настройки ACP: порог должен быть от 1 до 99%.',empty_hotbar:'Оставь хотя бы одно действие или умение.'});
export const POTION_REASONS = {
  potion_empty: 'Это зелье закончилось.',
  player_dead: 'Нельзя пить зелье, пока персонаж мёртв.',
  hp_full: 'HP уже полное.',
  mp_full: 'MP уже полное.',
};

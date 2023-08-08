module.exports = {
    "ru": {
        index: "Выбери интересующий тебя пункт",
        info: "Полная информация о участниках группы",
        menu: "выбери пункт меню",
        customButtonsCreate: "Выбери пункт для создания кнопки",
        customButtonsCreateContinue: "Выбери кнопку для редактирования",
        help: {
            main: "Основная информация о возможностях бота:\n",
            minigames: "Информация о разных мини играх, которые реализованы в боте",
            sword: "Ты можешь 'увеличить свой меч' используя команду /sword, вызывается раз в сутки, обновляется в 00.00.\nПосмотреть список мечей группы можно командой /swords. Игроки отсортированы в порядке убывания\n\n",
            title: "Ты можешь получить себе случайный титул через команду /title, которую можно вызвать раз в 10 минут, и посмотреть последние 10 титулов группы командой /titles\n\n",
            boss: "Группа может призывать босса командой /boss.\nОн имеет свои скиллы, которые описываются при призыве\n" +
                "Каждый раз призывая босса, он появляется со случайным количеством хп, которое зависит от количества участников чата.\nОн может атаковать игроков в ответ. Мёртвый игрок не может атаковать босса.\n" +
                "Когда босса убьют, будут выданы награды: золото и опыт.\nНаибольшие награды получают первые 3 места.\n" +
                "Босс наносит урон всем игрокам каждые две минуты в зависимости от их характеристик.\nОн так же повышает свой уровень и статы, в зависимости от количества призывов.\nОтката у призыва нет.\nОдновременно может существовать только один босс.",
            bossDealDamage: "Бить босса можно раз в час /boss - нанести урон.",
            bossHeal: "Если босс нанёс тебе много урона, ты можешь отхилиться зельем хп (/whoami - раздел 'инвентарь'. Выбрать необходимое зелье и применить его), которое нужно купить в магазине /shop.\n",
            bossShop: "В магазине можно купить разные предметы и улучшения, как постоянные, так и временные. Например, бонус для нанесения увеличенного урона боссу (действует на 10 ударов) или длину меча.\n",
            class: "Ты можешь выбрать свой класс через команду /whoami.\nМенять класс можно раз в НЕДЕЛЮ! Классы отличаются скиллами (всего 3 скилла), статами и в целом возможностями.\n" +
                "\nДля использования 2 и 3 скилла расходуется золото и кристаллы.",
            slots: "Игра в слоты. Делаешь ставку. Игра начинается автоматически.\nПри нажатии на кнопку 'сделать спин' тебе выдаётся 3 случайных эмодзи.\nЕсли все 3 эмодзи будут одинаковые, ты выиграл.",
            chest: "Игрок имеет возможность открыть 3 сундучка в день /chest.\nИз сундучка выпадает случайное к-во опыта, или золота, или кристаллов и т.д. Награде соответствуют иконки на клавиатуре.\n",
            point: "Игра в 21 очко /point - играть можно как на ставки, так и без них. Время отведённое для ставок - 25 секунд.\nВеличина карт равна их ценности (10 - 10, 9 - 9 и так далее)," +
                " Валет - 2, Дама - 3, Король - 4, Туз - 11 или 1, в зависимости от текущего к-ва очков.\nПобеждает тот, у кого наибольшее к-во очков, но которое меньше или равно 21.\n" +
                "Так же, есть вероятность, что тебя обыграет бот, который играет вместе с вами. Колода рассчитана на 36 карт.\nВ игру допускается не более 4 живых игроков + бот.",
            dice: "Игра на бросание кубика. Ты можешь делать ставки, можешь играть без ставок.\nПосле окончания времени на ставки, начинается сама игра. Нажми трижды на кнопку 'Бросить кубик'.\n" +
                "Ты сделаешь три броска и получишь какое-то количество очков.\nЕсли твоё суммарное количество очков между 12 и 18 (включительно), ты получаешь награду.",
            bowling: "Игра в боулинг. Ты можешь делать ставки, можешь играть без ставок.\nПосле окончания времени на ставки, начинается сама игра. Нажми дважды на кнопку 'Сделать бросок'.\n" +
                "Ты сделаешь два броска и получишь какое-то количество очков.\nЕсли твоё суммарное количество очков между 8 и 12 (включительно), ты получаешь награду. При двух страйках, твоя ставка будет утроена.",
            darts: "Игра в дартс. Ты можешь делать ставки, можешь играть без ставок.\nПосле окончания времени на ставки, начинается сама игра. Нажми трижды на кнопку 'Сделать бросок'.\n" +
                "Ты сделаешь три броска и получишь какое-то количество очков.\nЕсли твоё суммарное количество очков между 13 и 18 (включительно), ты получаешь награду.",
            basketball: "Игра в баскетбол. Ты можешь делать ставки, можешь играть без ставок.\nПосле окончания времени на ставки, начинается сама игра. Нажми трижды на кнопку 'Сделать бросок'.\n" +
                "Ты сделаешь три броска и получишь какое-то количество очков.\nЕсли твоё суммарное количество очков больше 12, ты получаешь награду.",
            football: "Игра в футбол. Ты можешь делать ставки, можешь играть без ставок.\nПосле окончания времени на ставки, начинается сама игра. Нажми трижды на кнопку 'Ударить по мячу'.\n" +
                "Ты сделаешь три удара и получишь какое-то количество очков.\nЕсли твоё суммарное количество очков больше 12, ты получаешь награду.",
            elements: "Игра в элементы. Вы можете играть как со ставками, так и без.\nПосле окончания времени на ставки, начинается сама игра. Игра рассчитана от 1 до 7 человек. Она ведётся с ботом.\n\nПравила игры:\n" +
                "У нас есть 7 элементов: \"🔥 Пиро\", \"❄️ Крио\", \"💨 Анемо\", \"⚡️ Электро\", \"💧 Гидро\", \"🗿 Гео\", \"🌿 Дендро\".\n" +
                "Каждому игроку в начале игры выдаётся один элемент, которые не могут повторяться между собой на первой раздаче.\n" +
                "После раздачи элементов, появляется в том же сообщении, где игроки регистрировались в игре, кнопка с названием 'Стихия!'.\n" +
                "Игроки по очереди нажимают на кнопку и получают один случайный элемент в добавок к уже существующему. Новые элементы могут повторятся между собой и между теми, которые уже есть на руках у игрока.\n" +
                "Всего кругов получения новых элементов: 4.\n" +
                "Цель игры: набрать как можно больше очков.\n\n" +
                "Подсчёт очков:\n" +
                "Если все элементы разные - 10 очков.\n" +
                "Если два элемента одинаковые и два разные - 18 очков.\n" +
                "Если два элемента одинаковые и другие два элемента одинаковые между собой - 24 очка.\n" +
                "Если три элемента одинаковые - 35 очков.\n" +
                "Если четыре элемента одинаковые - 50 очков.\n\n" +
                "У элементов есть синергия. Если в конце игры у собранных игроком элементов получается синергия, то он получает дополнительные очки.\n" +
                "Синергия из двух элементов - 10 очков.\n" +
                "Синергия из трёх элементов - 17 очков.\n" +
                "Синергия из четырёх элементов - 35 очков.",
            form: "Это анкета, которая сделана под любителей геншина",
            contact: "Нашли баг? Есть вопросы? Милости прошу к злому разрабу: @WhitesLove",
            crystals: "Кристаллы выпадают с сундуков, выбиваются с босса и можно получить в обменнике /exchange (курс 1 х 1500)\n",
            stats: "Твои статы (ХП, атака, защита) растут с каждым уровнем.\nУровень повышается путём получения опыта от убийства босса или выпадает с сундуков.\n",
            whoami: "Всю информацию о своём персонаже можно посмотреть через меню /whoami. В данном меню можно выбрать класс персонажа, управлять своими зданиями и инвентарём.\n",
            sendGold: "Игрок имеет возможность переводить золото другому игроку /send_gold. Появится список ников всех участников группы.\n" +
                "Выбери нужного участника и введи необходимое количество голды для передачи.\n" +
                "Золото нельзя передавать во время игры. Кристаллы передавать нельзя.",
            mute: "Команда /self_mute даёт вам возможность замутаться в чате на 2 минуты.\nНе работает на админов и работает ТОЛЬКО в супергруппах. Зачем? Потому что.",
            stealResources: "/steal_resources - позволяет ограбить другого игрока. Количество украденных ресурсов зависит от количества хп, которое вы снесли при автобое другому игроку. " +
                "Если Вы выиграли бой, но у игрока количество ресурсов меньше или равно количеству ресурсов под защитой казны, вы уйдёте ни с чем, получив только опыт." +
                " Не рекомендуется нападать на игроков, чей уровень на 8 и более выше вашего. После ограбления игрока, на него вешается щит на 2 часа. Если игрок, имеющий щит, нападёт на кого-то, щит будет моментально снят.",
            selectGender: "/select_gender - позволяет указать свой пол. На данный момент влияет на Ваш аватар класса, который появляется при вызове /whoami",
            builds: "/whoami > Постройки - Управление Вашими постройками. Вы можете получать ресурсы, улучшать их и, даже, изменять название и внешний вид для некоторых из них.",
            gacha: "/lucky_roll - Гача со снаряжением для вашего персонажа. На данным момент пять видов гач. Доступ к гаче определяется Вашим уровнем. Вы можете крутить равную или ниже Вашего уровня гачу." +
                " Для круток требуется золото и иногда кристаллы. Ежедневно восстанавливаются бесплатные попытки для каждой гачи. Так же, если Вы не хотите забирать снаряжение, которое Вам выпало, можно его распылить на осколки." +
                " Определённое количество осколков дадут Вам бесплатную попытку для крутки.",
            equipment: "Система снаряжения для вашего персонажа. На данный момент, снаряжение можно достать из гачи (/lucky_roll). Выпадение снаряжения зависит от Вашего уровня." +
                "Снаряжение имеет как положительные, так и отрицательные свойства, в зависимости от его грейда и редкости. Вы можете надеть или снять снаряжение через меню инвентаря." +
                " Просмотреть статистику надетых вещей можно в разделе Статистика персонажа /whoami",
            helpForm: "Основная информация об анкете (команда /form):\n" +
                "Анкета, чтобы пользователь мог предоставить некоторую игровую информацию о себе.\n" +
                "Она имеет следующие команды:\n" +
                "1. /setNickName - твой игровой ник\n" +
                "2. /setGameId - твой игровой айди\n" +
                "3. /setRank - твой уровень в игре\n" +
                "4. /setBestCharacter - твой лучший персонаж\n" +
                "5. /setFavoriteCharacter - твой любимый персонаж\n" +
                "6. /setInGameExp - игровой опыт (к-во дней, месяцев, лет)\n" +
                "7. /setLvlOfWorld - уровень мира\n" +
                "8. /setFavoriteElement - любимый элемент\n" +
                "9. /setFavoriteLocation - любимая локация\n" +
                "10. /setMostWishesCharacter - самый желаемый персонаж\n" +
                "11. /setAge - возраст\n" +
                "12. /setGender - пол (влияет на вывод титулов в Ж или М роде)\n" +
                "13. /setMostHatedCharacter - наиболее ненавистный персонаж\n" +
                "14. /setAchievementsCount - количество ачивок\n" +
                "15. /remove_keyboard - убрать клавиатуру\n",
            adminCommands: "У админов есть свои команды, чтобы как-то влиять на игроков.\nОдни дают ресурсы, другие перезапускают игры.\nУвидеть весь список команд можно командой /admin_commands"
        }
    }, "en": {
        index: "Pick form",
        info: {
            category: "Pick the form item that interested you"
        }
    }
};

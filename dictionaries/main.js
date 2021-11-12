module.exports = {
    "ru": {
        index: "Выбери интересующий тебя пункт",
        info: "Полная информация о участниках группы",
        menu: "выбери пункт меню",
        customButtonsCreate: "Выбери пункт для создания кнопки",
        customButtonsCreateContinue: "Выбери кнопку для редактирования",
        help: "Основная информация о возможностях бота:\nТы можешь получить себе случайный титул через команду /title, которую можно вызвать раз в 10 минут, и посмотреть последние 10 титулов группы командой /titles\n\n" +
            "Ты можешь 'увеличить свой меч' используя команду /sword, вызывается раз в сутки, обновляется в 00.00.\nПосмотреть список мечей группы можно командой /swords. Игроки отсортированы в порядке убывания\n\n" +
            "Группа может призывать босса командой /summon_boss. Он имеет свои скиллы (на данный момент - три), которые описываются при призыве\n" +
            "Каждый раз призывая босса, он появляется со случайным к-вом хп, которое зависит от количества участников чата. Он может лупить игроков в ответ. Мёртвый игрок не может атаковать босса.\n" +
            "Когда босса убьют, будут выданы награды: золото и опыт. Наибольшие награды получают первые 3 места. За каждый повышенный уровень ты так же получаешь золото.\n" +
            "Бить босса можно раз в час /deal_damage. Отката у призыва нет. Если босс нанёс тебе много урона, ты можешь отхилиться зельем хп, которое нужно купить в магазине /shop.\n" +
            "В магазине так же можно купить бонус для нанесения урона боссу (действует на 10 ударов), можно иметь все одновременно, так и плюшки для других игр (например, отращивания меча).\n" +
            "Игрок имеет возможность переводить золото другому игроку /send_gold. И открывать 3 сундучка в день /chest.\n" +
            "Из сундучка выпадает случайное к-во опыта, или золота, или... сам увидишь. Награде соответствуют иконки на клавиатуре.\n" +
            "Игра в 21 очко /point - играть можно как на ставки, так и без них. Время отведённое для ставок - 40 секунд. Величина карт равна их ценности (10 - 10, 9 - 9 и так далее)," +
            " Валет - 2, Дама - 3, Король - 4, Туз - 11 или 1, в зависимости от текущего к-ва очков. Побеждает тот, у кого наибольшее к-во очков, но которое меньше или равно 21." +
            "Так же, есть вероятность, что тебя обыграет бот, который играет вместе с вами. Колода расчитана на 36 карт. В игру допускается не более 4 живых игроков + бот.\n\n" +
            "Нашли баг? Есть вопросы? Милости прошу к злому разрабу: @WhitesLove",
        helpMenu: "Основная информация о анкете (команда /menu):\n" +
            "Данная анкета расчитана на то, чтобы пользователь мог предоставить некоторую игровую информацию о себе.\n" +
            "Меню имеет следующие команды:\n" +
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
    }, "en": {
        index: "Pick menu",
        info: {
            category: "Pick the menu item that interested you"
        }
    }
};

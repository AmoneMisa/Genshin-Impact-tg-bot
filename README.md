>Телеграм бот для групп и персонального использования с открытым исходным кодом.
---

**Общие возможности бота:**
- Игры;
- Анкеты для игры Genshin Impact;
- Selfmute для самых нервозных;
- ~~Команды для получения и отправки постов с Reddit (в разработке);~~ Отменено из-за изменения политики Reddit.
- Команда help с описанием возможностей команд;
- Админ команды для помощи в управлении персонажами участников чата;
- Команды для сброса игр, на случай, если они зависли по какой-то причине.
- Команда help, где расписана основная информация и правила игр.
- Команда feedback, при помощи которой можно связаться с разработчиком.

**Игры:**
- Открытие сундучков;
- Карточная игра "21 очко";
- Забавные титулы по Genshin Impact;
- Убийство босса;
- Система опыта, классов, лута, характеристик и увеличения уровня персонажа;
- Система магазина с разными возможностями;
- Система передачи золота между игроками;
- "Кости" (бросить кубики);
- Слоты;
- Боулинг;
- Бартс;
- Элементы;
- Футбол;
- Баскетбол;
- "Увеличение меча";
- Постройки
- <span style="color:rgb(210, 170, 220)">НОВОЕ</span>: система снаряжения
- <span style="color:rgb(210, 170, 220)">НОВОЕ</span>: система гачи
- <span style="color:rgb(210, 170, 220)">НОВОЕ</span>: шуточный гороскоп


**Пример файла для настроек**

*Название:     <span style="color:#eb4c4c">config.js</span>*

    module.exports = {
        token: 'Токен бота, получается через BotFather',
        myId:  Айди владельца бота (строго в числовом формате)
    };


**Административные команды**

- Добавить чат в доверенные;
- Получить данные чата;
- Настройка доступных обычных команд для чата;
- Показать список админ команд (присылается в личные сообщения);
- Убить босса;
- Настройки босса;
- Обнулить таймер для сундука пользователя;
- Добавить пользователю золота;
- Добавить пользователю кристаллов (необходимы для улучшения построек и <span style="color:#eb4c">скиллов персонажей</span> (в разработке));
- Добавить пользователю опыт;
- Добавить пользователю железную руду;
- Обнулить сессию игры в "кости" (доступна всем пользователям. Применяется в случае, если у пользователя зависла сессия игры);
- Обнулить сессию игры в "21 очко";
- Обнулить сессию игры в "элементы" и другие игры;
- Сбросить таймер "увеличения меча" для пользователя;
- Перезапустить таймеры "увеличения меча" у всех чатов и пользователей (на случай зависания таймера. Применяется только     <span style="color:#9c61d0">владельцем</span> бота).
- Обновить характеристики персонажа или у всего чата, в случае, если произошли изменения в расчётах для характеристик.


**Общий принцип работы**

- С ботом могут общаться только <span style="color:#9c61d0">доверенные владельцем</span> пользователи и чаты;
- После запуска, бот создаёт файлы для данных - сессий, боссов, титулов, доверенных чатов и при отключении делает их бэкапы.
- Бот НЕ ведёт логирование действий пользователей;
- Бот сообщает владельцу в личные сообщения, если он отключается или происходит ошибка.


**Функции для переиспользования**

Бот имеет множество различных функций для переиспользования.
К примеру, постройка клавиатуры как с пагинацией, так и со списком людей в группе (записанных в сессию, т.к. <span style="color:#eb4c4c">телеграм не имеет апи</span> для получения списка всех юзеров). Функции для удобного получения сессий и некоторых их состояний. Удобной отправки сообщений с различными настройками (отправка с удалением через время, отправка "дебаг-сообщения" с нужной владельцу информацией в личные сообщения, удаление сообщения через определённое время, обычная отправка сообщения).


**Создатели бота**  
WhitesLove  
Baros


**Бот написан на основе**
1. Telegram Bot Api
2. Node Telegram Bot Api


**Что в планах**

1. Добавить возможность "построек" для получения разной валюты и характеристик <span style="color:rgb(10, 150 , 10)">(Сделано)</span>;
2. ~~Доработать отправку постов с Reddit;~~  В связи с закрытием API реддитом, <span style="color:rgb(150, 10 , 10)">отменено</span>.
3. Добавить систему экипировки для игроков <span style="color:rgb(10, 150 , 10)">(Сделано)</span>;
4. Добавить большее разнообразие боссов и их навыков <span style="color:rgb(10, 150 , 10)">(Сделано)</span>;
5. Добавить больше навыков, классов для игроков;
6. Добавить возможность удалять "мёртвые души" из списка пользователей чата <span style="color:rgb(10, 150 , 10)">(Сделано)</span>;
7. Добавить возможность скрывать в списке пользователей чата тех, кто в нём уже не состоит, но всё ещё не был удалён из сессии (данных) чата <span style="color:rgb(10, 150 , 10)">(Сделано)</span>;
8. Переработать систему нанесения урона боссу <span style="color:rgb(10, 150 , 10)">(Сделано)</span>.
9. Добавить систему кланов и клановых боссов 
10. Добавить дуэли 
11. Добавить воровство ресурсов <span style="color:rgb(10, 150 , 10)">(Сделано)</span>
12. Добавить систему улучшения снаряжения 
13. Добавить систему крафта расходок и снаряжения 
14. Добавить систему аукциона для расходок, ресурсов, снаряжения 
15. Добавить магазин - постройку, в котором можно покупать ресурсы, редко - хорошее снаряжение, расходки и продавать уже имеющийся мусор за небольшое количество золота
16. Добавить академию - постройку, в которой можно улучшать своего персонажа
17. Добавить полигон - постройку, в которой можно копить опыт для своего персонажа
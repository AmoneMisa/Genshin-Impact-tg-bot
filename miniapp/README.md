# Mini App

Серверная часть Telegram Mini App. Клиент лежит в `../webapp`, общая документация — в корневом `../README.md`.

## Архитектура

- `../miniapp-entry.js` — точка входа: запускает бота (`../index.js`) и HTTP-сервер Mini App; `/play` отправляет кнопку запуска.
- `server.js` — статика клиента и авторизованное API (`/api/...`). Каждый запрос проверяет подпись `initData`.
- `telegramAuth.js` — серверная проверка `Telegram.WebApp.initData`.
- `state.js` — безопасный DTO игрока и каталог экранов (`FEATURE_CATALOG`).
- `featureAccess.js` — какие маршруты зависят от настроек чата (`/api/chat-settings`).
- По файлу на механику: `boss.js`, `arena.js`, `clan*.js`, `equipment.js`, `buffs.js`, `luck.js`, `stars.js`, `promo.js`, `social.js`, `adminTools.js` и т. д.
- `notifications.js` — пуши в личку и счётчики красных точек (`/api/badges`).
- `language.js` — язык игрока на сервере (перевод пушей и сообщений бота).

Старые текстовые команды бота убраны: на любую команду бот отвечает кнопкой запуска. Вся игровая логика теперь идёт через это API.

## Настройка Telegram

В BotFather настрой Main Mini App на публичный HTTPS-адрес сервера.

```bash
MINI_APP_URL=https://game.example.com
MINI_APP_SHORT_NAME=game      # имя Mini App в BotFather: нужно для кнопки в группах
MINI_APP_PORT=8080
MINI_APP_HOST=0.0.0.0
MINI_APP_ENABLED=true         # false — запустить только бота
```

`/play` создаёт ссылку `startapp=chat_<chatId>`, поэтому игровой мир и сессия берутся из того чата, откуда открыли игру.

## Запуск

```bash
npm run run
```

## Правила безопасности

- Не доверять `initDataUnsafe` на сервере; проверять подпись и возраст `initData`.
- Награды, ГСЧ, таймеры и валюта — только на сервере.
- Любое изменение чата — под локом чата (`withLock`), чтобы не получить `VersionError`.
- В браузер отдаются только DTO (`state.js` и ответы модулей), не сырые сессии.
- Админ-действия проверяются по `ADMIN_ID` на сервере, а не по тому, что показал клиент.

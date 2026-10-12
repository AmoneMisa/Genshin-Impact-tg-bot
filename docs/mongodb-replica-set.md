# MongoDB и сохранение игры

`checkAccumulateTimer … database_transactions_required` означает, что MongoDB не поддерживает транзакции. Для атомарной записи персонажа и чата нужен replica set либо sharded cluster. Обычный standalone не подходит. Одного узла replica set достаточно для транзакций; это не обеспечивает резервирование сервера.

Проверить подключение без записи данных и вывода строки подключения:

```sh
node --env-file=.env scripts/models/checkTransactions.mjs
```

## Docker Compose

В репозитории сервис `mongo` уже запускается с `--replSet rs0`, healthcheck инициализирует набор и ждёт primary. На сервере должны быть обновлены не только образ бота, но и `docker-compose.yml`. Если задан `DOCKER_MONGO_URL`, бот использует внешнюю базу: настройка встроенного `mongo` на неё не влияет.

Перед переводом существующей базы остановить запись бота и сделать резервную копию. Использовать прежний Compose project и прежний том `mongo-data`. Не запускать `docker compose down -v`.

```sh
docker compose stop bot
docker compose exec mongo mongodump --archive=/tmp/before-replica-set.archive --gzip
docker compose cp mongo:/tmp/before-replica-set.archive ./before-replica-set.archive
docker compose up -d mongo
docker compose ps mongo
docker compose up -d bot
docker compose exec bot node scripts/models/checkTransactions.mjs
```

Команды резервирования выше предназначены для встроенной базы этого Compose без аутентификации. Дождаться состояния `healthy` перед запуском бота. Проверка должна показать `transactionsSupported: true`.

### Старый Compose и перезапускающийся бот

`setName: undefined` при `isWritablePrimary: true` означает standalone: MongoDB доступна для записи, но replica set не настроен. Статус `healthy` старого healthcheck, проверяющего только ping, не подтверждает поддержку транзакций. Обновление образа бота не обновляет серверный Compose-файл.

После остановки бота и резервирования данных проверить, что существующий сервис `mongo` запускается с `command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]`. Пересоздать именно этот сервис в прежнем Compose project, сохраняя его том:

```sh
docker compose up -d --force-recreate mongo
docker compose exec mongo mongosh --quiet --eval "try { rs.status() } catch(e) { if(e.code === 94) rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo:27017'}]}); else throw e; }"
docker compose exec mongo mongosh --quiet --eval 'const h=db.hello(); printjson({setName:h.setName, primary:h.isWritablePrimary})'
```

Инициализация выполняется только для ещё не настроенного replica set (код 94); существующий набор не перенастраивается. Дождаться `setName: 'rs0'` и `primary: true`.

В старых образах `scripts/models/checkTransactions.mjs` отсутствует из-за прежнего исключения `scripts/models` из Docker context. Исправленная упаковка включает только диагностический скрипт. Для проверки старого образа без запуска приложения и вывода строки подключения:

```sh
docker compose run --rm --no-deps --entrypoint node bot --input-type=module -e 'import mongoose from "mongoose"; try { await mongoose.connect(process.env.MONGO_URL,{serverSelectionTimeoutMS:10000}); const h=await mongoose.connection.db.admin().command({hello:1}); const supported=Boolean(h.setName||h.msg==="isdbgrid"); console.log(JSON.stringify({transactionsSupported:supported,topology:h.msg==="isdbgrid"?"sharded":h.setName?"replicaSet":"standalone",primary:Boolean(h.isWritablePrimary)})); if(!supported)process.exitCode=2; } catch(e) { console.error(JSON.stringify({checkFailed:true,type:e.name,code:e.code||null})); process.exitCode=1; } finally { await mongoose.disconnect(); }'
```

Если встроенная MongoDB уже является replica set, но проверка бота показывает standalone, проверить `DOCKER_MONGO_URL` в `.env`: он переопределяет адрес базы. Сохранить используемые имя базы и данные авторизации, добавив `replicaSet=rs0`. После успешной проверки пересоздать бот: `docker compose up -d --force-recreate bot`.

## Отдельная MongoDB

1. Остановить бот, сделать резервную копию базы.
2. В существующий конфиг `mongod` добавить:

   ```yaml
   replication:
     replSetName: rs0
   ```

3. Перезапустить ту же службу MongoDB с тем же `storage.dbPath`.
4. В `mongosh` выполнить один раз:

   ```js
   rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})
   db.hello().isWritablePrimary
   ```

   `localhost` подходит только если бот подключается с того же компьютера. Для отдельного сервера использовать DNS-имя, доступное MongoDB и боту. Не заменять конфигурацию уже существующего replica set. При включённой аутентификации требуется настройка внутренней аутентификации узлов по документации MongoDB.

5. В существующем `MONGO_URL` сохранить базу, логин, пароль и другие параметры; добавить `replicaSet=rs0` (`?` для первого параметра, `&` для последующих). Имя должно соответствовать `rs.conf()._id`.
6. Запустить проверку поддержки транзакций, затем бот.

На Windows конфиг используется службой MongoDB: менять нужно именно её конфиг, а не запускать второй `mongod` рядом с работающим. Инструкция требует перезапуска базы.

При запуске бот теперь проверяет топологию до импорта данных и запуска обработчиков. Ошибка конфигурации останавливает запуск с инструкцией вместо повторяющихся ошибок сохранения каждого чата. Проверка не инициирует replica set и не меняет базу автоматически.

Официальная инструкция: [Convert a Standalone to a Replica Set](https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/).

# Telegram Mini App / WebGL migration

This branch keeps the legacy text bot operational and adds a Telegram Mini App as a new presentation layer.

## Architecture

- `index.js` — existing Telegram text bot and game logic (unchanged).
- `miniapp-entry.js` — compatibility entrypoint: starts the legacy bot plus Mini App HTTP server and `/play` launcher.
- `miniapp/server.js` — static WebGL client + authenticated API.
- `miniapp/telegramAuth.js` — server-side validation of `Telegram.WebApp.initData`.
- `miniapp/state.js` — maps the existing file-backed session to a safe client DTO.
- `webapp/` — dependency-free Telegram Mini App with a real WebGL canvas.

The Mini App intentionally does **not** mutate economy/state yet. Existing text commands remain the authoritative actions while mechanics are migrated one by one.

## Telegram / BotFather setup

Configure a Main Mini App for the bot in BotFather and point it to the public HTTPS URL served by this app.

Environment variables:

```bash
MINI_APP_URL=https://game.example.com
MINI_APP_SHORT_NAME=game
MINI_APP_PORT=8080
MINI_APP_HOST=0.0.0.0
# Set to false to run only the legacy bot through miniapp-entry.js
MINI_APP_ENABLED=true
```

`MINI_APP_SHORT_NAME` is important for group chats. `/play` creates a direct Mini App link with `startapp=chat_<chatId>`, preserving the existing per-chat game world/session model.

## Run

```bash
npm run run
```

Legacy-only fallback:

```bash
npm run run:legacy
```

## Migration order

Recommended next mechanics:

1. Chest opening — small isolated state transition and good WebGL interaction test.
2. Gacha — animation-heavy, naturally benefits from WebGL.
3. Equipment/inventory — UI-heavy, low realtime complexity.
4. Buildings/shop — stateful resource screens.
5. Boss — shared-chat combat with server-authoritative actions.
6. Arena/PvP — migrate last, after concurrency and anti-replay protections are in place.

## Security rules

- Never trust `initDataUnsafe` on the server.
- Validate `initData` signature and age before resolving a player.
- Keep rewards, RNG, timers and currency mutations server-authoritative.
- Do not expose raw session objects to the browser; use DTOs from `miniapp/state.js`.
- Keep the legacy text commands as rollback/fallback until each mechanic has parity tests.

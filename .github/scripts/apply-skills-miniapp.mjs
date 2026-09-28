import fs from 'node:fs';

function patch(path, oldText, newText, label) {
  const current = fs.readFileSync(path, 'utf8');
  if (!current.includes(oldText)) throw new Error(`Missing anchor: ${label}`);
  fs.writeFileSync(path, current.replace(oldText, newText));
}

patch(
  'miniapp/server.js',
  "import { getPlayerProfileState, changePlayerClassForMiniApp, changePlayerGenderForMiniApp } from './playerProfile.js';\n",
  "import { getPlayerProfileState, changePlayerClassForMiniApp, changePlayerGenderForMiniApp } from './playerProfile.js';\nimport { getSkillsState, enchantSkillForMiniApp } from './skills.js';\n",
  'server skills import',
);

patch(
  'miniapp/server.js',
  "async function inventoryState(req, res) {\n",
  `async function playerSkillsState(req, res) {
  try {
    const context = await authorize(req);
    const skills = await withLock(\`${'${context.chatId}:${context.userId}:skills'}\`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return getSkillsState(context.session);
    });
    return sendJson(res, 200, skills);
  } catch (error) {
    return sendApiError(res, 'player skills state', error);
  }
}

async function playerSkillsEnchant(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    const slot = Number(body.slot);
    if (!Number.isInteger(slot) || slot < 0) {
      const error = new Error('slot must be a non-negative integer');
      error.status = 400;
      throw error;
    }

    const result = await withLock(\`${'${context.chatId}:${context.userId}:skills'}\`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const enchanted = enchantSkillForMiniApp(context.session, slot);
      if (enchanted.ok) await saveSession(context.session);
      return enchanted;
    });

    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'player skills enchant', error);
  }
}

async function inventoryState(req, res) {
`,
  'server skills handlers',
);

patch(
  'miniapp/server.js',
  "    if (route === 'POST /api/profile/gender') return playerProfileGender(req, res);\n",
  "    if (route === 'POST /api/profile/gender') return playerProfileGender(req, res);\n    if (route === 'GET /api/skills') return playerSkillsState(req, res);\n    if (route === 'POST /api/skills/enchant') return playerSkillsEnchant(req, res);\n",
  'server skills routes',
);

patch(
  'miniapp/state.js',
  "      { id: 'profile', title: 'Персонаж', subtitle: 'Класс, пол и характеристики', icon: '🧙', status: 'webgl' },\n",
  "      { id: 'profile', title: 'Персонаж', subtitle: 'Класс, пол и характеристики', icon: '🧙', status: 'webgl' },\n      { id: 'skills', title: 'Навыки', subtitle: 'Прокачка умений и ОП', icon: '⚡', status: 'webgl' },\n",
  'state skills card',
);

patch(
  'webapp/app.js',
  "import { openPlayerProfile } from './profile.js';\n",
  "import { openPlayerProfile } from './profile.js';\nimport { openSkillsGame } from './skills.js';\n",
  'app skills import',
);

patch(
  'webapp/app.js',
  "  profile: [openPlayerProfile, 'Профиль персонажа работает через Mini App и сохраняется в Mongo.'],\n",
  "  profile: [openPlayerProfile, 'Профиль персонажа работает через Mini App и сохраняется в Mongo.'],\n  skills: [openSkillsGame, 'Навыки и их улучшения работают через Mini App и сохраняются в Mongo.'],\n",
  'app skills launcher',
);

patch(
  'webapp/index.html',
  "  <link rel=\"stylesheet\" href=\"/profile.css\" />\n",
  "  <link rel=\"stylesheet\" href=\"/profile.css\" />\n  <link rel=\"stylesheet\" href=\"/skills.css\" />\n",
  'skills stylesheet',
);

patch(
  '.github/workflows/miniapp-ci.yml',
  "          node --check miniapp/state.js\n",
  "          node --check miniapp/state.js\n          node --check miniapp/skills.js\n",
  'skills backend syntax',
);

patch(
  '.github/workflows/miniapp-ci.yml',
  "          node --check callbacks/game/player/showInventory.js\n",
  "          node --check callbacks/game/player/showInventory.js\n          node --check callbacks/game/player/skillsCallback.js\n",
  'legacy skills syntax',
);

patch(
  '.github/workflows/miniapp-ci.yml',
  "          node --check webapp/forms.js\n",
  "          node --check webapp/forms.js\n          node --check webapp/skills.js\n",
  'skills frontend syntax',
);

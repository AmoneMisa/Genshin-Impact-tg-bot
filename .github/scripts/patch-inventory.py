from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


# Server API.
path = Path('miniapp/server.js')
text = path.read_text()
anchor = "import { getPlayerProfileState, changePlayerClassForMiniApp, changePlayerGenderForMiniApp } from './playerProfile.js';\n"
text = replace_once(text, anchor, anchor + "import { getInventoryState, useInventoryPotion } from './inventory.js';\n", 'inventory import')

anchor = "async function goldTransferState(req, res) {\n"
handlers = """async function inventoryState(req, res) {
  try {
    const context = await authorize(req);
    const inventory = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return getInventoryState(context.session);
    });
    return sendJson(res, 200, inventory);
  } catch (error) {
    return sendApiError(res, 'inventory state', error);
  }
}

async function inventoryUse(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (!['string', 'number'].includes(typeof body.key) || String(body.key).trim() === '') {
      const error = new Error('key is required');
      error.status = 400;
      throw error;
    }

    const result = await withLock(`${context.chatId}:${context.userId}:inventory`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const used = useInventoryPotion(context.session, body.key);
      if (used.ok) await saveSession(context.session);
      return used;
    });

    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'inventory use', error);
  }
}

"""
text = replace_once(text, anchor, handlers + anchor, 'inventory handlers')

anchor = "    if (route === 'POST /api/profile/gender') return playerProfileGender(req, res);\n"
routes = """    if (route === 'GET /api/inventory') return inventoryState(req, res);
    if (route === 'POST /api/inventory/use') return inventoryUse(req, res);
"""
text = replace_once(text, anchor, anchor + routes, 'inventory routes')
path.write_text(text)


# Game hub state.
path = Path('miniapp/state.js')
text = path.read_text()
anchor = "      { id: 'profile', title: 'Персонаж', subtitle: 'Класс, пол и характеристики', icon: '🧙', status: 'webgl' },\n"
text = replace_once(text, anchor, anchor + "      { id: 'inventory', title: 'Инвентарь', subtitle: 'Ресурсы и расходники', icon: '🎒', status: 'webgl' },\n", 'inventory feature')
path.write_text(text)


# Browser launcher.
path = Path('webapp/app.js')
text = path.read_text()
anchor = "import { openPlayerProfile } from './profile.js';\n"
text = replace_once(text, anchor, anchor + "import { openInventoryGame } from './inventory.js';\n", 'inventory UI import')
anchor = "  profile: [openPlayerProfile, 'Профиль персонажа работает через Mini App и сохраняется в Mongo.'],\n"
text = replace_once(text, anchor, anchor + "  inventory: [openInventoryGame, 'Инвентарь работает через Mini App; расходники сохраняются в Mongo.'],\n", 'inventory launcher')
path.write_text(text)


# Stylesheet.
path = Path('webapp/index.html')
text = path.read_text()
anchor = '  <link rel="stylesheet" href="/profile.css" />\n'
text = replace_once(text, anchor, anchor + '  <link rel="stylesheet" href="/inventory.css" />\n', 'inventory stylesheet')
path.write_text(text)

from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


path = Path('miniapp/server.js')
text = path.read_text()
anchor = "import { getInventoryState, useInventoryPotion } from './inventory.js';\n"
text = replace_once(text, anchor, anchor + "import { getExchangeState, buyCrystalsForMiniApp } from './exchange.js';\n", 'exchange import')

anchor = "async function goldTransferState(req, res) {\n"
handlers = """async function exchangeState(req, res) {
  try {
    const context = await authorize(req);
    const exchange = await withLock(`${context.chatId}:${context.userId}:exchange`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return getExchangeState(context.session);
    });
    return sendJson(res, 200, exchange);
  } catch (error) {
    return sendApiError(res, 'exchange state', error);
  }
}

async function exchangeBuy(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    const result = await withLock(`${context.chatId}:${context.userId}:exchange`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const purchase = buyCrystalsForMiniApp(context.session, body.amount);
      if (purchase.ok) await saveSession(context.session);
      return purchase;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'exchange buy', error);
  }
}

"""
text = replace_once(text, anchor, handlers + anchor, 'exchange handlers')

anchor = "    if (route === 'POST /api/inventory/use') return inventoryUse(req, res);\n"
routes = """    if (route === 'GET /api/exchange') return exchangeState(req, res);
    if (route === 'POST /api/exchange/buy') return exchangeBuy(req, res);
"""
text = replace_once(text, anchor, anchor + routes, 'exchange routes')
path.write_text(text)

path = Path('miniapp/state.js')
text = path.read_text()
anchor = "      { id: 'inventory', title: 'Инвентарь', subtitle: 'Ресурсы и расходники', icon: '🎒', status: 'webgl' },\n"
text = replace_once(text, anchor, anchor + "      { id: 'exchange', title: 'Обменник', subtitle: 'Золото в кристаллы', icon: '💱', status: 'webgl' },\n", 'exchange feature')
path.write_text(text)

path = Path('webapp/app.js')
text = path.read_text()
anchor = "import { openInventoryGame } from './inventory.js';\n"
text = replace_once(text, anchor, anchor + "import { openExchangeGame } from './exchange.js';\n", 'exchange UI import')
anchor = "  inventory: [openInventoryGame, 'Инвентарь работает через Mini App; расходники сохраняются в Mongo.'],\n"
text = replace_once(text, anchor, anchor + "  exchange: [openExchangeGame, 'Обменник работает через Mini App и сохраняет покупку в Mongo.'],\n", 'exchange launcher')
path.write_text(text)

path = Path('webapp/index.html')
text = path.read_text()
anchor = '  <link rel="stylesheet" href="/inventory.css" />\n'
text = replace_once(text, anchor, anchor + '  <link rel="stylesheet" href="/exchange.css" />\n', 'exchange stylesheet')
path.write_text(text)

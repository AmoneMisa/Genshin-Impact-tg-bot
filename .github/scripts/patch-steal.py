from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


path = Path('miniapp/server.js')
text = path.read_text()

anchor = "import { getGoldTransferState, transferGoldForMiniApp } from './goldTransfer.js';\n"
text = replace_once(
    text,
    anchor,
    anchor + "import { getStealState, prepareStealMember, stealForMiniApp } from './steal.js';\n",
    'steal import',
)

anchor = """async function point21State(req, res) {
"""
handlers = """async function stealState(req, res) {
  try {
    const context = await authorize(req);
    const steal = await withLock(`${context.chatId}:steal`, async () => {
      const chat = await getChatSession(context.chatId);
      refreshContextSession(context, chat);
      const changed = prepareStealMember(context.session);
      if (changed) await chat.save();
      return getStealState(chat, context.userId);
    });
    return sendJson(res, 200, steal);
  } catch (error) {
    return sendApiError(res, 'steal state', error);
  }
}

async function stealAttack(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (!['string', 'number'].includes(typeof body.targetId) || String(body.targetId).trim() === '') {
      const error = new Error('targetId is required');
      error.status = 400;
      throw error;
    }

    const payload = await withLock(`${context.chatId}:steal`, async () => {
      const chat = await getChatSession(context.chatId);
      refreshContextSession(context, chat);
      const result = stealForMiniApp(chat, context.userId, body.targetId);
      if (result.ok) await chat.save();
      refreshContextSession(context, chat);
      return {
        result,
        steal: getStealState(chat, context.userId),
      };
    });

    return sendJson(res, payload.result.ok ? 200 : 409, {
      ...payload.result,
      steal: payload.steal,
      state: stateFor(context),
    });
  } catch (error) {
    return sendApiError(res, 'steal attack', error);
  }
}

"""
text = replace_once(text, anchor, handlers + anchor, 'steal handlers')

anchor = """    if (route === 'GET /api/gold-transfer') return goldTransferState(req, res);
    if (route === 'POST /api/gold-transfer/send') return goldTransferSend(req, res);
"""
replacement = anchor + """    if (route === 'GET /api/steal') return stealState(req, res);
    if (route === 'POST /api/steal/attack') return stealAttack(req, res);
"""
text = replace_once(text, anchor, replacement, 'steal routes')

path.write_text(text)

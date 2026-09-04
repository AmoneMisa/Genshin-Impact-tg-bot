from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


path = Path('miniapp/server.js')
text = path.read_text()

anchor = "import { getStealState, prepareStealMember, stealForMiniApp } from './steal.js';\n"
text = replace_once(
    text,
    anchor,
    anchor + "import { getPlayerProfileState, changePlayerClassForMiniApp, changePlayerGenderForMiniApp } from './playerProfile.js';\n",
    'profile import',
)

anchor = "async function goldTransferState(req, res) {\n"
handlers = """async function playerProfileState(req, res) {
  try {
    const context = await authorize(req);
    const profile = await withLock(`${context.chatId}:${context.userId}:profile`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return getPlayerProfileState(context.session);
    });
    return sendJson(res, 200, profile);
  } catch (error) {
    return sendApiError(res, 'player profile state', error);
  }
}

async function playerProfileClass(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (typeof body.className !== 'string' || !body.className) {
      const error = new Error('className is required');
      error.status = 400;
      throw error;
    }

    const result = await withLock(`${context.chatId}:${context.userId}:profile`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const changed = changePlayerClassForMiniApp(context.session, body.className);
      if (changed.ok) await saveSession(context.session);
      return changed;
    });

    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'player profile class', error);
  }
}

async function playerProfileGender(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (typeof body.gender !== 'string' || !body.gender) {
      const error = new Error('gender is required');
      error.status = 400;
      throw error;
    }

    const result = await withLock(`${context.chatId}:${context.userId}:profile`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const changed = changePlayerGenderForMiniApp(context.session, body.gender);
      if (changed.ok) await saveSession(context.session);
      return changed;
    });

    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'player profile gender', error);
  }
}

"""
text = replace_once(text, anchor, handlers + anchor, 'profile handlers')

anchor = "    if (route === 'GET /api/bootstrap') return bootstrap(req, res);\n"
routes = """    if (route === 'GET /api/profile') return playerProfileState(req, res);
    if (route === 'POST /api/profile/class') return playerProfileClass(req, res);
    if (route === 'POST /api/profile/gender') return playerProfileGender(req, res);
"""
text = replace_once(text, anchor, anchor + routes, 'profile routes')

path.write_text(text)

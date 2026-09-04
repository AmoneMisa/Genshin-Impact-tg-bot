from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


# miniapp/server.js
path = Path('miniapp/server.js')
text = path.read_text()
anchor = "import { getExchangeState, buyCrystalsForMiniApp } from './exchange.js';\n"
text = replace_once(text, anchor, anchor + "import { getFormsState, savePersonalForm } from './forms.js';\n", 'forms import')

anchor = "async function playerProfileState(req, res) {\n"
handlers = """async function formsState(req, res) {
  try {
    const context = await authorize(req);
    const forms = await withLock(`${context.chatId}:forms`, async () => {
      const chat = await getChatSession(context.chatId);
      refreshContextSession(context, chat);
      return getFormsState(chat, context.userId);
    });
    return sendJson(res, 200, forms);
  } catch (error) {
    return sendApiError(res, 'forms state', error);
  }
}

async function formsSave(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    const result = await withLock(`${context.chatId}:forms`, async () => {
      const chat = await getChatSession(context.chatId);
      refreshContextSession(context, chat);
      const saved = savePersonalForm(chat, context.userId, body.fields);
      if (saved.ok) await chat.save();
      return saved;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'forms save', error);
  }
}

"""
text = replace_once(text, anchor, handlers + anchor, 'forms handlers')

anchor = "    if (route === 'GET /api/bootstrap') return bootstrap(req, res);\n"
text = replace_once(text, anchor, anchor + "    if (route === 'GET /api/forms') return formsState(req, res);\n    if (route === 'POST /api/forms/save') return formsSave(req, res);\n", 'forms routes')
path.write_text(text)


# miniapp/state.js
path = Path('miniapp/state.js')
text = path.read_text()
anchor = "      { id: 'profile', title: 'Персонаж', subtitle: 'Класс, пол и характеристики', icon: '🧙', status: 'webgl' },\n"
text = replace_once(text, anchor, anchor + "      { id: 'forms', title: 'Анкеты', subtitle: 'Профили участников группы', icon: '📝', status: 'webgl' },\n", 'forms feature')
path.write_text(text)


# webapp/app.js
path = Path('webapp/app.js')
text = path.read_text()
anchor = "import { openPlayerProfile } from './profile.js';\n"
text = replace_once(text, anchor, anchor + "import { openFormsGame } from './forms.js';\n", 'forms ui import')
anchor = "  profile: [openPlayerProfile, 'Профиль персонажа работает через Mini App и сохраняется в Mongo.'],\n"
text = replace_once(text, anchor, anchor + "  forms: [openFormsGame, 'Анкеты работают через Mini App и сохраняются в Mongo.'],\n", 'forms launcher')
path.write_text(text)


# webapp/index.html
path = Path('webapp/index.html')
text = path.read_text()
anchor = "  <link rel=\"stylesheet\" href=\"/profile.css\" />\n"
text = replace_once(text, anchor, anchor + "  <link rel=\"stylesheet\" href=\"/forms.css\" />\n", 'forms stylesheet')
path.write_text(text)

# Trigger temporary runner after workflow installation.

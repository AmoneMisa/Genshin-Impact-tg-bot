from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


path = Path('miniapp/server.js')
text = path.read_text()

text = replace_once(
    text,
    "import { token } from '../config.js';\n",
    "import { token, myId } from '../config.js';\n",
    'config import',
)

anchor = "import saveSession from '../functions/getters/saveSession.js';\n"
text = replace_once(
    text,
    anchor,
    anchor + "import sendMessage from '../functions/tgBotFunctions/sendMessage.js';\n",
    'sendMessage import',
)

anchor = "import { getFormsState, savePersonalForm } from './forms.js';\n"
text = replace_once(
    text,
    anchor,
    anchor
    + "import { getUpdatesState, setUpdatesEnabled } from './updates.js';\n"
    + "import { normalizeFeedbackMessage, formatFeedbackForDeveloper } from './feedback.js';\n",
    'miniapp service imports',
)

anchor = "const locks = new Map();\n"
text = replace_once(
    text,
    anchor,
    anchor + "const feedbackCooldowns = new Map();\nconst FEEDBACK_COOLDOWN_MS = 30_000;\n",
    'feedback cooldown map',
)

anchor = "async function formsState(req, res) {\n"
handlers = """async function updatesState(req, res) {
  try {
    const context = await authorize(req);
    context.session = await getSession(context.chatId, context.userId);
    return sendJson(res, 200, getUpdatesState(context.session));
  } catch (error) {
    return sendApiError(res, 'updates state', error);
  }
}

async function updatesSettings(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    if (typeof body.enabled !== 'boolean') {
      const error = new Error('enabled must be boolean');
      error.status = 400;
      throw error;
    }

    const result = await withLock(`${context.chatId}:${context.userId}:updates`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const changed = setUpdatesEnabled(context.session, body.enabled);
      if (changed.ok) await saveSession(context.session);
      return changed;
    });

    return sendJson(res, result.ok ? 200 : 409, {
      ...result,
      updates: getUpdatesState(context.session),
      state: stateFor(context),
    });
  } catch (error) {
    return sendApiError(res, 'updates settings', error);
  }
}

async function feedbackSubmit(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    const normalized = normalizeFeedbackMessage(body.message);
    if (!normalized.ok) {
      const error = new Error(normalized.reason);
      error.status = 400;
      throw error;
    }

    const cooldownKey = String(context.userId);
    const now = Date.now();
    const lastSentAt = feedbackCooldowns.get(cooldownKey) || 0;
    const waitMs = FEEDBACK_COOLDOWN_MS - (now - lastSentAt);
    if (waitMs > 0) {
      const error = new Error(`Подождите ${Math.ceil(waitMs / 1000)} сек. перед следующим сообщением`);
      error.status = 429;
      throw error;
    }

    await sendMessage(myId, formatFeedbackForDeveloper({
      message: normalized.message,
      user: context.validated.user,
      chatId: context.chatId,
    }), { disable_notification: true });
    feedbackCooldowns.set(cooldownKey, now);

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    return sendApiError(res, 'feedback submit', error);
  }
}

"""
text = replace_once(text, anchor, handlers + anchor, 'updates and feedback handlers')

anchor = "    if (route === 'GET /api/bootstrap') return bootstrap(req, res);\n"
text = replace_once(
    text,
    anchor,
    anchor
    + "    if (route === 'GET /api/updates') return updatesState(req, res);\n"
    + "    if (route === 'POST /api/updates/settings') return updatesSettings(req, res);\n"
    + "    if (route === 'POST /api/feedback') return feedbackSubmit(req, res);\n",
    'updates and feedback routes',
)

path.write_text(text)

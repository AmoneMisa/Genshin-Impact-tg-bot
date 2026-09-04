from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


# Wire the group sword ranking into the existing sword API atomically with the
# player roll, so the leaderboard always reflects the same Mongo document.
path = Path('miniapp/server.js')
text = path.read_text()
text = replace_once(
    text,
    "import { getMiniAppSwordState, rollMiniAppSword } from './sword.js';\n",
    "import { getMiniAppSwordDashboard, rollMiniAppSword } from './sword.js';\n",
    'sword import',
)
old = """async function swordState(req, res) {
  try {
    const context = await authorize(req);
    const sword = await withLock(`${context.chatId}:${context.userId}:sword`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      return getMiniAppSwordState(context.session);
    });
    return sendJson(res, 200, sword);
  } catch (error) {
    return sendApiError(res, 'sword state', error);
  }
}

async function swordRoll(req, res) {
  try {
    const context = await authorize(req);
    const result = await withLock(`${context.chatId}:${context.userId}:sword`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const rolled = rollMiniAppSword(context.session);
      if (rolled.ok) await saveSession(context.session);
      return rolled;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'sword roll', error);
  }
}
"""
new = """async function swordState(req, res) {
  try {
    const context = await authorize(req);
    const sword = await withLock(`${context.chatId}:sword`, async () => {
      const chat = await getChatSession(context.chatId);
      refreshContextSession(context, chat);
      return getMiniAppSwordDashboard(chat, context.userId);
    });
    return sendJson(res, 200, sword);
  } catch (error) {
    return sendApiError(res, 'sword state', error);
  }
}

async function swordRoll(req, res) {
  try {
    const context = await authorize(req);
    const result = await withLock(`${context.chatId}:sword`, async () => {
      const chat = await getChatSession(context.chatId);
      refreshContextSession(context, chat);
      const rolled = rollMiniAppSword(context.session);
      if (rolled.ok) await chat.save();
      return {
        ...rolled,
        sword: getMiniAppSwordDashboard(chat, context.userId),
      };
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'sword roll', error);
  }
}
"""
text = replace_once(text, old, new, 'sword handlers')
path.write_text(text)


# Render /swords inside the existing sword Mini App screen instead of creating
# a duplicate hub card. Telegram names are escaped before insertion into HTML.
path = Path('webapp/sword.js')
text = path.read_text()
anchor = """function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}
"""
addition = """
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function rankingHtml(ranking) {
  if (!Array.isArray(ranking) || ranking.length === 0) {
    return '<div class="sword-ranking-empty">Ещё никто не отрастил свой меч.</div>';
  }

  return ranking.map(entry => {
    const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
    return `<div class="sword-ranking-row ${entry.isCurrent ? 'current' : ''}">
      <span class="sword-ranking-rank">${medal}</span>
      <span class="sword-ranking-name">${escapeHtml(entry.name)}</span>
      <strong>${formatNumber(entry.length)} <small>мм</small></strong>
    </div>`;
  }).join('');
}
"""
text = replace_once(text, anchor, anchor + addition, 'ranking helpers')
anchor = """      <button class="sword-roll" type="button" data-sword-roll ${canRoll ? '' : 'disabled'}>
        <span>⚔️</span>
        <div><strong>${canRoll ? 'Испытать удачу' : 'Попытка использована'}</strong><small>${canRoll ? '−10…+15 мм, модификаторы учитываются сервером' : 'Новая попытка будет в 00:00'}</small></div>
      </button>

      <div class="sword-rules">
"""
replacement = """      <button class="sword-roll" type="button" data-sword-roll ${canRoll ? '' : 'disabled'}>
        <span>⚔️</span>
        <div><strong>${canRoll ? 'Испытать удачу' : 'Попытка использована'}</strong><small>${canRoll ? '−10…+15 мм, модификаторы учитываются сервером' : 'Новая попытка будет в 00:00'}</small></div>
      </button>

      <section class="sword-ranking">
        <div class="sword-ranking-head">
          <div><small>ГРУППОВОЙ РЕЙТИНГ</small><strong>Мечи группы</strong></div>
          <span>${Array.isArray(state.ranking) ? state.ranking.length : 0}</span>
        </div>
        <div class="sword-ranking-list">${rankingHtml(state.ranking)}</div>
      </section>

      <div class="sword-rules">
"""
text = replace_once(text, anchor, replacement, 'ranking panel')
path.write_text(text)


path = Path('webapp/sword.css')
text = path.read_text()
styles = """
.sword-ranking { margin-top:12px; padding:12px; border:1px solid rgba(255,255,255,.065); border-radius:16px; background:rgba(255,255,255,.018); }
.sword-ranking-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
.sword-ranking-head > div { display:grid; gap:2px; }
.sword-ranking-head small { color:var(--muted); font-size:8px; letter-spacing:.09em; }
.sword-ranking-head strong { font-size:12px; }
.sword-ranking-head > span { min-width:28px; height:28px; padding:0 8px; display:grid; place-items:center; border-radius:9px; background:rgba(255,255,255,.04); color:#c8c5d4; font-size:9px; }
.sword-ranking-list { display:grid; gap:5px; max-height:190px; overflow:auto; scrollbar-width:thin; }
.sword-ranking-row { display:grid; grid-template-columns:30px minmax(0,1fr) auto; align-items:center; gap:8px; min-height:36px; padding:6px 8px; border-radius:10px; background:rgba(255,255,255,.018); }
.sword-ranking-row.current { background:linear-gradient(90deg,rgba(89,120,193,.13),rgba(126,75,158,.08)); outline:1px solid rgba(139,171,235,.12); }
.sword-ranking-rank { color:#aaa8b8; font-size:10px; text-align:center; }
.sword-ranking-name { overflow:hidden; color:#ccc9d7; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
.sword-ranking-row strong { color:#f1f2f8; font-size:10px; font-variant-numeric:tabular-nums; }
.sword-ranking-row strong small { color:var(--muted); font-size:7px; font-weight:500; }
.sword-ranking-empty { padding:12px 8px; color:var(--muted); font-size:9px; text-align:center; }
"""
if styles.strip() in text:
    raise RuntimeError('Sword ranking styles are already present')
path.write_text(text.rstrip() + '\n' + styles)

# Trigger the temporary patch workflow after it has been installed.

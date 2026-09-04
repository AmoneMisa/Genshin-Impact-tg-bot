from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


# Server endpoint: only the five legacy score games are resettable. Slots keep
# their deducted wager until the server resolves the spin.
path = Path('miniapp/server.js')
text = path.read_text()
anchor = "import { getArcadeState, startArcadeGame, rollArcadeGame, getArcadeConfig } from './arcade.js';\n"
text = replace_once(text, anchor, anchor + "import { resetArcadeGame } from './arcadeReset.js';\n", 'arcade reset import')

anchor = "async function arcadeState(req, res) {\n"
handler = """async function arcadeReset(req, res) {
  try {
    const context = await authorize(req);
    const body = await readJsonBody(req);
    validateArcadeGameId(body.gameId);
    const result = await withLock(`${context.chatId}:${context.userId}:arcade`, async () => {
      context.session = await getSession(context.chatId, context.userId);
      const reset = resetArcadeGame(context.session, body.gameId);
      if (reset.ok) await saveSession(context.session);
      return reset;
    });
    return sendJson(res, result.ok ? 200 : 409, { ...result, state: stateFor(context) });
  } catch (error) {
    return sendApiError(res, 'arcade reset', error);
  }
}

"""
text = replace_once(text, anchor, handler + anchor, 'arcade reset handler')

anchor = "    if (route === 'POST /api/arcade/start') return arcadeStart(req, res);\n"
text = replace_once(text, anchor, anchor + "    if (route === 'POST /api/arcade/reset') return arcadeReset(req, res);\n", 'arcade reset route')
path.write_text(text)


# Browser UI: expose reset only for score games. It mirrors the old
# /reset_*_game commands and does not alter gold.
path = Path('webapp/arcade.js')
text = path.read_text()
anchor = "  finished: 'Раунд уже завершён.',\n"
text = replace_once(text, anchor, anchor + "  reset_not_supported: 'Этот тип игры нельзя сбросить после списания ставки.',\n", 'arcade reset reason')

old = """      <button type="button" class="arcade-primary roll" data-arcade-roll>
        <span class="arcade-roll-icon">${game.icon}</span>
        <div><strong>Бросить</strong><small>Осталось: ${game.rollsLeft} · RNG выполняется на сервере</small></div>
      </button>`;
"""
new = """      <button type="button" class="arcade-primary roll" data-arcade-roll>
        <span class="arcade-roll-icon">${game.icon}</span>
        <div><strong>Бросить</strong><small>Осталось: ${game.rollsLeft} · RNG выполняется на сервере</small></div>
      </button>
      <button type="button" class="arcade-secondary danger" data-arcade-reset>
        <span>↺</span><div><strong>Сбросить сессию</strong><small>Счёт и текущая база обнулятся, баланс не изменится</small></div>
      </button>`;
"""
text = replace_once(text, old, new, 'arcade reset control')

anchor = "    content.querySelector('[data-arcade-roll]')?.addEventListener('click', roll);\n"
text = replace_once(text, anchor, anchor + "    content.querySelector('[data-arcade-reset]')?.addEventListener('click', reset);\n", 'arcade reset binding')

anchor = "  async function roll() {\n"
reset_function = """  async function reset() {
    if (pending || currentGame().mode === 'slots') return;
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Сбрасываем текущую сессию…';
    haptic('medium');
    try {
      const payload = await api('/api/arcade/reset', {
        method: 'POST',
        body: JSON.stringify({ gameId: selected }),
      });
      state = payload.arcade;
      if (payload.state) renderState(payload.state);
      lastResult = null;
      feedback.textContent = 'Сессия сброшена. Можно начать заново.';
      statusElement.textContent = `${currentGame().title}: сессия сброшена.`;
      renderAll();
    } catch (error) {
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      if (error.payload?.arcade) state = error.payload.arcade;
      renderAll();
      haptic('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

"""
text = replace_once(text, anchor, reset_function + anchor, 'arcade reset function')
path.write_text(text)


path = Path('webapp/arcade.css')
text = path.read_text()
styles = """
.arcade-secondary { width:100%; min-height:43px; margin-top:6px; padding:8px 12px; border:1px solid rgba(255,255,255,.07); border-radius:13px; background:rgba(255,255,255,.018); color:#b8b4c4; display:flex; align-items:center; gap:9px; text-align:left; }
.arcade-secondary > span { width:28px; height:28px; display:grid; place-items:center; border-radius:9px; background:rgba(255,255,255,.03); font-size:14px; }
.arcade-secondary > div { display:grid; gap:2px; }
.arcade-secondary strong { font-size:9px; }
.arcade-secondary small { color:var(--muted); font-size:7px; }
.arcade-secondary.danger { border-color:rgba(214,108,126,.1); color:#c5aeb4; }
.arcade-secondary.danger:hover { background:rgba(138,61,74,.04); }
"""
if '.arcade-secondary {' in text:
    raise RuntimeError('Arcade reset styles are already present')
path.write_text(text.rstrip() + '\n' + styles)

# Trigger the temporary workflow after it has been installed.

import { dialogHeading } from './dialog-heading.js';
import { installOverlayA11y } from './overlay-a11y.js';
import { enhanceSelects } from './design/select.js';
import { escapeHtml as esc } from './escape-html.js';
import { STAKE_CHOICES, stakeBodyOf, stakeText } from './stakes.js';
import { FACES, FACE_NAMES, COMBINATIONS, LEVELS, REROLLS, ROUNDS_TO_WIN, evaluate, newMatch, playerThrow, aiSteps, settleRound, nextRound } from './dice-poker.js';

const RULES = `Кости из «Ведьмака»: у каждого пять костей. Бросьте их, затем один раз перебросьте любые, оставив нужные, или оставьте всё как есть. Побеждает сильнейшая комбинация; если они одинаковые, решает сумма костей комбинации, при равенстве — ничья. Матч идёт до ${ROUNDS_TO_WIN} побед. Ничья не считается, раунд играется заново.`;
const button = (label, attrs = '', primary = false) => `<button type="button" class="ui-button${primary ? ' primary' : ''}" ${attrs}>${label}</button>`;
const STEP_MS = 800;
const POLL_MS = 2500;

/**
 * Dice poker. Against the tavern's player it is played here on the device; against another player (when the app
 * is connected, `api`) the server throws the dice and can hold a stake.
 */
export function openDiceGame({ api = null, haptic = () => {}, initialInvite = null } = {}) {
  if (document.querySelector('.dice-overlay')) return;
  installOverlayA11y();
  // screen: start | lobby (pick a player) | ai (against the tavern) | online (a match with a player)
  let screen = api && initialInvite ? 'lobby' : 'start', focusedInvite = api ? initialInvite : null, level = 'hard', match = null, keep = new Set(), fresh = new Set(), busy = false, note = '', closed = false, surrenderArmed = false;
  let net = { friends: [], incoming: [], outgoing: [], invitation: null, match: null }, wallet = null, stakeChoice = '', pollTimer = null, requestId = 0;
  const timers = new Set();
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!closed) fn(); }, ms); timers.add(id); };

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay dice-overlay';
  overlay.innerHTML = '<div class="overlay-backdrop"></div><div class="overlay-panel game-dialog-panel ui-card-table-window dice-panel" data-dice-panel></div>';
  const panel = overlay.querySelector('[data-dice-panel]');
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  /** `dice` are face numbers; `null` stands for a hidden die. `mine` dice can be kept while `canKeep`. */
  function diceRow(dice, { mine = false, canKeep = false, tag = 'a', label = '' } = {}) {
    return `<div class="dice-row" role="group" aria-label="${esc(label)}">${dice.map((value, i) => {
      const hidden = value === null;
      const name = hidden ? 'скрыта' : `${FACE_NAMES[value]}${canKeep ? (keep.has(i) ? ', оставлена' : ', будет переброшена') : ''}`;
      const classes = `dice-die${mine && canKeep && keep.has(i) ? ' kept' : ''}${fresh.has(`${tag}${i}`) && !reduced() ? ' rolling' : ''}`;
      return canKeep
        ? `<button type="button" class="ui-button ${classes}" data-die="${i}" aria-pressed="${keep.has(i)}" aria-label="${esc(name)}">${FACES[value]}</button>`
        : `<span class="ui-button ${classes} is-static" role="img" aria-label="${esc(name)}">${hidden ? '?' : FACES[value]}</span>`;
    }).join('')}</div>`;
  }
  function combinations() {
    return `<details class="ui-disclosure dice-combinations"><summary>Комбинации</summary><ol class="dice-combination-list">${[...COMBINATIONS].reverse().map(([name, text]) => `<li class="ui-inset-row"><strong>${name}</strong><small>${text}</small></li>`).join('')}</ol></details>`;
  }
  const noteHtml = () => (note ? `<p class="dice-hint" role="status">${esc(note)}</p>` : '');

  function startScreen() {
    return `<p class="dice-lead">Пять костей, один переброс, до двух побед.</p>
      <h3>С кем играем?</h3>
      <div class="dice-levels" role="group" aria-label="Соперник">${[['ai', 'Против таверны'], ['online', 'Против игрока']].map(([id, title]) => button(title, `data-mode="${id}" ${id === 'online' && !api ? 'disabled' : ''}`, id === 'ai')).join('')}</div>
      <p class="dice-hint">${api ? 'Против игрока можно играть на ставку: адену или CoL.' : 'Игра против игрока доступна при входе через Telegram.'}</p>${combinations()}`;
  }
  function tavernScreen() {
    return `<h3>Соперник</h3>
      <div class="dice-levels" role="group" aria-label="Сложность">${Object.entries(LEVELS).map(([id, title]) => `<button type="button" class="ui-button${id === level ? ' primary' : ''}" data-level="${id}" aria-pressed="${id === level}">${title}</button>`).join('')}</div>
      <p class="dice-hint">${level === 'hard' ? 'Считает, какие кости лучше оставить. Обыграть его трудно.' : 'Оставляет повторы и редко гонится за стритом.'}</p>
      <p class="dice-hint">Игра против таверны идёт без ставок.</p>
      <div class="dice-actions">${button('Начать игру', 'data-start', true)}</div>${combinations()}`;
  }

  function aiMatchScreen() {
    const mine = evaluate(match.dice.player), theirs = evaluate(match.dice.ai), left = REROLLS - match.rolls.player;
    const over = match.phase === 'over', result = match.result;
    const verdict = !result ? '' : over ? (match.winner === 'player' ? 'Вы выиграли матч!' : 'Соперник выиграл матч.') : result.winner === 'draw' ? 'Ничья: раунд будет сыгран заново.' : result.winner === 'player' ? 'Раунд за вами!' : 'Раунд за соперником.';
    const controls = match.phase === 'throw'
      ? `<div class="dice-actions">${button(`Перебросить · осталось ${left}`, `data-reroll ${busy || left <= 0 || keep.size === 5 ? 'disabled' : ''}`)}${button('Оставить', `data-stand ${busy ? 'disabled' : ''}`, true)}</div>
         <p class="dice-hint">${busy ? 'Соперник бросает кости…' : 'Нажмите на кости, которые хотите оставить.'}</p>`
      : `${verdict ? `<p class="dice-verdict" role="status" data-winner="${over ? match.winner : result.winner}">${verdict}</p>` : ''}
         <div class="dice-actions">${over ? button('Новая игра', 'data-restart', true) : button('Дальше', 'data-next', true)}</div>`;
    return `${scoreHtml(match.round, match.wins.player, match.wins.ai)}
      <section class="dice-side" aria-label="Соперник"><h3>Соперник</h3>${diceRow(match.dice.ai, { tag: 'a', label: 'Кости соперника' })}<p class="dice-hand">${theirs.name}</p></section>
      <section class="dice-side" aria-label="Вы"><h3>Вы</h3>${diceRow(match.dice.player, { mine: true, canKeep: match.phase === 'throw' && !busy, tag: 'p', label: 'Ваши кости' })}<p class="dice-hand">${mine.name}</p></section>
      ${noteHtml()}${controls}${combinations()}`;
  }
  const scoreHtml = (round, mine, theirs) => `<div class="dice-score" role="status"><span>Раунд ${round}</span><strong>${mine} : ${theirs}</strong><small>До ${ROUNDS_TO_WIN} побед</small></div>`;

  // ---- against another player ----
  function lobbyScreen() {
    const rows = net.friends.map(friend => `<div class="ui-inset-row dice-person"><div><strong>${esc(friend.name)}</strong><small>${esc(friend.busy ? 'В игре' : friend.text)}</small></div>${button('Пригласить', `data-invite="${esc(friend.userId)}" ${friend.busy ? 'disabled' : ''}`)}</div>`).join('');
    const invite = (item, outgoing) => `<article class="ui-inset-row dice-person"><div><strong>${esc(outgoing ? (item.toName || 'Приглашение по ссылке') : item.fromName)}</strong><small>${item.stake ? `Ставка: ${stakeText(item.stake)}` : 'Без ставки'} · ${Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 60000))} мин.</small></div>
      <div class="dice-actions">${outgoing ? `${item.url ? button('Копировать ссылку', `data-copy-invite="${item.id}"`) : ''}${button('Отменить', `data-cancel-invite="${item.id}"`)}` : `${button('Принять', `data-accept-invite="${item.id}"`, true)}${item.open ? '' : button('Отклонить', `data-decline-invite="${item.id}"`)}`}</div>
      ${outgoing && item.url ? `<input class="dice-share-link" aria-label="Ссылка приглашения" readonly value="${esc(item.url)}">` : ''}</article>`;
    const linked = net.invitation && net.invitation.status === 'pending' && !net.invitation.mine && !net.incoming.some(item => item.id === net.invitation.id) ? net.invitation : null;
    return `${linked ? `<h3>Приглашение по ссылке</h3>${invite(linked, false)}` : ''}${net.incoming.length ? `<h3>Вас приглашают</h3>${net.incoming.map(item => invite(item, false)).join('')}` : ''}
      <h3>Ставка</h3><label class="dice-field">На что играем<select name="dice-stake">${STAKE_CHOICES.map(([value, label]) => `<option value="${value}" ${value === stakeChoice ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      ${wallet ? `<p class="dice-hint">У вас: ${stakeText({ currency: 'gold', amount: wallet.gold })} · ${stakeText({ currency: 'luckCoins', amount: wallet.luckCoins })}.</p>` : ''}
      <p class="dice-hint">Ставка списывается, когда вы отправляете приглашение или принимаете чужое. Победитель получает 1,8 ставки: 10% банка уходит из игры. Ничья, отказ и истёкшее приглашение возвращают ставку; сдача — поражение.</p>
      ${net.outgoing.length ? `<h3>Вы пригласили</h3>${net.outgoing.map(item => invite(item, true)).join('')}` : ''}
      <h3>Друзья</h3>${rows || '<p class="dice-hint">Добавьте друга в разделе друзей, чтобы пригласить его.</p>'}
      <h3>Пригласить по ссылке</h3><div class="dice-actions">${button('Создать ссылку', 'data-create-link')}</div>
      <h3>Пригласить по нику</h3><div class="dice-actions"><label class="dice-field">Ник игрока<input type="text" data-invite-nick maxlength="16" autocomplete="off" placeholder="Ник в игре"></label>${button('Пригласить', 'data-invite-nick-go')}</div>${noteHtml()}`;
  }
  function stakeLine(stake) {
    if (!stake) return '';
    if (stake.result) {
      const { kind, payout } = stake.result;
      return `<p class="dice-stake" role="status" data-outcome="${kind}">${kind === 'won' ? `Выигрыш: ${stakeText({ ...stake, amount: payout })}` : kind === 'refund' ? `Ставка возвращена: ${stakeText(stake)}` : `Проигрыш: ${stakeText(stake)}`}</p>`;
    }
    return `<p class="dice-stake">Приз: ${stakeText({ ...stake, amount: stake.prize })}</p>`;
  }
  function onlineMatchScreen() {
    const view = net.match;
    const over = view.phase === 'over', result = view.result, inRound = view.phase === 'throw';
    const left = REROLLS - view.rolls;
    const verdict = over ? (view.winner === 'me' ? 'Вы выиграли матч!' : view.winner === 'draw' ? 'Матч завершён вничью.' : 'Соперник выиграл матч.')
      : result ? (result.winner === 'draw' ? 'Ничья: раунд будет сыгран заново.' : result.winner === 'me' ? 'Раунд за вами!' : 'Раунд за соперником.') : '';
    const opponentDice = view.opponentDice || Array(5).fill(null);
    let controls;
    if (inRound && !view.done) controls = `<div class="dice-actions">${button(`Перебросить · осталось ${left}`, `data-reroll ${busy || left <= 0 || keep.size === 5 ? 'disabled' : ''}`)}${button('Оставить', `data-stand ${busy ? 'disabled' : ''}`, true)}</div><p class="dice-hint">Нажмите на кости, которые хотите оставить.</p>`;
    else if (inRound) controls = `<p class="dice-hint" role="status">${view.opponentDone ? 'Считаем результат…' : 'Ждём соперника…'}</p>`;
    else controls = `${verdict ? `<p class="dice-verdict" role="status" data-winner="${over ? view.winner : result.winner}">${verdict}</p>` : ''}${view.endReason ? `<p class="dice-hint">${esc(view.endReason)}</p>` : ''}${stakeLine(view.stake)}
      <div class="dice-actions">${over ? button('Закрыть', 'data-dismiss-match', true) : button(view.ready ? 'Ждём соперника…' : 'Дальше', `data-ready ${view.ready ? 'disabled' : ''}`, true)}</div>`;
    const offered = over ? net.incoming.find(item => item.rematch && item.from === view.opponentId) : null;
    const asked = over ? net.outgoing.find(item => item.rematch) : null;
    const rematch = !over ? '' : offered ? `<p class="dice-hint" role="status">${esc(view.opponent)} предлагает реванш${offered.stake ? `: ставка ${stakeText(offered.stake)}` : ''}.</p><div class="dice-actions">${button('Принять реванш', `data-accept-invite="${offered.id}"`, true)}${button('Отклонить', `data-decline-invite="${offered.id}"`)}</div>`
      : asked ? `<p class="dice-hint" role="status">Ждём ответа соперника…</p><div class="dice-actions">${button('Отменить реванш', `data-cancel-invite="${asked.id}"`)}</div>`
        : `<div class="dice-actions">${button(view.stake ? `Реванш · ставка ${stakeText(view.stake)}` : 'Реванш', 'data-rematch')}</div>`;
    const surrender = !over ? `<div class="dice-actions">${button(surrenderArmed ? 'Точно сдаться?' : 'Сдаться', 'data-surrender')}</div>` : '';
    return `${scoreHtml(view.round, view.wins.me, view.wins.opponent)}${over ? '' : stakeLine(view.stake)}
      <section class="dice-side" aria-label="${esc(view.opponent)}"><h3>${esc(view.opponent)}</h3>${diceRow(opponentDice, { tag: 'a', label: 'Кости соперника' })}<p class="dice-hand">${result ? result.opponent : inRound ? (view.opponentDone ? 'Остановился' : `Бросков: ${view.opponentRolls}`) : ''}</p></section>
      <section class="dice-side" aria-label="Вы"><h3>Вы</h3>${diceRow(view.dice, { mine: true, canKeep: inRound && !view.done && !busy, tag: 'p', label: 'Ваши кости' })}<p class="dice-hand">${evaluate(view.dice).name}</p></section>
      ${noteHtml()}${controls}${rematch}${surrender}${combinations()}`;
  }

  function render() {
    const open = panel.querySelector('.dice-combinations')?.open;
    const body = screen === 'start' ? startScreen() : screen === 'tavern' ? tavernScreen() : screen === 'ai' ? aiMatchScreen() : screen === 'lobby' ? lobbyScreen() : onlineMatchScreen();
    panel.innerHTML = `${dialogHeading('Кости', { rules: RULES, back: screen !== 'start' && !(screen === 'ai' && busy) })}<div class="dice-content">${body}</div>`;
    if (open) panel.querySelector('.dice-combinations')?.setAttribute('open', '');
    enhanceSelects(panel);
    fresh.clear();
  }

  // ---- the game against the tavern ----
  function startRound() { keep = new Set(); note = ''; fresh = new Set(match.dice.player.map((_, i) => `p${i}`).concat(match.dice.ai.map((_, i) => `a${i}`))); }
  function throwDice() {
    const result = playerThrow(match, [...keep]);
    if (result.error) { note = result.error; return render(); }
    fresh = new Set(match.dice.player.map((_, i) => (keep.has(i) ? null : `p${i}`)).filter(Boolean));
    match = result.match; keep = new Set(); haptic('light');
    render();
    if (match.rolls.player >= REROLLS) { busy = true; later(stand, 700); render(); }
  }
  /** The player is done: the opponent throws step by step and the round is settled. */
  function stand() {
    busy = true; keep = new Set(); render();
    const steps = aiSteps(match);
    steps.forEach((step, n) => later(() => {
      fresh = new Set(step.dice.map((value, i) => (value !== match.dice.ai[i] ? `a${i}` : null)).filter(Boolean));
      match = { ...match, dice: { ...match.dice, ai: step.dice } }; haptic('light'); render();
    }, STEP_MS * (n + 1)));
    later(() => { match = settleRound(match); busy = false; haptic(match.result.winner === 'player' ? 'success' : 'warning'); render(); }, STEP_MS * (steps.length + 1));
  }

  // ---- the game against a player ----
  function accept(data) {
    if (data.wallet) wallet = data.wallet;
    if (data.credited?.length) note = `Получено: ${data.credited.map(stakeText).join(', ')}`;
    const before = net.match;
    net = { friends: data.friends || [], incoming: data.incoming || [], outgoing: data.outgoing || [], invitation: data.invitation || null, match: data.match || null };
    if (net.match) {
      if (!before || before.id !== net.match.id || before.round !== net.match.round) keep = new Set();
      fresh = new Set(net.match.dice.map((value, i) => (before?.id === net.match.id && before.round === net.match.round && before.dice[i] !== value ? `p${i}` : null)).filter(Boolean));
      if (!before || before.id !== net.match.id) surrenderArmed = false;
      if (screen === 'lobby' || screen === 'online') screen = 'online';
    } else if (screen === 'online') { screen = 'lobby'; surrenderArmed = false; }
    render();
    schedulePoll();
  }
  async function send(body) {
    if (busy) return;
    requestId += 1; busy = true; render();
    try { note = ''; accept(await api('/api/dice/action', { method: 'POST', body: JSON.stringify(body) })); }
    catch (error) {
      if (closed) return;
      note = error.message || 'Не удалось выполнить действие';
      try { accept(await api(readUrl())); note = error.message || note; render(); } catch { /* the message stays */ }
    } finally { busy = false; if (!closed) { render(); schedulePoll(); } }
  }
  async function refresh() {
    const token = ++requestId;
    try { const data = await api(readUrl()); if (!closed && token === requestId && !busy) accept(data); }
    catch (error) { if (focusedInvite && !closed) { focusedInvite = null; note = error.message || 'Приглашение недоступно'; render(); } /* otherwise the next poll tries again */ }
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    if (closed || document.hidden || !api || !(screen === 'lobby' || screen === 'online')) return;
    pollTimer = setTimeout(async () => { if (!busy) await refresh(); schedulePoll(); }, POLL_MS);
  }
  const readUrl = () => `/api/dice${focusedInvite ? `?invite=${encodeURIComponent(focusedInvite)}` : ''}`;
  const onVisibility = () => { if (!document.hidden) { refresh(); schedulePoll(); } };
  document.addEventListener('visibilitychange', onVisibility);

  function back() {
    if (screen === 'online') { screen = 'lobby'; }
    else if (screen === 'lobby' || screen === 'tavern') { screen = 'start'; clearTimeout(pollTimer); }
    else if (screen === 'ai') { timers.forEach(clearTimeout); timers.clear(); busy = false; screen = 'tavern'; match = null; }
    note = ''; render();
  }
  panel.addEventListener('change', event => { if (event.target.name === 'dice-stake') stakeChoice = STAKE_CHOICES.some(([value]) => value === event.target.value) ? event.target.value : ''; });
  panel.addEventListener('click', async event => {
    const back_ = event.target.closest('[data-back]');
    if (back_) return back();
    const el = event.target.closest('button'); if (!el || el.disabled) return;
    if (el.matches('[data-dismiss]')) return close();
    if (el.matches('[data-game-rules]')) return;
    if (busy) return;
    const d = el.dataset;
    if (d.mode === 'ai') { screen = 'tavern'; render(); }
    else if (d.mode === 'online') { screen = 'lobby'; note = ''; render(); await refresh(); schedulePoll(); }
    else if (d.level) { level = d.level; render(); }
    else if ('start' in d || 'restart' in d) { match = newMatch(Math.random, level); startRound(); screen = 'ai'; render(); }
    else if ('next' in d) { const result = nextRound(match); if (result.match) { match = result.match; startRound(); render(); } }
    else if (d.die !== undefined) { const i = Number(d.die); if (keep.has(i)) keep.delete(i); else keep.add(i); render(); panel.querySelector(`[data-die="${i}"]`)?.focus({ preventScroll: true }); }
    else if ('reroll' in d) { if (screen === 'ai') throwDice(); else await send({ action: 'throw', matchId: net.match.id, round: net.match.round, rolls: net.match.rolls, keep: [...keep] }); }
    else if ('stand' in d) { if (screen === 'ai') stand(); else await send({ action: 'stand', matchId: net.match.id, round: net.match.round, rolls: net.match.rolls }); }
    else if ('createLink' in d) await send({ action: 'invite', open: true, ...stakeBodyOf(stakeChoice) });
    else if (d.copyInvite) { const item = net.outgoing.find(entry => entry.id === d.copyInvite); if (item?.url) { try { await navigator.clipboard.writeText(item.url); note = 'Ссылка скопирована'; } catch { note = 'Скопируйте выделенную ссылку'; } render(); panel.querySelector('.dice-share-link')?.select?.(); } }
    else if ('rematch' in d) await send({ action: 'rematch', matchId: net.match.id });
    else if (d.invite) await send({ action: 'invite', targetId: d.invite, ...stakeBodyOf(stakeChoice) });
    else if ('inviteNickGo' in d) {
      const nick = panel.querySelector('[data-invite-nick]')?.value.trim();
      if (!nick) { note = 'Введите ник игрока'; render(); return; }
      await send({ action: 'invite', targetNickname: nick, ...stakeBodyOf(stakeChoice) });
    }
    else if (d.acceptInvite) { focusedInvite = null; await send({ action: 'accept_invite', inviteId: d.acceptInvite }); }
    else if (d.declineInvite) { focusedInvite = null; await send({ action: 'decline_invite', inviteId: d.declineInvite }); }
    else if (d.cancelInvite) await send({ action: 'cancel_invite', inviteId: d.cancelInvite });
    else if ('ready' in d) await send({ action: 'ready', matchId: net.match.id });
    else if ('dismissMatch' in d) { await send({ action: 'dismiss', matchId: net.match.id }); }
    else if ('surrender' in d) { if (!surrenderArmed) { surrenderArmed = true; render(); } else { surrenderArmed = false; await send({ action: 'surrender', matchId: net.match.id }); } }
  });
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  function close() {
    if (closed) return;
    closed = true; timers.forEach(clearTimeout); timers.clear(); clearTimeout(pollTimer); document.removeEventListener('visibilitychange', onVisibility); overlay.remove();
  }
  render();
  if (screen === 'lobby') refresh().then(schedulePoll);
}

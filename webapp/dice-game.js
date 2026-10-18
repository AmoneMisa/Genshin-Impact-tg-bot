import { dialogHeading } from './dialog-heading.js';
import { installOverlayA11y } from './overlay-a11y.js';
import { escapeHtml as esc } from './escape-html.js';
import { FACES, FACE_NAMES, COMBINATIONS, LEVELS, REROLLS, ROUNDS_TO_WIN, evaluate, newMatch, playerThrow, aiSteps, settleRound, nextRound } from './dice-poker.js';

const RULES = `Кости из «Ведьмака»: у каждого пять костей. Бросьте их, затем до двух раз перебросьте любые, оставив нужные. Побеждает сильнейшая комбинация. Кто первым выиграет ${ROUNDS_TO_WIN} раунда, тот побеждает в матче. Ничья не считается, раунд играется заново.`;
const button = (label, attrs = '', primary = false) => `<button type="button" class="ui-button${primary ? ' primary' : ''}" ${attrs}>${label}</button>`;
const STEP_MS = 800;

export function openDiceGame({ haptic = () => {} } = {}) {
  if (document.querySelector('.dice-overlay')) return;
  installOverlayA11y();
  let level = 'hard', match = null, keep = new Set(), fresh = new Set(), busy = false, note = '', closed = false;
  const timers = new Set();
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!closed) fn(); }, ms); timers.add(id); };

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay dice-overlay';
  overlay.innerHTML = '<div class="overlay-backdrop"></div><div class="overlay-panel game-dialog-panel ui-card-table-window dice-panel" data-dice-panel></div>';
  const panel = overlay.querySelector('[data-dice-panel]');
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  function diceRow(dice, { mine = false } = {}) {
    return `<div class="dice-row" role="group" aria-label="${mine ? 'Ваши кости' : 'Кости соперника'}">${dice.map((value, i) => {
      const label = `${FACE_NAMES[value]}${mine && match.phase === 'throw' ? (keep.has(i) ? ', оставлена' : ', будет переброшена') : ''}`;
      const classes = `dice-die${mine && keep.has(i) ? ' kept' : ''}${fresh.has(`${mine ? 'p' : 'a'}${i}`) && !reduced() ? ' rolling' : ''}`;
      return mine && match.phase === 'throw' && !busy
        ? `<button type="button" class="ui-button ${classes}" data-die="${i}" aria-pressed="${keep.has(i)}" aria-label="${esc(label)}">${FACES[value]}</button>`
        : `<span class="ui-button ${classes} is-static" role="img" aria-label="${esc(label)}">${FACES[value]}</span>`;
    }).join('')}</div>`;
  }
  function combinations() {
    return `<details class="ui-disclosure dice-combinations"><summary>Комбинации</summary><ol class="dice-combination-list">${[...COMBINATIONS].reverse().map(([name, text]) => `<li class="ui-inset-row"><strong>${name}</strong><small>${text}</small></li>`).join('')}</ol></details>`;
  }
  function startScreen() {
    return `<p class="dice-lead">Пять костей, три раунда до победы. Играем против соперника из таверны.</p>
      <h3>Соперник</h3>
      <div class="dice-levels" role="group" aria-label="Сложность">${Object.entries(LEVELS).map(([id, title]) => `<button type="button" class="ui-button${id === level ? ' primary' : ''}" data-level="${id}" aria-pressed="${id === level}">${title}</button>`).join('')}</div>
      <p class="dice-hint">${level === 'hard' ? 'Считает, какие кости лучше оставить.' : 'Оставляет повторы и редко гонится за стритом.'}</p>
      <div class="dice-actions">${button('Начать игру', 'data-start', true)}</div>${combinations()}`;
  }
  function matchScreen() {
    const mine = evaluate(match.dice.player), theirs = evaluate(match.dice.ai), left = REROLLS - match.rolls.player;
    const over = match.phase === 'over', result = match.result;
    const verdict = !result ? '' : result.winner === 'draw' ? 'Ничья: раунд будет сыгран заново.' : result.winner === 'player' ? 'Раунд за вами!' : 'Раунд за соперником.';
    const status = over ? (match.winner === 'player' ? 'Вы выиграли матч!' : 'Соперник выиграл матч.') : verdict;
    const controls = match.phase === 'throw'
      ? `<div class="dice-actions">${button(`Перебросить · осталось ${left}`, `data-reroll ${busy || left <= 0 || keep.size === 5 ? 'disabled' : ''}`)}${button('Оставить', `data-stand ${busy ? 'disabled' : ''}`, true)}</div>
         <p class="dice-hint">${busy ? 'Соперник бросает кости…' : 'Нажмите на кости, которые хотите оставить.'}</p>`
      : `${status ? `<p class="dice-verdict" role="status" data-winner="${over ? match.winner : result.winner}">${status}</p>` : ''}
         <div class="dice-actions">${over ? button('Новая игра', 'data-restart', true) : button('Дальше', 'data-next', true)}</div>`;
    return `<div class="dice-score" role="status"><span>Раунд ${match.round}</span><strong>${match.wins.player} : ${match.wins.ai}</strong><small>До ${ROUNDS_TO_WIN} побед</small></div>
      <section class="dice-side" aria-label="Соперник"><h3>Соперник</h3>${diceRow(match.dice.ai)}<p class="dice-hand">${theirs.name}</p></section>
      <section class="dice-side" aria-label="Вы"><h3>Вы</h3>${diceRow(match.dice.player, { mine: true })}<p class="dice-hand">${mine.name}</p></section>
      ${note ? `<p class="dice-hint" role="status">${esc(note)}</p>` : ''}${controls}${combinations()}`;
  }
  function render() {
    const open = panel.querySelector('.dice-combinations')?.open;
    panel.innerHTML = `${dialogHeading('Кости', { rules: RULES })}<div class="dice-content">${match ? matchScreen() : startScreen()}</div>`;
    if (open) panel.querySelector('.dice-combinations').open = true;
    fresh.clear();
  }

  function startRound() { keep = new Set(); note = ''; fresh = new Set(match.dice.player.map((_, i) => `p${i}`).concat(match.dice.ai.map((_, i) => `a${i}`))); }
  function throwDice() {
    const result = playerThrow(match, keep);
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
  function start() { match = newMatch(Math.random, level); startRound(); render(); }

  panel.addEventListener('click', event => {
    const el = event.target.closest('button'); if (!el || el.disabled) return;
    if (el.matches('[data-dismiss]')) return close();
    if (busy && !el.matches('[data-game-rules]')) return;
    const d = el.dataset;
    if (d.level) { level = d.level; render(); }
    else if ('start' in d || 'restart' in d) start();
    else if ('next' in d) { const result = nextRound(match); if (result.match) { match = result.match; startRound(); render(); } }
    else if (d.die !== undefined) { const i = Number(d.die); if (keep.has(i)) keep.delete(i); else keep.add(i); render(); panel.querySelector(`[data-die="${i}"]`)?.focus({ preventScroll: true }); }
    else if ('reroll' in d) throwDice();
    else if ('stand' in d) stand();
  });
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  function close() {
    if (closed) return;
    closed = true; timers.forEach(clearTimeout); timers.clear(); overlay.remove();
  }
  render();
}

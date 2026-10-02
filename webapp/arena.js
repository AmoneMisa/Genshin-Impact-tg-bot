import { escapeHtml } from './escape-html.js';
// Arena, prototype style: Обычная / Рейтинговая tabs over the arena painting,
// a metal rank emblem with points, "Найти противника" matchmaking with a VS
// intro and result, the season reward ladder and the leaderboard.

import { menuArtFor } from './menu-art.js';

const MODE_LABELS = {
  common: { tab: 'Обычная', subtitle: 'Соперники из текущего игрового чата' },
  expansion: { tab: 'Рейтинговая', subtitle: 'Глобальный рейтинг между чатами' },
};

const REASONS = {
  no_chances: 'Попытки закончились. Они восстановятся по расписанию арены.',
  stale_defender: 'Соперник уже сменился. Ищу другого.',
  self_attack: 'Нельзя атаковать самого себя.',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}


/** Metal tier and division pips of a rank name ("Серебро III" -> silver, 3). */
export function rankTier(rank) {
  const name = String(rank || '');
  const tier = name.startsWith('Бронза') ? 'bronze'
    : name.startsWith('Серебро') ? 'silver'
      : name.startsWith('Золото') ? 'gold'
        : name.startsWith('Бриллиант') ? 'diamond'
          : name.startsWith('Рубин') ? 'ruby' : 'iron';
  const roman = name.match(/\b(I{1,3})$/)?.[1] || '';
  return { tier, division: roman.length };
}

export function rankEmblem(rank, size = '') {
  const { tier, division } = rankTier(rank);
  return `<span class="arena-emblem ${tier} ${size}" aria-hidden="true"><i></i><b>${'◆'.repeat(division)}</b></span>`;
}

/** Picks an opponent for matchmaking, preferring players and a close rating. */
export function pickOpponent(defenders = [], rating = 1000, exclude = null, random = Math.random) {
  const pool = defenders.filter(defender => defender.id !== exclude);
  if (!pool.length) return defenders[0] || null;
  const players = pool.filter(defender => defender.kind === 'player');
  const candidates = (players.length ? players : pool)
    .slice()
    .sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating))
    .slice(0, 3);
  return candidates[Math.floor(random() * candidates.length)];
}

function portrait(person) {
  return menuArtFor('profile', { className: person?.classId || person?.className, gender: person?.gender });
}

export async function openArenaGame({ api, renderState, haptic, statusElement, player = null }) {
  let mode = 'common';
  let arena = await api(`/api/arena?mode=${mode}`);
  let pending = false;
  let opponent = null;
  let showBoard = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay arena-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel arena-panel">
      <header class="arena-head">
        <button class="overlay-close arena-round" type="button" aria-label="Закрыть">←</button>
        <h2>Арена</h2>
        <button class="arena-round" type="button" data-arena-refresh aria-label="Обновить">↻</button>
      </header>
      <div class="arena-mode-tabs" data-arena-tabs>
        <button type="button" data-mode="common">Обычная</button>
        <button type="button" data-mode="expansion">Рейтинговая</button>
      </div>
      <div data-arena-body></div>
      <div class="arena-feedback" data-arena-feedback aria-live="polite"></div>
    </div>`;

  const body = overlay.querySelector('[data-arena-body]');
  const feedback = overlay.querySelector('[data-arena-feedback]');

  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.querySelector('[data-arena-refresh]').addEventListener('click', () => loadMode(mode));
  overlay.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.mode !== mode) loadMode(button.dataset.mode);
  }));

  async function loadMode(nextMode) {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy');
    try {
      mode = nextMode;
      arena = await api(`/api/arena?mode=${mode}`);
      opponent = null;
      feedback.textContent = '';
      renderAll();
      haptic('light');
    } catch (error) {
      feedback.textContent = error.message;
      statusElement.textContent = `Арена: ${error.message}`;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  function heroHtml() {
    return `
      <section class="arena-hero-art ${arena.mode}">
        <div class="arena-rank">
          ${rankEmblem(arena.rank, 'large')}
          <div>
            <strong>${escapeHtml(arena.rank || 'Без ранга')}</strong>
            <span>${formatNumber(arena.rating)} очков</span>
            <small>Место: #${formatNumber(arena.position)} из ${formatNumber(arena.totalPlayers)}</small>
          </div>
        </div>
        <div class="arena-chances" title="Попытки">⚔️ ${arena.chances} / ${arena.maxChances}</div>
      </section>`;
  }

  function opponentHtml() {
    if (!opponent) return '';
    return `
      <section class="arena-match">
        <div class="arena-match-portrait" style="--art:url('${portrait(opponent)}')"></div>
        <div class="arena-match-info">
          <small>${opponent.kind === 'bot' ? 'Тренировочный соперник' : 'Игрок'}</small>
          <strong>${escapeHtml(opponent.name)}</strong>
          <span>${escapeHtml(opponent.className)} · ур. ${opponent.level}</span>
          <span>${formatNumber(opponent.rating)} очков · 🛡️ ${formatNumber(opponent.gearScore)}</span>
        </div>
      </section>
      <div class="arena-actions">
        <button type="button" class="arena-btn red" data-arena-fight>В бой</button>
        <button type="button" class="arena-btn ghost" data-arena-next>Другой</button>
      </div>`;
  }

  function ladderHtml() {
    const ranks = arena.ranks || [];
    return `
      <section class="arena-season">
        <div class="arena-season-head"><strong>Награды за сезон</strong><small>${arena.weeklyReward ? `еженедельно: ${formatNumber(arena.weeklyReward)} 🎖️` : ''}</small></div>
        <div class="arena-ladder" data-arena-ladder>${ranks.map(item => `
          <div class="arena-step ${item.current ? 'current' : ''}">
            ${rankEmblem(item.rank)}
            <small>${escapeHtml(item.rank)}</small>
            <b>${formatNumber(item.reward)} 🎖️</b>
          </div>`).join('')}</div>
        ${arena.nextRank ? `<p class="arena-next">Следующий ранг: <b>${escapeHtml(arena.nextRank)}</b></p>` : ''}
      </section>`;
  }

  function boardHtml() {
    const rows = arena.leaderboard || [];
    return `
      <button type="button" class="arena-btn ghost" data-arena-board>${showBoard ? 'Скрыть таблицу' : 'Таблица лидеров'}</button>
      ${showBoard ? `<ol class="arena-board">${rows.map(row => `
        <li class="${row.isCurrentUser ? 'me' : ''} ${row.position <= 3 ? `top top${row.position}` : ''}" ${row.isCurrentUser || arena.mode !== 'common' ? '' : `data-player-card="${escapeHtml(row.userId)}"`}>
          <span>${row.position <= 3 ? ['🥇', '🥈', '🥉'][row.position - 1] : row.position}</span>
          <strong>${escapeHtml(row.name || `Игрок ${row.userId}`)}</strong>
          <em>${formatNumber(row.rating)}</em>
        </li>`).join('')}</ol>` : ''}`;
  }

  function renderAll() {
    overlay.querySelectorAll('[data-mode]').forEach(button => button.classList.toggle('active', button.dataset.mode === arena.mode));
    body.innerHTML = `
      ${heroHtml()}
      ${opponent ? opponentHtml() : `<button type="button" class="arena-btn gold" data-arena-find ${arena.chances > 0 ? '' : 'disabled'}>${arena.chances > 0 ? 'Найти противника' : 'Попытки закончились'}</button>`}
      ${ladderHtml()}
      ${boardHtml()}`;
    body.querySelector('[data-arena-find]')?.addEventListener('click', find);
    body.querySelector('[data-arena-next]')?.addEventListener('click', () => find(opponent?.id));
    body.querySelector('[data-arena-fight]')?.addEventListener('click', fight);
    body.querySelector('[data-arena-board]')?.addEventListener('click', () => { showBoard = !showBoard; haptic('light'); renderAll(); });
    // Center the ladder on the current rank once the panel has layout.
    requestAnimationFrame(() => {
      const ladder = body.querySelector('[data-arena-ladder]');
      const current = ladder?.querySelector('.arena-step.current');
      if (current) ladder.scrollLeft = current.offsetLeft - (ladder.clientWidth - current.clientWidth) / 2;
    });
  }

  // Matchmaking: a short search sweep, then the opponent card slides in.
  async function find(exclude = null) {
    if (pending) return;
    pending = true;
    haptic('medium');
    const button = body.querySelector('[data-arena-find], [data-arena-next]');
    body.querySelector('.arena-match')?.classList.add('leaving');
    if (button) { button.classList.add('searching'); button.textContent = 'Поиск…'; }
    body.querySelector('.arena-hero-art')?.classList.add('searching');
    await new Promise(resolve => window.setTimeout(resolve, 900));
    opponent = pickOpponent(arena.defenders, arena.rating, typeof exclude === 'string' ? exclude : null);
    pending = false;
    feedback.textContent = opponent ? '' : 'Сейчас подходящих соперников нет.';
    renderAll();
  }

  function playIntro(defender) {
    const intro = document.createElement('div');
    intro.className = 'arena-vs';
    intro.innerHTML = `
      <div class="arena-vs-side me" style="--art:url('${portrait(player || {})}')"><strong>Ты</strong></div>
      <div class="arena-vs-mark">VS</div>
      <div class="arena-vs-side foe" style="--art:url('${portrait(defender)}')"><strong>${escapeHtml(defender.name)}</strong></div>
      <div class="arena-vs-clash" aria-hidden="true"></div>`;
    overlay.querySelector('.arena-panel').appendChild(intro);
    requestAnimationFrame(() => intro.classList.add('on'));
    return intro;
  }

  function showResult(intro, result) {
    const title = result.result === 'win' ? 'Победа' : result.result === 'lose' ? 'Поражение' : 'Ничья';
    intro.classList.add(`result-${result.result}`);
    intro.insertAdjacentHTML('beforeend', `
      <div class="arena-vs-result">
        <strong>${title}</strong>
        <span class="${result.ratingDelta >= 0 ? 'up' : 'down'}">${result.ratingDelta > 0 ? '+' : ''}${formatNumber(result.ratingDelta)} очков</span>
        ${result.result === 'lose' ? `<small>У соперника осталось ${Number(result.defenderHpPercent || 0).toFixed(1)}% HP</small>` : ''}
        <button type="button" class="arena-btn gold" data-arena-dismiss>Продолжить</button>
      </div>`);
    return new Promise(resolve => intro.querySelector('[data-arena-dismiss]').addEventListener('click', () => {
      intro.classList.add('leaving');
      window.setTimeout(() => { intro.remove(); resolve(); }, 250);
    }, { once: true }));
  }

  async function fight() {
    if (pending || !opponent) return;
    pending = true;
    overlay.classList.add('busy');
    haptic('heavy');
    const intro = playIntro(opponent);
    try {
      const [result] = await Promise.all([
        api('/api/arena/attack', { method: 'POST', body: JSON.stringify({ mode, defenderId: opponent.id }) }),
        new Promise(resolve => window.setTimeout(resolve, 1400)),
      ]);
      arena = result.arena;
      opponent = null;
      if (result.state) renderState(result.state);
      haptic(result.result === 'win' ? 'heavy' : 'light');
      statusElement.textContent = `Арена: ${result.result === 'win' ? 'победа' : result.result === 'lose' ? 'поражение' : 'ничья'}.`;
      renderAll();
      pending = false;
      overlay.classList.remove('busy');
      await showResult(intro, result);
    } catch (error) {
      intro.remove();
      const reason = error.payload?.reason;
      feedback.textContent = REASONS[reason] || error.message;
      statusElement.textContent = `Арена: ${feedback.textContent}`;
      if (error.payload?.arena) arena = error.payload.arena;
      opponent = null;
      renderAll();
      pending = false;
      overlay.classList.remove('busy');
      haptic('light');
    }
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

import { escapeHtml } from './escape-html.js';
export { escapeHtml };
// City screen: the player's buildings as painted cards (palace banner + grid),
// each opening its own window to interact with it: collect, upgrade, speed up,
// change style, rename. Paintings follow the building's level (art/builds-art.js).

import { buildArtUrl } from './art/builds-art.js';
import { icon } from './icons.js';

export const RESOURCE_META = Object.freeze({
  gold: { label: 'Золото', icon: '🪙' },
  crystals: { label: 'Кристаллы', icon: '💎' },
  ironOre: { label: 'Руда', icon: '⛏️' },
  experience: { label: 'Опыт', icon: '✦' },
  sp: { label: 'ОП', icon: '✧' },
});

export const REASONS = Object.freeze({
  max_level: 'Постройка уже максимального уровня.',
  already_upgrading: 'Постройка уже улучшается.',
  requirements: 'Сначала выполни требования следующего уровня.',
  resources: 'Недостаточно ресурсов.',
  upgrade_unavailable: 'Для этой постройки улучшение сейчас недоступно.',
  unknown_build: 'Постройка больше не найдена.',
  not_upgrading: 'Улучшение уже завершилось.',
  no_production: 'Эта постройка не производит ресурсы.',
  upgrading: 'Во время улучшения ресурсы собирать нельзя.',
  nothing_to_collect: 'Пока нечего собирать.',
  type_unavailable: 'У этой постройки нельзя менять облик.',
  type_not_owned: 'Этот облик ещё не куплен.',
  invalid_name: 'Название должно содержать от 1 до 40 символов.',
});


export function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(Number(value) || 0));
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  if (h) return `${h}ч ${m}м ${s}с`;
  if (m) return `${m}м ${s}с`;
  return `${s}с`;
}

/** Upgrade progress: { endAt, percent } from the server's start time and remaining ms. */
export function upgradeProgress(build, now = Date.now()) {
  if (!build?.upgrading) return null;
  const endAt = now + (Number(build.remainingMs) || 0);
  const startAt = Number(build.upgradeStartedAt) || now;
  const total = Math.max(1, endAt - startAt);
  return { startAt, endAt, percent: Math.max(0, Math.min(100, ((now - startAt) / total) * 100)) };
}

function artFor(build) {
  return buildArtUrl(build.id, build.currentLevel, build.currentType) || '';
}

function costRow(build) {
  if (!build.upgradeCost) return '<span class="city-cost muted">Максимальный уровень</span>';
  const met = new Map((build.affordability || []).map(item => [item.resource || item.key, item.met]));
  return Object.entries(build.upgradeCost)
    .filter(([, value]) => Number(value) > 0)
    .map(([resource, value]) => `<span class="city-cost ${met.get(resource) === false ? 'missing' : ''}">${RESOURCE_META[resource]?.icon || '•'} ${formatNumber(value)}</span>`)
    .join('') || '<span class="city-cost">Бесплатно</span>';
}

/** Window requirements as "needed / have" rows, like the design's building sheet. */
function needRows(build) {
  const rows = (build.affordability || []).filter(item => Number(item.required) > 0);
  if (!rows.length) return costRow(build);
  return `<ul class="city-needs">${rows.map(item => `
    <li class="${item.met ? 'met' : 'missing'}"><span>${RESOURCE_META[item.resource]?.icon || '•'}</span><strong>${formatNumber(item.required)} / ${formatNumber(item.current)}</strong></li>`).join('')}</ul>`;
}

function progressHtml(build) {
  const progress = upgradeProgress(build);
  if (!progress) return '';
  return `<div class="city-progress" data-progress-start="${progress.startAt}" data-progress-end="${progress.endAt}">
    <i style="width:${progress.percent}%"></i><b>${formatDuration(build.remainingMs)}</b></div>`;
}

function actionButton(build) {
  if (build.upgrading) {
    return `<button type="button" class="city-btn speedup" data-city-action="speedup" data-build="${escapeHtml(build.id)}" ${build.canSpeedup ? '' : 'disabled'}>Ускорить${build.speedupCost ? ` · ${formatNumber(build.speedupCost)} 💎` : ' · бесплатно'}</button>`;
  }
  if (build.currentLevel >= build.maxLevel) return '<button type="button" class="city-btn" disabled>Максимум</button>';
  return `<button type="button" class="city-btn upgrade" data-city-action="upgrade" data-build="${escapeHtml(build.id)}" ${build.canUpgrade ? '' : 'disabled'} title="${escapeHtml(REASONS[build.blockedReason] || '')}">Улучшить</button>`;
}

function collectChip(build) {
  if (!build.canCollect) return '';
  const meta = RESOURCE_META[build.resourceType] || { icon: '✦' };
  return `<button type="button" class="city-collect" data-city-action="collect" data-build="${escapeHtml(build.id)}">${meta.icon} +${formatNumber(build.resourceCollected)}</button>`;
}

/** One building lot: a soft-edged painting "island" with an ornate plate over it. */
export function buildingCard(build, { banner = false } = {}) {
  return `
  <article class="city-card ${banner ? 'banner' : ''} ${build.upgrading ? 'upgrading' : ''}" data-city-card="${escapeHtml(build.id)}" tabindex="0" role="button" aria-label="${escapeHtml(build.name)}">
    <div class="city-art" style="--art:url('${artFor(build)}')"></div>
    ${collectChip(build)}
    <div class="city-plate">
      <div class="city-ribbon">
        <strong>${escapeHtml(build.name)}</strong>
        ${build.canUpgrade ? '<span class="city-up" aria-label="Можно улучшить">▲</span>' : ''}
      </div>
      <small class="city-level">Ур. ${formatNumber(build.currentLevel)}</small>
      ${build.upgrading ? progressHtml(build) : `<div class="city-costs">${costRow(build)}</div>`}
      ${actionButton(build)}
    </div>
  </article>`;
}

/**
 * The city's current goal for the quest card (prototype "Новые горизонты"):
 * ready harvest first, then the lowest affordable upgrade, a running build,
 * a requirement to meet, or the cheapest upgrade to save for.
 */
export function cityQuest(buildings = []) {
  const byLevel = [...buildings].sort((a, b) => a.currentLevel - b.currentLevel);
  const harvest = buildings.find(build => build.canCollect);
  if (harvest) return { id: harvest.id, icon: '🧺', title: 'Урожай готов', text: `Собери ресурсы: «${harvest.name}»` };
  const upgrade = byLevel.find(build => build.canUpgrade);
  if (upgrade) return { id: upgrade.id, icon: '📜', title: 'Новые горизонты', text: `Улучши «${upgrade.name}» до ур. ${upgrade.nextLevel}` };
  const building = buildings.find(build => build.upgrading);
  if (building) return { id: building.id, icon: '🔨', title: 'Стройка идёт', text: `«${building.name}» · ${formatDuration(building.remainingMs)}` };
  const blocked = byLevel.find(build => build.blockedReason === 'requirements');
  if (blocked) return { id: blocked.id, icon: '🗝️', title: 'Цель', text: `Выполни требования для «${blocked.name}»` };
  const saving = byLevel
    .filter(build => build.upgradeCost && build.currentLevel < build.maxLevel)
    .sort((a, b) => (Number(a.upgradeCost.gold) || 0) - (Number(b.upgradeCost.gold) || 0))[0];
  if (saving) return { id: saving.id, icon: '🪙', title: 'Копим ресурсы', text: `На «${saving.name}» ур. ${saving.nextLevel}` };
  return null;
}

function questHtml(quest) {
  if (!quest) return '';
  return `
    <button type="button" class="city-quest" data-city-quest="${escapeHtml(quest.id)}">
      <span aria-hidden="true">${quest.icon}</span>
      <div><strong>${escapeHtml(quest.title)}</strong><small>${escapeHtml(quest.text)}</small></div>
      <b aria-hidden="true">›</b>
    </button>`;
}

export function cityHtml(state) {
  const buildings = state?.buildings || [];
  const palace = buildings.find(build => build.id === 'palace');
  const others = buildings.filter(build => build.id !== 'palace');
  return `
  <section class="city">
    <div class="city-sky" aria-hidden="true"></div>
    <header class="city-title">
      ${icon('crown', 'city-crown')}
      <strong>WhitesLove</strong>
      <span class="city-game" aria-hidden="true"><i></i>GAME<i></i></span>
      <small>Больше, чем игра — наше королевство</small>
    </header>
    ${questHtml(cityQuest(buildings))}
    ${palace ? buildingCard(palace, { banner: true }) : ''}
    <div class="city-grid">${others.map(build => buildingCard(build)).join('')}</div>
  </section>`;
}

function requirementsHtml(requirements) {
  const rows = [];
  for (const req of requirements?.buildings || []) rows.push(`<li class="${req.met ? 'met' : 'missing'}">${req.met ? '✓' : '×'} ${escapeHtml(req.title)} ${req.current}/${req.required}</li>`);
  for (const req of requirements?.character || []) rows.push(`<li class="${req.met ? 'met' : 'missing'}">${req.met ? '✓' : '×'} ${req.key === 'lvl' ? 'Уровень героя' : escapeHtml(req.key)} ${req.current}/${req.required}</li>`);
  return rows.length ? `<ul class="city-reqs">${rows.join('')}</ul>` : '';
}

/** The building's own window. */
export function buildingWindow(build) {
  const resource = build.resourceType ? RESOURCE_META[build.resourceType] || { label: build.resourceType, icon: '✦' } : null;
  const types = build.availableTypes?.length ? `
    <section class="city-block"><h4>Облик</h4><div class="city-types">${build.availableTypes.map(type => `
      <button type="button" class="city-type ${type.selected ? 'active' : ''}" data-city-action="change_type" data-build="${escapeHtml(build.id)}" data-type="${escapeHtml(type.id)}" ${type.selected || !type.owned ? 'disabled' : ''} title="${escapeHtml(type.bonus || '')}">${type.owned ? '' : '🔒 '}${escapeHtml(type.name)}</button>`).join('')}</div></section>` : '';
  const treasury = build.treasury ? `
    <section class="city-block"><h4>Защита казны</h4><div class="city-costs">
      <span class="city-cost">🪙 ${formatNumber(build.treasury.guardedGold)}</span><span class="city-cost">💎 ${formatNumber(build.treasury.guardedCrystals)}</span><span class="city-cost">⛏️ ${formatNumber(build.treasury.guardedIronOre)}</span></div></section>` : '';
  return `
  <div class="city-window-art" style="--art:url('${artFor(build)}')">
    <div class="city-window-title"><strong>${escapeHtml(build.name)}</strong><small>Уровень ${formatNumber(build.currentLevel)} / ${formatNumber(build.maxLevel)}</small></div>
  </div>
  <div class="city-window-body">
    ${build.description ? `<p class="city-desc">${escapeHtml(build.description)}</p>` : ''}
    ${resource ? `
    <section class="city-block"><h4>Производство</h4>
      <div class="city-stat"><span>${resource.icon} ${escapeHtml(resource.label)} в час</span><strong>${formatNumber(build.productionPerHour)}${build.nextProductionPerHour > build.productionPerHour ? ` <i class="city-arrow">→</i> <em class="city-gain">${formatNumber(build.nextProductionPerHour)}</em>` : ''}</strong></div>
      <div class="city-stat"><span>Накоплено</span><strong>${formatNumber(build.resourceCollected)}</strong></div>
      ${build.maxWorkHoursWithoutCollection ? `<div class="city-stat"><span>Склад заполняется за</span><strong>${formatNumber(build.maxWorkHoursWithoutCollection)} ч</strong></div>` : ''}
      <button type="button" class="city-btn collect" data-city-action="collect" data-build="${escapeHtml(build.id)}" ${build.canCollect ? '' : 'disabled'}>Собрать</button>
    </section>` : ''}
    <section class="city-block"><h4>${build.upgrading ? 'Улучшение идёт' : build.currentLevel >= build.maxLevel ? 'Максимальный уровень' : `Улучшение до ${formatNumber(build.nextLevel)}`}</h4>
      ${build.upgrading ? progressHtml(build) : `${build.currentLevel < build.maxLevel ? '<h5 class="city-subhead">Требования</h5>' : ''}${needRows(build)}${requirementsHtml(build.requirements)}`}
      ${actionButton(build)}
      ${!build.upgrading && build.blockedReason && build.currentLevel < build.maxLevel ? `<p class="city-note">${escapeHtml(REASONS[build.blockedReason] || '')}</p>` : ''}
    </section>
    ${types}
    ${treasury}
    ${build.canRename ? `<button type="button" class="city-btn ghost" data-city-action="rename" data-build="${escapeHtml(build.id)}">Переименовать</button>` : ''}
    <p class="city-feedback" data-city-feedback aria-live="polite"></p>
  </div>`;
}

/**
 * Mounts the city into `container`. `onState(state)` receives the refreshed
 * player state after actions (to update the HUD and resources).
 */
export async function mountCity(container, { api, haptic = () => {}, onState = () => {} } = {}) {
  let state = await api('/api/builds');
  let openId = null;
  let pending = false;
  let windowNode = null;

  function render() {
    container.innerHTML = cityHtml(state);
    if (openId && windowNode) renderWindow();
  }

  function buildById(id) {
    return state.buildings.find(build => build.id === id);
  }

  function renderWindow() {
    const build = buildById(openId);
    if (!build || !windowNode) return;
    windowNode.querySelector('.city-window-content').innerHTML = buildingWindow(build);
  }

  function openWindow(id) {
    openId = id;
    windowNode?.remove();
    windowNode = document.createElement('section');
    windowNode.className = 'game-overlay city-window';
    windowNode.innerHTML = `
      <div class="overlay-backdrop" data-city-close></div>
      <div class="overlay-panel city-window-panel">
        <button type="button" class="overlay-close icon-button" data-city-close aria-label="Закрыть">×</button>
        <div class="city-window-content"></div>
      </div>`;
    document.body.appendChild(windowNode);
    renderWindow();
    windowNode.addEventListener('click', onClick);
    requestAnimationFrame(() => windowNode?.classList.add('visible'));
    haptic('light');
  }

  function closeWindow() {
    const node = windowNode;
    windowNode = null;
    openId = null;
    if (!node) return;
    node.classList.add('closing');
    window.setTimeout(() => node.remove(), 200);
  }

  function celebrate(id) {
    const card = container.querySelector(`[data-city-card="${CSS.escape(id)}"]`);
    card?.classList.remove('celebrate');
    void card?.offsetWidth;
    card?.classList.add('celebrate');
  }

  async function runAction(id, action, extra = {}) {
    if (pending) return;
    pending = true;
    const feedback = windowNode?.querySelector('[data-city-feedback]');
    try {
      const payload = await api('/api/builds/action', { method: 'POST', body: JSON.stringify({ buildName: id, action, ...extra }) });
      state = payload.builds || state;
      if (payload.state) onState(payload.state);
      render();
      celebrate(id);
      haptic(action === 'collect' ? 'medium' : 'heavy');
    } catch (error) {
      const message = REASONS[error.payload?.reason] || error.message;
      if (error.payload?.builds) { state = error.payload.builds; render(); }
      const fresh = windowNode?.querySelector('[data-city-feedback]') || feedback;
      if (fresh) fresh.textContent = message;
      haptic('light');
    } finally {
      pending = false;
    }
  }

  function onClick(event) {
    if (event.target.closest('[data-city-close]')) { closeWindow(); return; }
    const actionButton = event.target.closest('[data-city-action]');
    if (actionButton) {
      event.stopPropagation();
      const { cityAction: action, build: id, type } = actionButton.dataset;
      if (action === 'rename') {
        const current = buildById(id)?.name || '';
        const name = window.prompt('Новое название постройки (до 40 символов):', current);
        if (name != null) runAction(id, 'rename', { name });
      } else if (action === 'change_type') {
        runAction(id, 'change_type', { typeName: type });
      } else {
        runAction(id, action);
      }
      return;
    }
    const quest = event.target.closest('[data-city-quest]');
    if (quest && container.contains(quest)) { openWindow(quest.dataset.cityQuest); return; }
    const card = event.target.closest('[data-city-card]');
    if (card && container.contains(card)) openWindow(card.dataset.cityCard);
  }

  container.addEventListener('click', onClick);
  container.addEventListener('keydown', event => {
    const card = event.target.closest?.('[data-city-card]');
    if (card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openWindow(card.dataset.cityCard); }
  });

  // Live timers; when an upgrade finishes, pull fresh state from the server.
  const timer = window.setInterval(async () => {
    const now = Date.now();
    let finished = false;
    for (const bar of document.querySelectorAll('.city-progress[data-progress-end]')) {
      const start = Number(bar.dataset.progressStart), end = Number(bar.dataset.progressEnd);
      bar.querySelector('i').style.width = `${Math.max(0, Math.min(100, ((now - start) / Math.max(1, end - start)) * 100))}%`;
      bar.querySelector('b').textContent = formatDuration(end - now);
      if (end <= now) finished = true;
    }
    if (finished && !pending) {
      try { state = await api('/api/builds'); render(); } catch { /* retry next tick */ }
    }
  }, 1000);

  render();
  return {
    async refresh() { state = await api('/api/builds'); render(); },
    destroy() { window.clearInterval(timer); closeWindow(); container.innerHTML = ''; },
  };
}

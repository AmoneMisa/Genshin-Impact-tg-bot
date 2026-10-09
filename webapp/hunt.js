import { bar, escapeHtml, formatDuration, formatNumber, hotbar, playerFrame, potionBar, statusIcons } from './boss-hud.js';

// Hunting fields (Lineage II style): pick a zone, fight one mob at a time in real time with skills,
// potions and shots. Blue and red champions are tougher and pay much more.

const REASONS = {
  unknown_zone: 'Такой зоны нет.',
  already_fighting: 'Ты уже сражаешься.',
  dead: 'Персонаж погиб и ещё не воскрес.',
  no_combat_class: 'Сначала выбери класс.',
  no_mob: 'Врага уже нет.',
  invalid_skill: 'Навык больше недоступен.',
  skill_locked: 'Навык откроется на более высоком уровне.',
  not_enough_resource: 'Недостаточно HP или MP для навыка.',
  cooldown: 'Навык ещё в откате.',
};
const POTION_REASONS = {
  potion_empty: 'Это зелье закончилось.',
  player_dead: 'Нельзя пить зелье, пока персонаж мёртв.',
  hp_full: 'HP уже полное.',
  mp_full: 'MP уже полное.',
};
const ELEMENT_ICONS = { fire: '🔥', water: '💧', wind: '🌪️', earth: '🪨', holy: '✨', dark: '🌑' };
const CHAMPION = { blue: { icon: '🔵', label: 'Синий чемпион' }, red: { icon: '🔴', label: 'Красный чемпион' } };

export async function openHuntGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/hunt');
  let pending = false;
  let feedback = '';
  let lastLog = state.log?.[0]?.text || '';

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay hunt-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass hunt-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Охотничьи поля</h2>
        <span class="ds-round" aria-hidden="true">🗡️</span>
      </header>
      <div data-hunt-content></div>
      <div class="boss-feedback" data-hunt-feedback aria-live="polite"></div>
    </div>`;
  const content = overlay.querySelector('[data-hunt-content]');
  const feedbackNode = overlay.querySelector('[data-hunt-feedback]');
  let timer = 0;
  let pollTimer = 0;
  const close = () => {
    window.clearInterval(timer);
    window.clearInterval(pollTimer);
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  const say = text => { feedback = text; feedbackNode.textContent = text; };

  function take(payload) {
    if (payload?.hunt) state = payload.hunt;
    if (payload?.state) renderState(payload.state);
  }

  async function run(path, body, { heavy = false } = {}) {
    if (pending) return null;
    pending = true;
    overlay.classList.add('busy');
    haptic(heavy ? 'heavy' : 'light');
    try {
      const payload = await api(path, { method: 'POST', body: JSON.stringify(body || {}) });
      take(payload);
      return payload;
    } catch (error) {
      take(error.payload);
      say(REASONS[error.payload?.reason] || error.message);
      statusElement.textContent = `Охота: ${feedback}`;
      haptic('light');
      return null;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  function describeResult(payload) {
    const result = payload.result || {};
    let text = 'Навык использован.';
    if (result.type === 'damage') {
      text = `Урон: ${formatNumber(result.dmg)}${result.isHasCritical ? ' · КРИТ' : ''}`;
      if (result.hits?.length > 1) text += ` · ${result.hits.length} удара`;
      if (result.vampire) text += ` · вампиризм ${formatNumber(result.vampire)}`;
    } else if (result.type === 'heal') text = `Восстановлено ${formatNumber(result.heal)} HP`;
    else if (result.type === 'shield') text = `Щит: ${formatNumber(result.shield)}`;
    else if (result.type === 'buff') text = 'Усиление наложено';
    else if (result.type === 'debuff') text = result.debuffs?.some(item => item.kind === 'stun' && item.applied) ? 'Враг оглушён!' : 'Враг ослаблен';
    else if (result.type === 'restore') text = `Мана +${formatNumber(result.restoredMp)}`;
    if (payload.shots) text += ` · заряды −${payload.shots.spent}`;
    if (payload.killed && payload.rewards) {
      const r = payload.rewards;
      const items = (r.items || []).map(item => `${item.icon} ${item.name} ×${item.amount}`).join(', ');
      text = `${r.champion ? `${CHAMPION[r.champion].icon} ` : '🏆'} Враг повержен: +${formatNumber(r.exp)} опыта${r.bonus > 1 ? ` (Vitality ×${r.bonus})` : ''}, +${formatNumber(r.sp)} ОП${r.gold ? `, +${formatNumber(r.gold)} 🪙` : ''}${items ? `, ${items}` : ''}${r.leveledUp ? ' · НОВЫЙ УРОВЕНЬ!' : ''}`;
    }
    return text;
  }

  async function start(zone) {
    const payload = await run('/api/hunt/start', { zone }, { heavy: true });
    if (payload) say(payload.hunt.mob ? `${payload.hunt.mob.champion ? `${CHAMPION[payload.hunt.mob.champion].icon} ` : ''}${payload.hunt.mob.name} нападает!` : 'Врага нет.');
    render();
  }

  async function skill(index) {
    const payload = await run('/api/hunt/skill', { skillIndex: Number(index) }, { heavy: true });
    if (payload) {
      say(describeResult(payload));
      if (payload.killed && payload.rewards?.champion) haptic('heavy');
    }
    render();
  }

  async function flee() {
    const payload = await run('/api/hunt/flee');
    if (payload) say('Ты отступил.');
    render();
  }

  async function drink(key) {
    if (pending) return;
    pending = true;
    try {
      haptic('light');
      const payload = await api('/api/inventory/use', { method: 'POST', body: JSON.stringify({ key }) });
      if (payload.state) renderState(payload.state);
      state = await api('/api/hunt');
      say(`Выпито: ${payload.potion?.name || 'зелье'} (+${formatNumber(payload.restored)} ${payload.resource === 'mp' ? 'MP' : 'HP'}).`);
    } catch (error) {
      say(POTION_REASONS[error.payload?.reason] || error.message);
    } finally {
      pending = false;
      render();
    }
  }

  async function toggleShots() {
    const payload = await run('/api/shots/auto', { enabled: !state.shots.enabled });
    if (payload) say(state.shots.enabled ? 'Автозаряды включены.' : 'Автозаряды выключены.');
    render();
  }

  function shotsHtml() {
    const shots = state.shots;
    if (!shots?.grade) return '<div class="hunt-shots off"><span>🔸 Заряды</span><small>Надень оружие, чтобы использовать заряды.</small></div>';
    const kinds = shots.kinds.map(kind => `<em title="${escapeHtml(kind.label)}">${kind.icon} ${formatNumber(kind.count)}</em>`).join('');
    return `<div class="hunt-shots ${shots.enabled ? 'on' : ''}">
      <span>Заряды ${shots.grade === 'noGrade' ? 'NG' : escapeHtml(shots.grade)} · ${shots.perCast}/удар</span>${kinds}
      <button type="button" class="hunt-toggle" data-shots>${shots.enabled ? 'Авто: вкл' : 'Авто: выкл'}</button>
    </div>`;
  }

  function vitalityHtml() {
    const vit = state.vitality;
    if (!vit) return '';
    return `<div class="hunt-vitality" title="Vitality усиливает опыт, пока полоса не опустеет">
      ${bar('vit', 0, 0, { label: 'VIT', percent: (vit.points / vit.max) * 100, text: `опыт ×${Math.round(vit.rate * vit.bonus * 10) / 10} · ${formatNumber(vit.points)}` })}
    </div>`;
  }

  function mobFrame(mob) {
    const champion = mob.champion ? CHAMPION[mob.champion] : null;
    const statuses = [];
    if (mob.stunned) statuses.push({ id: 'stun', label: 'Оглушён' });
    for (const debuff of mob.debuffs || []) {
      if (debuff.kind === 'stun') continue;
      statuses.push({ id: debuff.kind, label: debuff.kind === 'armorBreak' ? 'Броня разбита' : 'Ослаблен', description: `−${Math.round(debuff.amount * 100)}%`, count: Math.ceil(debuff.remainMs / 1000) });
    }
    return `
    <section class="mmo-frame target-frame hunt-mob ${mob.champion ? `champion ${mob.champion}` : ''}">
      <span class="mmo-portrait boss hunt-mob-icon"><em>${formatNumber(mob.level)}</em>${champion ? champion.icon : '👾'}</span>
      <span class="mmo-frame-body">
        <span class="mmo-frame-title"><strong>${escapeHtml(mob.name)}</strong><small>${champion ? escapeHtml(champion.label) : 'Моб'}${mob.element ? ` · ${ELEMENT_ICONS[mob.element] || ''}` : ''}</small></span>
        ${bar('hp', mob.currentHp, mob.hp)}
        <span class="hunt-swing"><small data-hunt-next data-until="${Date.now() + mob.nextAttackMs}" data-total="${mob.attackMs}">…</small><i data-hunt-swing></i></span>
        ${statusIcons(statuses)}
      </span>
    </section>`;
  }

  function zonesHtml() {
    const zones = state.zones;
    return `<div class="hunt-zones">${zones.map(zone => `
      <article class="hunt-zone ${zone.recommended ? 'recommended' : ''} ${zone.reachable ? '' : 'far'}">
        <div class="hunt-zone-head"><strong>${escapeHtml(zone.title)}</strong><small>ур. ${zone.min}–${zone.max}${zone.recommended ? ' · для тебя' : ''}</small></div>
        <p class="hunt-zone-mobs">${zone.mobs.map(mob => `${mob.element ? ELEMENT_ICONS[mob.element] : ''}${escapeHtml(mob.name)} ${mob.level}`).join(' · ')}</p>
        <button type="button" class="equipment-action forge-action" data-zone="${escapeHtml(zone.id)}" ${zone.reachable ? '' : 'disabled'}>${zone.reachable ? 'Охотиться' : 'Опыт не даётся'}</button>
      </article>`).join('')}</div>`;
  }

  function lastHtml() {
    const last = state.last;
    if (!last) return '';
    const items = (last.items || []).map(item => `${item.icon} ${escapeHtml(item.name)} ×${item.amount}`).join(', ');
    return `<section class="mmo-frame hunt-last">
      <div class="mmo-section-title"><strong>${last.champion ? `${CHAMPION[last.champion].icon} ` : ''}Последняя добыча: ${escapeHtml(last.name)}</strong><small>убито: ${formatNumber(state.kills)}</small></div>
      <p>+${formatNumber(last.exp)} опыта · +${formatNumber(last.sp)} ОП${last.gold ? ` · +${formatNumber(last.gold)} 🪙` : ''}${items ? `<br>${items}` : ''}</p>
    </section>`;
  }

  function logHtml() {
    if (!state.log?.length) return '';
    return `<ol class="hunt-log">${state.log.map(row => `<li><i>${escapeHtml(row.icon)}</i><span>${escapeHtml(row.text)}</span></li>`).join('')}</ol>`;
  }

  function render() {
    const player = state.player;
    const dead = player.respawnRemainMs > 0;
    const body = [];
    if (state.mob) {
      body.push(mobFrame(state.mob));
      body.push(playerFrame(player));
      if (dead) body.push(`<div class="boss-dead">Персонаж восстанавливается · ${formatDuration(player.respawnRemainMs)}</div>`);
      body.push(hotbar(player.skills));
      body.push(potionBar(player.potions, { disabled: pending || dead }));
      body.push(shotsHtml());
      body.push(vitalityHtml());
      body.push('<button type="button" class="hunt-flee" data-flee>Отступить</button>');
      body.push(logHtml());
    } else {
      body.push(playerFrame(player));
      body.push(vitalityHtml());
      body.push(potionBar(player.potions, { disabled: pending || dead }));
      body.push(shotsHtml());
      if (dead) body.push(`<div class="boss-dead">Персонаж восстанавливается · ${formatDuration(player.respawnRemainMs)}</div>`);
      body.push(lastHtml());
      body.push(logHtml());
      body.push(`<div class="mmo-section-title"><strong>Зоны</strong><small>🔵 синий: ×3 опыта · 🔴 красный: ×8 опыта и добычи</small></div>`);
      body.push(zonesHtml());
    }
    content.innerHTML = body.join('');
    if (!feedback) feedbackNode.textContent = '';
    bind();
  }

  function bind() {
    content.querySelectorAll('[data-skill]').forEach(button => button.addEventListener('click', () => skill(button.dataset.skill)));
    content.querySelectorAll('[data-boss-potion]').forEach(button => button.addEventListener('click', () => drink(button.dataset.bossPotion)));
    content.querySelectorAll('[data-zone]').forEach(button => button.addEventListener('click', () => start(button.dataset.zone)));
    content.querySelector('[data-flee]')?.addEventListener('click', flee);
    content.querySelector('[data-shots]')?.addEventListener('click', toggleShots);
  }

  // The mob swings in real time: poll while a fight is on, show new swings, and tick the timers locally.
  async function poll() {
    if (pending || !overlay.isConnected || !state.mob) return;
    try {
      const next = await api('/api/hunt');
      // Countdowns tick locally; only real changes re-render.
      const clockless = value => JSON.stringify(value, (key, v) => (/Ms$/.test(key) ? 0 : v));
      if (clockless(next) === clockless(state)) { state = next; return; }
      const top = next.log?.[0]?.text || '';
      state = next;
      if (top && top !== lastLog) {
        lastLog = top;
        say(top);
        if (/бьёт/.test(top)) haptic('medium');
      }
      render();
    } catch {
      // keep the last state; the next poll retries
    }
  }

  function tick() {
    content.querySelectorAll('[data-skill-cooldown]').forEach(node => {
      const remain = Math.max(0, Number(node.dataset.until || 0) - Date.now());
      node.textContent = remain > 0 ? formatDuration(remain) : '';
      const total = Number(node.dataset.total) || remain;
      node.closest('.mmo-skill')?.style.setProperty('--cd', total > 0 ? String(remain / total) : '0');
      if (remain <= 0) node.closest('.boss-skill')?.removeAttribute('disabled');
    });
    const next = content.querySelector('[data-hunt-next]');
    if (next) {
      const remain = Math.max(0, Number(next.dataset.until) - Date.now());
      const total = Number(next.dataset.total) || 1;
      next.textContent = remain > 0 ? `удар через ${(remain / 1000).toFixed(1)} с` : 'бьёт!';
      const fill = content.querySelector('[data-hunt-swing]');
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, (1 - remain / total) * 100))}%`;
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  timer = window.setInterval(tick, 200);
  pollTimer = window.setInterval(poll, 2000);
}

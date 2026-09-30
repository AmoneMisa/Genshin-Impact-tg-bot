import { createBossStage, SKILL_FX, skillFxForClass } from './boss-stage.js';
import {
  damageMeter, escapeHtml, formatDuration, formatNumber, hotbar, partyStrip, playerFrame, rewardsPanel, targetFrame, bossAttacksPanel, potionBar } from './boss-hud.js';

const REASONS = {
  already_summoned: 'Босс уже призван.',
  no_boss: 'Активного босса больше нет.',
  dead: 'Персонаж погиб и ещё не воскрес.',
  invalid_skill: 'Навык больше недоступен.',
  not_enough_resource: 'Недостаточно HP или MP для навыка.',
  cooldown: 'Навык ещё в откате.',
};

// Legacy /boss is an entry action, not a passive status read: when no boss is
// alive it summons one immediately. Preserve that behavior without mutating a
// GET endpoint. The POST race case is expected when two players open the Mini
// App at the same time, so reuse the boss returned by already_summoned.
export async function loadBossEntryState(api) {
  const current = await api('/api/boss');
  if (current?.active) {
    return { boss: current, summoned: false, state: null };
  }

  try {
    const payload = await api('/api/boss/summon', { method: 'POST' });
    return {
      boss: payload.boss,
      summoned: true,
      state: payload.state || null,
    };
  } catch (error) {
    if (error?.payload?.reason === 'already_summoned' && error.payload.boss) {
      return {
        boss: error.payload.boss,
        summoned: false,
        state: error.payload.state || null,
      };
    }
    throw error;
  }
}

export async function openBossGame({ api, renderState, haptic, statusElement }) {
  const entry = await loadBossEntryState(api);
  let state = entry.boss;
  if (entry.state) renderState(entry.state);
  let pending = false;
  let timer = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay boss-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass boss-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Босс</h2>
        <span class="ds-round" aria-hidden="true">⚔</span>
      </header>
      <div data-boss-target></div>
      <div class="boss-stage" data-boss-stage hidden></div>
      <div data-boss-content></div>
      <div class="boss-feedback" data-boss-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-boss-content]');
  // The stage lives outside the re-rendered content so its WebGL context
  // survives every state refresh; renderAll only updates it.
  const stageHost = overlay.querySelector('[data-boss-stage]');
  const targetHost = overlay.querySelector('[data-boss-target]');
  let stage = null;
  let stageRetiring = false;

  function syncStage() {
    if (state.active) {
      if (!stage || stage.name !== state.boss.name) {
        stage?.destroy();
        stageHost.hidden = false;
        stage = createBossStage(stageHost, { name: state.boss.name, hpPercent: state.boss.hpPercent, player: state.player });
      } else {
        stage.setHp(state.boss.hpPercent);
      }
      return;
    }
    if (stage && !stageRetiring) {
      // Let the defeat dissolve play out before the stage goes away.
      stageRetiring = true;
      const retiring = stage;
      window.setTimeout(() => {
        retiring.destroy();
        if (stage === retiring) { stage = null; stageHost.hidden = true; }
        stageRetiring = false;
      }, 1800);
    } else if (!stage) {
      stageHost.hidden = true;
    }
  }

  function floatNumber(text, kind, delayMs = 0) {
    if (delayMs > 0) { window.setTimeout(() => floatNumber(text, kind), delayMs); return; }
    const node = document.createElement('span');
    node.className = `boss-stage-number ${kind}`;
    node.textContent = text;
    node.style.setProperty('--drift', `${Math.round((Math.random() - 0.5) * 60)}px`);
    stageHost.appendChild(node);
    window.setTimeout(() => node.remove(), 1300);
  }
  const feedback = overlay.querySelector('[data-boss-feedback]');
  if (entry.summoned) feedback.textContent = 'Босс призван. Таймер рейда запущен.';

  let pollTimer = null;
  const close = () => {
    if (timer) window.clearInterval(timer);
    window.clearInterval(pollTimer);
    stage?.destroy();
    stage = null;
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  async function refresh() {
    state = await api('/api/boss');
    renderAll();
  }

  // Live combat: poll while the raid is on and play the boss's new casts.
  let lastCastAt = state.active ? Number(state.boss.attackLog?.[0]?.at) || 0 : 0;
  async function poll() {
    if (pending || !overlay.isConnected || !state.active) return;
    try {
      const next = await api('/api/boss');
      const cast = next.active ? next.boss.attackLog?.[0] : null;
      // Countdowns tick locally; only real changes re-render.
      const clockless = value => JSON.stringify(value, (key, v) => (/Ms$/.test(key) ? 0 : v));
      if (clockless(next) === clockless(state)) return;
      state = next;
      renderAll();
      if (cast && Number(cast.at) > lastCastAt) {
        lastCastAt = Number(cast.at);
        stage?.bossAttack?.();
        const mine = cast.hits.find(hit => hit.you);
        if (mine) {
          floatNumber(`−${formatNumber(mine.dmg)}`, 'incoming', 350);
          haptic(mine.killed ? 'heavy' : 'medium');
          feedback.textContent = `${cast.icon} ${state.boss.nameCall || state.boss.name}: «${cast.name}» — ${mine.killed ? 'ты повержен(-а)!' : `−${formatNumber(mine.dmg)} HP`}`;
        }
      }
    } catch {
      // Keep the last state; the next poll retries.
    }
  }

  async function summon() {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Призываем босса для всего чата…';
    haptic('heavy');
    try {
      const payload = await api('/api/boss/summon', { method: 'POST' });
      state = payload.boss;
      if (payload.state) renderState(payload.state);
      feedback.textContent = 'Босс призван. Таймер рейда запущен.';
      renderAll();
    } catch (error) {
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      if (error.payload?.boss) {
        state = error.payload.boss;
        renderAll();
      }
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  function resultBanner(payload) {
    const result = payload.result || {};
    let text = 'Навык использован.';
    let icon = '✨';
    if (result.type === 'damage') {
      icon = result.isHasCritical ? '💥' : '⚔️';
      text = `Урон: ${formatNumber(result.dmg)}${result.isHasCritical ? ' · КРИТ' : ''}`;
      if (result.reflectDamage) text += ` · отражено ${formatNumber(result.reflectDamage)}`;
      if (result.vampire) text += ` · вампиризм ${formatNumber(result.vampire)}`;
    } else if (result.type === 'heal') {
      icon = '💚'; text = `Восстановлено ${formatNumber(result.heal)} HP`;
    } else if (result.type === 'shield') {
      icon = '🛡️'; text = `Щит: ${formatNumber(result.shield)}`;
    }

    if (payload.killed) {
      icon = '🏆';
      text = 'Босс повержен! Награды распределены между участниками.';
    }

    const banner = document.createElement('div');
    banner.className = `boss-result ${payload.killed ? 'victory' : ''}`;
    banner.innerHTML = `<span>${icon}</span><strong>${escapeHtml(text)}</strong>`;
    overlay.querySelector('.boss-panel').prepend(banner);
    requestAnimationFrame(() => banner.classList.add('visible'));
    window.setTimeout(() => {
      banner.classList.add('leaving');
      window.setTimeout(() => banner.remove(), 180);
    }, 2600);
  }

  async function useSkill(index) {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy', 'fighting');
    feedback.textContent = 'Считаем действие на сервере…';
    haptic('heavy');
    try {
      const payload = await api('/api/boss/skill', {
        method: 'POST',
        body: JSON.stringify({ skillIndex: Number(index) }),
      });
      state = payload.boss;
      if (payload.state) renderState(payload.state);
      const result = payload.result || {};
      if (result.type === 'damage') {
        stage?.playSkill('damage', { crit: Boolean(result.isHasCritical) });
        // The number lands with the class animation's impact.
        const impactMs = (SKILL_FX[skillFxForClass(state.player?.className)]?.impact || 0) * 1000;
        floatNumber(`-${formatNumber(result.dmg)}`, result.isHasCritical ? 'crit' : 'damage', impactMs);
      } else if (result.type === 'heal' || result.type === 'shield') {
        stage?.playSkill(result.type);
        floatNumber(result.type === 'heal' ? `+${formatNumber(result.heal)}` : `🛡 ${formatNumber(result.shield)}`, 'heal');
      }
      if (payload.killed) stage?.defeat();
      resultBanner(payload);
      feedback.textContent = payload.killed
        ? (payload.loot ? 'Твоя награда уже начислена.' : 'Рейд завершён.')
        : 'Действие применено.';
      renderAll();
    } catch (error) {
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      statusElement.textContent = `Босс: ${feedback.textContent}`;
      if (error.payload?.boss) {
        state = error.payload.boss;
        renderAll();
      } else {
        try { await refresh(); } catch {}
      }
      haptic('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy', 'fighting');
    }
  }

  const POTION_REASONS = {
    potion_empty: 'Это зелье закончилось.',
    player_dead: 'Нельзя пить зелье, пока персонаж мёртв.',
    hp_full: 'HP уже полное.',
    mp_full: 'MP уже полное.',
  };

  async function drinkPotion(key) {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy');
    try {
      haptic('light');
      const payload = await api('/api/inventory/use', { method: 'POST', body: JSON.stringify({ key }) });
      if (payload.state) renderState(payload.state);
      state = await api('/api/boss');
      floatNumber(`+${formatNumber(payload.restored)} ${payload.resource === 'mp' ? 'MP' : 'HP'}`, 'heal');
      feedback.textContent = `Выпито: ${payload.potion?.name || 'зелье'} (+${formatNumber(payload.restored)} ${payload.resource === 'mp' ? 'MP' : 'HP'}).`;
    } catch (error) {
      feedback.textContent = POTION_REASONS[error.payload?.reason] || error.message;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      renderAll();
    }
  }

  function bind() {
    content.querySelectorAll('[data-boss-potion]').forEach(button => {
      button.addEventListener('click', () => drinkPotion(button.dataset.bossPotion));
    });
    targetHost.querySelector('[data-boss-rewards-toggle]')?.addEventListener('click', () => {
      const panel = targetHost.querySelector('[data-boss-rewards]');
      if (!panel) return;
      panel.hidden = !panel.hidden;
      haptic('light');
    });
    content.querySelector('[data-summon]')?.addEventListener('click', summon);
    content.querySelector('[data-boss-refresh]')?.addEventListener('click', async () => {
      haptic('light');
      await refresh();
    });
    content.querySelectorAll('[data-skill]').forEach((button) => {
      button.addEventListener('click', () => useSkill(button.dataset.skill));
    });
  }

  function renderAll() {
    syncStage();
    if (!state.active) {
      targetHost.innerHTML = '';
      content.innerHTML = `
        <section class="boss-empty-state">
          <div class="boss-empty-icon">👹</div>
          <strong>Активного босса нет</strong>
          <p>Призыв создаёт общего босса для текущего игрового чата на 15 минут.</p>
          <button type="button" class="boss-summon" data-summon>Призвать босса</button>
        </section>`;
      bind();
      return;
    }

    const boss = state.boss;
    const player = state.player;
    const rewardsOpen = !targetHost.querySelector('[data-boss-rewards]')?.hidden && Boolean(targetHost.querySelector('[data-boss-rewards]'));
    targetHost.innerHTML = `${targetFrame(boss)}${rewardsPanel(boss.loot)}`;
    if (rewardsOpen) targetHost.querySelector('[data-boss-rewards]').hidden = false;
    content.innerHTML = `
      ${playerFrame(player)}
      ${bossAttacksPanel(boss)}
      ${player.respawnRemainMs > 0 ? `<div class="boss-dead">Персонаж восстанавливается · ${formatDuration(player.respawnRemainMs)}</div>` : ''}
      ${hotbar(player.skills)}
      ${potionBar(player.potions, { disabled: pending || player.respawnRemainMs > 0 })}
      ${partyStrip(boss.damageList)}
      <div class="mmo-section-title"><strong>Урон рейда</strong><small>${boss.damageList.length} участников · <button type="button" class="mmo-link" data-boss-refresh>обновить</button></small></div>
      ${damageMeter(boss.damageList)}`;
    bind();
  }

  function tick() {
    content.querySelectorAll('[data-skill-cooldown]').forEach((node) => {
      const remain = Math.max(0, Number(node.dataset.until || 0) - Date.now());
      node.textContent = remain > 0 ? formatDuration(remain) : '';
      const total = Number(node.dataset.total) || remain;
      node.closest('.mmo-skill')?.style.setProperty('--cd', total > 0 ? String(remain / total) : '0');
      if (remain <= 0) node.closest('.boss-skill')?.removeAttribute('disabled');
    });
    const next = content.querySelector('[data-boss-next]');
    if (next && state.active && state.boss.damageList?.length) {
      const remain = Math.max(0, Number(next.dataset.until || 0) - Date.now());
      next.textContent = remain > 0 ? `следующая через ${Math.ceil(remain / 1000)} с` : 'готовит удар…';
    }
    // Escape timer bar in the target frame.
    const timeBar = targetHost.querySelector('.mmo-bar.time');
    if (timeBar && state.active) {
      const remain = Math.max(0, Number(state.boss.aliveTime || 0) - Date.now());
      timeBar.querySelector('b').textContent = formatDuration(remain);
      timeBar.querySelector('i').style.width = `${Math.min(100, (remain / (15 * 60 * 1000)) * 100)}%`;
      timeBar.classList.toggle('expired', remain <= 0);
    }
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  timer = window.setInterval(tick, 1000);
  pollTimer = window.setInterval(poll, 2500);
}

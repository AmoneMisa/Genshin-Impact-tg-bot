const REASONS = {
  already_summoned: 'Босс уже призван.',
  no_boss: 'Активного босса больше нет.',
  dead: 'Персонаж погиб и ещё не воскрес.',
  invalid_skill: 'Навык больше недоступен.',
  not_enough_resource: 'Недостаточно HP или MP для навыка.',
  cooldown: 'Навык ещё в откате.',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function duration(ms) {
  const total = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function skillCard(skill) {
  const type = skill.isDamage ? 'damage' : skill.isHeal ? 'heal' : skill.isShield ? 'shield' : 'utility';
  const cost = skill.costHp > 0 ? `❤️ ${formatNumber(skill.costHp)}` : `🔹 ${formatNumber(skill.costMp)}`;
  return `
    <button type="button" class="boss-skill ${type}" data-skill="${skill.index}" ${skill.canUse ? '' : 'disabled'}>
      <div class="boss-skill-top"><strong>${escapeHtml(skill.name)}</strong><span>${cost}</span></div>
      <p>${escapeHtml(skill.description)}</p>
      <div class="boss-skill-foot">
        <span>${type === 'damage' ? 'Атака' : type === 'heal' ? 'Лечение' : type === 'shield' ? 'Щит' : 'Навык'}</span>
        <span data-skill-cooldown data-until="${skill.cooldownUntil || 0}">${skill.cooldownMs > 0 ? `Откат ${duration(skill.cooldownMs)}` : 'Готов'}</span>
      </div>
    </button>`;
}

function lootPreview(loot) {
  if (!loot) return '';
  const rows = [];
  if (loot.gold) rows.push(`<span>🪙 ${formatNumber(loot.gold.min)}–${formatNumber(loot.gold.max)}</span>`);
  if (loot.crystals) rows.push(`<span>💎 ${formatNumber(loot.crystals.min)}–${formatNumber(loot.crystals.max)}</span>`);
  if (loot.experience) rows.push(`<span>✦ ${formatNumber(loot.experience.min)}–${formatNumber(loot.experience.max)} XP</span>`);
  if (loot.equipment) rows.push(`<span>🛡️ Снаряжение</span>`);
  return rows.join('');
}

function damageList(rows) {
  if (!rows?.length) return '<div class="boss-empty compact">Пока никто не атаковал.</div>';
  return rows.map((row, index) => `
    <div class="boss-damage-row">
      <span>#${index + 1}</span>
      <strong>${escapeHtml(row.name)}</strong>
      <em>${formatNumber(row.damage)}</em>
    </div>`).join('');
}

export async function openBossGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/boss');
  let pending = false;
  let timer = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay boss-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass boss-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">РЕЙД · SHARED CHAT BOSS</div><h2>Босс</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <div data-boss-content></div>
      <div class="boss-feedback" data-boss-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-boss-content]');
  const feedback = overlay.querySelector('[data-boss-feedback]');

  const close = () => {
    if (timer) window.clearInterval(timer);
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  async function refresh() {
    state = await api('/api/boss');
    renderAll();
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

  function bind() {
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
    if (!state.active) {
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
    content.innerHTML = `
      <section class="boss-hero">
        <div class="boss-name-row"><div><small>LVL ${boss.level}</small><strong>${escapeHtml(boss.nameCall)}</strong></div><button type="button" data-boss-refresh>↻</button></div>
        <p>${escapeHtml(boss.description)}</p>
        <div class="boss-hp-copy"><span>HP</span><strong>${formatNumber(boss.currentHp)} / ${formatNumber(boss.hp)}</strong></div>
        <div class="boss-hp-track"><span style="width:${boss.hpPercent}%"></span></div>
        <div class="boss-timer"><span>До побега</span><strong data-boss-timer data-until="${boss.aliveTime}">${duration(boss.remainMs)}</strong></div>
      </section>

      <div class="boss-player-bars">
        <div><small>Твоё HP</small><strong>❤️ ${formatNumber(player.hp)} / ${formatNumber(player.maxHp)}</strong><span><i style="width:${player.hpPercent}%"></i></span></div>
        <div><small>Твоё MP</small><strong>🔹 ${formatNumber(player.mp)} / ${formatNumber(player.maxMp)}</strong><span><i style="width:${player.mpPercent}%"></i></span></div>
      </div>

      ${player.respawnRemainMs > 0 ? `<div class="boss-dead">Персонаж восстанавливается · ${duration(player.respawnRemainMs)}</div>` : ''}

      <div class="boss-section-title"><strong>Навыки</strong><small>HP/MP и cooldown проверяет сервер</small></div>
      <div class="boss-skills">${player.skills.map(skillCard).join('')}</div>

      <div class="boss-section-title"><strong>Возможная награда</strong><small>Зависит от места по урону</small></div>
      <div class="boss-loot">${lootPreview(boss.loot)}</div>

      <div class="boss-section-title"><strong>Урон группы</strong><small>${boss.damageList.length} участников</small></div>
      <div class="boss-damage-list">${damageList(boss.damageList)}</div>`;
    bind();
  }

  function tick() {
    content.querySelectorAll('[data-skill-cooldown]').forEach((node) => {
      const remain = Math.max(0, Number(node.dataset.until || 0) - Date.now());
      node.textContent = remain > 0 ? `Откат ${duration(remain)}` : 'Готов';
      if (remain <= 0) node.closest('.boss-skill')?.removeAttribute('disabled');
    });
    const bossTimer = content.querySelector('[data-boss-timer]');
    if (bossTimer) {
      const remain = Math.max(0, Number(bossTimer.dataset.until || 0) - Date.now());
      bossTimer.textContent = duration(remain);
      if (remain <= 0) bossTimer.classList.add('expired');
    }
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  timer = window.setInterval(tick, 1000);
}

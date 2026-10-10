import { createBossStage, SKILL_FX, skillFxForClass } from './boss-stage.js';
import {
  damageMeter, encounterPanel, escapeHtml, formatDuration, formatNumber, hotbar, hotbarChoice, partyStrip, playerFrame, rewardsPanel, targetFrame, bossAttacksPanel, potionBar } from './boss-hud.js';
import {l2SkillIcon} from './art/l2-extra-art.js';
import {l2EffectIcon} from './art/l2-effects-art.js';

const REASONS = {
  already_summoned: 'Босс уже призван.',
  no_boss: 'Активного босса больше нет.',
  dead: 'Персонаж погиб и ещё не воскрес.',
  invalid_skill: 'Навык больше недоступен.',
  skill_locked: 'Навык откроется на более высоком уровне.',
  target_gone: 'Цель уже побеждена — выбери другую.',
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
  // Damage skills go to this target: 'boss' or a minion id.
  let selectedTarget = 'boss';
  let skillTab='skills',editBar=false,barDraft=[];

  function skillBarHtml(player) {
    const max=player.hotbarMax||16;
    const tabs=`<div class="hunt-bar-tabs" role="tablist"><button type="button" role="tab" aria-selected="${skillTab==='skills'}" data-bar-tab="skills" class="${skillTab==='skills'?'active':''}">Умения</button><button type="button" role="tab" aria-selected="${skillTab==='special'}" data-bar-tab="special" title="Навыки ЛС, призывы и переключаемые" class="${skillTab==='special'?'active':''}">Особые</button></div>`;
    if(skillTab==='special')return tabs+`<div class="mmo-hotbar icons-only">${(player.special||[]).map(row=>`<button type="button" class="mmo-skill boss-skill special ${row.running?'on':''}" data-special="${escapeHtml(row.id)}" ${row.canUse&&!pending?'':'disabled'} title="${escapeHtml(row.name+' — '+(row.description||''))}" aria-label="${escapeHtml(row.name)}"><span class="mmo-skill-icon">${l2EffectIcon(row.id)||l2SkillIcon(row.iconId)||l2SkillIcon(row.name)}</span><small class="mmo-skill-cost">${formatNumber(row.costMp||0)}</small></button>`).join('')||'<p class="party-note">Нет навыков от ЛС, призывов и переключаемых навыков.</p>'}</div>`;
    if(editBar)return tabs+`<div class="hunt-bar-edit"><small>Выбрано ${barDraft.length} из ${max}</small><div class="mmo-hotbar icons-only">${player.skills.map(skill=>hotbarChoice(skill,{on:barDraft.includes(skill.index),position:barDraft.indexOf(skill.index)+1})).join('')}</div><div class="hunt-bar-actions"><button type="button" class="hunt-toggle" data-bar-save ${barDraft.length?'':'disabled'}>Сохранить</button><button type="button" class="hunt-toggle" data-bar-cancel>Отмена</button></div></div>`;
    return tabs+hotbar(player.skills,{chosen:player.hotbar})+`<div class="hunt-bar-actions"><button type="button" class="hunt-toggle" data-bar-edit>Выбрать навыки · ${(player.hotbar||[]).length}/${max}</button></div>`;
  }

  async function skillPanelAction(path,body,after=()=>{}) {
    if(pending)return;pending=true;
    try {const result=await api(path,{method:'POST',body:JSON.stringify(body)});if(result.state)renderState(result.state);after();await refresh();}
    catch(error){feedback.textContent=error.payload?.message||error.message;}
    finally {pending=false;renderAll();}
  }

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay boss-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass boss-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Босс</h2>
        <button class="ds-round" type="button" data-epic-open aria-label="Эпические боссы">👑</button>
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
  // ---- Epic raid bosses (Lineage 2): long respawn windows, unique jewellery ----
  const EPIC_REASONS = {
    ...REASONS,
    unknown_epic: 'Такого эпического босса нет.',
    epic_level_too_low: 'Твой уровень слишком низок для этого босса.',
    epic_cooldown: 'Босс ещё не вернулся — подожди окончания таймера.',
  };
  let epicTimer = 0;
  const epicDuration = (ms) => {
    const minutes = Math.max(0, Math.ceil(ms / 60000));
    const days = Math.floor(minutes / 1440), hours = Math.floor((minutes % 1440) / 60);
    return days ? `${days}д ${hours}ч` : hours ? `${hours}ч ${minutes % 60}м` : `${minutes}м`;
  };

  function epicRemaining(entry) {
    return Math.max(0, (Number(entry.respawnAt) || 0) - Date.now());
  }

  function epicCard(entry, level) {
    const remain = epicRemaining(entry);
    const tooLow = level < entry.minLevel;
    const jewel = entry.jewel;
    const real = jewel?.lineage?.mDef != null ? `M.Def ${jewel.lineage.mDef}` : '';
    const status = remain > 0 ? `Вернётся через <b data-epic-timer="${escapeHtml(entry.respawnAt)}">${epicDuration(remain)}</b>` : tooLow ? `Нужен LVL ${entry.minLevel}` : 'Можно вызвать';
    return `<article class="forge-card epic-card ${remain > 0 || tooLow ? 'unaffordable' : ''}">
      <div class="forge-card-head"><span class="equipment-grade grade-s">👑</span><div><strong>${escapeHtml(entry.nameCall)}</strong><small>${escapeHtml(entry.title || '')}</small></div></div>
      <div class="forge-costs">
        <span class="forge-cost">LVL ${entry.minLevel}+</span>
        <span class="forge-cost">Возрождение ${entry.respawnHours}–${entry.respawnHours + entry.windowHours} ч</span>
        <span class="forge-cost">Убит ${entry.kills || 0} раз</span>
      </div>
      ${jewel ? `<p class="epic-jewel">💍 ${escapeHtml(jewel.name)} · ${escapeHtml(jewel.grade)}${real ? ` · ${escapeHtml(real)}` : ''} · шанс ${Math.round(entry.jewelChance * 100)}%</p>` : ''}
      ${entry.weapons?.length ? `<p class="epic-jewel">Эпическое оружие · S84 · ур. 84 · шанс ${Math.round(entry.weaponChance * 100)}%<br>${entry.weapons.map(weapon=>escapeHtml(weapon.name)).join(' · ')}<br>Для подходящего класса участника рейда.</p>` : ''}
      <p class="epic-status">${status}</p>
      <button class="equipment-action forge-action" type="button" data-epic-summon="${escapeHtml(entry.name)}" ${remain > 0 || tooLow ? 'disabled' : ''}>Бросить вызов</button>
    </article>`;
  }

  async function openEpic() {
    if (pending) return;
    let epic;
    try {
      epic = await api('/api/boss/epic');
    } catch (error) {
      feedback.textContent = EPIC_REASONS[error.payload?.reason] || error.message;
      return;
    }
    const panel = document.createElement('section');
    panel.className = 'boss-epic-panel';
    panel.innerHTML = `<header class="ds-head"><button class="ds-round" type="button" data-epic-close aria-label="Назад">←</button><h2>Эпические боссы</h2><span class="ds-round" aria-hidden="true">👑</span></header>
      <p class="epic-note">Вызов эпического босса ставит таймер возрождения для всего чата. Нетронутый обычный босс уступит место.</p>
      <div class="forge-grid">${(epic.bosses || []).map(entry => epicCard(entry, Number(state.player?.level) || 1)).join('')}</div>`;
    overlay.querySelector('.overlay-panel').appendChild(panel);
    const close = () => { window.clearInterval(epicTimer); panel.remove(); };
    panel.querySelector('[data-epic-close]').addEventListener('click', close);
    epicTimer = window.setInterval(() => {
      panel.querySelectorAll('[data-epic-timer]').forEach(node => {
        const left = Math.max(0, Number(node.dataset.epicTimer) - Date.now());
        node.textContent = epicDuration(left);
      });
    }, 1000);
    panel.querySelectorAll('[data-epic-summon]').forEach(button => button.addEventListener('click', async () => {
      if (pending || button.disabled) return;
      pending = true;
      overlay.classList.add('busy');
      haptic('heavy');
      try {
        const payload = await api('/api/boss/summon', { method: 'POST', body: JSON.stringify({ epic: button.dataset.epicSummon }) });
        state = payload.boss;
        if (payload.state) renderState(payload.state);
        feedback.textContent = 'Эпический босс вышел на бой!';
        close();
        renderAll();
      } catch (error) {
        feedback.textContent = EPIC_REASONS[error.payload?.reason] || error.message;
        haptic('light');
      } finally {
        pending = false;
        overlay.classList.remove('busy');
      }
    }));
  }
  overlay.querySelector('[data-epic-open]')?.addEventListener('click', openEpic);
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
    } else if (result.type === 'buff') {
      icon = '⬆'; text = 'Усиление наложено';
    } else if (result.type === 'debuff') {
      icon = '⬇'; text = result.debuffs?.some(item => item.kind === 'stun' && item.applied) ? 'Босс оглушён!' : 'Босс ослаблен';
    } else if (result.type === 'restore') {
      icon = '🔹'; text = `Мана +${formatNumber(result.restoredMp)}`;
    }
    if (result.type === 'damage') {
      if (result.hits?.length > 1) text += ` · ${result.hits.length} удара`;
      if (result.shielded) text += ' · свита прикрывает босса';
      if (result.locked) text = 'Босс неуязвим, пока жива его вторая половина!';
      if (result.debuffs?.some(item => item.kind === 'stun' && item.applied)) text += result.debuffs.find(item => item.kind === 'stun').interrupted ? ' · удар прерван!' : ' · оглушён';
    }
    if (payload.unitDrops) {
      const items = payload.unitDrops.items.map(item => `${item.icon} ${item.name} ×${item.amount}`).join(', ');
      text += ` · ${payload.unitDrops.name} повержен: +${payload.unitDrops.sp} ОП${items ? `, ${items}` : ''}`;
    }
    if (payload.questGains?.length) text += ` · квест: ${payload.questGains.map(gain => `${gain.item ? `${gain.item} ` : ''}${gain.progress}/${gain.target}`).join(', ')}`;

    if (payload.killed) {
      icon = '🏆';
      text = 'Босс повержен! Награды распределены между участниками.';
      if (payload.loot) {
        const drops = (payload.loot.items || []).map(item => `${item.icon} ${item.name} ×${item.amount}`).join(', ');
        text += ` Тебе: +${formatNumber(payload.loot.gotSp || 0)} ОП${drops ? `, ${drops}` : ''}.`;
        if (payload.loot.epicItem) text += ` 👑 Эпическое украшение: ${payload.loot.epicItem}!`;
        if (payload.loot.epicWeapon) text += ` 👑 Эпическое оружие: ${payload.loot.epicWeapon}!`;
        if (payload.loot.questReady) text += ' Квест профессии выполнен!';
      }
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
        body: JSON.stringify({ skillIndex: Number(index), targetId: selectedTarget }),
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
    content.querySelectorAll('[data-bar-tab]').forEach(button=>button.addEventListener('click',()=>{skillTab=button.dataset.barTab;editBar=false;renderAll();}));
    content.querySelector('[data-bar-edit]')?.addEventListener('click',()=>{editBar=true;barDraft=[...(state.player.hotbar||[])];renderAll();});
    content.querySelector('[data-bar-cancel]')?.addEventListener('click',()=>{editBar=false;renderAll();});
    content.querySelectorAll('[data-hotbar-toggle]').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.hotbarToggle);
      if(barDraft.includes(index))barDraft=barDraft.filter(i=>i!==index);else if(barDraft.length<(state.player.hotbarMax||16))barDraft.push(index);else feedback.textContent='Можно выбрать максимум 16 навыков.';
      renderAll();
    }));
    content.querySelector('[data-bar-save]')?.addEventListener('click',()=>skillPanelAction('/api/hunt/hotbar',{slots:barDraft},()=>{editBar=false;}));
    content.querySelectorAll('[data-special]').forEach(button=>button.addEventListener('click',()=>skillPanelAction('/api/hunt/special',{id:button.dataset.special})));
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
    content.querySelectorAll('[data-boss-target]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedTarget = button.dataset.bossTarget;
        haptic('light');
        renderAll();
      });
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
    // A fallen minion can't stay targeted.
    if (selectedTarget !== 'boss' && !boss.minions?.some(unit => unit.id === selectedTarget && unit.alive)) selectedTarget = 'boss';
    const rewardsOpen = !targetHost.querySelector('[data-boss-rewards]')?.hidden && Boolean(targetHost.querySelector('[data-boss-rewards]'));
    targetHost.innerHTML = `${targetFrame(boss)}${rewardsPanel(boss.loot)}`;
    if (rewardsOpen) targetHost.querySelector('[data-boss-rewards]').hidden = false;
    content.innerHTML = `
      ${playerFrame(player)}
      ${encounterPanel(boss, selectedTarget)}
      ${bossAttacksPanel(boss)}
      ${player.respawnRemainMs > 0 ? `<div class="boss-dead">Персонаж восстанавливается · ${formatDuration(player.respawnRemainMs)}</div>` : ''}
      ${skillBarHtml(player)}
      ${potionBar(player.potions, { disabled: pending || player.respawnRemainMs > 0 })}
      ${partyStrip(boss.damageList)}
      <div class="mmo-section-title"><strong>Урон рейда</strong><small>${boss.damageList.length} участников · <button type="button" class="mmo-link" data-boss-refresh>обновить</button></small></div>
      ${damageMeter(boss.damageList)}`;
    bind();
  }

  function tick() {
    content.querySelectorAll('[data-skill-cooldown]').forEach((node) => {
      const remain = Math.max(0, Number(node.dataset.until || 0) - Date.now());
      node.textContent = remain > 0 ? epicDuration(remain) : '';
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
      timeBar.querySelector('b').textContent = epicDuration(remain);
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

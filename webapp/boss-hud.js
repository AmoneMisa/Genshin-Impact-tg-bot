// MMO-style boss raid HUD (pure HTML builders, styled in boss.css):
// target frame, player frame, status-effect icons, party strip with HP rings,
// skill hotbar with cooldown sweep, ranked damage meter and the rewards panel
// that opens from the target frame.

import { bossArtUrl, classArtUrl } from './boss-stage.js';

export const STATUS_ICONS = Object.freeze({
  // boss skills
  reflect: '🪞', hp_regen: '✚', rage: '🔥', resistance: '🛡️', life: '❤️',
  // player effects
  shield: '🛡️', damageUp: '⚔️', critChanceUp: '🎯', critDamageUp: '💥', dead: '💀',
});

const CLASS_COLORS = Object.freeze({ warrior: '#d9744a', archer: '#6fcf6b', mage: '#8f7bff', priest: '#f1d27a', noClass: '#a8a8b8' });

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(Number(value) || 0));
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export function bar(kind, current, max, { label = kind.toUpperCase(), text = null, percent = null } = {}) {
  const pct = clampPercent(percent ?? (max > 0 ? (current / max) * 100 : 0));
  return `<div class="mmo-bar ${kind}"><span class="mmo-bar-label">${label}</span><div class="mmo-bar-track"><i style="width:${pct}%"></i><b>${escapeHtml(text ?? `${formatNumber(current)} / ${formatNumber(max)}`)}</b></div></div>`;
}

export function statusIcons(list = []) {
  if (!list.length) return '<div class="mmo-statuses empty"></div>';
  return `<div class="mmo-statuses">${list.map(status => `
    <span class="mmo-status ${escapeHtml(status.id)}" title="${escapeHtml(status.label)}${status.description ? ` — ${escapeHtml(status.description)}` : ''}">
      ${STATUS_ICONS[status.id] || '✦'}${status.count != null ? `<em>${formatNumber(status.count)}</em>` : ''}
    </span>`).join('')}</div>`;
}

/** Boss target frame; tapping it opens the rewards panel (`data-boss-rewards-toggle`). */
export function targetFrame(boss) {
  const timePercent = boss.aliveTime && boss.remainMs != null ? clampPercent((boss.remainMs / (15 * 60 * 1000)) * 100) : 0;
  return `
  <button type="button" class="mmo-frame target-frame" data-boss-rewards-toggle aria-label="Показать награды">
    <span class="mmo-portrait boss" style="--portrait:url('${bossArtUrl(boss.name) || ''}')"><em>${formatNumber(boss.level)}</em></span>
    <span class="mmo-frame-body">
      <span class="mmo-frame-title"><strong>${escapeHtml(boss.nameCall || boss.name)}</strong><small>Босс · награды ▾</small></span>
      ${bar('hp', boss.currentHp, boss.hp)}
      ${bar('time', 0, 0, { label: '⏳', percent: timePercent, text: formatDuration(boss.remainMs) })}
      ${statusIcons(boss.statuses || [])}
    </span>
  </button>`;
}

export function playerFrame(player) {
  return `
  <section class="mmo-frame player-frame">
    <span class="mmo-portrait player" style="--portrait:url('${classArtUrl(player.className, player.gender)}')"><em>${formatNumber(player.level)}</em></span>
    <span class="mmo-frame-body">
      <span class="mmo-frame-title"><strong>${escapeHtml(player.name || 'Ты')}</strong><small>Ур. ${formatNumber(player.level)}</small></span>
      ${bar('hp', player.hp, player.maxHp)}
      ${bar('mp', player.mp, player.maxMp)}
      ${player.maxCp ? bar('cp', player.cp, player.maxCp) : ''}
      ${statusIcons(player.effects || [])}
    </span>
  </section>`;
}

/** Other raiders: portrait with an HP ring, name and damage share. */
export function partyStrip(rows = []) {
  if (!rows.length) return '';
  return `
  <section class="mmo-party" aria-label="Участники рейда">
    <div class="mmo-section-title"><strong>В бою</strong><small>${rows.length}</small></div>
    <div class="mmo-party-row">${rows.map(row => `
      <div class="mmo-party-member ${row.isYou ? 'you' : ''}" ${row.isYou ? '' : `data-player-card="${escapeHtml(row.userId)}"`} title="${escapeHtml(row.name)} · ${formatNumber(row.damage)}">
        <span class="mmo-ring" style="--hp:${row.hpPercent == null ? 100 : clampPercent(row.hpPercent)};--class:${CLASS_COLORS[row.className] || CLASS_COLORS.noClass}">
          <span class="mmo-portrait mini" style="--portrait:url('${classArtUrl(row.className, row.gender)}')"></span>
        </span>
        <small>${escapeHtml(row.isYou ? 'Ты' : row.name)}</small>
        <em>${row.share}%</em>
      </div>`).join('')}</div>
  </section>`;
}

function skillGlyph(skill) {
  if (skill.isHeal) return '✚';
  if (skill.isShield) return '🛡️';
  if (skill.isDamage) return '⚔️';
  return '✦';
}

/** Hotbar; `data-skill-cooldown` nodes are refreshed by the screen's ticker. */
export function hotbar(skills = []) {
  return `<div class="mmo-hotbar">${skills.map(skill => {
    const type = skill.isDamage ? 'damage' : skill.isHeal ? 'heal' : skill.isShield ? 'shield' : 'utility';
    const cost = skill.costHp > 0 ? `❤️${formatNumber(skill.costHp)}` : `🔹${formatNumber(skill.costMp)}`;
    return `
    <button type="button" class="mmo-skill boss-skill ${type}" data-skill="${skill.index}" ${skill.canUse ? '' : 'disabled'} title="${escapeHtml(skill.description)}">
      <span class="mmo-skill-icon">${skillGlyph(skill)}</span>
      <span class="mmo-skill-cooldown" data-skill-cooldown data-until="${skill.cooldownUntil || 0}" data-total="${skill.cooldownMs || 0}">${skill.cooldownMs > 0 ? formatDuration(skill.cooldownMs) : ''}</span>
      <strong>${escapeHtml(skill.name)}</strong>
      <small>${cost}</small>
    </button>`;
  }).join('')}</div>`;
}

/** Ranked damage meter; bars are relative to the top damage dealer. */
export function damageMeter(rows = []) {
  if (!rows.length) return '<div class="boss-empty compact">Пока никто не атаковал.</div>';
  const top = Math.max(...rows.map(row => Number(row.damage) || 0), 1);
  return `<div class="mmo-meter">${rows.map((row, index) => `
    <div class="mmo-meter-row ${row.isYou ? 'you' : ''}" ${row.isYou ? '' : `data-player-card="${escapeHtml(row.userId)}"`} style="--fill:${((Number(row.damage) || 0) / top) * 100}%;--class:${CLASS_COLORS[row.className] || CLASS_COLORS.noClass}">
      <span class="rank">${index + 1}</span>
      <strong>${escapeHtml(row.isYou ? `${row.name} (ты)` : row.name)}</strong>
      <em>${formatNumber(row.damage)} · ${row.share ?? 0}%</em>
    </div>`).join('')}</div>`;
}

/** Possible rewards, opened from the target frame. */
export function rewardsPanel(loot) {
  const rows = [];
  if (loot?.gold) rows.push(['🪙', 'Золото', `${formatNumber(loot.gold.min)} – ${formatNumber(loot.gold.max)}`]);
  if (loot?.crystals) rows.push(['💎', 'Кристаллы', `${formatNumber(loot.crystals.min)} – ${formatNumber(loot.crystals.max)}`]);
  if (loot?.experience) rows.push(['✦', 'Опыт', `${formatNumber(loot.experience.min)} – ${formatNumber(loot.experience.max)}`]);
  if (loot?.equipment) rows.push(['🛡️', 'Снаряжение', `${formatNumber(loot.equipment)} шт. в добыче`]);
  return `
  <section class="mmo-frame mmo-rewards" data-boss-rewards hidden>
    <div class="mmo-section-title"><strong>Возможная награда</strong><small>Зависит от места по урону</small></div>
    ${rows.length ? rows.map(([icon, name, range]) => `<div class="mmo-reward"><span>${icon}</span><strong>${name}</strong><em>${range}</em></div>`).join('') : '<div class="boss-empty compact">Нет данных о награде.</div>'}
  </section>`;
}

/**
 * The boss's own attacks with a countdown to the next cast
 * (`data-boss-next` is ticked locally) and the latest casts.
 */
export function bossAttacksPanel(boss) {
  const attacks = boss.attacks || [];
  const log = (boss.attackLog || []).slice(0, 3);
  return `
  <section class="mmo-frame boss-attacks">
    <div class="mmo-section-title"><strong>Атаки босса</strong><small data-boss-next data-until="${Date.now() + (Number(boss.nextAttackMs) || 0)}">${boss.damageList?.length ? 'готовится…' : 'ждёт первого удара'}</small></div>
    <div class="boss-attack-list">${attacks.map(attack => `
      <span class="boss-attack ${attack.target}" title="${escapeHtml(attack.description)}"><i>${escapeHtml(attack.icon)}</i><b>${escapeHtml(attack.name)}</b><small>${attack.target === 'all' ? 'по всем' : 'по одному'}</small></span>`).join('')}</div>
    ${log.length ? `<ol class="boss-attack-feed">${log.map((record, index) => `
      <li class="${index === 0 ? 'latest' : ''} ${record.hits.some(hit => hit.you) ? 'hit-you' : ''}">
        <i>${escapeHtml(record.icon)}</i>
        <div><strong>${escapeHtml(record.name)}</strong><small>${record.hits.map(hit => `${escapeHtml(hit.you ? 'ты' : hit.name)} −${formatNumber(hit.dmg)}${hit.killed ? ' 💀' : ''}`).join(' · ') || 'промах'}</small></div>
      </li>`).join('')}</ol>` : ''}
  </section>`;
}

import {l2SkillIcon} from './art/l2-extra-art.js';
import { escapeHtml } from './escape-html.js';
export { escapeHtml };
// MMO-style boss raid HUD (pure HTML builders, styled in boss.css):
// target frame, player frame, status-effect icons, party strip with HP rings,
// skill hotbar with cooldown sweep, ranked damage meter and the rewards panel
// that opens from the target frame.

import { bossArtUrl, classArtUrl } from './boss-stage.js';
import { flaskHtml } from './inventory.js';
import { familyOf } from './class-family.js';
import {icon,emojiIconName} from './icons.js';

export const STATUS_ICONS = Object.freeze({reflect:'mirror-round',hp_regen:'heart',rage:'flame',resistance:'shield',life:'heart',shield:'shield',damageUp:'swords',critChanceUp:'target',critDamageUp:'bomb',dead:'skull',guard:'shield',taunt:'flag',evade:'wind',haste:'zap',armorBreak:'hammer',weaken:'cloud-fog',stun:'orbit',enrage:'angry',armored:'shield',locked:'lock',slow:'hourglass',mute:'volume-x',accuracyDown:'cloud-fog',poison:'flask-conical',bleed:'droplet'});

const CLASS_COLORS = Object.freeze({ warrior: '#d9744a', archer: '#6fcf6b', mage: '#8f7bff', priest: '#f1d27a', rogue: '#4fd1c5', berserk: '#e0483c', noClass: '#a8a8b8' });
const classColor = className => CLASS_COLORS[familyOf(className)] || CLASS_COLORS.noClass;


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
      ${l2SkillIcon(status.iconKey || status.potionId || status.id) || icon(STATUS_ICONS[status.id] || 'sparkle')}${status.count != null ? `<em>${formatNumber(status.count)}</em>` : ''}
    </span>`).join('')}</div>`;
}

/** The boss's own skill plus the states of this fight (enrage, minion shield, stun, debuffs). */
export function encounterStatuses(boss) {
  const list = [...(boss.statuses || [])];
  if (boss.enrage > 0) list.push({ id: 'enrage', label: 'Ярость', description: `Урон босса +${boss.enrage}%` });
  if (boss.shielded > 0) list.push({ id: 'armored', label: 'Свита прикрывает', description: `Босс игнорирует ${boss.shielded}% урона, пока жива свита` });
  if (boss.locked) list.push({ id: 'locked', label: 'Неуязвим', description: 'Пока живы обе головы / близнец, босса не убить' });
  if (boss.stunned) list.push({ id: 'stun', label: 'Оглушён' });
  for (const debuff of boss.debuffs || []) {
    if (debuff.kind === 'stun') continue;
    list.push({ id: debuff.kind, label: debuff.kind === 'armorBreak' ? 'Броня разбита' : 'Ослаблен', description: `−${Math.round(debuff.amount * 100)}%`, count: Math.ceil(debuff.remainMs / 1000) });
  }
  return list;
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
      ${bar('time', 0, 0, { label: 'TIME', percent: timePercent, text: formatDuration(boss.remainMs) })}
      ${statusIcons(encounterStatuses(boss))}
      ${summonsProgress(boss.summons, boss.level)}
    </span>
  </button>`;
}

/** Summons towards the boss's next level. */
export function summonsProgress(summons, level) {
  const need = Number(summons?.need) || 0;
  if (!need) return '';
  const current = Math.min(need, Number(summons?.current) || 0);
  return `<span class="boss-summons" title="Босс усиливается с каждым призывом"><small>До ур. ${formatNumber(Number(level) + 1)}</small><i style="--p:${(current / need) * 100}%"></i><b>${formatNumber(current)} / ${formatNumber(need)} призывов</b></span>`;
}

/**
 * Quick-use potions in the fight (`data-boss-potion` = inventory key). Every
 * potion kind is shown; ones you don't have are dimmed with a 0 badge.
 */
export function potionBar(potions = [], { disabled = false } = {}) {
  if (!potions.length) return '';
  return `<div class="boss-potions">${potions.map(potion => {
    const empty = !(Number(potion.count) > 0) || potion.key == null;
    const unit = potion.type === 'mp' ? 'MP' : 'HP';
    const power = potion.bottleType === 'elixir'
      ? `${unit} +${formatNumber(potion.power)}%`
      : potion.share > 0 ? `${unit} ≥${formatNumber(potion.power)} · ${potion.share}%` : `${unit} +${formatNumber(potion.power)}`;
    return `
    <button type="button" class="boss-potion ${empty ? 'empty' : ''}" ${empty ? '' : `data-boss-potion="${escapeHtml(potion.key)}"`} ${empty || disabled ? 'disabled' : ''} title="${escapeHtml(potion.name)} · ${power}" aria-label="${escapeHtml(potion.name)}: ${formatNumber(potion.count)} шт.">
      ${flaskHtml(potion)}
      <em>${formatNumber(potion.count)}</em>
      <small>${power}</small>
    </button>`;
  }).join('')}</div>`;
}

export function playerFrame(player) {
  return `
  <section class="mmo-frame player-frame" data-pvp="${['pk','flagged'].includes(player.pvp?.status)?player.pvp.status:'neutral'}">
    <span class="mmo-portrait player" style="--portrait:url('${classArtUrl(player.className, player.gender)}')"><em>${formatNumber(player.level)}</em></span>
    <span class="mmo-frame-body">
      <span class="mmo-frame-title"><strong>${escapeHtml(player.name || 'Ты')}</strong><small>Ур. ${formatNumber(player.level)}</small></span>
      ${player.maxCp ? bar('cp', player.cp, player.maxCp) : ''}
      ${bar('hp', player.hp, player.maxHp)}
      ${bar('mp', player.mp, player.maxMp)}
      ${player.pvp?`<small class="mmo-pvp-status">${player.pvp.status==='pk'?`${icon('skull')} PK · карма ${formatNumber(player.pvp.karma)}`:player.pvp.status==='flagged'?`${icon('flag')} PvP · <span data-pvp-flag data-until="${Date.now()+player.pvp.flagRemainMs}">${formatDuration(player.pvp.flagRemainMs)}</span>`:'Мирный'} · PvP ${player.pvp.pvpKills} / PK ${player.pvp.pkKills}</small>`:''}
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
        <span class="mmo-ring" style="--hp:${row.hpPercent == null ? 100 : clampPercent(row.hpPercent)};--class:${classColor(row.className)}">
          <span class="mmo-portrait mini" style="--portrait:url('${classArtUrl(row.className, row.gender)}')"></span>
        </span>
        <small>${escapeHtml(row.isYou ? 'Ты' : row.name)}</small>
        <em>${row.share}%</em>
      </div>`).join('')}</div>
  </section>`;
}

function skillGlyph(skill,className='') {
  return l2SkillIcon(skill.name) || l2SkillIcon(skill.isHeal?'heal':skill.isShield?'shield':skill.isDebuff?'debuff':skill.isBuff?'buff':'damage');
}

/** Hotbar; `data-skill-cooldown` nodes are refreshed by the screen's ticker. */
export function hotbar(skills = [],{className=''}={}) {
  return `<div class="mmo-hotbar">${skills.map(skill => {
    const type = skill.isDamage ? 'damage' : skill.isHeal ? 'heal' : skill.isShield ? 'shield' : 'utility';
    const cost = skill.locked ? `${icon('lock')} ур. ${formatNumber(skill.needLevel)}` : skill.costHp > 0 ? `HP ${formatNumber(skill.costHp)}` : `MP ${formatNumber(skill.costMp)}`;
    return `
    <button type="button" class="mmo-skill boss-skill ${type}${skill.locked ? ' locked' : ''}${skill.tier > 1 ? ` tier-${skill.tier}` : ''}" data-skill="${skill.index}" ${skill.canUse ? '' : 'disabled'} title="${escapeHtml(skill.description)}${skill.tags?.length ? ` · ${escapeHtml(skill.tags.join(' · '))}` : ''}">
      <span class="mmo-skill-icon">${skillGlyph(skill,className)}</span>
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
    <div class="mmo-meter-row ${row.isYou ? 'you' : ''}" ${row.isYou ? '' : `data-player-card="${escapeHtml(row.userId)}"`} style="--fill:${((Number(row.damage) || 0) / top) * 100}%;--class:${classColor(row.className)}">
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
  if (loot?.buffPotion) rows.push(['🧪', 'Зелья-баффы', loot.buffPotion.guaranteedTop ? 'топ-3 — всегда' : `шанс ${loot.buffPotion.percent}%`]);
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
      <span class="boss-attack ${attack.target}" title="${escapeHtml(attack.description)}"><i>${icon(emojiIconName(attack.icon)||'swords')}</i><b>${escapeHtml(attack.name)}</b><small>${attack.target === 'all' ? 'по всем' : attack.target === 'multi' ? `по ${attack.count || 2}` : 'по одному'}</small></span>`).join('')}</div>
    ${log.length ? `<ol class="boss-attack-feed">${log.map((record, index) => `
      <li class="${index === 0 ? 'latest' : ''} ${record.hits.some(hit => hit.you) ? 'hit-you' : ''}">
        <i>${icon(emojiIconName(record.icon)||'swords')}</i>
        <div><strong>${escapeHtml(record.name)}</strong><small>${record.hits.map(hit => `${escapeHtml(hit.you ? 'ты' : hit.name)} −${formatNumber(hit.dmg)}${hit.killed ? ' 💀' : ''}`).join(' · ') || 'промах'}</small></div>
      </li>`).join('')}</ol>` : ''}
  </section>`;
}

/**
 * The encounter: minions / twins / heads as targets (`data-boss-target`), a
 * warning while an ultimate charges, and the latest fight events. `selected` is
 * the target id damage skills are aimed at ('boss' or a minion id).
 */
export function encounterPanel(boss, selected = 'boss') {
  const units = boss.minions || [];
  const events = (boss.events || []).slice(0, 3);
  if (!units.length && !events.length && !boss.charging) return '';

  const chargeAttack = (boss.attacks || []).find(attack => attack.key === boss.charging?.key);
  const unitRow = unit => `
    <button type="button" class="boss-unit ${unit.kind} ${selected === unit.id ? 'selected' : ''} ${unit.alive ? '' : 'dead'}" data-boss-target="${escapeHtml(unit.id)}" ${unit.alive ? '' : 'disabled'} title="${escapeHtml(unit.description)}">
      <i>${escapeHtml(unit.icon)}</i>
      <span><strong>${escapeHtml(unit.name)}${unit.required ? ' 🔒' : ''}</strong>
      <span class="boss-unit-bar"><b style="width:${clampPercent(unit.hpPercent)}%"></b></span></span>
      <em>${formatNumber(unit.currentHp)}</em>
    </button>`;

  return `
  <section class="mmo-frame boss-encounter">
    ${boss.charging ? `<div class="boss-charging" role="alert">⚠️ Босс накапливает «${escapeHtml(chargeAttack?.name || 'ультимейт')}»! Оглушение прервёт удар.</div>` : ''}
    ${units.length ? `<div class="mmo-section-title"><strong>Свита</strong><small>${boss.requiredAlive ? 'добей, чтобы убить босса' : 'ловят часть урона'}</small></div>
    <div class="boss-units">
      <button type="button" class="boss-unit boss ${selected === 'boss' ? 'selected' : ''}" data-boss-target="boss">
        <i>👹</i><span><strong>${escapeHtml(boss.nameCall || boss.name)}</strong>
        <span class="boss-unit-bar"><b style="width:${clampPercent(boss.hpPercent)}%"></b></span></span><em>${formatNumber(boss.currentHp)}</em>
      </button>
      ${units.map(unitRow).join('')}
    </div>` : ''}
    ${events.length ? `<ol class="boss-events">${events.map(event => `<li><i>${escapeHtml(event.icon)}</i><span>${escapeHtml(event.text)}</span></li>`).join('')}</ol>` : ''}
  </section>`;
}

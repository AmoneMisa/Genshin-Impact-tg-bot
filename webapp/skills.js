import {l2SkillIcon} from './art/l2-extra-art.js';
import { escapeHtml } from './escape-html.js';
import { materialIcon } from './material-icons.js';
import { menuArtFor } from './menu-art.js';
import {icon} from './icons.js';

export const SKILL_RUNES = Object.freeze({damage:icon('swords'),heal:icon('heart'),shield:icon('shield'),buff:icon('sparkles'),debuff:icon('cloud-fog'),restore:icon('droplet'),utility:icon('wand-sparkles')});

const REASONS = {
  invalid_skill: 'Навык не найден. Обнови список и попробуй снова.',
  no_skills: 'Сначала выбери игровой класс.',
  max_level: 'Навык уже улучшен до максимума.',
  already_learned: 'Это умение уже изучено.',
  level_too_low: 'Твой уровень ещё слишком низкий для этого умения.',
  not_enough_gold: 'Недостаточно золота.',
  not_enough_crystals: 'Недостаточно кристаллов.',
  not_enough_iron_ore: 'Недостаточно железной руды.',
  not_enough_sp: 'Недостаточно очков прокачки.',
  not_enough_items: 'Не хватает материалов для улучшения.',
  routes_locked: 'Пути улучшения открываются после 3-й профессии.',
  skill_level_too_low: 'Сначала подними уровень навыка до 5.',
  other_route_chosen: 'У навыка уже выбран другой путь. Сбрось его за плату.',
  max_route_level: 'Путь улучшен до максимума.',
  unknown_route: 'Такого пути нет.',
  no_route: 'У навыка нет выбранного пути.',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}


function usageText(usage) {
  const resource = usage.hp > 0 ? `${formatNumber(usage.hp)} HP` : usage.mp > 0 ? `${formatNumber(usage.mp)} MP` : 'бесплатно';
  const cooldown = usage.cooldownSeconds > 0 ? ` · ${usage.cooldownSeconds} сек. CD` : '';
  return `${resource}${cooldown}`;
}

function powerText(power) {
  if (!power || power.value === null) return power?.label || 'Эффект';
  return `${power.label}: ${formatNumber(power.value)}${power.unit}${power.hits > 1 ? ` ×${power.hits}` : ''}`;
}

function costText(cost) {
  if (!cost) return 'MAX';
  const base = `🪙 ${formatNumber(cost.gold)} · 💎 ${formatNumber(cost.crystals)} · ⛏️ ${formatNumber(cost.ironOre)} · ✦ ${formatNumber(cost.sp)} ОП`;
  return cost.items?.length ? `${base} · ${cost.items.map(item => `${item.icon} ${item.name} ${formatNumber(item.have)}/${formatNumber(item.need)}`).join(' · ')}` : base;
}

/** Enchant level as filled / empty pips. */
export function enchantPips(level, max) {
  const total = Math.max(0, Number(max) || 0);
  const filled = Math.min(total, Math.max(0, Number(level) || 0));
  return Array.from({ length: total }, (_, i) => `<i class="${i < filled ? 'on' : ''}${i === filled - 1 ? ' last' : ''}"></i>`).join('');
}

function routeBlock(skill, state) {
  const route = skill.route;
  if (!route) return '';
  if (!route.unlocked) {
    return skill.slot === 0
      ? '<div class="skill-route locked"><small>🔒 Пути улучшения (сила, цена, время, шанс, атрибут, защита) откроются после 3-й профессии.</small></div>'
      : '';
  }
  const options = state.routeOptions || [];
  const chosen = options.find(option => option.kind === route.kind);
  const picker = route.level > 0
    ? `<div class="skill-route-chosen"><b>${chosen?.icon || ''} ${escapeHtml(chosen?.label || '')} ${route.level}/${route.maxLevel}</b><small>${escapeHtml(chosen?.description || '')}</small></div>`
    : `<div class="skill-route-options">${options.map(option => `<button type="button" class="skill-route-option" data-skill-route="${skill.slot}" data-route-kind="${escapeHtml(option.kind)}" ${route.skillReady && route.canUpgrade ? '' : 'disabled'} title="${escapeHtml(option.description)}">${option.icon} ${escapeHtml(option.label)}</button>`).join('')}</div>`;
  const cost = route.cost
    ? `🪙 ${formatNumber(route.cost.gold)} · ✦ ${formatNumber(route.cost.sp)}${route.cost.items.length ? ` · ${route.cost.items.map(item => `${item.icon} ${item.have}/${item.need}`).join(' ')}` : ''}`
    : '';
  const next = route.level > 0 && route.cost
    ? `<button type="button" data-skill-route="${skill.slot}" data-route-kind="${escapeHtml(route.kind)}" ${route.canUpgrade ? '' : 'disabled'}>Путь → ${route.level + 1}: ${escapeHtml(cost)}</button>
       <button type="button" class="skill-route-reset" data-skill-route="${skill.slot}" data-route-kind="reset">Сбросить путь</button>`
    : (route.level === 0 && cost ? `<small>Первый уровень пути: ${escapeHtml(cost)}</small>` : '');
  return `<div class="skill-route">
    <small>Путь улучшения${route.skillReady ? '' : ` · нужен уровень навыка ${route.needSkillLevel}`}</small>
    ${picker}${next}
  </div>`;
}

function skillCard(skill, state) {
  const maxed = !skill.upgradeCost;
  const transition = skill.next
    ? `<div class="skill-transition"><span>${escapeHtml(powerText(skill.power))}</span><b>→</b><span>${escapeHtml(powerText(skill.next.power))}</span></div>
       <small>${escapeHtml(usageText(skill.usage))} → ${escapeHtml(usageText(skill.next.usage))}</small>`
    : `<div class="skill-transition"><span>${escapeHtml(powerText(skill.power))}</span></div><small>${escapeHtml(usageText(skill.usage))}</small>`;
  const missingItems = skill.upgradeCost?.items?.some(item => item.have < item.need);

  return `
    <article class="skill-card kind-${escapeHtml(skill.power?.kind || 'utility')} tier-${skill.tier} ${skill.locked ? 'locked' : ''}" data-skill-card="${skill.slot}">
      <div class="skill-head">
        <span class="skill-rune" aria-hidden="true">${l2SkillIcon(skill.name) || l2SkillIcon(skill.power?.kind) || SKILL_RUNES.utility}</span>
        <div><strong>${escapeHtml(skill.name)}</strong><small>${skill.locked ? `🔒 Откроется на ${skill.needLevel} уровне` : `Нужен уровень ${skill.needLevel}`}${skill.tier > 1 ? ` · ${skill.tier}-я профессия` : ''}</small></div>
        <span class="skill-level">+${skill.enchantLevel}</span>
      </div>
      <div class="skill-pips" aria-label="Улучшение ${skill.enchantLevel} из ${skill.maxEnchantLevel}">${enchantPips(skill.enchantLevel, skill.maxEnchantLevel)}</div>
      <p>${escapeHtml(skill.description)}</p>
      ${skill.tags?.length ? `<div class="skill-tags">${skill.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      ${transition}
      ${skill.learn ? `<div class="skill-upgrade-cost"><small>Умение не изучено</small><strong>✦ ${formatNumber(skill.learn.sp)} ОП</strong></div>
      <button type="button" data-skill-learn="${skill.slot}" ${skill.learn.canLearn ? '' : 'disabled'}>${skill.locked ? `Нужен ${skill.needLevel} уровень` : 'Изучить'}</button>` : `<div class="skill-upgrade-cost"><small>${maxed ? 'Максимальный уровень' : 'Улучшение'}</small><strong>${escapeHtml(costText(skill.upgradeCost))}</strong></div>
      <button type="button" data-skill-upgrade="${skill.slot}" ${maxed || !skill.canUpgrade ? 'disabled' : ''}>
        ${maxed ? 'MAX' : skill.canUpgrade ? `Улучшить до +${skill.enchantLevel + 1}` : missingItems ? 'Не хватает материалов' : 'Не хватает ресурсов'}
      </button>
      ${routeBlock(skill, state)}`}
    </article>`;
}

export async function openSkillsGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/skills');
  let pending = false;
  let feedbackText = '';
  let enchanted = null; // slot that just gained a level: plays the enchant burst once

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay skills-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass skills-panel">
      <header class="skills-head">
        <button class="overlay-close skills-round" type="button" aria-label="Закрыть">←</button>
        <h2>Навыки</h2>
        <span class="skills-round" aria-hidden="true">📖</span>
      </header>
      <div data-skills-content></div>
      <div class="skills-feedback" data-skills-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-skills-content]');
  const feedback = overlay.querySelector('[data-skills-feedback]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function bind() {
    content.querySelectorAll('[data-skill-route]').forEach(button => button.addEventListener('click', async () => {
      if (pending) return;
      pending = true;
      feedback.textContent = 'Улучшаем путь…';
      haptic('medium');
      try {
        const payload = await api('/api/skills/route', {
          method: 'POST',
          body: JSON.stringify({ slot: Number(button.dataset.skillRoute), route: button.dataset.routeKind }),
        });
        state = payload.skills;
        if (payload.state) renderState(payload.state);
        feedbackText = payload.route ? `${payload.skillName}: путь улучшен до ${payload.level}.` : `${payload.skillName}: путь сброшен.`;
        enchanted = Number(button.dataset.skillRoute);
        haptic('heavy');
      } catch (error) {
        if (error.payload?.skills) state = error.payload.skills;
        feedbackText = REASONS[error.payload?.reason] || error.message;
        haptic('light');
      } finally {
        pending = false;
        render();
      }
    }));
    content.querySelectorAll('[data-skill-learn]').forEach(button => button.addEventListener('click', async () => {
      if (pending) return;
      pending = true;
      haptic('medium');
      try {
        const payload = await api('/api/skills/learn', { method: 'POST', body: JSON.stringify({ slot: Number(button.dataset.skillLearn) }) });
        state = payload.skills;
        if (payload.state) renderState(payload.state);
        feedbackText = `Умение «${payload.name}» изучено.`;
        haptic('heavy');
      } catch (error) {
        if (error.payload?.skills) state = error.payload.skills;
        feedbackText = REASONS[error.payload?.reason] || error.message;
        haptic('light');
      } finally {
        pending = false;
        render();
      }
    }));
    content.querySelectorAll('[data-skill-upgrade]').forEach(button => button.addEventListener('click', async () => {
      if (pending) return;
      pending = true;
      feedback.textContent = 'Улучшаем навык…';
      haptic('medium');
      try {
        const payload = await api('/api/skills/enchant', {
          method: 'POST',
          body: JSON.stringify({ slot: Number(button.dataset.skillUpgrade) }),
        });
        state = payload.skills;
        if (payload.state) renderState(payload.state);
        feedbackText = `${payload.skillName} улучшен до +${payload.level}.`;
        enchanted = Number(button.dataset.skillUpgrade);
        haptic('heavy');
      } catch (error) {
        if (error.payload?.skills) state = error.payload.skills;
        feedbackText = REASONS[error.payload?.reason] || error.message;
        statusElement.textContent = `Навыки: ${feedbackText}`;
        haptic('light');
      } finally {
        pending = false;
        render();
      }
    }));
  }

  function render() {
    const inv = state.inventory || {};
    content.innerHTML = `
      <section class="skills-summary">
        <span class="skills-portrait" style="--art:url('${menuArtFor('profile', { className: state.className })}')" aria-hidden="true"></span>
        <div><small>Класс</small><strong>${escapeHtml(state.classTitle)}</strong><em>${state.routesUnlocked ? 'Уровень навыка и путь улучшения: сила, цена, время, шанс, атрибут, защита.' : 'Уровень навыка усиливает эффект и снижает цену и перезарядку. Новые навыки — за профессии.'}</em></div>
      </section>
      <div class="skills-resources">
        <span>🪙 ${formatNumber(inv.gold)}</span><span>💎 ${formatNumber(inv.crystals)}</span><span>⛏️ ${formatNumber(inv.ironOre)}</span><span class="sp">✦ ${formatNumber(inv.sp)} ОП</span>
      </div>
      ${state.materials?.length ? `<div class="skills-resources materials">${state.materials.map(item => `<span title="${escapeHtml(item.description)}">${materialIcon(item.key, item.icon)} ${escapeHtml(item.name)} ×${formatNumber(item.count)}</span>`).join('')}</div>` : ''}
      <div class="skills-list">
        ${state.skills?.length ? state.skills.map(skill => skillCard(skill, state)).join('') : '<div class="skills-empty">Для этого класса навыки пока недоступны.</div>'}
      </div>`;
    feedback.textContent = feedbackText;
    if (enchanted !== null) {
      content.querySelector(`[data-skill-card="${enchanted}"]`)?.classList.add('enchanted');
      enchanted = null;
    }
    bind();
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  statusElement.textContent = `Навыки: ${state.classTitle}`;
}

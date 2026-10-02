import { escapeHtml } from './escape-html.js';
import { menuArtFor } from './menu-art.js';

export const SKILL_RUNES = Object.freeze({ damage: '⚔️', heal: '✚', shield: '🛡️', utility: '✦' });

const REASONS = {
  invalid_skill: 'Навык не найден. Обнови список и попробуй снова.',
  no_skills: 'Сначала выбери игровой класс.',
  max_level: 'Навык уже улучшен до максимума.',
  not_enough_gold: 'Недостаточно золота.',
  not_enough_crystals: 'Недостаточно кристаллов.',
  not_enough_iron_ore: 'Недостаточно железной руды.',
  not_enough_sp: 'Недостаточно очков прокачки.',
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
  return `${power.label}: ${formatNumber(power.value)}${power.unit}`;
}

function costText(cost) {
  if (!cost) return 'MAX';
  return `🪙 ${formatNumber(cost.gold)} · 💎 ${formatNumber(cost.crystals)} · ⛏️ ${formatNumber(cost.ironOre)} · ✦ ${formatNumber(cost.sp)} ОП`;
}

/** Enchant level as filled / empty pips. */
export function enchantPips(level, max) {
  const total = Math.max(0, Number(max) || 0);
  const filled = Math.min(total, Math.max(0, Number(level) || 0));
  return Array.from({ length: total }, (_, i) => `<i class="${i < filled ? 'on' : ''}${i === filled - 1 ? ' last' : ''}"></i>`).join('');
}

function skillCard(skill) {
  const maxed = !skill.upgradeCost;
  const transition = skill.next
    ? `<div class="skill-transition"><span>${escapeHtml(powerText(skill.power))}</span><b>→</b><span>${escapeHtml(powerText(skill.next.power))}</span></div>
       <small>${escapeHtml(usageText(skill.usage))} → ${escapeHtml(usageText(skill.next.usage))}</small>`
    : `<div class="skill-transition"><span>${escapeHtml(powerText(skill.power))}</span></div><small>${escapeHtml(usageText(skill.usage))}</small>`;

  return `
    <article class="skill-card kind-${escapeHtml(skill.power?.kind || 'utility')}" data-skill-card="${skill.slot}">
      <div class="skill-head">
        <span class="skill-rune" aria-hidden="true">${SKILL_RUNES[skill.power?.kind] || SKILL_RUNES.utility}</span>
        <div><strong>${escapeHtml(skill.name)}</strong><small>Нужен уровень ${skill.needLevel}</small></div>
        <span class="skill-level">+${skill.enchantLevel}</span>
      </div>
      <div class="skill-pips" aria-label="Улучшение ${skill.enchantLevel} из ${skill.maxEnchantLevel}">${enchantPips(skill.enchantLevel, skill.maxEnchantLevel)}</div>
      <p>${escapeHtml(skill.description)}</p>
      ${transition}
      <div class="skill-upgrade-cost"><small>${maxed ? 'Максимальный уровень' : 'Улучшение'}</small><strong>${escapeHtml(costText(skill.upgradeCost))}</strong></div>
      <button type="button" data-skill-upgrade="${skill.slot}" ${maxed || !skill.canUpgrade ? 'disabled' : ''}>
        ${maxed ? 'MAX' : skill.canUpgrade ? `Улучшить до +${skill.enchantLevel + 1}` : 'Не хватает ресурсов'}
      </button>
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
        <div><small>Класс</small><strong>${escapeHtml(state.classTitle)}</strong><em>Каждый уровень усиливает эффект и снижает цену и перезарядку.</em></div>
      </section>
      <div class="skills-resources">
        <span>🪙 ${formatNumber(inv.gold)}</span><span>💎 ${formatNumber(inv.crystals)}</span><span>⛏️ ${formatNumber(inv.ironOre)}</span><span class="sp">✦ ${formatNumber(inv.sp)} ОП</span>
      </div>
      <div class="skills-list">
        ${state.skills?.length ? state.skills.map(skillCard).join('') : '<div class="skills-empty">Для этого класса навыки пока недоступны.</div>'}
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

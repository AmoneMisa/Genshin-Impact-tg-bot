import {dialogHeading} from './dialog-heading.js';
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
  not_enough_crystals: 'Недостаточно лунной росы.',
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
  const base = `🪙 ${formatNumber(cost.gold)} · 💧 ${formatNumber(cost.moonDew)} · ⛏️ ${formatNumber(cost.ironOre)} · ✦ ${formatNumber(cost.sp)} SP`;
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

function skillCard(skill, state, enchanted) {
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
        <div><strong>${escapeHtml(skill.name)}</strong><small>${skill.locked ? `🔒 Откроется на ${skill.needLevel} уровне` : `Нужен уровень ${skill.needLevel}`}${skill.tier > 1 ? ` · ${skill.tier - 1}-я профессия` : ''}</small></div>
        <span class="skill-level">+${skill.enchantLevel}</span>
      </div>
      <div class="skill-pips" aria-label="Улучшение ${skill.enchantLevel} из ${skill.maxEnchantLevel}">${enchantPips(skill.enchantLevel, skill.maxEnchantLevel)}</div>
      <details class="ui-disclosure" ${skill.slot === enchanted ? 'open' : ''}>
      <summary>Описание и улучшение</summary>
      <p>${escapeHtml(skill.description)}</p>
      ${skill.l2Level ? `<div class="skill-l2"><span>Skill Lv ${formatNumber(skill.l2Level)}/${formatNumber(skill.l2MaxLevel)}</span>${skill.l2Power ? `<span>Power ${formatNumber(skill.l2Power)}</span>` : ''}</div>` : ''}
      ${skill.tags?.length ? `<div class="skill-tags">${skill.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      ${transition}
      ${skill.learn ? `<div class="skill-upgrade-cost"><small>Умение не изучено</small><strong>✦ ${formatNumber(skill.learn.sp)} SP</strong></div>
      <button class="ui-button primary" type="button" data-skill-learn="${skill.slot}" ${skill.learn.canLearn ? '' : 'disabled'}>${skill.locked ? `Нужен ${skill.needLevel} уровень` : 'Изучить'}</button>` : `<div class="skill-upgrade-cost"><small>${maxed ? 'Максимальный уровень' : 'Улучшение'}</small><strong>${escapeHtml(costText(skill.upgradeCost))}</strong></div>
      ${skill.enchantChance<1?`<small class="skill-enchant-warning">${Math.round(skill.enchantChance*100)}% · При неудаче заточка сбрасывается. Mastery сохраняет уровень.</small>`:''}
      <button class="ui-button primary" type="button" data-skill-upgrade="${skill.slot}" ${maxed || !skill.canUpgrade ? 'disabled' : ''}>
        ${maxed ? 'MAX' : skill.canUpgrade ? `Улучшить до +${skill.enchantLevel + 1}` : missingItems ? 'Не хватает материалов' : 'Не хватает ресурсов'}
      </button>
      ${routeBlock(skill, state)}`}
      </details>
    </article>`;
}

export {openSkillBook as openSkillsGame} from './skill-book.js';

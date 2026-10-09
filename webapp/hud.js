import { menuArtFor } from './menu-art.js';
import { familyOf } from './class-family.js';

export const CLASS_SIGILS = Object.freeze({
  warrior: '⚔',
  mage: '✦',
  priest: '✧',
  archer: '➶',
  rogue: '†',
  berserk: '⚒',
  noClass: '◇',
});

function percent(current, max) {
  const safeMax = Math.max(1, Number(max) || 1);
  return Math.min(100, Math.max(0, (Number(current) || 0) / safeMax * 100));
}

function meter(getElement, formatNumber, id, current, max) {
  const text = getElement(`${id}-text`);
  const fill = getElement(`${id}-fill`);
  if (text) text.textContent = `${formatNumber(current)} / ${formatNumber(max)}`;
  if (fill) fill.style.width = `${percent(current, max)}%`;
}

export function renderPlayerHud({ state, getElement, formatNumber }) {
  const player = state.player || {};
  const context = state.context || {};
  const user = context.user || {};
  const firstName = user.firstName || user.username || 'Путешественник';

  // Optional nodes (older layouts had a chat badge and arena counter) are skipped when absent.
  const setText = (id, value) => { const node = getElement(id); if (node) node.textContent = value; };
  setText('hello', firstName);
  setText('level', player.level || 1);
  setText('class-name', player.classTitle || (player.className === 'noClass' ? 'Без класса' : player.className || 'Без класса'));
  setText('class-sigil', CLASS_SIGILS[familyOf(player.className)] || CLASS_SIGILS.noClass);
  // Painted class portrait in the crest; the sigil stays as the fallback glyph.
  const shell = getElement('class-sigil')?.parentElement;
  if (shell?.style) {
    shell.style.setProperty('--portrait', `url("${menuArtFor('profile', player)}")`);
    shell.classList.add('has-portrait');
  }
  setText('chat-badge', context.chatType || (String(context.chatId) === String(user.id) ? 'private' : 'group'));
  setText('arena-text', `Арена: ${player.arenaChances || 0}`);

  meter(getElement, formatNumber, 'hp', player.hp, player.maxHp);
  meter(getElement, formatNumber, 'mp', player.mp, player.maxMp);
  meter(getElement, formatNumber, 'cp', player.cp, player.maxCp);
  if (player.maxLevel && player.level >= player.maxLevel) {
    const text = getElement('xp-text');
    const fill = getElement('xp-fill');
    if (text) text.textContent = 'MAX';
    if (fill) fill.style.width = '100%';
  } else {
    meter(getElement, formatNumber, 'xp', player.currentExp, player.needExp);
  }
  // Vitality: the bar and the experience multiplier it gives (x5 rate times the stage bonus).
  const vitality = player.vitality;
  if (vitality) {
    const text = getElement('vit-text');
    const fill = getElement('vit-fill');
    if (text) text.textContent = `x${Math.round(vitality.rate * vitality.bonus * 10) / 10} · ${formatNumber(vitality.points)}`;
    if (fill) fill.style.width = `${percent(vitality.points, vitality.max)}%`;
    // Three charges light up with the bar stage: 1-2 one, 3 two, 4 (x3) all three.
    const lit = [0, 1, 1, 2, 3][vitality.stage] || 0;
    getElement('vit-cells')?.querySelectorAll('i').forEach((cell, index) => cell.classList.toggle('on', index < lit));
  }

  setText('sp-text', formatNumber(player.sp));
}

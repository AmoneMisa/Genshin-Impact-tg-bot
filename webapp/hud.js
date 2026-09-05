export const CLASS_SIGILS = Object.freeze({
  warrior: '⚔',
  mage: '✦',
  priest: '✧',
  archer: '➶',
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

  getElement('hello').textContent = `Привет, ${firstName}`;
  getElement('level').textContent = player.level || 1;
  getElement('class-name').textContent = player.classTitle || (player.className === 'noClass' ? 'Без класса' : player.className || 'Без класса');
  getElement('class-sigil').textContent = CLASS_SIGILS[player.className] || CLASS_SIGILS.noClass;
  getElement('chat-badge').textContent = context.chatType || (String(context.chatId) === String(user.id) ? 'private' : 'group');
  getElement('arena-text').textContent = `Арена: ${player.arenaChances || 0}`;

  meter(getElement, formatNumber, 'hp', player.hp, player.maxHp);
  meter(getElement, formatNumber, 'mp', player.mp, player.maxMp);
  meter(getElement, formatNumber, 'cp', player.cp, player.maxCp);
  meter(getElement, formatNumber, 'xp', player.currentExp, player.needExp);

  getElement('sp-text').textContent = formatNumber(player.sp);
}

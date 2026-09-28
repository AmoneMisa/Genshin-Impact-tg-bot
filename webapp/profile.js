import { menuArtFor } from './menu-art.js';

const REASONS = {
  unknown_class: 'Такого класса нет.',
  same_class: 'Этот класс уже выбран.',
  class_cooldown: 'Класс можно менять только раз в неделю.',
  unknown_gender: 'Недопустимое значение пола.',
};

const CLASS_ICONS = {
  warrior: '🛡️',
  mage: '🪄',
  priest: '✨',
  archer: '🏹',
  noClass: '🧭',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.ceil((Number(ms) || 0) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days) return `${days} д. ${hours} ч.`;
  if (hours) return `${hours} ч. ${minutes} мин.`;
  return `${minutes} мин.`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stat(label, value, icon) {
  return `<article><span>${icon}</span><div><small>${label}</small><strong>${formatNumber(value)}</strong></div></article>`;
}

export function classArt(className, gender) {
  return menuArtFor('profile', { className, gender });
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

export async function openPlayerProfile({ api, renderState, haptic, statusElement, context }) {
  let profile = await api('/api/profile');
  let pending = false;
  let selected = profile.currentClass.name === 'noClass' ? profile.classes[0]?.name : null;
  const isPrivateContext = context?.chatId != null
    && context?.user?.id != null
    && String(context.chatId) === String(context.user.id);

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay profile-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass profile-panel">
      <header class="profile-head">
        <button class="overlay-close profile-round" type="button" aria-label="Закрыть">←</button>
        <h2>Персонаж</h2>
        <span class="profile-round" aria-hidden="true">⚜</span>
      </header>
      <div data-profile-content></div>
      <div class="utility-feedback" data-profile-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-profile-content]');
  const feedback = overlay.querySelector('[data-profile-feedback]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function classCard(item) {
    const active = item.name === profile.currentClass.name;
    const chosen = item.name === selected;
    return `
      <button type="button" class="profile-class-card ${active ? 'active' : ''} ${chosen ? 'selected' : ''}" data-profile-select="${escapeHtml(item.name)}" style="--art:url('${classArt(item.name, profile.gender)}')" ${active ? 'aria-current="true"' : ''}>
        <span class="profile-class-art" aria-hidden="true"></span>
        <span class="profile-class-badge">${CLASS_ICONS[item.name] || '⚔️'}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${active ? 'Текущий' : chosen ? 'Выбран' : `⚔ ${formatNumber(item.stats.attack)} · 🛡 ${formatNumber(item.stats.defence)}`}</small>
      </button>`;
  }

  function chosenHtml() {
    const item = profile.classes.find(entry => entry.name === selected);
    if (!item || item.name === profile.currentClass.name) return '';
    const blocked = pending || profile.classChangeRemainingMs > 0;
    return `
      <section class="profile-chosen">
        <p>${escapeHtml(item.description)}</p>
        <div class="profile-class-stats">
          <span>⚔ ${formatNumber(item.stats.attack)}</span><span>🛡 ${formatNumber(item.stats.defence)}</span>
          <span>❤ ${formatNumber(item.stats.maxHp)}</span><span>⚡ ${formatNumber(item.stats.speed)}</span>
        </div>
        <button type="button" class="profile-confirm" data-profile-class="${escapeHtml(item.name)}" ${blocked ? 'disabled' : ''}>Стать: ${escapeHtml(item.title)}</button>
      </section>`;
  }

  function render() {
    const current = profile.currentClass;
    const cooldown = profile.classChangeRemainingMs > 0
      ? `Следующая смена через ${formatDuration(profile.classChangeRemainingMs)}`
      : current.name === 'noClass' ? 'Первый класс можно выбрать сразу' : 'Класс можно сменить сейчас';
    const genderLocked = pending || isPrivateContext;

    content.innerHTML = `
      <section class="profile-hero" style="--art:url('${classArt(current.name, profile.gender)}')">
        <div class="profile-hero-art" aria-hidden="true"></div>
        <div class="profile-hero-flash" aria-hidden="true"></div>
        <div class="profile-hero-copy">
          <small>Ур. ${profile.level}</small>
          <h3>${escapeHtml(current.title)}</h3>
          <span>${cooldown}</span>
        </div>
        <div class="profile-genders" role="group" aria-label="Пол персонажа">
          ${['male', 'female'].map(gender => `
            <button type="button" data-profile-gender="${gender}" class="${profile.gender === gender ? 'active' : ''}" style="--art:url('${classArt(current.name, gender)}')" ${genderLocked ? 'disabled' : ''} aria-label="${gender === 'male' ? 'Мужской' : 'Женский'}"><i>${gender === 'male' ? '♂' : '♀'}</i></button>`).join('')}
        </div>
      </section>
      ${isPrivateContext ? '<p class="profile-hint">Смена пола доступна только из группового чата.</p>' : ''}
      <section class="profile-stats">
        ${stat('Атака', current.stats.attack, '⚔️')}
        ${stat('Защита', current.stats.defence, '🛡️')}
        ${stat('HP', current.stats.maxHp, '❤')}
        ${stat('MP', current.stats.maxMp, '🔹')}
        ${stat('CP', current.stats.maxCp, '🔸')}
        ${stat('Скорость', current.stats.speed, '⚡')}
      </section>
      <section class="profile-classes">
        <div class="profile-section-title"><strong>Боевые классы</strong></div>
        <div class="profile-class-list">${profile.classes.map(classCard).join('')}</div>
        ${chosenHtml()}
      </section>`;
    bind();
  }

  // Transformation: the hero flashes white, then settles on the new portrait.
  async function transform() {
    const hero = content.querySelector('.profile-hero');
    if (!hero || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    hero.classList.add('transforming');
    await wait(450);
  }

  function bind() {
    content.querySelectorAll('[data-profile-select]').forEach(button => {
      button.addEventListener('click', () => {
        if (button.dataset.profileSelect === profile.currentClass.name) return;
        selected = button.dataset.profileSelect;
        feedback.textContent = '';
        haptic('light');
        render();
      });
    });
    content.querySelectorAll('[data-profile-class]').forEach(button => {
      button.addEventListener('click', () => changeClass(button.dataset.profileClass));
    });
    content.querySelectorAll('[data-profile-gender]').forEach(button => {
      button.addEventListener('click', () => changeGender(button.dataset.profileGender));
    });
  }

  async function changeClass(className) {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Меняем класс…';
    haptic('heavy');
    try {
      const payload = await api('/api/profile/class', {
        method: 'POST',
        body: JSON.stringify({ className }),
      });
      await transform();
      profile = payload.profile;
      selected = null;
      if (payload.state) renderState(payload.state);
      feedback.textContent = `Класс изменён: ${payload.classTitle}.`;
      window.setTimeout(() => content.querySelector('.profile-hero')?.classList.add('arrived'), 20);
      statusElement.textContent = `Персонаж: выбран класс ${payload.classTitle}.`;
      haptic('medium');
    } catch (error) {
      const base = REASONS[error.payload?.reason] || error.message;
      const remain = error.payload?.cooldownRemainingMs ? ` Осталось ${formatDuration(error.payload.cooldownRemainingMs)}.` : '';
      feedback.textContent = `${base}${remain}`;
      haptic('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      render();
    }
  }

  async function changeGender(gender) {
    if (isPrivateContext) {
      feedback.textContent = 'Смена пола доступна только из группового чата.';
      haptic('light');
      return;
    }
    if (pending || gender === profile.gender) return;
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Сохраняем…';
    try {
      const payload = await api('/api/profile/gender', {
        method: 'POST',
        body: JSON.stringify({ gender }),
      });
      await transform();
      profile = payload.profile;
      if (payload.state) renderState(payload.state);
      feedback.textContent = 'Пол персонажа сохранён.';
      window.setTimeout(() => content.querySelector('.profile-hero')?.classList.add('arrived'), 20);
      statusElement.textContent = 'Профиль персонажа обновлён.';
      haptic('light');
    } catch (error) {
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      render();
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

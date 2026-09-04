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

export async function openPlayerProfile({ api, renderState, haptic, statusElement }) {
  let profile = await api('/api/profile');
  let pending = false;
  let selected = profile.currentClass.name === 'noClass' ? profile.classes[0]?.name : null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay profile-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass profile-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">CHARACTER · MONGO</div><h2>Персонаж</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
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
    const blocked = pending || active || profile.classChangeRemainingMs > 0;
    return `
      <article class="profile-class-card ${active ? 'active' : ''} ${chosen ? 'selected' : ''}">
        <button type="button" class="profile-class-main" data-profile-select="${escapeHtml(item.name)}" ${active ? 'disabled' : ''}>
          <span>${CLASS_ICONS[item.name] || '⚔️'}</span>
          <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></div>
          <i>${active ? 'Текущий' : chosen ? 'Выбран' : '›'}</i>
        </button>
        <div class="profile-class-stats">
          <span>⚔ ${formatNumber(item.stats.attack)}</span>
          <span>🛡 ${formatNumber(item.stats.defence)}</span>
          <span>❤ ${formatNumber(item.stats.maxHp)}</span>
          <span>⚡ ${formatNumber(item.stats.speed)}</span>
        </div>
        ${chosen && !active ? `<button type="button" class="profile-confirm" data-profile-class="${escapeHtml(item.name)}" ${blocked ? 'disabled' : ''}>Выбрать ${escapeHtml(item.title)}</button>` : ''}
      </article>`;
  }

  function render() {
    const current = profile.currentClass;
    const cooldown = profile.classChangeRemainingMs > 0
      ? `Следующая смена через ${formatDuration(profile.classChangeRemainingMs)}`
      : current.name === 'noClass' ? 'Первый класс можно выбрать сразу' : 'Класс можно сменить сейчас';

    content.innerHTML = `
      <section class="profile-current">
        <div class="profile-current-icon">${CLASS_ICONS[current.name] || '🧭'}</div>
        <div><small>LVL ${profile.level} · ТЕКУЩИЙ КЛАСС</small><h3>${escapeHtml(current.title)}</h3><p>${cooldown}</p></div>
      </section>
      <section class="profile-stats">
        ${stat('Атака', current.stats.attack, '⚔️')}
        ${stat('Защита', current.stats.defence, '🛡️')}
        ${stat('HP', current.stats.maxHp, '❤')}
        ${stat('MP', current.stats.maxMp, '🔹')}
        ${stat('CP', current.stats.maxCp, '🔸')}
        ${stat('Скорость', current.stats.speed, '⚡')}
      </section>
      <section class="profile-gender">
        <div><strong>Пол персонажа</strong><small>Используется для классовых артов и старого профиля</small></div>
        <div>
          <button type="button" data-profile-gender="male" class="${profile.gender === 'male' ? 'active' : ''}" ${pending ? 'disabled' : ''}>♂ Мужской</button>
          <button type="button" data-profile-gender="female" class="${profile.gender === 'female' ? 'active' : ''}" ${pending ? 'disabled' : ''}>♀ Женский</button>
        </div>
      </section>
      <section class="profile-classes">
        <div class="profile-section-title"><strong>Боевые классы</strong><span>${cooldown}</span></div>
        <div class="profile-class-list">${profile.classes.map(classCard).join('')}</div>
      </section>`;
    bind();
  }

  function bind() {
    content.querySelectorAll('[data-profile-select]').forEach(button => {
      button.addEventListener('click', () => {
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
      profile = payload.profile;
      selected = null;
      if (payload.state) renderState(payload.state);
      feedback.textContent = `Класс изменён: ${payload.classTitle}.`;
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
    if (pending || gender === profile.gender) return;
    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Сохраняем…';
    try {
      const payload = await api('/api/profile/gender', {
        method: 'POST',
        body: JSON.stringify({ gender }),
      });
      profile = payload.profile;
      if (payload.state) renderState(payload.state);
      feedback.textContent = 'Пол персонажа сохранён.';
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

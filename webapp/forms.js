const REASONS = {
  invalid_fields: 'Не удалось прочитать поля анкеты.',
  invalid_field: 'В анкете найдено неизвестное поле.',
  invalid_value: 'Значение поля должно быть текстом.',
  value_too_long: 'Одно из значений слишком длинное.',
  member_not_found: 'Твой профиль не найден в этом чате.',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function profileFields(profile) {
  if (!profile.fields?.length) {
    return '<div class="forms-empty">Анкета пока не заполнена.</div>';
  }
  return profile.fields.map(field => `
    <div class="forms-profile-field">
      <small>${escapeHtml(field.label)}</small>
      <strong>${escapeHtml(field.value)}</strong>
    </div>`).join('');
}

export async function openFormsGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/forms');
  let tab = 'mine';
  let selectedUserId = state.profiles.find(profile => profile.isCurrent)?.userId || state.profiles[0]?.userId || null;
  let pending = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay forms-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass forms-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">GROUP PROFILES · MONGO</div><h2>Анкеты</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <div class="forms-tabs">
        <button type="button" data-forms-tab="mine">Моя анкета</button>
        <button type="button" data-forms-tab="group">Участники</button>
      </div>
      <div data-forms-content></div>
      <div class="forms-feedback" data-forms-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-forms-content]');
  const feedback = overlay.querySelector('[data-forms-feedback]');

  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function renderMine() {
    content.innerHTML = `
      <section class="forms-intro">
        <span>📝</span>
        <div><strong>Твоя анкета Genshin</strong><small>Это те же данные, которые раньше заполнялись через /form. Пустое поле очищает сохранённое значение.</small></div>
      </section>
      <div class="forms-grid">
        ${state.fields.map(field => `
          <label class="forms-field">
            <span>${escapeHtml(field.label)}</span>
            <input type="text" maxlength="256" data-form-field="${escapeHtml(field.key)}" value="${escapeHtml(field.value)}" autocomplete="off" />
          </label>`).join('')}
      </div>
      <button type="button" class="forms-save" data-forms-save>
        <span>✓</span><div><strong>Сохранить анкету</strong><small>Изменения сохраняются в Mongo и видны участникам группы</small></div>
      </button>`;

    content.querySelector('[data-forms-save]')?.addEventListener('click', save);
  }

  function renderGroup() {
    const selected = state.profiles.find(profile => profile.userId === selectedUserId) || state.profiles[0] || null;
    if (selected && !selectedUserId) selectedUserId = selected.userId;

    content.innerHTML = `
      <div class="forms-members">
        ${state.profiles.map(profile => `
          <button type="button" class="forms-member ${profile.userId === selected?.userId ? 'active' : ''}" data-profile-id="${escapeHtml(profile.userId)}">
            <span>${profile.isCurrent ? '★' : '•'}</span><strong>${escapeHtml(profile.name)}</strong><small>${profile.fields.length} полей</small>
          </button>`).join('') || '<div class="forms-empty">Нет доступных участников.</div>'}
      </div>
      ${selected ? `
        <section class="forms-profile-card">
          <header><div><small>АНКЕТА УЧАСТНИКА</small><strong>${escapeHtml(selected.name)}</strong></div>${selected.isCurrent ? '<span>Это ты</span>' : ''}</header>
          <div class="forms-profile-fields">${profileFields(selected)}</div>
        </section>` : ''}`;

    content.querySelectorAll('[data-profile-id]').forEach(button => {
      button.addEventListener('click', () => {
        selectedUserId = button.dataset.profileId;
        haptic('light');
        renderGroup();
      });
    });
  }

  function renderTabs() {
    overlay.querySelectorAll('[data-forms-tab]').forEach(button => {
      button.classList.toggle('active', button.dataset.formsTab === tab);
    });
  }

  function renderAll() {
    renderTabs();
    if (tab === 'mine') renderMine();
    else renderGroup();
  }

  async function save() {
    if (pending) return;
    const fields = {};
    content.querySelectorAll('[data-form-field]').forEach(input => {
      fields[input.dataset.formField] = input.value;
    });

    pending = true;
    overlay.classList.add('busy');
    feedback.textContent = 'Сохраняем анкету…';
    haptic('medium');
    try {
      const payload = await api('/api/forms/save', {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });
      state = payload.forms;
      if (payload.state) renderState(payload.state);
      feedback.textContent = 'Анкета сохранена.';
      statusElement.textContent = 'Анкета обновлена и сохранена в Mongo.';
      haptic('light');
      renderAll();
    } catch (error) {
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      if (error.payload?.forms) state = error.payload.forms;
      haptic('light');
      renderAll();
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  overlay.querySelectorAll('[data-forms-tab]').forEach(button => {
    button.addEventListener('click', () => {
      tab = button.dataset.formsTab;
      feedback.textContent = '';
      haptic('light');
      renderAll();
    });
  });

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

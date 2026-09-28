const MAX_LENGTH = 3000;

export async function openFeedbackGame({ api, haptic, statusElement }) {
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay feedback-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass feedback-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">CONTACT · MINI APP</div><h2>Связь с разработчиком</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <div class="feedback-card">
        <div class="feedback-intro">
          <span>💬</span>
          <div><strong>Баг, идея или вопрос?</strong><p>Сообщение уйдёт разработчику вместе с вашим Telegram ID и ID игрового чата, чтобы можно было понять контекст.</p></div>
        </div>
        <label class="feedback-field">
          <span>Сообщение</span>
          <textarea rows="8" maxlength="${MAX_LENGTH}" placeholder="Опишите, что произошло или что хотелось бы изменить…" data-feedback-message></textarea>
        </label>
        <div class="feedback-meta"><span data-feedback-count>0 / ${MAX_LENGTH}</span><span>Ответ по-прежнему можно получить через Telegram.</span></div>
        <button type="button" class="feedback-submit" data-feedback-submit>Отправить</button>
        <div class="feedback-result" data-feedback-result hidden></div>
      </div>
    </div>`;

  const textarea = overlay.querySelector('[data-feedback-message]');
  const count = overlay.querySelector('[data-feedback-count]');
  const submit = overlay.querySelector('[data-feedback-submit]');
  const result = overlay.querySelector('[data-feedback-result]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };

  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  textarea.addEventListener('input', () => {
    count.textContent = `${textarea.value.length} / ${MAX_LENGTH}`;
  });

  submit.addEventListener('click', async () => {
    const message = textarea.value.trim();
    if (!message) {
      result.hidden = false;
      result.className = 'feedback-result error';
      result.textContent = 'Сначала напишите сообщение.';
      textarea.focus();
      return;
    }

    submit.disabled = true;
    result.hidden = true;
    try {
      haptic('medium');
      await api('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      textarea.value = '';
      count.textContent = `0 / ${MAX_LENGTH}`;
      result.hidden = false;
      result.className = 'feedback-result success';
      result.textContent = 'Сообщение отправлено разработчику.';
      statusElement.textContent = 'Feedback отправлен разработчику.';
      haptic('light');
    } catch (error) {
      result.hidden = false;
      result.className = 'feedback-result error';
      result.textContent = error.message;
      statusElement.textContent = `Feedback: ${error.message}`;
    } finally {
      submit.disabled = false;
    }
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  textarea.focus();
  statusElement.textContent = 'Форма обратной связи открыта.';
}

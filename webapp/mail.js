import { escapeHtml } from './escape-html.js';

// Mail (rewards and letters) and the promo code field. Promo rewards are not
// applied on redeem: they arrive as a letter and are claimed from the mail.

const KIND_LABELS = { gold: ['🪙', 'золота'], crystals: ['💎', 'кристаллов'], luckCoins: ['🍀', 'монет удачи'], ironOre: ['⛏️', 'железной руды'], bonusChances: ['🎁', 'попыток бонуса'] };

export function rewardsHtml(rewards = []) {
  return rewards.map(reward => {
    const [icon, label] = KIND_LABELS[reward.kind] || ['🎁', reward.kind];
    return `<span class="mail-reward">${icon} ${new Intl.NumberFormat('ru-RU').format(reward.amount)} <small>${escapeHtml(label)}</small></span>`;
  }).join('');
}

function daysLeft(expiresAt) {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000));
}

function shell({ title, icon, body }) {
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay mail-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass feedback-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>${title}</h2>
        <span class="ds-round" aria-hidden="true">${icon}</span>
      </header>
      ${body}
    </div>`;
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  return overlay;
}

/** The promo field. Calls `onRedeemed(mail)` so a mailbox open behind it can refresh. */
function promoFormHtml() {
  return `
    <div class="feedback-card mail-promo">
      <label class="feedback-field">
        <span>Промокод</span>
        <input type="text" maxlength="40" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Например, WELCOME" data-promo-code />
      </label>
      <button type="button" class="feedback-submit" data-promo-submit>Применить</button>
      <div class="feedback-result" data-promo-result hidden></div>
    </div>`;
}

function bindPromoForm(root, { api, haptic, statusElement, onRedeemed = () => {} }) {
  const input = root.querySelector('[data-promo-code]');
  const submit = root.querySelector('[data-promo-submit]');
  const result = root.querySelector('[data-promo-result]');
  const show = (kind, text) => {
    result.hidden = false;
    result.className = `feedback-result ${kind}`;
    result.textContent = text;
  };
  const run = async () => {
    const code = input.value.trim();
    if (!code) return show('error', 'Введи промокод.');
    submit.disabled = true;
    try {
      haptic?.('medium');
      const payload = await api('/api/promo/redeem', { method: 'POST', body: JSON.stringify({ code }) });
      input.value = '';
      show('success', payload.message);
      if (statusElement) statusElement.textContent = payload.message;
      haptic?.('light');
      onRedeemed(payload.mail);
    } catch (error) {
      show('error', error.payload?.error || error.message);
    } finally {
      submit.disabled = false;
    }
  };
  submit.addEventListener('click', run);
  input.addEventListener('keydown', event => { if (event.key === 'Enter') run(); });
}

/** Settings → Промокод: only the code field. */
export async function openPromoGame({ api, haptic, statusElement }) {
  const overlay = shell({ title: 'Промокод', icon: '🎟️', body: promoFormHtml() });
  bindPromoForm(overlay, { api, haptic, statusElement });
  overlay.querySelector('[data-promo-code]').focus();
}

export async function openMailGame({ api, haptic, statusElement }) {
  let mail = await api('/api/mail');
  const overlay = shell({
    title: 'Почта',
    icon: '✉️',
    body: `${promoFormHtml()}<div class="mail-list" data-mail-list></div><div class="feedback-result" data-mail-result hidden></div>`,
  });
  const list = overlay.querySelector('[data-mail-list]');
  const result = overlay.querySelector('[data-mail-result]');

  function render() {
    const claimAll = mail.pending > 1 ? `<button type="button" class="feedback-submit" data-mail-claim-all>Забрать всё (${mail.pending})</button>` : '';
    list.innerHTML = mail.letters.length ? `${claimAll}${mail.letters.map(letter => `
      <article class="mail-letter ${letter.status}">
        <div class="mail-head"><strong>${escapeHtml(letter.title)}</strong><small>${letter.status === 'pending' ? `ещё ${daysLeft(letter.expiresAt)} дн.` : letter.status === 'claimed' ? 'получено' : ''}</small></div>
        ${letter.text ? `<p>${escapeHtml(letter.text)}</p>` : ''}
        ${letter.rewards.length ? `<div class="mail-rewards">${rewardsHtml(letter.rewards)}</div>` : ''}
        ${letter.status === 'pending' ? `<button type="button" class="feedback-submit" data-mail-claim="${escapeHtml(letter.id)}">Забрать</button>` : ''}
      </article>`).join('')}` : '<p class="mail-empty">Писем пока нет.</p>';
    list.querySelector('[data-mail-claim-all]')?.addEventListener('click', () => claim(null));
    list.querySelectorAll('[data-mail-claim]').forEach(button => button.addEventListener('click', () => claim(button.dataset.mailClaim)));
  }

  async function claim(id) {
    try {
      haptic?.('medium');
      const payload = await api('/api/mail/claim', { method: 'POST', body: JSON.stringify(id ? { id } : {}) });
      mail = payload.mail;
      result.hidden = false;
      result.className = 'feedback-result success';
      result.textContent = payload.message;
      if (statusElement) statusElement.textContent = payload.message;
    } catch (error) {
      if (error.payload?.mail) mail = error.payload.mail;
      result.hidden = false;
      result.className = 'feedback-result error';
      result.textContent = error.payload?.reason === 'already_claimed' ? 'Награда уже получена.' : error.message;
    }
    render();
  }

  bindPromoForm(overlay, { api, haptic, statusElement, onRedeemed: next => { if (next) mail = next; render(); } });
  render();
}

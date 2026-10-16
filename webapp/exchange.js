import { icon } from './icons.js';
import { escapeHtml } from './escape-html.js';
import { createGamePopup } from './game-popup.js';
import { luckCoinHtml } from './currency-icons.js';
import { formatNumber } from './format.js';

const REASONS = {
  inventory_missing: 'Инвентарь персонажа недоступен.',
  too_many_pending: 'Слишком много неоплаченных счетов. Оплати открытый или подожди час.',
  invoice_failed: 'Telegram не смог создать счёт. Попробуй чуть позже.',
  unknown_pack: 'Такого набора больше нет.',
};



/** Whole units within [1, max]; empty when nothing is affordable. */
export function clampAmount(value, max) {
  const limit = Math.max(0, Math.floor(Number(max) || 0));
  if (!limit) return 0;
  return Math.max(1, Math.min(limit, Math.floor(Number(value) || 0)));
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

/** Opens a Stars invoice in Telegram; resolves with 'paid' | 'cancelled' | 'failed' | 'pending' | 'unsupported'. */
function openInvoice(url) {
  const tg = window.Telegram?.WebApp;
  if (typeof tg?.openInvoice !== 'function') return Promise.resolve('unsupported');
  return new Promise(resolve => tg.openInvoice(url, resolve));
}




const PACK_ART = new Set(['pouch','sack','casket','chest','trove','vault']);
function coinPackHtml(id) {
  if (!PACK_ART.has(id)) return luckCoinHtml(80);
  return `<img class="ex-pack-art" src="/art/col-topup/${id}-128.webp" srcset="/art/col-topup/${id}-128.webp 1x, /art/col-topup/${id}-256.webp 2x" width="96" height="96" alt="" loading="lazy" decoding="async">`;
}

export function starsHtml(stars) {
  if (!stars?.packs?.length) return '';
  const first = stars.firstPurchase;
  return `
    <section class="ex-stars" aria-label="Купить монеты удачи за Telegram Stars">
      <header><h3>Выберите пакет</h3><small>Telegram Stars</small></header>
      ${first ? `<p class="ex-first">Бонус первой покупки: до +${formatNumber(Math.max(...stars.packs.map(pack => pack.firstBonus)))}&nbsp;${luckCoinHtml(16)}</p>` : ''}
      <div class="ex-packs">
        ${stars.packs.map(pack => `
          <button type="button" class="ex-pack" data-star-pack="${escapeHtml(pack.id)}" aria-label="${escapeHtml(pack.title)}: ${formatNumber(pack.coins)} монет удачи за ${pack.stars} звёзд">
            ${coinPackHtml(pack.id)}
            <span class="ex-pack-coins">${luckCoinHtml(26)}<strong>${formatNumber(pack.coins)}</strong></span>
            <em class="ex-pack-bonus ${first && pack.firstBonus ? 'first' : ''}">${first && pack.firstBonus ? `+${formatNumber(pack.firstBonus)} бонус` : pack.bonusPercent ? `+${pack.bonusPercent}%` : '&nbsp;'}</em>
            <span class="ex-pack-price">${icon('star')}<b>${formatNumber(pack.stars)}</b></span>
          </button>`).join('')}
      </div>
      <p class="ex-shield">CoL — монеты удачи. Баланс пополняется за Telegram Stars. Покупки и обмен CoL на адену доступны в магазине.</p>
    </section>`;
}

export async function openExchangeGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/exchange');
  let pending = false;


  const popup = createGamePopup({
    title: 'Пополнение CoL', className: 'exchange-overlay', panelClass: 'glass exchange-panel',
    canClose: () => !pending,
    body: '<div data-exchange-content></div><div class="utility-feedback" data-exchange-feedback aria-live="polite"></div>',
  });
  const {overlay} = popup;
  const content = overlay.querySelector('[data-exchange-content]');
  const feedback = overlay.querySelector('[data-exchange-feedback]');
  function render() {
    content.innerHTML = starsHtml(state.stars) || '<p>Пополнение временно недоступно.</p>';
    content.querySelectorAll('[data-star-pack]').forEach(button => {
      button.disabled = pending;
      button.addEventListener('click', () => buyWithStars(button.dataset.starPack));
    });
  }

  // Telegram confirms a payment a moment before the coins land, so wait for them.
  async function waitForCoins(before) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const fresh = await api('/api/exchange');
      if (fresh.luckCoins > before) return fresh;
      await wait(1500);
    }
    return null;
  }

  async function buyWithStars(packId) {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy');
    render();
    feedback.textContent = '';
    haptic('medium');
    try {
      const invoice = await api('/api/stars/invoice', { method: 'POST', body: JSON.stringify({ packId }) });
      const status = await openInvoice(invoice.url);
      if (status === 'unsupported') {
        feedback.textContent = 'Обнови Telegram: эта версия не умеет оплату Звёздами.';
      } else if (status === 'cancelled') {
        feedback.textContent = '';
      } else if (status === 'failed') {
        feedback.textContent = 'Платёж не прошёл. Звёзды не списаны.';
      } else {
        feedback.textContent = 'Платёж принят, начисляем монеты удачи…';
        const before = state.luckCoins;
        const fresh = await waitForCoins(before);
        if (fresh) {
          state = fresh;
          renderState(await api('/api/bootstrap'));
          const gained = fresh.luckCoins - before;
          feedback.textContent = `Готово! Начислено ${formatNumber(gained)} монет удачи.`;
          statusElement.textContent = `Обменник: куплено ${formatNumber(gained)} монет удачи за Звёзды.`;
          haptic('heavy');
        } else {
          feedback.textContent = 'Платёж получен, монеты появятся в течение минуты. Если нет, напиши /paysupport.';
        }
      }
    } catch (error) {
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      render();
    }
  }

  render();
  popup.show();
}

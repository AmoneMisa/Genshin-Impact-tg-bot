import {materialIcon} from './material-icons.js';
import {shotIcon} from './art/painted-icon-art.js';
import { escapeHtml } from './escape-html.js';
import { buildArtUrl } from './art/builds-art.js';
import {flaskHtml} from './inventory.js';
import { l2IconHtml, L2_CATEGORY_ART, L2_MATERIAL_ART, L2_JEWELRY_ART } from './art/l2-icon-art.js';
import { openMerchantsGame } from './merchants.js';
import { openExchangeGame } from './exchange.js';
import { openBonusGame } from './bonus.js';
import { openLuckShopGame } from './luck-shop.js';
import { openAuctionGame } from './auction.js';
import {icon} from './icons.js';

// Keep the category window underneath the goods: closing a child returns here.
export async function openShopGame(options) {
  const merchant = (id, group) => () => openMerchantsGame({ ...options, initialMerchant: id, initialGroup: group });
  const goods = category => () => openShopGoods({ ...options, initialCategory: category });
  const categories = [
    ['armor', 'Броня', 'icon-armor_elven_tunic_i00', merchant('armor')],
    ['weapons', 'Оружие', L2_CATEGORY_ART.full, merchant('weapons')],
    ['jewelry', 'Бижа', L2_JEWELRY_ART['blue coral ring'], merchant('jewelry')],
    ['shots', 'Соски', L2_MATERIAL_ART.soulshot_S, goods('shots')],
    ['arrows', 'Стрелы', L2_MATERIAL_ART.l2_17, merchant('weapons', 'ammo')],
    ['potions', 'Банки', L2_CATEGORY_ART.consumable, goods('player')],
    ['crystals', 'Кристаллы', L2_CATEGORY_ART.crystal, goods('soul')],
    // High Five item 3276, Mark of Champion (Destroyer profession): icon.etc_jewel_gold_i00.
    ['quest', 'Квест', 'icon-etc_jewel_gold_i00', null, 'Квестовые товары пока не продаются.'],
    ['dyes', 'Краски', L2_CATEGORY_ART.dye, merchant('mammon', 'dye')],
    ['scrolls', 'Свитки', L2_CATEGORY_ART.scroll, merchant('mammon', 'scroll')],
    ['life', 'ЛС', L2_CATEGORY_ART.lifestone, goods('stones')],
    ['resources', 'Ресурсы', L2_CATEGORY_ART.material, merchant('alchemist')],
    ['bonus', 'Бонус', L2_MATERIAL_ART.l2_1865, () => openBonusGame(options)],
    ['exchange', 'Обменник', L2_CATEGORY_ART.gold, () => openExchangeGame(options)],
    ['runes', 'Руны', L2_MATERIAL_ART.l2_8358, null, 'Руны пока не продаются.'],
  ];
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay l2-store-overlay';
  overlay.innerHTML = `<div class="overlay-backdrop"></div>
    <div class="overlay-panel l2-store-panel">
      <header class="l2-store-title"><h2>Магазин</h2><button type="button" class="overlay-close" aria-label="Закрыть">${icon('x')}</button></header>
      <div class="l2-store-ornament" aria-hidden="true"><span></span></div>
      <div class="l2-store-grid">${categories.map(([id, label, art, open, reason]) => `<button type="button" class="l2-store-category" data-store-category="${id}" ${!open ? `aria-disabled="true" title="${reason}"` : ''}>${l2IconHtml(art)}<span>${label}</span></button>`).join('')}</div>
      <div class="l2-store-notice" role="status" aria-live="polite"></div>
      <footer class="l2-store-footer"><button type="button" data-store-all>Все товары</button><button type="button" data-store-premium>Магазин COL</button><button type="button" data-store-auction>Аукцион</button></footer>
    </div>`;
  const notice = overlay.querySelector('.l2-store-notice');
  let opening = false;
  async function launch(open, reason) {
    if (opening) return;
    options.haptic('light');
    if (!open) { notice.textContent = reason; return; }
    opening = true;
    notice.textContent = 'Открываем раздел…';
    try { await open(); notice.textContent = ''; }
    catch (error) { notice.textContent = error.message || 'Не удалось открыть раздел.'; }
    finally { opening = false; }
  }
  overlay.querySelectorAll('[data-store-category]').forEach(button => {
    const entry = categories.find(([id]) => id === button.dataset.storeCategory);
    button.addEventListener('click', () => launch(entry[3], entry[4]));
  });
  overlay.querySelector('[data-store-all]').addEventListener('click', () => launch(goods('all')));
  overlay.querySelector('[data-store-premium]').addEventListener('click', () => launch(() => openLuckShopGame(options)));
  overlay.querySelector('[data-store-auction]').addEventListener('click', () => launch(() => openAuctionGame(options)));
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

/** Item art: palace styles show their painting, all other emblems are WebP. */
export const ITEM_ICONS = Object.freeze({
  swordImmune: 'shield', swordAddMm: 'sword', swordAddTry: 'swords',
  bossAddDmg: 'flame', bossAddCrChance: 'target', bossAddCrDmg: 'sparkles',
  potionHp1000: 'flask-conical', potionHp3000: 'flask-conical', potionHp8000: 'flask-conical',
  potionMp180: 'flask-conical', potionMp300: 'flask-conical',
  chestAddTry: 'package-open', palaceChangeName: 'scroll',
  ...Object.fromEntries(['C', 'B', 'A', 'S'].map(grade => [`lifestoneMid-${grade}`, 'sparkle'])),
  ...Object.fromEntries(['soulshot', 'spiritshot', 'blessed'].flatMap(kind => ['noGrade', 'D', 'C', 'B', 'A', 'S', 'S80', 'S84'].map(grade => [`shot-${kind}-${grade}`, 'sparkle']))),
});
const ITEM_ART = { palaceElven: ['palace', 'elven'], palaceRoyal: ['palace', 'royal'] };

export function itemIconHtml(item) {
  const soul=item.command.match(/^soul-(red|green|blue)-(\d+)$/);if(soul)return '<span class="shop-icon">'+materialIcon('soul_'+soul[1]+'_'+soul[2])+'</span>';
  const life=item.command.match(/^lifestoneMid-(C|B|A|S)$/);if(life)return '<span class="shop-icon">'+materialIcon('lifestone_mid_'+life[1])+'</span>';
  const shot=item.command.match(/^shot-(soulshot|spiritshot|blessed)-(noGrade|D|C|B|A|S|S80|S84)$/);if(shot)return '<span class="shop-icon">'+shotIcon(shot[1],shot[2])+'</span>';
  if(item.potionId)return `<span class="shop-icon">${flaskHtml({type:'buff',id:item.potionId})}</span>`;
  const potion={potionHp1000:{type:'hp',size:'little'},potionHp3000:{type:'hp',size:'small'},potionHp8000:{type:'hp',size:'medium'},elixirHp45:{type:'hp',bottleType:'elixir'},potionMp180:{type:'mp',size:'little'},potionMp300:{type:'mp',size:'small'}}[item.command];
  if(potion)return `<span class="shop-icon ${potion.type}">${flaskHtml(potion)}</span>`;
  const art = ITEM_ART[item.command];
  const url = art ? buildArtUrl(art[0], 1, art[1]) : null;
  if (url) return `<span class="shop-icon art" style="--art:url('${url}')"></span>`;
  const tone = item.command.startsWith('potionMp') ? 'mp' : item.command.startsWith('potionHp') ? 'hp' : item.category;
  return `<span class="shop-icon ${tone}">${icon(ITEM_ICONS[item.command] || 'sparkle')}</span>`;
}

const REASONS = {
  unknown_item: 'Товар больше не существует.',
  cooldown: 'Этот товар уже покупался и пока не обновился.',
  not_enough_gold: 'Недостаточно золота.',
  rejected: 'Покупка отклонена правилами магазина.',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}


function remain(until) {
  const ms = Math.max(0, Number(until || 0) - Date.now());
  if (!ms) return 'Доступно';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} дн. ${hours % 24} ч.`;
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  if (hours > 0) return `${hours} ч. ${minutes % 60} мин.`;
  return `${minutes} мин.`;
}

export async function openShopGoods({ api, renderState, haptic, statusElement, initialCategory = 'all' }) {
  let state = await api('/api/shop');
  let category = initialCategory;
  let pending = false;
  let confirming = null;
  let timer = null;
  let purchased = null; // flashes the bought row once after re-render
  let page = 1;
  let search = '';
  const PAGE_SIZE = 12;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay shop-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass shop-panel">
      <header class="shop-head">
        <button class="overlay-close shop-back" type="button" aria-label="Назад">${icon('chevron-left')}</button>
        <h2>Магазин</h2>
        <strong class="shop-wallet" data-shop-gold></strong>
      </header>
      <div class="shop-categories" data-shop-categories></div>
      <input type="search" class="shop-search" data-shop-search placeholder="Поиск по названию" maxlength="40">
      <div class="shop-list" data-shop-list></div>
      <div class="pager" data-shop-pager></div>
      <div class="shop-feedback" data-shop-feedback aria-live="polite"></div>
    </div>`;

  const list = overlay.querySelector('[data-shop-list]');
  const categories = overlay.querySelector('[data-shop-categories]');
  const feedback = overlay.querySelector('[data-shop-feedback]');
  const pager = overlay.querySelector('[data-shop-pager]');
  overlay.querySelector('[data-shop-search]').addEventListener('input', event => {
    search = event.target.value.trim().toLowerCase();
    page = 1;
    confirming = null;
    renderItems();
  });
  const gold = overlay.querySelector('[data-shop-gold]');

  const close = () => {
    if (timer) window.clearInterval(timer);
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function itemCard(item) {
    const disabled = item.onCooldown || !item.canAfford;
    const armed = confirming === item.command;
    const price = item.onCooldown
      ? `${icon('hourglass')} ${escapeHtml(remain(item.resetAt))}`
      : `${armed ? icon('circle-check') : materialIcon('gold')} ${formatNumber(item.cost)}`;

    return `
      <article class="shop-item ${item.onCooldown ? 'cooldown' : ''} ${armed ? 'armed' : ''} ${!item.canAfford && !item.onCooldown ? 'poor' : ''}">
        ${itemIconHtml(item)}
        <div class="shop-item-copy">
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(armed ? 'Нажми ещё раз, чтобы купить' : item.message || item.categoryLabel)}</p>
        </div>
        <button type="button" data-shop-buy="${escapeHtml(item.command)}" ${disabled ? 'disabled' : ''} class="shop-price ${armed ? 'confirming' : ''}" aria-label="${escapeHtml(`${item.name}: ${formatNumber(item.cost)} золота`)}">${price}</button>
      </article>`;
  }

  function renderCategories() {
    const all = [{ id: 'all', title: 'Все' }, ...state.categories];
    categories.innerHTML = all.map((item) => `
      <button type="button" data-shop-category="${item.id}" class="${category === item.id ? 'active' : ''}">${escapeHtml(item.title)}</button>
    `).join('');
    categories.querySelectorAll('[data-shop-category]').forEach((button) => {
      button.addEventListener('click', () => {
        category = button.dataset.shopCategory;
        page = 1;
        confirming = null;
        haptic('light');
        renderAll();
      });
    });
  }

  function renderItems() {
    const matching = (category === 'all' ? state.items : state.items.filter((item) => item.category === category))
      .filter((item) => !search || item.name.toLowerCase().includes(search));
    const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
    page = Math.min(page, pages);
    const items = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    pager.innerHTML = pages > 1
      ? `<button type="button" class="equipment-action" data-shop-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>←</button><span>${page} / ${pages} · ${matching.length}</span><button type="button" class="equipment-action" data-shop-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>→</button>`
      : '';
    pager.querySelectorAll('[data-shop-page]').forEach((button) => button.addEventListener('click', () => { page = Number(button.dataset.shopPage); confirming = null; renderItems(); }));
    list.innerHTML = items.length ? items.map(itemCard).join('') : '<div class="shop-empty">Ничего не найдено.</div>';
    list.querySelectorAll('.shop-item').forEach((node, index) => node.style.setProperty('--i', String(index)));
    if (purchased) {
      list.querySelector(`[data-shop-buy="${CSS.escape(purchased)}"]`)?.closest('.shop-item')?.classList.add('bought');
      purchased = null;
    }
    list.querySelectorAll('[data-shop-buy]').forEach((button) => {
      button.addEventListener('click', () => buy(button.dataset.shopBuy));
    });
  }

  function renderAll() {
    gold.innerHTML = `${materialIcon('gold')} ${formatNumber(state.gold)}`;
    renderCategories();
    renderItems();
  }

  async function buy(command) {
    if (pending) return;
    if (confirming !== command) {
      confirming = command;
      feedback.textContent = 'Нажми ещё раз, чтобы подтвердить покупку.';
      haptic('medium');
      renderItems();
      return;
    }

    pending = true;
    confirming = null;
    overlay.classList.add('busy');
    feedback.textContent = 'Проводим покупку…';
    haptic('heavy');

    try {
      const payload = await api('/api/shop/buy', {
        method: 'POST',
        body: JSON.stringify({ command }),
      });
      state = payload.shop;
      if (payload.state) renderState(payload.state);
      feedback.textContent = payload.message || `Куплено: ${payload.item?.name || command}`;
      purchased = command;
      statusElement.textContent = 'Покупка совершена.';
      renderAll();
    } catch (error) {
      if (error.payload?.shop) state = error.payload.shop;
      feedback.textContent = error.payload?.message || REASONS[error.payload?.reason] || error.message;
      statusElement.textContent = `Магазин: ${feedback.textContent}`;
      haptic('light');
      renderAll();
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  renderAll();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  timer = window.setInterval(() => {
    if (state.items.some((item) => item.onCooldown && Number(item.resetAt) <= Date.now())) {
      state.items = state.items.map((item) => Number(item.resetAt) <= Date.now() ? { ...item, onCooldown: false, available: item.canAfford } : item);
      renderItems();
    } else {
      list.querySelectorAll('.shop-item.cooldown button').forEach((button) => {
        const item = state.items.find((candidate) => candidate.command === button.dataset.shopBuy);
        if (item) button.innerHTML = `${icon('hourglass')} ${escapeHtml(remain(item.resetAt))}`;
      });
    }
  }, 30000);
}

import { escapeHtml } from './escape-html.js';

// The inside of a shop category, laid out like the Lineage II store window: a grid of item icons on the left,
// the selected item's information, the items it costs and the quantity on the right, Confirm / Cancel below.
// The caller owns the data and the purchase; this module only draws the view and wires its events.

const number = value => new Intl.NumberFormat('ru-RU').format(Math.round(Number(value) || 0));

/**
 * item: {id, iconHtml, name, grade?, badge?, description?, extraHtml?, note?, requires: [{iconHtml, label, need, have}],
 *        canBuy, countable?, maxCount?}
 */
export function storeViewHtml({ items, selectedId, quantity = 1, emptyText = 'Ничего не найдено.' }) {
  if (!items.length) return `<div class="shop-empty">${escapeHtml(emptyText)}</div>`;
  const selected = items.find(item => item.id === selectedId) || null;
  const grid = items.map(item => `<button type="button" class="store-slot ${item.id === selectedId ? 'selected' : ''} ${item.canBuy ? '' : 'poor'}" data-store-slot="${escapeHtml(item.id)}" title="${escapeHtml(item.name)}" aria-label="${escapeHtml(item.name)}" aria-pressed="${item.id === selectedId}">${item.iconHtml}${item.badge ? `<em>${escapeHtml(item.badge)}</em>` : ''}</button>`).join('');
  let info = '<div class="store-info"><p class="store-hint">Выбери товар слева.</p></div>';
  if (selected) {
    const count = selected.countable ? Math.max(1, Math.min(Number(quantity) || 1, selected.maxCount || 1000)) : 1;
    const rows = selected.requires.map(row => {
      const need = row.need * count;
      const ok = row.have >= need;
      return `<li class="${ok ? '' : 'missing'}"><span class="store-req-icon">${row.iconHtml}</span><span class="store-req-name">${escapeHtml(row.label)}</span><strong>${number(need)}${row.have !== undefined ? ` / ${number(row.have)}` : ''}</strong></li>`;
    }).join('');
    info = `<div class="store-info">
      <section class="store-box"><h4>Информация</h4>
        <div class="store-name"><span class="store-icon">${selected.iconHtml}</span><div><strong>${escapeHtml(selected.name)}${selected.grade ? ` <small>${escapeHtml(selected.grade)}</small>` : ''}</strong>${selected.note ? `<small>${escapeHtml(selected.note)}</small>` : ''}</div></div>
        ${selected.description ? `<p>${escapeHtml(selected.description)}</p>` : ''}${selected.extraHtml || ''}
      </section>
      <section class="store-box"><h4>Необходимо</h4><ul class="store-req">${rows || '<li><span class="store-req-name">Бесплатно</span></li>'}</ul></section>
      ${selected.countable ? `<label class="store-quantity"><span>Количество</span><input type="number" min="1" max="${selected.maxCount || 1000}" step="1" inputmode="numeric" value="${count}" data-store-quantity></label>` : ''}
    </div>`;
  }
  return `<div class="store-view"><div class="store-grid" role="listbox">${grid}</div>${info}</div>
    <div class="store-actions"><button type="button" class="store-confirm" data-store-confirm ${selected?.canBuy ? '' : 'disabled'}>Подтвердить</button><button type="button" class="store-cancel" data-store-cancel ${selected ? '' : 'disabled'}>Отмена</button></div>`;
}

/** Wires the events of a rendered store view inside `root`. */
export function bindStoreView(root, { onSelect, onQuantity, onConfirm, onCancel }) {
  root.querySelectorAll('[data-store-slot]').forEach(button => button.addEventListener('click', () => onSelect(button.dataset.storeSlot)));
  root.querySelector('[data-store-quantity]')?.addEventListener('input', event => onQuantity(Math.max(1, Math.floor(Number(event.target.value) || 1))));
  root.querySelector('[data-store-confirm]')?.addEventListener('click', onConfirm);
  root.querySelector('[data-store-cancel]')?.addEventListener('click', onCancel);
}

import {escapeHtml} from './escape-html.js';

/** Shared bag surface. Callers supply cells and retain ownership of item actions. */
export function itemGridHtml(cells, {className = '', min = 30, label = 'Предметы'} = {}) {
  const empty = '<span class="item-grid-cell empty" data-grid-empty aria-hidden="true"></span>';
  return `<l2-item-grid class="item-grid ${escapeHtml(className)}" data-min="${min}" role="group" aria-label="${escapeHtml(label)}">${cells.join('')}${empty.repeat(Math.max(0, min - cells.length))}</l2-item-grid>`;
}

// Fit complete rows to the available width without changing the caller's item cells.
if (typeof customElements !== 'undefined' && !customElements.get('l2-item-grid')) {
  customElements.define('l2-item-grid', class extends HTMLElement {
    connectedCallback() {
      this.observer = new ResizeObserver(() => this.fillRows());
      this.observer.observe(this);
    }
    disconnectedCallback() { this.observer?.disconnect(); }
    fillRows() {
      if (!this.clientWidth) return;
      const columns = getComputedStyle(this).gridTemplateColumns.split(' ').length;
      const empty = [...this.querySelectorAll(':scope > [data-grid-empty]')];
      const items = this.children.length - empty.length;
      const target = Math.ceil(Math.max(Number(this.dataset.min), items) / columns) * columns - items;
      if (empty.length > target) empty.slice(target).forEach(cell => cell.remove());
      for (let count = empty.length; count < target; count++) {
        const cell = document.createElement('span');
        cell.className = 'item-grid-cell empty';
        cell.setAttribute('data-grid-empty', '');
        cell.setAttribute('aria-hidden', 'true');
        this.append(cell);
      }
    }
  });
}

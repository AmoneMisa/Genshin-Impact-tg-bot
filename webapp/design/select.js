// Enhance a native select while preserving its value and change event contract.
// The native control remains the form value; the visible control owns keyboard navigation.
let sequence = 0;
let active = null;
let listening = false;
const refresh = new WeakMap();
export function enhanceSelects(root) {
  if (active && !active.wrapper.isConnected) active.close();
  if (!listening) {
    document.addEventListener('pointerdown', event => { if (active && !active.wrapper.contains(event.target)) active.close(); });
    listening = true;
  }
  const selects = [...root.querySelectorAll('select:not([data-ds-select])')];
  if (root.matches?.('select:not([data-ds-select])')) selects.unshift(root);
  for (const select of selects) {
    if (select.multiple || select.size > 1) continue;
    select.dataset.dsSelect = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'ds-select';
    select.before(wrapper);
    wrapper.append(select);
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ds-select-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', select.getAttribute('aria-label') || select.labels?.[0]?.textContent || 'Выбрать');
    const menu = document.createElement('ul');
    menu.className = 'ds-select-menu';
    menu.id = `ds-select-${++sequence}`;
    menu.role = 'listbox';
    menu.hidden = true;
    trigger.setAttribute('aria-controls', menu.id);
    wrapper.append(trigger, menu);
    let options = [...select.options];
    let highlighted = select.selectedIndex;
    const close = () => { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); trigger.removeAttribute('aria-activedescendant'); if (active?.wrapper === wrapper) active = null; };
    function paint() {
      options = [...select.options];
      trigger.textContent = select.selectedOptions[0]?.textContent || '';
      trigger.disabled = select.disabled;
      menu.replaceChildren(...options.map((option, index) => {
        const row = document.createElement('li');
        row.role = 'option'; row.id = `${menu.id}-${index}`;
        row.textContent = option.textContent;
        row.setAttribute('aria-selected', String(index === select.selectedIndex));
        row.setAttribute('aria-disabled', String(option.disabled));
        row.classList.toggle('highlighted', index === highlighted);
        // Keep focus on the combobox until the option's click commits the value.
        row.addEventListener('pointerdown', event => event.preventDefault());
        row.addEventListener('click', () => choose(index));
        return row;
      }));
      if (!menu.hidden && highlighted >= 0) {
        trigger.setAttribute('aria-activedescendant', `${menu.id}-${highlighted}`);
        menu.children[highlighted]?.scrollIntoView({block:'nearest'});
      }
    }
    function choose(index) {
      if (!options[index] || options[index].disabled) return;
      select.selectedIndex = index; close(); paint(); trigger.focus();
      select.dispatchEvent(new Event('change', {bubbles:true}));
    }
    function open() { active?.close(); active = {wrapper, close}; highlighted = select.selectedIndex; menu.hidden = false; trigger.setAttribute('aria-expanded', 'true'); paint(); }
    trigger.addEventListener('click', () => menu.hidden ? open() : close());
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Tab') { close(); return; }
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (['Enter',' '].includes(event.key)) { event.preventDefault(); menu.hidden ? open() : choose(highlighted); return; }
      if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
      event.preventDefault(); if (menu.hidden) open();
      const enabled = options.map((o,i) => o.disabled ? -1 : i).filter(i => i >= 0);
      const index = enabled.indexOf(highlighted);
      highlighted = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1)
        : enabled[Math.max(0, Math.min(enabled.length-1, index+(event.key === 'ArrowDown' ? 1 : -1)))];
      paint();
    });
    wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) close(); });
    select.addEventListener('change', paint);
    select.addEventListener('focus', () => trigger.focus());
    refresh.set(select,paint);
    paint();
  }
}

// One observer for newly rendered screens, without timers or per-control observers.
export function observeSelects(root) {
  enhanceSelects(root);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const select = record.target.matches?.('select') ? record.target : record.target.closest?.('select');
      if (select) refresh.get(select)?.();
      for (const node of record.addedNodes) if (node.nodeType === 1 && node.isConnected) enhanceSelects(node);
    }
  });
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
  return () => observer.disconnect();
}

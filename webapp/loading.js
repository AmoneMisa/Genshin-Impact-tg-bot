// Loading veil for opening screens: a rune spinner with the screen's name,
// shown only when opening takes longer than a moment (no flicker on fast
// loads), and a short error card when opening fails.

export function createLoader(doc = document, { delay = 160, errorMs = 2600 } = {}) {
  let veil = null;
  let pending = 0;
  let showTimer = null;
  let errorTimer = null;

  function element() {
    if (veil) return veil;
    veil = doc.createElement('div');
    veil.className = 'load-veil';
    veil.setAttribute('role', 'status');
    veil.setAttribute('aria-live', 'polite');
    veil.innerHTML = '<div class="load-card"><span class="load-rune" aria-hidden="true"><i></i><i></i></span><small data-load-label></small></div>';
    veil.addEventListener('click', () => { if (veil.classList.contains('error')) hide(); });
    doc.body.appendChild(veil);
    return veil;
  }

  function show(label, error = false) {
    const node = element();
    node.querySelector('[data-load-label]').textContent = label;
    node.classList.toggle('error', error);
    node.classList.add('on');
  }

  function hide() {
    veil?.classList.remove('on', 'error');
  }

  return {
    /** True while a task is running (lets callers ignore double taps). */
    get busy() { return pending > 0; },

    /** Runs `task`; shows the veil with `label` only if it outlasts `delay`. */
    async run(label, task) {
      pending += 1;
      clearTimeout(errorTimer);
      if (pending === 1) showTimer = setTimeout(() => show(label), delay);
      try {
        return await task();
      } finally {
        pending -= 1;
        if (pending === 0) {
          clearTimeout(showTimer);
          hide();
        }
      }
    },

    /** Brief error card; tap to dismiss early. */
    error(message) {
      clearTimeout(errorTimer);
      show(message, true);
      errorTimer = setTimeout(hide, errorMs);
    },
  };
}

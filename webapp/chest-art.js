// Painted chests share cached WebP files; no renderer or animation loop.
export const RATTLE_SECONDS = .28;
export const SWING_SECONDS = .55;
export const CHEST_ART_ROOT = '/art/chests/v1';
export function openingDelay() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? 0 : (RATTLE_SECONDS + SWING_SECONDS * .7) * 1000;
}

export async function createChest(host, { opened = null, reveal = false } = {}) {
  const art = document.createElement('span');
  art.className = 'chest-art';
  art.setAttribute('aria-hidden', 'true');
  const fallback = document.createElement('span');
  fallback.className = 'chest-art-fallback';
  fallback.textContent = '🧰';
  art.append(fallback);
  let destroyed = false, openImage;
  function painting(state) {
    const img = document.createElement('img');
    img.className = `chest-art-image chest-art-${state}`;
    img.alt = '';
    img.width = img.height = 512;
    img.decoding = 'async';
    const sizes = reveal ? [256, 512] : [128, 256];
    img.sizes = reveal ? '(max-width: 384px) 78vw, 300px' : '(max-width: 520px) 30vw, 156px';
    img.srcset = sizes.map(size => `${CHEST_ART_ROOT}/${state}-${size}.webp ${size}w`).join(', ');
    img.src = `${CHEST_ART_ROOT}/${state}-${sizes[0]}.webp`;
    img.addEventListener('load', () => { img.classList.add('loaded'); fallback.hidden = true; }, { once: true });
    img.addEventListener('error', () => { img.classList.remove('loaded'); img.classList.add('failed'); fallback.hidden = false; }, { once: true });
    art.append(img);
    return img;
  }
  painting('closed');
  host.append(art);
  host.classList.add('chest-art-ready');
  const controller = {
    open(kind = 'treasure') {
      if (destroyed) return;
      openImage ||= painting('open');
      art.classList.remove('depleted');
      art.classList.add('is-open');
      art.classList.toggle('has-treasure', kind !== 'empty');
    },
    showDepleted() {
      if (destroyed) return;
      art.classList.remove('is-open', 'has-treasure');
      art.classList.add('depleted');
    },
    destroy() {
      destroyed = true;
      art.remove();
      host.classList.remove('chest-art-ready');
    },
  };
  if (opened) controller.showDepleted();
  return controller;
}

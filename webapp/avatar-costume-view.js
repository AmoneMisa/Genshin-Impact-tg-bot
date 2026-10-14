import {escapeHtml as esc} from './escape-html.js';
import {avatarCostumeRig} from './art/avatar-costume-rigs.js';
import {createCostumeRig} from './avatar-costume-rig.js';

const controllers = new WeakMap();

export function avatarCostumeAttributes(id = '') {
  const tint = /crimson|scarlet|blood|rose|coalwood|eclipse/.test(id) ? 'rose'
    : /gold|ivory|sandglass|phoenix|emerald/.test(id) ? 'gold'
    : /azure|snow|frost|astral|star|opal|sapphire/.test(id) ? 'ice' : 'violet';
  return `data-avatar-motion data-avatar-tint="${tint}"`;
}

export function avatarCostumeImage({src, name = 'Декоративный костюм', imageClass = '', srcset = '', sizes = ''}) {
  return `<img class="avatar-costume-art ${esc(imageClass)}" data-avatar-art src="${esc(src || '')}"${srcset ? ` srcset="${esc(srcset)}"` : ''}${sizes ? ` sizes="${esc(sizes)}"` : ''} alt="${esc(name)}" decoding="async">`;
}

export function avatarCostumeHtml(options) {
  return `<span class="avatar-costume-view" ${avatarCostumeAttributes(options.id)}>${avatarCostumeImage(options)}</span>`;
}

/** One visibility controller and one throttled frame loop, only while rigs are visible. */
export function installAvatarCostumeMotion(doc = document) {
  if (controllers.has(doc)) return controllers.get(doc);
  const win = doc.defaultView;
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const nav = win.navigator;
  const lowPower = nav.connection?.saveData || (nav.deviceMemory && nav.deviceMemory <= 2)
    || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2);
  const views = new Map();
  const rigs = new Map();
  let frame = 0, lastFrame = 0;
  function tick(now) {
    frame = 0;
    if (disposed) return;
    const active = [...rigs.values()].filter(state => !state.failed && state.node.hasAttribute('data-avatar-motion-active'));
    if (!active.length) return;
    if (now - lastFrame >= 50) {
      lastFrame = now;
      for (const state of active) {
        let cost;
        try {cost = state.view.draw(now / 1000);} catch {cost=Infinity;state.slowFrames=3;}
        // A slow renderer keeps all game actions usable with the static painting.
        state.slowFrames = cost > 28 ? state.slowFrames + 1 : 0;
        if (state.slowFrames >= 3) {
          state.view.setActive(false);state.failed = true;
          state.node.querySelector('[data-avatar-art]')?.setAttribute('data-avatar-rig-failed','');
        }
      }
    }
    if (active.some(state => !state.failed)) frame = win.requestAnimationFrame(tick);
  }
  function syncRig(node, enabled) {
    let state = rigs.get(node);
    const image = node.querySelector('[data-avatar-art]');
    const source = image?.currentSrc || image?.src;
    const data = source && avatarCostumeRig(new URL(source, doc.baseURI).pathname);
    if (!image || !data) return;
    if (!enabled && state) {state.view.destroy();rigs.delete(node);return;}
    if (state && state.source !== source) {state.view.destroy();rigs.delete(node);state=null;}
    if (enabled && !state && image.complete && image.naturalWidth) {
      try {
        const view = createCostumeRig(image,data);
        if (view) {state={node,source,view,failed:false,slowFrames:0};rigs.set(node,state);}
      } catch { /* Image stays available if decorative rendering fails. */ }
      if (!state) {
        image.setAttribute('data-avatar-rig-failed','');
        state={node,source,failed:true,view:{setActive(){},destroy(){image.removeAttribute('data-avatar-rig-failed');}}};rigs.set(node,state);
      }
    }
    state?.view.setActive(enabled && !state.failed);
  }
  let queued = false, disposed = false;
  const selector = '[data-avatar-motion]';

  function sync() {
    queued = false;
    if (disposed) return;
    const overlays = [...doc.querySelectorAll('.game-overlay:not(.closing)')]
      .filter(node => node.getClientRects().length && !node.hidden);
    const topOverlay = overlays.at(-1);
    const modalOpen = Boolean(doc.querySelector('dialog[open]'));
    let active = 0;
    for (const [node, inViewport] of views) {
      if (!node.isConnected) {
        rigs.get(node)?.view.destroy();rigs.delete(node);
        intersection?.unobserve(node);
        node.removeAttribute('data-avatar-motion-active');
        views.delete(node);
        continue;
      }
      const ownOverlay = node.closest('.game-overlay');
      const visible = node.getClientRects().length > 0
        && !node.closest('[hidden], [inert], [aria-hidden="true"], .closing')
        && win.getComputedStyle(node).visibility === 'visible'
        && (!ownOverlay || ownOverlay.classList.contains('visible'))
        && (!topOverlay || ownOverlay === topOverlay);
      const enabled = Boolean(intersection && inViewport && visible && !doc.hidden
        && !reduced.matches && !lowPower && !modalOpen && active < 2);
      if (enabled) active++;
      if (enabled !== node.hasAttribute('data-avatar-motion-active')) {
        node.toggleAttribute('data-avatar-motion-active', enabled);
      }
      syncRig(node,enabled);
    }
    const running = [...rigs.values()].some(state => !state.failed && state.node.hasAttribute('data-avatar-motion-active'));
    if (running && !frame) frame = win.requestAnimationFrame(tick);
    if (!running && frame) {win.cancelAnimationFrame(frame);frame=0;}
  }
  function schedule() {
    if (queued || disposed) return;
    queued = true;
    win.queueMicrotask(sync);
  }
  const intersection = typeof win.IntersectionObserver === 'function'
    ? new win.IntersectionObserver(entries => {
      for (const entry of entries) if (views.has(entry.target)) views.set(entry.target, entry.isIntersecting);
      schedule();
    }, {threshold: 0.05}) : null;
  function register(root) {
    const nodes = root.matches?.(selector) ? [root, ...root.querySelectorAll(selector)]
      : [...(root.querySelectorAll?.(selector) || [])];
    for (const node of nodes) if (!views.has(node)) {
      views.set(node, false);
      intersection?.observe(node);
    }
  }
  const mutations = new win.MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) register(node);
    schedule();
  });
  register(doc.body);
  mutations.observe(doc.body, {subtree: true, childList: true, attributes: true,
    attributeFilter: ['hidden', 'inert', 'aria-hidden', 'class', 'style', 'open']});
  doc.addEventListener('visibilitychange', sync);
  doc.addEventListener('load', schedule, true);
  reduced.addEventListener('change', sync);
  const controller = {sync, destroy() {
    disposed = true;
    win.cancelAnimationFrame(frame);frame=0;
    for (const state of rigs.values()) state.view.destroy();rigs.clear();
    mutations.disconnect();
    intersection?.disconnect();
    doc.removeEventListener('visibilitychange', sync);
    doc.removeEventListener('load', schedule, true);
    reduced.removeEventListener('change', sync);
    for (const node of views.keys()) node.removeAttribute('data-avatar-motion-active');
    views.clear();
    controllers.delete(doc);
  }};
  controllers.set(doc, controller);
  schedule();
  return controller;
}

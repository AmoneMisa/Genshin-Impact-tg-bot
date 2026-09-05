const RARITY_TONES = Object.freeze({
  noGrade: 'mist',
  D: 'mist',
  C: 'aqua',
  B: 'aqua',
  A: 'arcane',
  S: 'gold',
  SS: 'rose',
  SSS: 'prismatic',
});

const INTERACTIVE_SELECTOR = [
  '.game-card:not(:disabled)',
  '.build-action:not(:disabled)',
  '.arena-attack:not(:disabled)',
  '.boss-skill:not(:disabled)',
  '.gacha-roll:not(:disabled)',
  '.gacha-action:not(:disabled)',
  '.chest-tile:not(:disabled)',
].join(',');

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function rarityTone(grade) {
  return RARITY_TONES[String(grade || '').trim()] || 'arcane';
}

export function particleVectors(count = 12) {
  const safeCount = Math.max(1, Math.min(24, Number(count) || 12));
  return Array.from({ length: safeCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / safeCount + (index % 2 ? 0.12 : -0.08);
    const distance = 34 + (index % 4) * 10;
    return {
      x: Math.round(Math.cos(angle) * distance),
      y: Math.round(Math.sin(angle) * distance),
      delay: (index % 5) * 18,
      size: 3 + (index % 3),
    };
  });
}

function motionAllowed(win) {
  try {
    return !win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

function removeLater(win, element, timeout) {
  win.setTimeout(() => element.remove(), timeout);
}

function effectHost(target) {
  return target?.closest?.('.overlay-panel') || target?.closest?.('.game-card') || target;
}

function pointInHost(target, host) {
  const targetRect = target.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  return {
    x: targetRect.left - hostRect.left + targetRect.width / 2,
    y: targetRect.top - hostRect.top + targetRect.height / 2,
  };
}

function burst(target, tone = 'arcane', count = 12) {
  const win = target?.ownerDocument?.defaultView;
  if (!win || !motionAllowed(win)) return;
  const host = effectHost(target);
  if (!host) return;

  host.classList.add('vfx-host');
  const point = pointInHost(target, host);
  const field = target.ownerDocument.createElement('span');
  field.className = `vfx-burst tone-${tone}`;
  field.style.setProperty('--vfx-x', `${point.x}px`);
  field.style.setProperty('--vfx-y', `${point.y}px`);

  for (const vector of particleVectors(count)) {
    const particle = target.ownerDocument.createElement('i');
    particle.className = 'vfx-particle';
    particle.style.setProperty('--dx', `${vector.x}px`);
    particle.style.setProperty('--dy', `${vector.y}px`);
    particle.style.setProperty('--delay', `${vector.delay}ms`);
    particle.style.setProperty('--size', `${vector.size}px`);
    field.appendChild(particle);
  }

  host.appendChild(field);
  removeLater(win, field, 900);
}

function floatingLabel(target, text, tone = 'arcane') {
  const win = target?.ownerDocument?.defaultView;
  if (!win || !motionAllowed(win) || !text) return;
  const host = effectHost(target);
  if (!host) return;

  host.classList.add('vfx-host');
  const point = pointInHost(target, host);
  const label = target.ownerDocument.createElement('span');
  label.className = `vfx-float-label tone-${tone}`;
  label.textContent = String(text).slice(0, 36);
  label.style.setProperty('--vfx-x', `${point.x}px`);
  label.style.setProperty('--vfx-y', `${point.y}px`);
  host.appendChild(label);
  removeLater(win, label, 1000);
}

function flash(target, tone = 'arcane') {
  const win = target?.ownerDocument?.defaultView;
  if (!win || !motionAllowed(win)) return;
  const overlay = target.closest?.('.game-overlay');
  if (!overlay) return;
  const node = target.ownerDocument.createElement('span');
  node.className = `vfx-flash tone-${tone}`;
  overlay.appendChild(node);
  removeLater(win, node, 520);
}

function stageEnter(overlay) {
  if (!overlay || overlay.dataset.vfxStage === 'yes') return;
  overlay.dataset.vfxStage = 'yes';
  const win = overlay.ownerDocument.defaultView;
  if (!motionAllowed(win)) return;
  const wash = overlay.ownerDocument.createElement('span');
  wash.className = 'vfx-screen-wash';
  overlay.appendChild(wash);
  removeLater(win, wash, 700);
}

function rarityBeam(container, grade) {
  const win = container?.ownerDocument?.defaultView;
  if (!win || !motionAllowed(win)) return;
  const beam = container.ownerDocument.createElement('span');
  beam.className = `vfx-rarity-beam tone-${rarityTone(grade)}`;
  container.appendChild(beam);
  removeLater(win, beam, 1250);
}

function pressRing(control, event) {
  const win = control?.ownerDocument?.defaultView;
  if (!win || !motionAllowed(win)) return;
  const rect = control.getBoundingClientRect();
  const ring = control.ownerDocument.createElement('span');
  ring.className = 'vfx-press-ring';
  const x = event?.clientX ? clamp(event.clientX - rect.left, 0, rect.width) : rect.width / 2;
  const y = event?.clientY ? clamp(event.clientY - rect.top, 0, rect.height) : rect.height / 2;
  ring.style.setProperty('--press-x', `${x}px`);
  ring.style.setProperty('--press-y', `${y}px`);
  control.classList.add('vfx-control');
  control.appendChild(ring);
  removeLater(win, ring, 480);
}

function inspectArenaResult(element) {
  if (!element.matches?.('.arena-result.visible') || element.dataset.vfxDone === 'yes') return;
  element.dataset.vfxDone = 'yes';
  const tone = element.classList.contains('win') ? 'gold' : element.classList.contains('lose') ? 'danger' : 'aqua';
  flash(element, tone);
  burst(element, tone, 16);
  const delta = element.querySelector('.arena-result-delta')?.textContent?.trim();
  if (delta) floatingLabel(element, delta, tone);
}

function inspectBossResult(element) {
  if (!element.matches?.('.boss-result.visible') || element.dataset.vfxDone === 'yes') return;
  element.dataset.vfxDone = 'yes';
  const text = element.textContent || '';
  const tone = element.classList.contains('victory') ? 'gold' : /Восстановлено|Щит/.test(text) ? 'aqua' : 'danger';
  flash(element, tone);
  burst(element, tone, element.classList.contains('victory') ? 20 : 14);
  const copy = element.querySelector('strong')?.textContent?.trim();
  if (copy) floatingLabel(element, copy, tone);
}

function inspectChest(element) {
  if (!element.matches?.('.chest-tile.opened:not(.historical)') || element.dataset.vfxDone === 'yes') return;
  element.dataset.vfxDone = 'yes';
  const empty = /Пусто/.test(element.textContent || '');
  const tone = empty ? 'mist' : 'gold';
  burst(element, tone, empty ? 7 : 14);
  const reward = element.querySelector('strong')?.textContent?.trim();
  if (reward) floatingLabel(element, reward, tone);
}

function inspectGacha(container) {
  if (!container.matches?.('.gacha-pending') || container.hidden) return;
  const grade = container.querySelector('.gacha-grade')?.textContent?.trim();
  const title = container.querySelector('h3')?.textContent?.trim();
  if (!grade || !title) return;
  const signature = `${grade}|${title}`;
  if (container.dataset.vfxSignature === signature) return;
  container.dataset.vfxSignature = signature;
  const tone = rarityTone(grade);
  rarityBeam(container, grade);
  burst(container, tone, grade === 'SSS' ? 22 : grade === 'SS' ? 18 : 14);
  floatingLabel(container, grade, tone);
}

function successfulBuildFeedback(feedback) {
  const text = feedback.textContent?.trim() || '';
  return /^(Собрано:|Улучшение завершено|Улучшение запущено|Облик постройки изменён|Название изменено)/.test(text);
}

export function startGameVfx(rootDocument = globalThis.document) {
  if (!rootDocument?.body || rootDocument.body.dataset.vfxRuntime === 'yes') return () => {};
  rootDocument.body.dataset.vfxRuntime = 'yes';
  const win = rootDocument.defaultView;
  let lastBuildAction = null;

  const onPointerDown = (event) => {
    const control = event.target?.closest?.(INTERACTIVE_SELECTOR);
    if (control) pressRing(control, event);
    const buildButton = event.target?.closest?.('[data-build-action][data-build]');
    if (buildButton) {
      lastBuildAction = {
        id: buildButton.dataset.build,
        action: buildButton.dataset.buildAction,
        at: Date.now(),
      };
    }
  };

  const inspect = (element) => {
    if (!element || element.nodeType !== 1) return;
    if (element.matches('.game-overlay')) stageEnter(element);
    inspectArenaResult(element);
    inspectBossResult(element);
    inspectChest(element);
    inspectGacha(element);

    element.querySelectorAll?.('.game-overlay').forEach(stageEnter);
    element.querySelectorAll?.('.arena-result.visible').forEach(inspectArenaResult);
    element.querySelectorAll?.('.boss-result.visible').forEach(inspectBossResult);
    element.querySelectorAll?.('.chest-tile.opened:not(.historical)').forEach(inspectChest);
    element.querySelectorAll?.('.gacha-pending').forEach(inspectGacha);
  };

  const observer = new win.MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
      inspect(target);
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => inspect(node));
      }

      const feedback = target?.closest?.('.build-feedback');
      if (feedback && successfulBuildFeedback(feedback) && lastBuildAction && Date.now() - lastBuildAction.at < 5000) {
        const card = [...rootDocument.querySelectorAll('[data-build-card]')].find(item => item.dataset.buildCard === lastBuildAction.id);
        if (card && feedback.dataset.vfxText !== feedback.textContent) {
          feedback.dataset.vfxText = feedback.textContent;
          const tone = lastBuildAction.action === 'collect' ? 'gold' : 'arcane';
          burst(card, tone, lastBuildAction.action === 'collect' ? 12 : 16);
          floatingLabel(card, lastBuildAction.action === 'collect' ? 'Ресурсы +' : 'Улучшение', tone);
        }
      }
    }
  });

  rootDocument.addEventListener('pointerdown', onPointerDown, { passive: true });
  observer.observe(rootDocument.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'hidden'],
    characterData: true,
  });

  rootDocument.querySelectorAll('.game-overlay').forEach(stageEnter);

  return () => {
    observer.disconnect();
    rootDocument.removeEventListener('pointerdown', onPointerDown);
    delete rootDocument.body.dataset.vfxRuntime;
  };
}

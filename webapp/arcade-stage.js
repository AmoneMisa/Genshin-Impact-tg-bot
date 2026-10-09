// Animated stages for the arcade mini-games (prototype "Баскетбол" style):
// a painted hall with a CSS-built scene per game, and throw animations that
// land where the server's roll says: swish/rim/miss shots, a dart at a ring,
// knocked pins, a tumbling die, spinning slot reels.
//
// Outcomes are decided by the server value; this module only shows them.

import { arcadeArtUrl, arcadeSpriteHtml, slotPaintingHtml } from './art/arcade-art.js';
import { worldArtUrl } from './art/world-art.js';

const SLOT_STRIP = ['😈', '❤️', '💋', '🤏', '🛫', '🚗', '💩', '👻', '👽', '☠️'];

/** Visual outcome of a throw. Mirrors the Telegram dice semantics the bot used. */
export function throwOutcome(gameId, value, maxValue = 6) {
  const v = Number(value) || 0;
  if (gameId === 'basketball') return v >= 4 ? 'hit' : v === 3 ? 'rim' : 'miss';
  if (gameId === 'football') return v >= 3 ? 'hit' : v === 2 ? 'post' : 'miss';
  if (gameId === 'darts') return v >= maxValue ? 'bull' : v <= 1 ? 'miss' : 'ring';
  if (gameId === 'bowling') return v >= maxValue ? 'strike' : v <= 0 ? 'miss' : 'pins';
  return 'roll';
}

/** Dart landing radius as a fraction of the board radius (6 = bullseye). */
export function dartRadius(value, maxValue = 6) {
  const v = Math.max(1, Math.min(maxValue, Number(value) || 1));
  if (v >= maxValue) return 0;
  if (v <= 1) return 1.12; // off the board
  return (maxValue - v) / (maxValue - 1);
}

/** Rotation that shows `face` (1..6) of the CSS die toward the viewer. */
export function dieRotation(face) {
  return {
    1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [0, 180],
  }[Math.max(1, Math.min(6, Number(face) || 1))];
}

const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
function dieFace(n) {
  return `<span class="die-face f${n} ${arcadeArtUrl("die") ? "painted-die" : ""}" ${arcadeArtUrl("die") ? `style="--die-painting:url(/art/arcade/v1/die-128.webp)"` : ""}>${Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n].includes(i + 1) ? 'on' : ''}"></i>`).join('')}</span>`;
}

function sceneHtml(gameId, game) {
  switch (gameId) {
    case 'basketball':
      return `
        <div class="as-board"><span class="as-board-square"></span></div>
        <div class="as-hoop" data-target><span class="as-rim"></span><span class="as-net"></span></div>
        <div class="as-shot" data-shot><span class="as-ball basket">${arcadeSpriteHtml("basketball-ball")}</span></div>`;
    case 'football':
      return `
        <div class="as-goal" data-target><span class="as-goal-net"></span><span class="as-keeper"></span></div>
        <span class="as-pitch" aria-hidden="true"></span>
        <div class="as-shot" data-shot><span class="as-ball soccer">${arcadeSpriteHtml("football-ball")}</span></div>`;
    case 'darts':
      return `
        <div class="as-dartboard" data-target><span class="as-bull"></span></div>
        <div class="as-shot dart" data-shot><span class="as-dart">${arcadeSpriteHtml("dart")}</span></div>`;
    case 'bowling':
      return `
        <span class="as-lane" aria-hidden="true"></span>
        <div class="as-pins" data-target>${[1, 2, 3, 4, 5, 6].map(n => `<span class="as-pin p${n}">${arcadeSpriteHtml("pin")}</span>`).join('')}</div>
        <div class="as-shot bowl" data-shot><span class="as-ball bowling">${arcadeSpriteHtml("bowling-ball")}</span></div>`;
    case 'slots': {
      const reels = game?.reels?.length ? game.reels : ['🍒', '⭐', '💎'];
      return `
        <div class="as-machine">${reels.map((symbol, i) => `<div class="as-reel" data-reel="${i}"><div class="as-strip"><span>${slotPaintingHtml(symbol)}</span></div></div>`).join('')}</div>
        <span class="as-slots-line" aria-hidden="true"></span>`;
    }
    default: {
      const [rx, ry] = dieRotation(game?.lastValue || 1);
      return `
        <div class="as-die-wrap"><div class="as-die" data-die style="--rx:${rx}deg;--ry:${ry}deg">${[1, 2, 3, 4, 5, 6].map(dieFace).join('')}</div></div>
        <span class="as-die-shadow" aria-hidden="true"></span>`;
    }
  }
}

export function stageHtml(gameId, game) {
  const art = arcadeArtUrl(gameId) || (gameId === 'basketball' ? worldArtUrl('games/basketball',512) : null);
  return `<div class="arcade-stage as-${gameId} ${art ? "painted-game" : ""}" data-stage="${gameId}" ${art ? `style="--arcade-painting:url('${art}')"` : ''}>${sceneHtml(gameId, game)}<div class="as-flash" data-flash></div></div>`;
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function centerOf(el, stageRect) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - stageRect.left, y: r.top + r.height / 2 - stageRect.top, w: r.width, h: r.height };
}

// Projectile along an arc: the outer node moves linearly in x, the inner in y
// up to `peak` then down to the target (two ease halves = a parabola).
async function arc(stage, shot, to, { peak = -70, duration = 800, spin = true } = {}) {
  const stageRect = stage.getBoundingClientRect();
  const from = centerOf(shot, stageRect);
  const ball = shot.firstElementChild;
  shot.style.setProperty('--tx', `${to.x - from.x}px`);
  shot.style.setProperty('--ty', `${to.y - from.y}px`);
  shot.style.setProperty('--peak', `${Math.min(peak, to.y - from.y - 40)}px`);
  shot.style.setProperty('--dur', `${duration}ms`);
  shot.style.setProperty('--scale', String(to.scale ?? 1));
  shot.classList.remove('fly');
  void shot.offsetWidth;
  shot.classList.add('fly');
  if (spin) ball.classList.add('spin');
  await wait(duration);
}

function flash(stage, kind) {
  const node = stage.querySelector('[data-flash]');
  node.className = `as-flash ${kind}`;
  void node.offsetWidth;
  node.classList.add('on');
}

/**
 * Plays one throw on a mounted stage and resolves when it has landed.
 * `value` is the server's roll; for slots pass the final reels array.
 */
export async function playThrow(stage, gameId, value, { maxValue = 6 } = {}) {
  if (!stage || reduced()) return;
  const outcome = throwOutcome(gameId, value, maxValue);
  const stageRect = stage.getBoundingClientRect();
  const shot = stage.querySelector('[data-shot]');
  const target = stage.querySelector('[data-target]');

  if (gameId === 'basketball') {
    const hoop = centerOf(target.querySelector('.as-rim'), stageRect);
    const to = outcome === 'hit' ? { x: hoop.x, y: hoop.y - 6, scale: .62 }
      : outcome === 'rim' ? { x: hoop.x + hoop.w * .48, y: hoop.y - 8, scale: .62 }
        : { x: hoop.x - hoop.w * 1.3, y: hoop.y + 30, scale: .7 };
    await arc(stage, shot, to, { peak: -(stageRect.height * .55), duration: 850 });
    shot.classList.add(`after-${outcome}`);
    if (outcome === 'hit') { target.classList.add('swish'); flash(stage, 'win'); }
    if (outcome === 'rim') target.classList.add('clank');
    await wait(550);
    return;
  }

  if (gameId === 'football') {
    const goal = centerOf(target, stageRect);
    const side = Math.random() < .5 ? -1 : 1;
    const to = outcome === 'hit' ? { x: goal.x + side * goal.w * .3, y: goal.y - goal.h * .1, scale: .55 }
      : outcome === 'post' ? { x: goal.x + side * goal.w * .5, y: goal.y, scale: .55 }
        : { x: goal.x + side * goal.w * .75, y: goal.y - goal.h * .9, scale: .5 };
    target.style.setProperty('--dive', String(outcome === 'hit' ? -side : side));
    target.classList.add('dive');
    await arc(stage, shot, to, { peak: -30, duration: 650 });
    shot.classList.add(`after-${outcome}`);
    if (outcome === 'hit') { target.classList.add('goal'); flash(stage, 'win'); }
    await wait(550);
    return;
  }

  if (gameId === 'darts') {
    const board = centerOf(target, stageRect);
    const radius = dartRadius(value, maxValue) * board.w / 2;
    const angle = Math.random() * Math.PI * 2;
    const to = { x: board.x + Math.cos(angle) * radius, y: board.y + Math.sin(angle) * radius, scale: .7 };
    await arc(stage, shot, to, { peak: -20, duration: 420, spin: false });
    shot.classList.add('stuck');
    target.classList.add('thud');
    if (outcome === 'bull') flash(stage, 'win');
    await wait(450);
    return;
  }

  if (gameId === 'bowling') {
    const pins = centerOf(target, stageRect);
    await arc(stage, shot, { x: pins.x + (Math.random() - .5) * 16, y: pins.y + pins.h * .2, scale: .55 }, { peak: 0, duration: 700 });
    const all = [...target.querySelectorAll('.as-pin')];
    const knocked = all.sort(() => Math.random() - .5).slice(0, Math.min(all.length, Number(value) || 0));
    knocked.forEach((pin, i) => {
      pin.style.setProperty('--fall', `${(Math.random() < .5 ? -1 : 1) * (60 + Math.random() * 40)}deg`);
      pin.style.animationDelay = `${i * 45}ms`;
      pin.classList.add('down');
    });
    if (outcome === 'strike') flash(stage, 'win');
    await wait(650);
    return;
  }

  if (gameId === 'slots') {
    const reels = Array.isArray(value) ? value : String(value).split('');
    const nodes = [...stage.querySelectorAll('[data-reel]')];
    nodes.forEach((reel, i) => {
      const strip = reel.querySelector('.as-strip');
      const filler = Array.from({ length: 14 + i * 5 }, () => SLOT_STRIP[Math.floor(Math.random() * SLOT_STRIP.length)]);
      strip.innerHTML = [...filler, reels[i] ?? '❔'].map(symbol => `<span>${symbol}</span>`).join('');
      strip.style.setProperty('--stop', String(filler.length));
      strip.style.setProperty('--dur', `${900 + i * 350}ms`);
      strip.classList.remove('spin');
      void strip.offsetWidth;
      strip.classList.add('spin');
    });
    await wait(900 + (nodes.length - 1) * 350 + 150);
    if (reels.length === 3 && reels.every(symbol => symbol === reels[0])) flash(stage, 'win');
    return;
  }

  // Dice: tumble, then settle on the rolled face.
  const die = stage.querySelector('[data-die]');
  const [rx, ry] = dieRotation(value);
  die.style.setProperty('--rx', `${rx + 720}deg`);
  die.style.setProperty('--ry', `${ry + 720}deg`);
  die.classList.remove('tumble');
  void die.offsetWidth;
  die.classList.add('tumble');
  await wait(1000);
}

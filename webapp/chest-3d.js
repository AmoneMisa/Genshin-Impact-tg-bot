// 3D treasure chests for the chest mini-game, drawn with the shared glTF
// context from loot-gltf.js. The Blender model (scripts/blender/treasure_chest.py)
// has named nodes: `lid` (pivot on the hinge), `glow`, `treasure`.
//
// Idle chests bob and sway; opening plays an anticipation rattle, then the lid
// swings back with an overshoot while light spills out and sparkles rise. Empty
// chests open dark with the treasure hidden.

import { getGltfStage } from './loot-gltf.js';

export const CHEST_MODEL_URL = '/models/chest.glb';
export const LID_OPEN_ANGLE = 1.95;          // radians
export const RATTLE_SECONDS = 0.28;
export const SWING_SECONDS = 0.55;

/** Lid angle (radians, 0 = closed) `t` seconds after opening starts. */
export function lidAngle(t) {
  if (!(t > RATTLE_SECONDS)) return 0;
  const s = Math.min(1, (t - RATTLE_SECONDS) / SWING_SECONDS);
  // easeOutBack: overshoots slightly past fully open, then settles.
  const c1 = 1.5, c3 = c1 + 1;
  return LID_OPEN_ANGLE * (1 + c3 * Math.pow(s - 1, 3) + c1 * Math.pow(s - 1, 2));
}

/** 0..1 glow intensity while opening (empty chests stay dark). */
export function glowLevel(t, empty) {
  if (empty || !(t > RATTLE_SECONDS)) return 0;
  const s = Math.min(1, (t - RATTLE_SECONDS) / 0.4);
  const flare = Math.max(0, 1 - Math.abs(t - RATTLE_SECONDS - 0.35) / 0.35);
  return Math.min(1.6, 0.55 * s + flare);
}

function reducedMotion() {
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false; } catch { return false; }
}

const scenes = new Set();
let loopRaf = 0;
let lastFrame = 0;

function loop(now) {
  if (!scenes.size) { loopRaf = 0; lastFrame = 0; return; }
  loopRaf = requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - (lastFrame || now)) / 1000);
  lastFrame = now;
  if (document.hidden) return;
  for (const scene of [...scenes]) {
    if (!scene.host.isConnected) { scene.destroy(); continue; }
    if (scene.visible) scene.draw(now, dt);
  }
}

function ensureLoop() {
  if (!loopRaf) loopRaf = requestAnimationFrame(loop);
}

/**
 * Mounts a 3D chest into `host` (the tile). Resolves to a controller:
 *   { open(kind: 'treasure' | 'empty') , showOpened(kind), destroy() }
 * or null when 3D is unavailable (the tile keeps its CSS look).
 */
export async function createChest(host, { opened = null, index = 0 } = {}) {
  if (typeof window === 'undefined' || reducedMotion()) return null;
  let stage, gltf;
  try {
    stage = await getGltfStage();
    gltf = await stage.load(CHEST_MODEL_URL);
  } catch (error) {
    console.warn(error);
    return null;
  }
  if (!host.isConnected) return null;
  const { THREE } = stage;

  const canvas = document.createElement('canvas');
  canvas.className = 'chest-3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  host.prepend(canvas);
  host.classList.add('chest-3d-ready');

  const scene = new THREE.Scene();
  scene.environment = stage.environment;
  const model = gltf.scene.clone(true);
  // Per-chest materials so one chest's glow doesn't light up the others.
  const owned = [];
  const cloneMaterial = material => { const copy = material.clone(); owned.push(copy); return copy; };
  model.traverse(obj => {
    if (obj.isMesh) obj.material = Array.isArray(obj.material) ? obj.material.map(cloneMaterial) : cloneMaterial(obj.material);
  });
  const lid = model.getObjectByName('lid');
  const glow = model.getObjectByName('glow');
  const treasure = model.getObjectByName('treasure');
  const glowMat = glow?.material;
  const baseGlow = glowMat?.emissiveIntensity ?? 1;

  // Centre the chest (body + closed lid) on the origin.
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const holder = new THREE.Group();
  holder.add(model);
  scene.add(holder);

  scene.add(new THREE.HemisphereLight(0xfff0dd, 0x1a1420, 0.35));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.5);
  key.position.set(-1.5, 2.5, 2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc27a, 1.2);
  rim.position.set(2, 1.5, -2.5);
  scene.add(rim);
  const inner = new THREE.PointLight(0xffc15a, 0, 3.5, 1.6);
  inner.position.set(0, 0.25, 0.05);
  model.add(inner);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshBasicMaterial({ map: stage.shadowTexture, transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = box.min.y - center.y - 0.01;
  scene.add(shadow);

  // Sparkles that rise out of an opening treasure chest.
  const sparkles = Array.from({ length: 8 }, (_, i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: stage.starTexture, color: 0xffd98a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }));
    sprite.userData = { phase: i / 8, x: (Math.random() - 0.5) * 0.7, z: (Math.random() - 0.5) * 0.3, speed: 0.6 + Math.random() * 0.5 };
    scene.add(sprite);
    return sprite;
  });

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 20);
  const state = { mode: 'idle', kind: 'treasure', openedAt: 0, seed: index * 1.7 };

  function setOpenedStatic(kind) {
    state.mode = 'opened';
    state.kind = kind;
    if (lid) lid.rotation.x = -LID_OPEN_ANGLE;
    if (treasure) treasure.visible = kind !== 'empty';
    if (glowMat) glowMat.emissiveIntensity = kind === 'empty' ? 0 : baseGlow * 0.5;
    inner.intensity = kind === 'empty' ? 0 : 0.8;
  }
  if (opened) setOpenedStatic(opened);

  const controller = {
    host,
    visible: true,
    draw(now) {
      const seconds = now / 1000 + state.seed;
      const { w, h } = stage.sizeCanvas(canvas);
      let bloom = 0;
      if (state.mode === 'idle') {
        holder.position.y = Math.sin(seconds * 1.4) * 0.02;
        holder.rotation.set(0, Math.sin(seconds * 0.6) * 0.18, 0);
      } else if (state.mode === 'opening') {
        const t = (now - state.openedAt) / 1000;
        const empty = state.kind === 'empty';
        const rattle = t < RATTLE_SECONDS ? Math.sin(t * 90) * 0.06 * (1 - t / RATTLE_SECONDS) : 0;
        holder.rotation.set(0, 0, rattle);
        const squash = t < RATTLE_SECONDS ? 1 - Math.sin((t / RATTLE_SECONDS) * Math.PI) * 0.06 : 1;
        holder.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
        if (lid) lid.rotation.x = -lidAngle(t);
        const g = glowLevel(t, empty);
        if (glowMat) glowMat.emissiveIntensity = baseGlow * g;
        inner.intensity = g * 2.2;
        bloom = empty ? 0 : 0.2 + g * 0.5;
        for (const sprite of sparkles) {
          const { phase, x, z, speed } = sprite.userData;
          const life = empty ? 0 : (t - RATTLE_SECONDS - phase * 0.4) * speed;
          sprite.visible = life > 0 && life < 1.2;
          sprite.position.set(x * (1 + life * 0.4), 0.1 + life * 0.8, z);
          sprite.scale.setScalar(0.12 + 0.1 * Math.sin(life * 3));
          sprite.material.opacity = Math.max(0, 1 - life / 1.2);
          sprite.material.rotation = life * 2;
        }
        if (t > RATTLE_SECONDS + SWING_SECONDS + 1.3) {
          setOpenedStatic(state.kind);
          holder.scale.setScalar(1);
          for (const sprite of sparkles) sprite.visible = false;
        }
      } else {
        holder.rotation.set(0, Math.sin(seconds * 0.4) * 0.08, 0);
        bloom = state.kind === 'empty' ? 0 : 0.25;
      }
      // Elevated three-quarter camera looking into the chest.
      const aspect = w / h;
      camera.aspect = aspect;
      camera.position.set(0, 1.05, 2.25 / Math.min(1, aspect));
      camera.lookAt(0, -0.02, 0);
      camera.updateProjectionMatrix();
      stage.renderInto(canvas, ctx, scene, camera, { bloom });
    },
    open(kind = 'treasure') {
      state.kind = kind;
      state.mode = 'opening';
      state.openedAt = performance.now();
      if (treasure) treasure.visible = kind !== 'empty';
      host.classList.add('chest-3d-opening');
    },
    showOpened(kind) { setOpenedStatic(kind); },
    destroy() {
      scenes.delete(controller);
      observer?.disconnect();
      for (const m of owned) m.dispose();
      for (const s of sparkles) s.material.dispose();
      shadow.geometry.dispose();
      shadow.material.dispose();
      scene.clear();
      canvas.remove();
    },
  };
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => { controller.visible = entry.isIntersecting; }) : null;
  observer?.observe(host);
  scenes.add(controller);
  ensureLoop();
  return controller;
}

// 2.5D boss battle stage: the boss painting brought to life in one fragment
// shader, with the player's class portrait fighting it.
//
// Boss: pseudo-depth parallax (the subject is centred in every painting, so a
// centre-weighted depth warps it against a slower blurred backdrop as the camera
// sways), breathing idle, per-boss elemental effect, periodic lunging attacks,
// hit shake/flash/zoom punch, crit chromatic split, low-HP pulse, defeat dissolve.
//
// Player: class portrait with idle bob; each skill plays a class animation in the
// shader (slash / arrow / orb / holy beam / impact) and the boss reacts on the
// skill's impact frame; heal and shield play as auras on the portrait.
//
// Falls back to a plain <img> without WebGL and a still frame with reduced motion.

export const BOSS_ART = Object.freeze({
  kivaha: { element: 1, tint: [0.55, 0.78, 1.0] },        // lightning turtle
  avrora: { element: 2, tint: [0.35, 0.85, 1.0] },        // corrupted water fairy
  fjorina: { element: 3, tint: [1.0, 0.5, 0.18] },        // fire-and-poison naga
  radjahal: { element: 4, tint: [0.75, 0.9, 1.0] },       // ice orangutan
  carnevorusIsse: { element: 5, tint: [1.0, 0.82, 0.45] }, // light/dark flower
});

/** Shader skill ids and the delay (s) from cast to impact. */
export const SKILL_FX = Object.freeze({
  slash: { id: 1, impact: 0.2 },
  arrow: { id: 2, impact: 0.3 },
  orb: { id: 3, impact: 0.42 },
  beam: { id: 4, impact: 0.16 },
  punch: { id: 5, impact: 0.06 },
});

const CLASS_SKILL = Object.freeze({ warrior: 'slash', archer: 'arrow', mage: 'orb', priest: 'beam', noClass: 'punch' });

/** Damage-skill animation for a class (unknown classes punch). */
export function skillFxForClass(className) {
  return CLASS_SKILL[className] || 'punch';
}

export function bossArtUrl(name) {
  return BOSS_ART[name] ? `/art/bosses/${name}.webp` : null;
}

export function classArtUrl(className, gender) {
  const cls = CLASS_SKILL[className] ? className : 'noClass';
  return `/art/classes/${cls}-${gender === 'female' ? 'female' : 'male'}.webp`;
}

/** Decaying envelope used for reactions: 1 at t = 0, ~0 after `duration`, 0 before 0. */
export function hitEnvelope(secondsSinceHit, duration = 0.45) {
  if (!(secondsSinceHit >= 0) || secondsSinceHit > duration) return 0;
  const t = secondsSinceHit / duration;
  return Math.pow(1 - t, 2.2);
}

/** Boss lunge: quick wind-up toward the camera, slower settle; 0..1. */
export function lungeEnvelope(seconds, duration = 0.7) {
  if (!(seconds >= 0) || seconds > duration) return 0;
  const t = seconds / duration;
  return t < 0.3 ? Math.sin((t / 0.3) * Math.PI / 2) : Math.pow(1 - (t - 0.3) / 0.7, 1.6);
}

const VERTEX = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAGMENT = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_art;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_sway;
uniform float u_hit;
uniform float u_crit;
uniform float u_low;
uniform float u_lunge;
uniform float u_dissolve;
uniform int u_element;
uniform vec3 u_tint;
uniform int u_skill;
uniform float u_skillT;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += noise(p) * a; p *= 2.03; a *= 0.5; } return s; }

vec2 aspectFix(vec2 p){ float aspect = u_res.x / u_res.y; if (aspect > 1.0) p.y /= aspect; else p.x *= aspect; return p; }

// Cover-fit the square painting into the stage and apply parallax + zoom.
vec2 artUv(vec2 uv, float depth, float zoom){
  vec2 p = aspectFix(uv - 0.5);
  p /= zoom;
  p += u_sway * depth;
  return p + 0.5;
}

vec3 sampleArt(vec2 uv){ return texture2D(u_art, clamp(uv, 0.001, 0.999)).rgb; }

vec3 blurArt(vec2 uv){
  vec3 c = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398;
    c += sampleArt(uv + vec2(cos(a), sin(a)) * 0.018);
  }
  return c / 8.0;
}

// ---- boss elements (screen space, additive) ----
vec3 lightning(vec2 uv){
  float flash = pow(max(0.0, sin(u_time * 1.7) * sin(u_time * 3.1 + 1.0)), 18.0) + u_lunge;
  vec3 c = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float x = 0.25 + 0.5 * hash(vec2(floor(u_time * 0.8 + fk * 7.0), fk));
    float path = x + (fbm(vec2(uv.y * 6.0, floor(u_time * 8.0) + fk * 3.0)) - 0.5) * 0.35;
    float d = abs(uv.x - path);
    c += u_tint * (smoothstep(0.012, 0.0, d) + smoothstep(0.05, 0.0, d) * 0.25) * flash * 2.4;
  }
  return c + u_tint * flash * 0.18;
}

vec3 water(vec2 uv){
  vec2 p = uv * vec2(6.0, 4.0) + vec2(0.0, u_time * 0.25);
  float caustic = pow(abs(sin(fbm(p) * 9.0 + u_time)), 12.0) * 0.35;
  // Sparse bubbles drifting up and fading out, not an even lattice of rings.
  float bubbles = 0.0;
  for (int k = 0; k < 2; k++) {
    vec2 g = uv * vec2(8.0, 5.0) + vec2(float(k) * 3.7 + sin(u_time * 0.8 + uv.y * 5.0) * 0.25, -u_time * (0.35 + float(k) * 0.2));
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = hash(id + float(k) * 17.0);
    float r = 0.06 + h * 0.05;
    bubbles += smoothstep(0.03, 0.0, abs(length(f - (vec2(h, fract(h * 9.0)) - 0.5) * 0.5) - r)) * step(0.9, h);
  }
  return u_tint * (caustic * smoothstep(0.9, 0.2, uv.y) + bubbles * 0.7 * smoothstep(1.0, 0.35, uv.y));
}

vec3 embers(vec2 uv){
  // Sparse, glowing sparks that rise from the bottom and burn out as they climb.
  vec3 c = vec3(0.0);
  for (int k = 0; k < 2; k++) {
    vec2 g = uv * vec2(9.0, 5.0) + vec2(sin(u_time * 0.7 + float(k) * 2.0 + uv.y * 4.0) * 0.35, -u_time * (0.55 + float(k) * 0.3));
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = hash(id + float(k) * 11.0);
    float d = length(f - (vec2(h, fract(h * 7.0)) - 0.5) * 0.6);
    float spark = smoothstep(0.09, 0.0, d) + smoothstep(0.22, 0.0, d) * 0.35;
    float flicker = 0.65 + 0.35 * sin(u_time * 9.0 + h * 40.0);
    c += vec3(1.0, 0.42 + h * 0.25, 0.08) * spark * step(0.9, h) * flicker * smoothstep(0.95, 0.15, uv.y) * 1.8;
  }
  float heat = smoothstep(0.45, 0.0, uv.y) * (0.5 + 0.5 * sin(u_time * 2.0 + uv.x * 9.0));
  return c + vec3(1.0, 0.35, 0.05) * heat * 0.22;
}

vec3 frost(vec2 uv){
  vec3 c = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    vec2 g = uv * vec2(12.0 + float(k) * 6.0, 8.0 + float(k) * 4.0) + vec2(sin(u_time * 0.4 + float(k)) * 0.8, u_time * (0.5 + float(k) * 0.3));
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = hash(id + float(k) * 5.0);
    c += vec3(0.9, 0.96, 1.0) * smoothstep(0.1, 0.0, length(f - (vec2(h, fract(h * 3.0)) - 0.5) * 0.6)) * step(0.7, h);
  }
  float edge = smoothstep(0.32, 0.5, length(uv - 0.5));
  return c * 0.9 + u_tint * fbm(uv * 14.0) * edge * 0.6;
}

vec3 motes(vec2 uv){
  vec3 c = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    vec2 g = uv * vec2(10.0, 8.0) + vec2(sin(u_time * 0.5 + float(k) * 2.0), cos(u_time * 0.4 + float(k)) - u_time * 0.2);
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = hash(id + float(k) * 9.0);
    float glow = smoothstep(0.2, 0.0, length(f - (vec2(h, fract(h * 5.0)) - 0.5) * 0.5)) * step(0.75, h);
    vec3 col = mix(vec3(1.0, 0.85, 0.45), vec3(0.62, 0.35, 1.0), step(0.5, fract(h * 13.0)));
    c += col * glow * (0.6 + 0.4 * sin(u_time * 2.0 + h * 20.0));
  }
  return c;
}

// ---- player skills (screen space, additive; t = seconds since cast) ----
// Short flash window around a skill's impact time 'at'.
float hitWindow(float t, float at){ return smoothstep(0.0, 0.03, t - at) * (1.0 - smoothstep(at + 0.03, at + 0.3, t)); }
float segment(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }

vec3 skillFx(vec2 uv, int kind, float t){
  if (t < 0.0 || t > 1.0) return vec3(0.0);
  vec2 p = aspectFix(uv - 0.5);
  if (kind == 1) { // slash: a bright crescent sweeping across the boss
    float s = clamp(t / 0.22, 0.0, 1.0);
    float head = mix(2.5, -0.7, s);
    float a = atan(p.y, p.x);
    float d = abs(length(p) - 0.28);
    float band = smoothstep(0.014, 0.0, d) * smoothstep(head + 1.1, head, a) * step(head, a);
    float fade = 1.0 - smoothstep(0.25, 0.55, t);
    return vec3(1.0, 0.92, 0.7) * band * fade * 3.0 + vec3(1.0, 0.8, 0.4) * smoothstep(0.06, 0.0, d) * band * fade;
  }
  if (kind == 2) { // arrow: streak from the player's corner into the boss
    float s = clamp(t / 0.3, 0.0, 1.0);
    vec2 from = aspectFix(vec2(-0.42, -0.42)), to = vec2(0.0, 0.02);
    vec2 head = mix(from, to, s);
    vec2 tail = mix(from, to, max(0.0, s - 0.35));
    float d = segment(p, tail, head);
    float fly = step(t, 0.3);
    float burst = smoothstep(0.12, 0.0, length(p - to)) * hitWindow(t, 0.3);
    return vec3(0.75, 0.95, 1.0) * (smoothstep(0.006, 0.0, d) * 2.5 + smoothstep(0.03, 0.0, d) * 0.4) * fly + vec3(0.8, 1.0, 1.0) * burst * 2.0;
  }
  if (kind == 3) { // orb: arcane sphere growing as it flies, bursting into a ring
    float s = clamp(t / 0.42, 0.0, 1.0);
    vec2 c = mix(aspectFix(vec2(-0.35, -0.45)), vec2(0.0, 0.02), s * s);
    float r = mix(0.025, 0.07, s);
    float orb = smoothstep(r, r * 0.3, length(p - c)) * step(t, 0.42);
    float glow = smoothstep(r * 3.0, 0.0, length(p - c)) * 0.5 * step(t, 0.42);
    float ringR = max(0.0, (t - 0.42) * 1.2);
    float ring = smoothstep(0.025, 0.0, abs(length(p) - ringR)) * (1.0 - smoothstep(0.42, 0.95, t)) * step(0.42, t);
    return vec3(0.75, 0.45, 1.0) * (orb * 2.5 + glow + ring * 2.2);
  }
  if (kind == 4) { // holy beam: a column of light onto the boss
    float grow = smoothstep(0.0, 0.16, t) * (1.0 - smoothstep(0.45, 0.8, t));
    float w = 0.12 * grow;
    float col = smoothstep(w, w * 0.2, abs(p.x)) * grow;
    float sparkle = step(0.97, hash(floor(uv * vec2(40.0, 60.0) + vec2(0.0, -t * 30.0)))) * col;
    return vec3(1.0, 0.92, 0.65) * (col * 1.6 + sparkle * 2.0);
  }
  if (kind == 5) { // impact star
    float s = hitWindow(t, 0.06);
    float a = atan(p.y, p.x);
    float star = smoothstep(0.25 * s, 0.0, length(p) * (0.6 + 0.4 * abs(sin(a * 4.0))));
    return vec3(1.0, 0.85, 0.6) * star * 2.0;
  }
  return vec3(0.0);
}

void main(){
  vec2 uv = v_uv;
  float t = u_time;
  vec2 shake = vec2(sin(t * 83.0), cos(t * 71.0)) * (0.012 * u_hit + 0.008 * u_lunge);
  uv += shake;
  float breathe = 1.0 + sin(t * 1.1) * 0.012;
  float zoom = breathe + u_hit * 0.035 + u_lunge * 0.14;

  float depth = 0.55 + 0.45 * smoothstep(0.75, 0.0, length(v_uv - vec2(0.5, 0.52)));
  vec2 fgUv = artUv(uv, depth * 0.06, zoom);
  vec2 bgUv = artUv(uv, 0.02, zoom * 1.12);

  vec3 bg = blurArt(bgUv) * 0.45;
  vec3 fg;
  if (u_crit > 0.01) {
    float split = 0.006 * u_crit;
    fg = vec3(sampleArt(fgUv + vec2(split, 0.0)).r, sampleArt(fgUv).g, sampleArt(fgUv - vec2(split, 0.0)).b);
  } else {
    fg = sampleArt(fgUv);
  }
  float subject = smoothstep(0.78, 0.35, length((v_uv - vec2(0.5, 0.5)) * vec2(1.0, 0.9)));
  vec3 color = mix(bg, fg, 0.55 + 0.45 * subject);

  if (u_element == 1) color += lightning(v_uv);
  else if (u_element == 2) color += water(v_uv);
  else if (u_element == 3) color += embers(v_uv);
  else if (u_element == 4) color += frost(v_uv);
  else if (u_element == 5) color += motes(v_uv);

  // Boss lunge: an elemental burst radiating from the boss toward the camera.
  color += u_tint * u_lunge * smoothstep(0.7, 0.0, length(v_uv - 0.5)) * 0.8;
  color += skillFx(v_uv, u_skill, u_skillT);
  color += mix(vec3(1.0, 0.35, 0.3), vec3(1.0), u_crit) * u_hit * 0.35;

  float vignette = smoothstep(0.3, 0.85, length(v_uv - 0.5));
  color = mix(color, vec3(0.02, 0.02, 0.05), vignette * 0.55);
  color += vec3(0.9, 0.05, 0.08) * vignette * u_low * (0.35 + 0.25 * sin(t * 4.0));

  float alpha = 1.0;
  if (u_dissolve > 0.0) {
    // fbm sits mostly in 0.25..0.75: sweep the threshold across that band so the
    // burn takes the whole animation, with a wide glowing rim at the burn front.
    float n = fbm(v_uv * 6.0);
    float threshold = mix(0.2, 0.82, u_dissolve);
    alpha = smoothstep(threshold - 0.015, threshold + 0.015, n);
    float rim = smoothstep(threshold + 0.09, threshold, n) * alpha;
    color += mix(u_tint, vec3(1.0, 0.95, 0.8), 0.4) * rim * 3.0;
  }
  gl_FragColor = vec4(color * alpha, alpha);
}`;

function reducedMotion() {
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false; } catch { return false; }
}

function portrait(host, player) {
  if (!player) return null;
  const node = document.createElement('div');
  node.className = 'boss-stage-player';
  node.innerHTML = `<img src="${classArtUrl(player.className, player.gender)}" alt=""><span class="boss-stage-aura"></span>`;
  host.appendChild(node);
  return node;
}

/** Restart a one-shot CSS animation class on `node`. */
function pulseClass(node, cls, ms) {
  if (!node) return;
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
  window.setTimeout(() => node.classList.remove(cls), ms);
}

function staticFallback(host, name, player) {
  const url = bossArtUrl(name);
  host.innerHTML = url ? `<img class="boss-stage-still" src="${url}" alt="">` : '';
  const hero = portrait(host, player);
  return {
    name,
    setHp() {},
    playSkill(kind) { if (kind === 'heal' || kind === 'shield') pulseClass(hero, kind === 'heal' ? 'healing' : 'shielding', 900); },
    hit() {},
    bossAttack() {},
    defeat() {},
    destroy() { host.innerHTML = ''; },
  };
}

function compile(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'boss stage shader failed');
  return s;
}

/**
 * Mounts the stage into `host`.
 * options: { name, hpPercent, player: { className, gender }, autoAttack = true }
 * Returns { setHp, playSkill(kind, { crit }), bossAttack(), defeat(), destroy() }.
 * playSkill kind: 'damage' (animation chosen by class) | 'heal' | 'shield' | a SKILL_FX key.
 */
export function createBossStage(host, { name, hpPercent = 100, player = null, autoAttack = true } = {}) {
  const art = BOSS_ART[name];
  if (!art || typeof window === 'undefined' || reducedMotion()) return staticFallback(host, name, player);

  const canvas = document.createElement('canvas');
  canvas.className = 'boss-stage-canvas';
  host.replaceChildren(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return staticFallback(host, name, player);

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'link failed');
  } catch (error) {
    console.warn(error);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return staticFallback(host, name, player);
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const u = key => gl.getUniformLocation(program, key);
  const uniforms = {
    res: u('u_res'), time: u('u_time'), sway: u('u_sway'), hit: u('u_hit'), crit: u('u_crit'), low: u('u_low'),
    lunge: u('u_lunge'), dissolve: u('u_dissolve'), element: u('u_element'), tint: u('u_tint'), skill: u('u_skill'), skillT: u('u_skillT'),
  };
  gl.uniform1i(uniforms.element, art.element);
  gl.uniform3fv(uniforms.tint, art.tint);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([10, 10, 20, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    host.classList.add('ready');
  };
  image.src = bossArtUrl(name);
  const hero = portrait(host, player);

  const state = {
    hp: hpPercent, hitAt: -1e9, crit: 0, lungeAt: -1e9, defeatAt: null, skill: 0, skillAt: -1e9,
    pointer: [0, 0], sway: [0, 0], nextAttack: performance.now() + 5000,
  };
  const onPointer = event => {
    const rect = host.getBoundingClientRect();
    if (!rect.width) return;
    state.pointer = [((event.clientX - rect.left) / rect.width - 0.5) * 2, ((event.clientY - rect.top) / rect.height - 0.5) * -2];
  };
  const onLeave = () => { state.pointer = [0, 0]; };
  host.addEventListener('pointermove', onPointer, { passive: true });
  host.addEventListener('pointerleave', onLeave, { passive: true });

  function bossAttack() {
    if (state.defeatAt !== null) return;
    state.lungeAt = performance.now();
    // The player recoils as the lunge peaks.
    window.setTimeout(() => pulseClass(hero, 'recoil', 500), 200);
  }

  let raf = 0, visible = true, last = performance.now();
  const started = last;
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }) : null;
  observer?.observe(host);

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden || gl.isContextLost()) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const seconds = (now - started) / 1000;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(2, Math.round(host.clientWidth * dpr)), h = Math.max(2, Math.round(host.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    if (autoAttack && now >= state.nextAttack && state.defeatAt === null) {
      bossAttack();
      state.nextAttack = now + 7000 + Math.random() * 4000;
    }
    const target = [Math.sin(seconds * 0.35) * 0.35 + state.pointer[0], Math.sin(seconds * 0.27 + 1) * 0.25 + state.pointer[1]];
    const ease = 1 - Math.exp(-dt * 3);
    state.sway = state.sway.map((v, i) => v + (target[i] - v) * ease);
    const hit = hitEnvelope((now - state.hitAt) / 1000);
    gl.uniform2f(uniforms.res, w, h);
    gl.uniform1f(uniforms.time, seconds);
    gl.uniform2f(uniforms.sway, state.sway[0], state.sway[1]);
    gl.uniform1f(uniforms.hit, hit);
    gl.uniform1f(uniforms.crit, hit * state.crit);
    gl.uniform1f(uniforms.low, state.hp < 30 ? 1 - state.hp / 30 : 0);
    gl.uniform1f(uniforms.lunge, lungeEnvelope((now - state.lungeAt) / 1000));
    gl.uniform1f(uniforms.dissolve, state.defeatAt === null ? 0 : Math.min(1, (now - state.defeatAt) / 1700));
    gl.uniform1i(uniforms.skill, state.skill);
    gl.uniform1f(uniforms.skillT, (now - state.skillAt) / 1000);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  raf = requestAnimationFrame(frame);

  return {
    name,
    setHp(percent) { state.hp = Number(percent) || 0; },
    playSkill(kind = 'damage', { crit = false } = {}) {
      const now = performance.now();
      if (kind === 'heal' || kind === 'shield') {
        pulseClass(hero, kind === 'heal' ? 'healing' : 'shielding', 900);
        return;
      }
      const fx = SKILL_FX[kind] || SKILL_FX[skillFxForClass(player?.className)];
      state.skill = fx.id;
      state.skillAt = now;
      pulseClass(hero, 'attacking', 450);
      // The boss reacts on the impact frame, not when the button was pressed.
      state.hitAt = now + fx.impact * 1000;
      state.crit = crit ? 1 : 0;
      // A hit delays the boss's next counter-attack a little.
      state.nextAttack = Math.max(state.nextAttack, now + 2500);
    },
    hit(kind = 'damage', options = {}) { this.playSkill(kind, options); },
    bossAttack,
    defeat() { if (state.defeatAt === null) state.defeatAt = performance.now(); },
    destroy() {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      host.removeEventListener('pointermove', onPointer);
      host.removeEventListener('pointerleave', onLeave);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      host.replaceChildren();
    },
  };
}

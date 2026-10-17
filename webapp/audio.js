// Shared sound: effects and background music, all synthesised with Web Audio (no files to download).
// Sound starts after the first touch (browser rule), pauses with a hidden page and never blocks play when unavailable.

const KEY = 'audio-v1';
const defaults = { music: 0.45, sfx: 0.8, muted: false };
let prefs = { ...defaults };
try { prefs = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage is optional */ }

// Weak phones skip the echo and thin out the music.
const light = (() => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.deviceMemory || 4) <= 2 || (navigator.hardwareConcurrency || 4) <= 4; } catch { return false; }
})();

let ctx = null, master = null, sfxBus = null, musicBus = null, echoSend = null, noiseBuffer = null;
const listeners = new Set();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* optional */ } listeners.forEach(fn => fn({ ...prefs })); };

function ensure() {
  if (ctx) return ctx;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  try {
    ctx = new Context();
    master = ctx.createGain(); master.gain.value = prefs.muted ? 0 : 1; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = prefs.music * 0.5; musicBus.connect(master);
    if (!light) {
      const delay = ctx.createDelay(1), feedback = ctx.createGain(), tone = ctx.createBiquadFilter(), wet = ctx.createGain();
      delay.delayTime.value = 0.32; feedback.gain.value = 0.38; tone.type = 'lowpass'; tone.frequency.value = 2200; wet.gain.value = 0.5;
      echoSend = ctx.createGain(); echoSend.connect(delay); delay.connect(tone); tone.connect(feedback); feedback.connect(delay); tone.connect(wet); wet.connect(musicBus);
    }
    const length = ctx.sampleRate; noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0); for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  } catch { ctx = null; }
  return ctx;
}

/** Call once; resumes the context on the first touch and pauses it while the page is hidden. */
export function installAudio() {
  if (installAudio.done) return; installAudio.done = true;
  const unlock = () => { const c = ensure(); if (c && c.state === 'suspended' && !document.hidden) c.resume().catch(() => {}); if (c) { document.removeEventListener('pointerdown', unlock, true); document.removeEventListener('keydown', unlock, true); wantMusic(); } };
  document.addEventListener('pointerdown', unlock, true); document.addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { ctx.suspend().catch(() => {}); townAudio?.pause(); } else { ctx.resume().catch(() => {}); townAudio?.play().catch(() => {}); }
  });
}

// ---- Original client sounds (webapp/audio, built by scripts/l2j/build-l2-audio.py), loaded on first use. ----
let l2Pack = null;
const loadPack = () => l2Pack ||= import('./audio/l2-audio.js').catch(() => null);
const buffers = new Map();
function loadBuffer(url) {
  if (!buffers.has(url)) buffers.set(url, fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))
    .then(data => new Promise((resolve, reject) => ctx.decodeAudioData(data, resolve, reject))).catch(() => null));
  return buffers.get(url);
}
async function playFile(url, { vol = 1, at = 0 } = {}) {
  const buffer = await loadBuffer(url);
  if (!buffer || !ready() || document.hidden) return false;
  const src = ctx.createBufferSource(), gain = ctx.createGain();
  src.buffer = buffer; gain.gain.value = vol; src.connect(gain); gain.connect(sfxBus); src.start(ctx.currentTime + at);
  return true;
}
// Effects that use the client's own sound when it is there; the synthesised one is the fallback.
const FROM_CLIENT = { click: 'click', deal: 'paper', flip: 'paper', chip: 'money', matchWin: 'fanfareSmall', win: 'jackpot', craftOk: 'craftOk', craftFail: 'craftFail', enchantOk: 'enchantOk', enchantFail: 'enchantFail', levelUp: 'levelUp', diceRoll: 'diceRoll', pickup: 'pickup', clickFailed: 'clickFailed', windowOpen: 'windowOpen', windowClose: 'windowClose', potion: 'potionDrink', teleport: 'teleport', questAccept: 'questAccept' };

/** A skill's own sounds by its Lineage II id: the cast now, the shot a moment later. Resolves false when the client has none. */
export async function sfxSkill(l2Id, { shotDelay = 0.35 } = {}) {
  try {
    if (!ctx || !ready() || !l2Id) return false;
    const pack = await loadPack(), row = pack?.L2_SKILL_SOUNDS?.[l2Id];
    if (!row) return false;
    const [cast, shot, blast] = row;
    if (cast) playFile(pack.SFX_DIR + cast, { vol: 0.8 });
    if (shot) playFile(pack.SFX_DIR + shot, { vol: 0.9, at: cast ? shotDelay : 0 });
    if (blast) playFile(pack.SFX_DIR + blast, { vol: 0.8, at: shotDelay + 0.2 });
    return true;
  } catch { return false; }
}

const ready = () => ctx && ctx.state === 'running' && !prefs.muted && prefs.sfx > 0;

/** One oscillator note with an attack/decay envelope. */
function tone(freq, { at = 0, dur = 0.2, type = 'sine', vol = 0.3, slide = 0, attack = 0.005, bus = sfxBus, lowpass = 0, echo = 0 } = {}) {
  const t = ctx.currentTime + at, osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(vol, t + attack); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = osc;
  if (lowpass) { const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = lowpass; osc.connect(filter); node = filter; }
  node.connect(gain); gain.connect(bus);
  if (echo && echoSend && bus === musicBus) { const send = ctx.createGain(); send.gain.value = echo; gain.connect(send); send.connect(echoSend); }
  osc.start(t); osc.stop(t + dur + 0.05);
}
/** Filtered noise burst: card swishes, whooshes, thumps. */
function hiss({ at = 0, dur = 0.12, freq = 3000, to = 0, q = 0.8, vol = 0.2, type = 'bandpass' } = {}) {
  const t = ctx.currentTime + at, src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = noiseBuffer; filter.type = type; filter.Q.value = q; filter.frequency.setValueAtTime(freq, t);
  if (to) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter); filter.connect(gain); gain.connect(sfxBus); src.start(t, Math.random() * 0.5, dur + 0.05);
}
const notes = (list, step, options) => list.forEach((f, i) => tone(f, { at: i * step, ...options }));

const N = { c4: 261.63, d4: 293.66, e4: 329.63, g4: 392, a4: 440, b4: 493.88, c5: 523.25, d5: 587.33, e5: 659.25, g5: 783.99, a5: 880, c6: 1046.5 };

const EFFECTS = {
  click: () => tone(1400, { dur: 0.04, type: 'triangle', vol: 0.12 }),
  deal: () => { hiss({ dur: 0.09, freq: 4200, to: 2400, vol: 0.14 }); tone(900, { at: 0.07, dur: 0.03, type: 'triangle', vol: 0.06 }); },
  flip: () => { hiss({ dur: 0.07, freq: 2600, to: 5200, vol: 0.13 }); tone(1500, { at: 0.05, dur: 0.05, type: 'triangle', vol: 0.07 }); },
  cardPlay: () => { hiss({ dur: 0.1, freq: 3500, to: 1800, vol: 0.16 }); tone(150, { at: 0.07, dur: 0.14, type: 'sine', vol: 0.3, slide: 70 }); },
  unit: () => { EFFECTS.cardPlay(); tone(520, { at: 0.09, dur: 0.16, type: 'triangle', vol: 0.08, lowpass: 1800 }); },
  hero: () => { EFFECTS.cardPlay(); notes([N.g4, N.c5, N.e5], 0.07, { dur: 0.5, type: 'triangle', vol: 0.1, lowpass: 2600, at: 0.1 }); },
  weather: () => { hiss({ dur: 0.9, freq: 400, to: 2600, q: 0.5, vol: 0.2 }); tone(110, { dur: 0.8, type: 'sawtooth', vol: 0.06, slide: 70, lowpass: 400 }); },
  clear: () => { hiss({ dur: 0.5, freq: 3000, to: 500, q: 0.5, vol: 0.1 }); notes([N.e5, N.g5, N.c6], 0.09, { dur: 0.35, type: 'sine', vol: 0.09 }); },
  horn: () => { tone(196, { dur: 0.7, type: 'sawtooth', vol: 0.14, lowpass: 900, attack: 0.08 }); tone(293.66, { dur: 0.7, type: 'sawtooth', vol: 0.1, lowpass: 900, attack: 0.1 }); },
  trap: () => { hiss({ dur: 0.18, freq: 1200, to: 300, vol: 0.2 }); tone(330, { dur: 0.3, type: 'square', vol: 0.06, slide: 120, lowpass: 900 }); },
  pass: () => { tone(330, { dur: 0.5, type: 'sine', vol: 0.18 }); tone(220, { at: 0.12, dur: 0.6, type: 'sine', vol: 0.14 }); },
  turn: () => { tone(660, { dur: 0.12, type: 'sine', vol: 0.09 }); tone(880, { at: 0.09, dur: 0.18, type: 'sine', vol: 0.09 }); },
  roundWin: () => notes([N.c5, N.e5, N.g5, N.c6], 0.09, { dur: 0.5, type: 'triangle', vol: 0.16, lowpass: 3200 }),
  roundLose: () => notes([N.g4, N.e4, N.d4, N.c4], 0.13, { dur: 0.55, type: 'triangle', vol: 0.15, lowpass: 1600 }),
  draw: () => notes([N.e4, N.e4], 0.18, { dur: 0.4, type: 'triangle', vol: 0.14 }),
  matchWin: () => { notes([N.c5, N.e5, N.g5, N.c6, N.g5, N.c6], 0.13, { dur: 0.9, type: 'triangle', vol: 0.16, lowpass: 3400 }); notes([N.c4, N.g4], 0.4, { dur: 1.4, type: 'sine', vol: 0.12 }); },
  matchLose: () => { notes([N.a4, N.g4, N.e4, N.d4], 0.22, { dur: 0.9, type: 'triangle', vol: 0.14, lowpass: 1400 }); tone(98, { dur: 1.6, type: 'sine', vol: 0.16 }); },
  // 21: chips and the table.
  chip: () => { tone(2400, { dur: 0.06, type: 'triangle', vol: 0.12 }); tone(3100, { at: 0.04, dur: 0.07, type: 'triangle', vol: 0.1 }); hiss({ dur: 0.05, freq: 5000, vol: 0.06 }); },
  stand: () => { hiss({ dur: 0.06, freq: 300, type: 'lowpass', vol: 0.3 }); tone(120, { dur: 0.12, type: 'sine', vol: 0.28, slide: 80 }); },
  bust: () => { tone(220, { dur: 0.6, type: 'sawtooth', vol: 0.12, slide: 70, lowpass: 900 }); tone(165, { at: 0.1, dur: 0.6, type: 'sawtooth', vol: 0.1, slide: 55, lowpass: 800 }); },
  twentyOne: () => { notes([N.e5, N.g5, N.c6, N.e5 * 2], 0.07, { dur: 0.55, type: 'sine', vol: 0.12 }); hiss({ at: 0.1, dur: 0.6, freq: 6000, to: 9000, vol: 0.04 }); },
  win: () => { EFFECTS.chip(); notes([N.g4, N.c5, N.e5, N.g5], 0.08, { dur: 0.45, type: 'triangle', vol: 0.14, at: 0.1 }); },
  lose: () => notes([N.e4, N.c4], 0.18, { dur: 0.6, type: 'triangle', vol: 0.12, lowpass: 1200 }),
  // Casting: the wind-up and the result.
  castStart: () => { tone(300, { dur: 0.35, type: 'sine', vol: 0.1, slide: 900 }); hiss({ dur: 0.35, freq: 800, to: 4200, q: 1.5, vol: 0.06 }); },
  cast: () => { tone(300, { dur: 0.35, type: 'sine', vol: 0.1, slide: 900 }); hiss({ dur: 0.35, freq: 800, to: 4200, q: 1.5, vol: 0.06 }); },
  hit: () => { hiss({ dur: 0.12, freq: 900, to: 200, q: 0.6, vol: 0.28 }); tone(140, { dur: 0.16, type: 'sine', vol: 0.3, slide: 60 }); },
  fire: () => { hiss({ dur: 0.55, freq: 700, to: 1800, q: 0.4, vol: 0.22 }); tone(180, { dur: 0.5, type: 'sawtooth', vol: 0.08, slide: 80, lowpass: 700 }); },
  ice: () => { notes([N.e5 * 2, N.c6 * 1.5, N.g5 * 2], 0.05, { dur: 0.4, type: 'sine', vol: 0.1 }); hiss({ dur: 0.2, freq: 7000, vol: 0.08, type: 'highpass' }); },
  lightning: () => { hiss({ dur: 0.18, freq: 6000, to: 600, q: 0.5, vol: 0.3, type: 'highpass' }); tone(70, { at: 0.04, dur: 0.4, type: 'sine', vol: 0.28, slide: 40 }); },
  wind: () => hiss({ dur: 0.6, freq: 500, to: 2500, q: 0.7, vol: 0.2 }),
  heal: () => notes([N.c5, N.e5, N.g5, N.c6], 0.08, { dur: 0.6, type: 'sine', vol: 0.11 }),
  buff: () => { notes([N.g4, N.d5, N.g5], 0.07, { dur: 0.5, type: 'triangle', vol: 0.1 }); hiss({ at: 0.05, dur: 0.4, freq: 3000, to: 6000, vol: 0.04 }); },
  curse: () => { tone(155, { dur: 0.7, type: 'sawtooth', vol: 0.09, slide: 90, lowpass: 600 }); tone(164, { at: 0.04, dur: 0.7, type: 'sawtooth', vol: 0.07, slide: 80, lowpass: 600 }); },
  miss: () => hiss({ dur: 0.25, freq: 2400, to: 700, q: 0.5, vol: 0.12 }),
};
/** Cast result by effect family; unknown families give the plain hit. */
const ELEMENT_ALIAS = { fire: 'fire', flame: 'fire', water: 'ice', ice: 'ice', frost: 'ice', holy: 'heal', heal: 'heal', lightning: 'lightning', thunder: 'lightning', wind: 'wind', dark: 'curse', curse: 'curse', debuff: 'curse', buff: 'buff' };

/** Plays an effect by name; silent before the first touch, when muted or when unsupported. */
export function sfx(name) {
  try {
    if (!ctx) return;
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {});
    if (!ready() || document.hidden) return;
    const own = FROM_CLIENT[name];
    if (own) loadPack().then(pack => pack?.L2_SFX?.[own] ? playFile(pack.SFX_DIR + pack.L2_SFX[own], { vol: 0.9 }) : false).then(played => { if (!played) (EFFECTS[name] || EFFECTS[ELEMENT_ALIAS[name]])?.(); });
    else (EFFECTS[name] || EFFECTS[ELEMENT_ALIAS[name]])?.();
  } catch { /* sound never blocks the game */ }
}
/** A skill's own client sound when it has one, otherwise the synthesised cast of this kind. */
export function castSkill(l2Id, kind = 'hit') {
  sfxSkill(l2Id).then(played => { if (!played) sfxCast(kind); }).catch(() => sfxCast(kind));
}
/** Wind-up followed by the result of a cast: sfxCast('fire'), sfxCast('heal'), sfxCast('miss'). */
export function sfxCast(kind = 'hit') {
  sfx('castStart');
  try { setTimeout(() => sfx(EFFECTS[kind] ? kind : ELEMENT_ALIAS[kind] || 'hit'), 320); } catch { /* ignore */ }
}

// ---- Music: generative tracks in the folk-fantasy mood, written here (not copied from any soundtrack). ----
const SCALES = { dorian: [0, 2, 3, 5, 7, 9, 10], minor: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], pent: [0, 2, 4, 7, 9] };
const midi = n => 440 * 2 ** ((n - 69) / 12);

export const TRACKS = {
  // Calm background for the whole game.
  ambient: { root: 57, scale: 'pent', bpm: 54, bar: 4, pad: true, lead: { type: 'sine', density: 0.45, range: [0, 7], lowpass: 2400 }, bass: false },
  // Lute-like duets for a Gwent table.
  gwent1: { root: 50, scale: 'dorian', bpm: 96, bar: 6, pad: false, lead: { type: 'triangle', density: 0.7, range: [0, 9], lowpass: 3000, pluck: true }, bass: true },
  gwent2: { root: 57, scale: 'minor', bpm: 78, bar: 4, pad: true, lead: { type: 'triangle', density: 0.55, range: [2, 10], lowpass: 2600, pluck: true, vibrato: true }, bass: true },
  gwent3: { root: 52, scale: 'phrygian', bpm: 66, bar: 4, pad: true, lead: { type: 'sine', density: 0.4, range: [0, 8], lowpass: 2000, vibrato: true }, bass: true },
};
export const GWENT_TRACKS = ['gwent1', 'gwent2', 'gwent3'];

let currentTrack = null, wanted = null, scheduleTimer = null, nextTime = 0, step = 0, degree = 0, trackToken = 0, stopTimer = null;

function pitch(track, deg, octave = 0) {
  const scale = SCALES[track.scale], len = scale.length, wrap = Math.floor(deg / len), idx = ((deg % len) + len) % len;
  return midi(track.root + scale[idx] + 12 * (wrap + octave));
}
function scheduleBar(track, start) {
  const beat = 60 / track.bpm, bar = beat * track.bar, scale = SCALES[track.scale];
  const chordRoot = [0, 0, 3, 4, 0, 5, 3, 4][step % 8] % scale.length; // a slow progression over eight bars
  const at = start - ctx.currentTime;
  if (track.pad) for (const offset of [0, 2, 4]) tone(pitch(track, chordRoot + offset, -1), { at, dur: bar * 1.1, type: 'sine', vol: 0.22, attack: bar * 0.3, bus: musicBus, echo: 0.2 });
  if (track.bass) for (let i = 0; i < track.bar; i += track.bar === 6 ? 3 : 2) tone(pitch(track, chordRoot, -2), { at: at + i * beat, dur: beat * 1.6, type: 'triangle', vol: 0.3, lowpass: 500, bus: musicBus });
  const lead = track.lead;
  for (let i = 0; i < track.bar * 2; i++) {
    if (Math.random() > lead.density) continue;
    degree = Math.max(lead.range[0], Math.min(lead.range[1], degree + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
    // Strong beats rest on the chord.
    const deg = i % 2 === 0 && Math.random() < 0.5 ? chordRoot + [0, 2, 4][Math.floor(Math.random() * 3)] + 7 : degree;
    const hold = lead.pluck ? beat * 1.4 : beat * 2.2;
    tone(pitch(track, deg, 0), { at: at + i * beat / 2, dur: hold, type: lead.type, vol: lead.pluck ? 0.32 : 0.24, attack: lead.pluck ? 0.004 : 0.12, lowpass: lead.lowpass, bus: musicBus, echo: 0.35 });
  }
  step++;
  return start + bar;
}
function pump(token) {
  if (token !== trackToken || !ctx || !currentTrack) return;
  // Schedule at most a couple of bars ahead so a hidden page or a stop never leaves a long tail.
  if (ctx.state === 'running') while (nextTime < ctx.currentTime + 6) nextTime = scheduleBar(currentTrack, Math.max(nextTime, ctx.currentTime + 0.05));
  scheduleTimer = setTimeout(() => pump(token), 1500);
}
function startTrack(id) {
  const track = TRACKS[id]; if (!track || !ensure()) return;
  clearTimeout(scheduleTimer); clearTimeout(stopTimer);
  currentTrack = track; trackToken++; step = 0; degree = track.lead.range[0] + 2; nextTime = 0;
  musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
  musicBus.gain.linearRampToValueAtTime(prefs.music * 0.5, ctx.currentTime + 2.5);
  pump(trackToken);
}
// Town themes are the client's own music: one streamed element, no decoded copy in memory.
let townAudio = null, townId = null, townFade = null;
const townVolume = () => Math.min(1, prefs.music * 0.7);
function stopTown() {
  clearInterval(townFade); townId = null;
  const gone = townAudio; townAudio = null; if (!gone) return;
  let volume = gone.volume; townFade = setInterval(() => { volume -= 0.08; if (volume <= 0.02) { clearInterval(townFade); gone.pause(); gone.removeAttribute('src'); gone.load(); } else gone.volume = volume; }, 60);
}
async function startTown(id) {
  const pack = await loadPack(), file = pack?.L2_TOWN_MUSIC?.[id.slice(5)];
  if (wanted !== id) return;
  if (!file) { wanted = 'ambient'; wantMusic(); return; }
  stopMusicSynth(); if (townId === id && townAudio) return;
  if (townAudio) stopTown();
  const audio = new Audio(pack.MUSIC_DIR + file); audio.loop = true; audio.volume = 0; townAudio = audio; townId = id;
  audio.play().then(() => { let volume = 0; clearInterval(townFade); townFade = setInterval(() => { volume += 0.05; audio.volume = Math.min(townVolume(), volume); if (volume >= townVolume()) clearInterval(townFade); }, 80); }).catch(() => { if (townAudio === audio) { townAudio = null; townId = null; } });
}
function stopMusicSynth() {
  if (!ctx || !currentTrack) return;
  clearTimeout(scheduleTimer); trackToken++;
  musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime); musicBus.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
  currentTrack = null;
}
function wantMusic() {
  if (!wanted || prefs.muted || prefs.music <= 0 || !ctx) return;
  if (wanted.startsWith('town:')) { if (townId !== wanted) startTown(wanted); return; }
  if (townAudio) stopTown();
  if (currentTrack !== TRACKS[wanted]) startTrack(wanted);
}

/** Picks the background track; null stops it. Gwent tables ask for one of GWENT_TRACKS. */
export function playMusic(id = 'ambient') {
  wanted = id;
  if (!id) { stopMusic(); return; }
  wantMusic();
}
export function stopMusic() {
  wanted = null; stopTown(); stopMusicSynth();
}
/** The track that was playing before a screen took the music over, so leaving it restores that one. */
export function withMusic(id) {
  const before = wanted; playMusic(id);
  return () => { if (wanted === id) playMusic(before); };
}

export const audioPrefs = () => ({ ...prefs });
export function setAudio(next) {
  prefs = { ...prefs, ...next }; prefs.music = Math.min(1, Math.max(0, Number(prefs.music) || 0)); prefs.sfx = Math.min(1, Math.max(0, Number(prefs.sfx) || 0));
  if (ctx) { master.gain.value = prefs.muted ? 0 : 1; sfxBus.gain.value = prefs.sfx; if (currentTrack) musicBus.gain.value = prefs.music * 0.5; }
  save();
  if (townAudio) townAudio.volume = townVolume();
  if (prefs.muted || prefs.music <= 0) { stopMusicSynth(); if (townAudio) { townAudio.pause(); townAudio = null; townId = null; } } else wantMusic();
}
export const onAudioChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

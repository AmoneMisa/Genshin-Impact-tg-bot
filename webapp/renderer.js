import { startLootWebGL } from './loot-webgl-v3.js';

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_transition;
uniform vec3 u_transition_color;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float stars(vec2 uv, float scale, float time) {
  vec2 gv = fract(uv * scale) - .5;
  vec2 id = floor(uv * scale);
  float n = hash(id);
  float pulse = .55 + .45 * sin(time * (1.2 + n * 2.0) + n * 6.2831);
  float d = length(gv - vec2(hash(id + 1.7), hash(id + 8.3)) * .55);
  return smoothstep(.055, 0.0, d) * step(.78, n) * pulse;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = (frag * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  vec2 pointer = (u_pointer * 2.0 - 1.0) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * .12;

  vec3 baseA = vec3(.035, .045, .10);
  vec3 baseB = vec3(.13, .075, .22);
  float wave = .5 + .5 * sin(uv.y * 1.2 + t + sin(uv.x * .8 - t));
  vec3 color = mix(baseA, baseB, wave * .52);

  float glow = .18 / (length(uv - pointer * .18 - vec2(.35, .2)) + .35);
  color += vec3(.20, .13, .36) * glow;
  color += vec3(.08, .22, .32) * (.13 / (length(uv + vec2(.55, .6)) + .35));

  float s = stars(uv + vec2(t * .03, 0.0), 7.0, u_time);
  s += stars(uv * 1.7 - vec2(t * .02, t * .01), 11.0, u_time * .8) * .5;
  color += vec3(.65, .72, 1.0) * s * .42;

  float transitionRadius = .12 + (1.0 - u_transition) * 1.55;
  float transitionDistance = length(uv - pointer * .10);
  float transitionRing = exp(-abs(transitionDistance - transitionRadius) * 14.0) * u_transition;
  float transitionWash = smoothstep(1.45, .0, transitionDistance) * u_transition * .24;
  float transitionMix = clamp(transitionRing * .72 + transitionWash, 0.0, .72);
  color = mix(color, u_transition_color, transitionMix);
  color += u_transition_color * transitionRing * .12;

  float vignette = smoothstep(1.65, .15, length(uv * vec2(.72, .85)));
  color *= .55 + vignette * .62;
  gl_FragColor = vec4(color, 1.0);
}`;

const TRANSITION_COLORS = Object.freeze({
  builds: [0.86, 0.63, 0.27],
  boss: [1.0, 0.22, 0.22],
  arena: [0.48, 0.38, 1.0],
  gacha: [0.78, 0.42, 1.0],
  chest: [0.42, 0.78, 1.0],
  equipment: [0.92, 0.68, 0.33],
  profile: [0.62, 0.50, 1.0],
  default: [0.54, 0.68, 1.0],
});

export function transitionColorForMode(mode) {
  return TRANSITION_COLORS[mode] || TRANSITION_COLORS.default;
}

function shader(gl, type, source) {
  const item = gl.createShader(type);
  gl.shaderSource(item, source);
  gl.compileShader(item);
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(item) || 'WebGL shader compilation failed');
  }
  return item;
}

export function startWebGL(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL is not supported by this Telegram client');

  const program = gl.createProgram();
  gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolution = gl.getUniformLocation(program, 'u_resolution');
  const time = gl.getUniformLocation(program, 'u_time');
  const pointerUniform = gl.getUniformLocation(program, 'u_pointer');
  const transitionUniform = gl.getUniformLocation(program, 'u_transition');
  const transitionColorUniform = gl.getUniformLocation(program, 'u_transition_color');
  const pointer = { x: .5, y: .5 };
  let transitionStarted = -Infinity;
  let transitionColor = TRANSITION_COLORS.default;

  const updatePointer = (x, y) => {
    pointer.x = x / Math.max(1, window.innerWidth);
    pointer.y = 1 - y / Math.max(1, window.innerHeight);
  };
  window.addEventListener('pointermove', (event) => updatePointer(event.clientX, event.clientY), { passive: true });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(canvas.clientWidth * dpr);
    const height = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  startLootWebGL();
  const started = performance.now();
  function frame(now) {
    resize();
    const transitionProgress = Math.min(1, Math.max(0, (now - transitionStarted) / 720));
    const transitionValue = transitionStarted === -Infinity ? 0 : Math.pow(1 - transitionProgress, 1.55);
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(time, (now - started) / 1000);
    gl.uniform2f(pointerUniform, pointer.x, pointer.y);
    gl.uniform1f(transitionUniform, transitionValue);
    gl.uniform3f(transitionColorUniform, transitionColor[0], transitionColor[1], transitionColor[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    transition(mode = 'default') {
      try {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      } catch {}
      transitionColor = transitionColorForMode(mode);
      transitionStarted = performance.now();
    },
  };
}
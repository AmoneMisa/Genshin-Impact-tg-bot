// Shared glTF stage for chest scenes. Equipment previews use WebP paintings.
// Shared scene support for chests. Equipment does not import a WebGL renderer.
const motionForKind = kind => ['ring','amulet','earring'].includes(kind) ? 'orbit' : ['armor','gloves','greaves','boots','cloak'].includes(kind) ? 'float' : ['helmet','tiara'].includes(kind) ? 'wobble' : ['bow','crossbow','hammer','shield'].includes(kind) ? 'heavy-turn' : 'spin';

export const MODEL_MANIFEST_URL = '/models/manifest.json';
const MODEL_BASE_URL = '/models/';
const MODEL_FILE = /^[\w-]+(\/[\w-]+)*\.(glb|gltf)$/;

export const TONE_HEX = Object.freeze({
  mist: 0x9ea6b3, aqua: 0x40c7eb, arcane: 0x9461f5, gold: 0xf2ad40, rose: 0xfa6b9e, prismatic: 0x94dbff,
});

// Grade → how strongly the rim light and accent glow read. Higher grades should
// be visibly more "alive" even when the model itself is the same file.
const GRADE_GLOW = Object.freeze({ noGrade: 0.15, D: 0.2, C: 0.3, B: 0.4, A: 0.55, S: 0.7, SS: 0.85, SSS: 1 });

/** 'sss' / 'SSS' / 'nograde' (the DOM stores grades lowercased) → canonical 'SSS' / 'noGrade'. */
export function canonicalGrade(grade) {
  const raw = String(grade ?? '').trim();
  if (!raw || raw.toLowerCase() === 'nograde') return 'noGrade';
  const upper = raw.toUpperCase();
  return GRADE_GLOW[upper] === undefined ? 'noGrade' : upper;
}

function finiteArray(value, length, fallback) {
  if (!Array.isArray(value) || value.length !== length) return [...fallback];
  return value.map((n, i) => (Number.isFinite(Number(n)) ? Number(n) : fallback[i]));
}

function normalizeEntry(raw) {
  const entry = typeof raw === 'string' ? { file: raw } : raw;
  if (!entry || typeof entry.file !== 'string' || !MODEL_FILE.test(entry.file)) return null;
  const safeFiles = map => Object.fromEntries(Object.entries(map || {}).filter(([, file]) => typeof file === 'string' && MODEL_FILE.test(file)));
  return {
    file: entry.file,
    variants: safeFiles(entry.variants),
    // Per item type (the template's kind.type, e.g. "robe", "twoHandedSword").
    types: safeFiles(entry.types),
    // Degrees in the manifest (friendlier for artists), radians internally.
    rotation: finiteArray(entry.rotation, 3, [0, 0, 0]).map(deg => (deg * Math.PI) / 180),
    offset: finiteArray(entry.offset, 3, [0, 0, 0]),
    scale: Number.isFinite(Number(entry.scale)) && Number(entry.scale) > 0 ? Number(entry.scale) : 1,
    tint: entry.tint !== false,
  };
}

/** Validates an untrusted manifest; unknown or unsafe entries are dropped. */
export function normalizeManifest(raw) {
  const models = {};
  for (const [kind, entry] of Object.entries(raw?.models || {})) {
    if (!/^[a-z][a-zA-Z]*$/.test(kind)) continue;
    const normalized = normalizeEntry(entry);
    if (normalized) models[kind] = normalized;
  }
  return { version: Number(raw?.version) || 1, models };
}

/**
 * Picks the model for a loot item. The item's type wins (a two-handed sword must
 * never show a one-handed silhouette), then its grade, then the kind's default.
 */
export function resolveModelEntry(manifest, { kind, grade, type } = {}) {
  const entry = manifest?.models?.[kind];
  if (!entry) return null;
  const file = (type && entry.types?.[type]) || entry.variants[canonicalGrade(grade)] || entry.file;
  return { ...entry, url: MODEL_BASE_URL + file };
}

/**
 * Maps the game's item condition onto PBR parameters. quality/durability are
 * 0..1 (see loot-renderer.js lootConditionProfile); worn gear gets rougher and
 * darker, masterwork gear reflects its environment more.
 */
export function materialAdjustments({ quality = 0.7, durability = 1, grade = 'noGrade' } = {}) {
  const q = Math.min(1, Math.max(0, Number(quality)));
  const d = Math.min(1, Math.max(0, Number(durability)));
  return {
    roughnessAdd: (1 - d) * 0.35 + (1 - q) * 0.12,
    colorMul: 0.6 + 0.4 * d,
    envIntensity: 0.55 + 0.75 * q,
    tintAmount: 0.1,
    glow: GRADE_GLOW[canonicalGrade(grade)],
  };
}

/** Camera distance that keeps a bounding sphere fully in view for a vertical FOV (degrees). */
export function fitDistance(radius, aspect, fovDeg = 30, padding = 1.08) {
  const halfY = (fovDeg * Math.PI) / 360;
  const halfX = Math.atan(Math.tan(halfY) * Math.max(0.05, aspect || 1));
  return (radius * padding) / Math.sin(Math.min(halfX, halfY));
}

/** Reveal pop-in: 0 → 1 with a small overshoot, settled after `duration` seconds. */
export function revealScale(seconds, duration = 0.7) {
  const t = Math.min(1, Math.max(0, seconds / duration));
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Item turn per motion preset; mirrors the procedural renderer so both paths feel alike. */
// Pieces designed to be seen from the front (bows, shields, body armour, rings, tiaras, pendants, earrings) sway
// instead of spinning, so they're never shown as an edge-on sliver.
const FRONT_FACING = new Set(['tiara', 'amulet', 'earring', 'ring', 'bow', 'shield', 'armor']);

export function itemRotation(kind, seconds) {
  const motion = motionForKind(kind);
  const rad = deg => (deg * Math.PI) / 180;
  if (FRONT_FACING.has(kind)) return [rad(-4 + Math.sin(seconds * 0.9) * 2), Math.sin(seconds * 0.55) * 0.6, rad(Math.sin(seconds * 0.8) * 2)];
  if (motion === 'heavy-turn') return [rad(-6), seconds * 0.38, rad(2)];
  if (motion === 'wobble') return [rad(-6 + Math.sin(seconds * 1.3) * 4), seconds * 0.28, rad(Math.sin(seconds * 0.8) * 2)];
  if (motion === 'orbit') return [rad(-12), seconds * 0.55, rad(Math.sin(seconds) * 5)];
  if (motion === 'float') return [rad(-6), seconds * 0.24, rad(Math.sin(seconds * 0.7) * 2)];
  return [rad(-6), seconds * 0.62, rad(2)];
}

let manifestPromise = null;
export function loadModelManifest(fetchImpl = globalThis.fetch) {
  if (!manifestPromise) {
    manifestPromise = Promise.resolve()
      .then(() => fetchImpl(MODEL_MANIFEST_URL, { cache: 'no-cache' }))
      .then(res => (res.ok ? res.json() : { models: {} }))
      .then(normalizeManifest)
      .catch(() => normalizeManifest({}));
  }
  return manifestPromise;
}

// ---------------------------------------------------------------------------
// three.js runtime (browser only, loaded lazily the first time a model is needed)
// ---------------------------------------------------------------------------

// Final post pass: rgb unchanged, alpha = max(item coverage, glow brightness).
const GLOW_ALPHA_SHADER = {
  uniforms: { tDiffuse: { value: null }, tCoverage: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform sampler2D tDiffuse; uniform sampler2D tCoverage; varying vec2 vUv;',
    'void main(){',
    '  vec4 color = texture2D(tDiffuse, vUv);',
    '  float coverage = texture2D(tCoverage, vUv).a;',
    '  float glow = max(color.r, max(color.g, color.b));',
    // Round fade toward the canvas edges so the halo never shows the canvas's square.
    '  float edge = smoothstep(0.5, 0.3, length(vUv - 0.5));',
    '  float fade = mix(edge, 1.0, coverage);',
    '  gl_FragColor = vec4(color.rgb * fade, max(coverage, clamp(glow * fade, 0.0, 1.0)));',
    '}',
  ].join('\n'),
};

function skyEnvironment(THREE) {
  const scene = new THREE.Scene();
  const dome = new THREE.SphereGeometry(10, 64, 32);
  const top = new THREE.Color(0x9db6e8), horizon = new THREE.Color(0xf4dcc0), ground = new THREE.Color(0x191420);
  const colors = [], p = dome.attributes.position, c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 10;
    if (y >= 0) c.copy(horizon).lerp(top, Math.pow(y, 0.55)); else c.copy(horizon).lerp(ground, Math.pow(-y, 0.35));
    colors.push(c.r * 1.3, c.g * 1.3, c.b * 1.3);
  }
  dome.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const panel = (w, h, intensity, position, color = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...position);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(8, 1.1, 7, [0, 6.5, 4]);              // long overhead strip → blade-length highlight
  panel(1.6, 5, 4.5, [-7.5, 1, 2.5]);         // key softbox
  panel(1.2, 6, 3.5, [7, 0.5, -3], 0xcfe0ff); // cool back strip for edge glints
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd8a0).multiplyScalar(22) }));
  sun.position.set(-5, 5.5, 5.5);
  scene.add(sun);
  return scene;
}

let stagePromise = null;
export function getGltfStage() {
  if (!stagePromise) stagePromise = createStage().catch(error => { stagePromise = null; throw error; });
  return stagePromise;
}

async function createStage() {
  const [THREE, { GLTFLoader }, { DRACOLoader }, { MeshoptDecoder }, { EffectComposer }, { RenderPass }, { SavePass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/loaders/DRACOLoader.js'),
    import('three/addons/libs/meshopt_decoder.module.js'),
    import('three/addons/postprocessing/EffectComposer.js'),
    import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/SavePass.js'),
    import('three/addons/postprocessing/UnrealBloomPass.js'),
    import('three/addons/postprocessing/OutputPass.js'),
    import('three/addons/postprocessing/ShaderPass.js'),
  ]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); // we size in device pixels ourselves
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  renderer.setScissorTest(true);
  let bufferW = 1, bufferH = 1;

  // HDR image-based lighting: metal is mostly reflection, so what it reflects IS
  // its look. A sky gradient + bright softbox strips + a warm sun give blades the
  // long specular sweeps of hero-item renders instead of flat grey studio light.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(skyEnvironment(THREE), 0.02).texture;
  pmrem.dispose();

  const composers = new Map();
  function composerFor(w, h) {
    const key = w + 'x' + h;
    if (composers.has(key)) return composers.get(key);
    if (composers.size >= 6) { for (const c of composers.values()) c.dispose(); composers.clear(); }
    const target = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, target);
    composer.setSize(w, h);
    const renderPass = new RenderPass(null, null);
    renderPass.clearAlpha = 0;
    // Bloom writes an opaque alpha, so the item's own coverage is saved first and
    // recombined at the end: alpha = max(item, glow brightness). That lets the glow
    // spill over the transparent UI instead of painting a black square.
    const coverage = new SavePass(new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType }));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.35, 1.0);
    const output = new OutputPass();
    const alpha = new ShaderPass(GLOW_ALPHA_SHADER);
    alpha.uniforms.tCoverage.value = coverage.renderTarget.texture;
    for (const pass of [renderPass, coverage, bloom, output, alpha]) composer.addPass(pass);
    const entry = { composer, renderPass, bloom, dispose: () => { composer.dispose(); coverage.renderTarget.dispose(); bloom.dispose(); } };
    composers.set(key, entry);
    return entry;
  }

  const draco = new DRACOLoader();
  draco.setDecoderPath('/vendor/three/examples/jsm/libs/draco/gltf/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  const cache = new Map();
  const load = url => {
    if (!cache.has(url)) cache.set(url, loader.loadAsync(url).catch(error => { cache.delete(url); throw error; }));
    return cache.get(url);
  };

  // Lens star for gems and cores (additive, so it only ever brightens).
  const starTexture = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.translate(128, 128);
    const core = x.createRadialGradient(0, 0, 0, 0, 0, 128);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.08, 'rgba(255,255,255,0.8)');
    core.addColorStop(0.25, 'rgba(255,255,255,0.12)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = core;
    x.fillRect(-128, -128, 256, 256);
    x.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 8; k++) {
      x.save();
      x.rotate((k * Math.PI) / 4);
      const long = k % 2 === 0, len = long ? 126 : 70, width = long ? 3.2 : 2;
      const g = x.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(0, -width); x.lineTo(len, 0); x.lineTo(0, width);
      x.fill();
      x.restore();
    }
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  })();

  // Soft contact shadow under the item — the main cue that sells "2.5D".
  const shadowTexture = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  })();

  function prepareModel(source, entry, profile) {
    const model = source.scene.clone(true);
    const adjust = materialAdjustments({ quality: profile.quality, durability: profile.durability, grade: profile.grade });
    const tone = new THREE.Color(TONE_HEX[profile.tone] ?? TONE_HEX.arcane);
    const materials = [];
    model.traverse(obj => {
      if (!obj.isMesh) return;
      const cloneMaterial = material => {
        const m = material.clone();
        if (m.color) {
          // Rarity tint reads as enchanted metal; on leather, wood or cloth it just looks dyed.
          // Textured metal already has its own colour story, so it only takes a hint.
          if (entry.tint && (m.metalness ?? 0) >= 0.5) m.color.lerp(tone, m.map ? adjust.tintAmount * 0.35 : adjust.tintAmount);
          m.color.multiplyScalar(adjust.colorMul);
        }
        if ('roughness' in m) m.roughness = Math.min(1, m.roughness + adjust.roughnessAdd);
        if ('envMapIntensity' in m) m.envMapIntensity = adjust.envIntensity;
        // Only surfaces the artist marked emissive glow; the grade scales them.
        if (m.emissive && (m.emissiveMap || m.emissive.getHex() !== 0)) {
          if (entry.tint) m.emissive.lerp(tone, 0.35);
          m.emissiveIntensity = (m.emissiveIntensity || 1) * (0.45 + 0.55 * adjust.glow);
        }
        materials.push(m);
        return m;
      };
      obj.material = Array.isArray(obj.material) ? obj.material.map(cloneMaterial) : cloneMaterial(obj.material);
    });

    // Normalize: rotate per manifest, center on the bounding box, scale to radius 1.
    const pivot = new THREE.Group();
    model.rotation.set(...entry.rotation);
    pivot.add(model);
    const box = new THREE.Box3().setFromObject(pivot);
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    model.position.sub(center);
    const normalize = 1 / Math.max(1e-6, sphere.radius);
    pivot.scale.setScalar(normalize * entry.scale);
    pivot.position.set(...entry.offset);
    const halfHeight = ((box.max.y - box.min.y) / 2) * normalize * entry.scale;

    // Solid glowing parts (gems, cores) get a lens star; big emissive surfaces
    // like rune-etched blades are left to the bloom.
    const flares = [];
    model.traverse(obj => {
      const m = obj.material;
      if (!obj.isMesh || Array.isArray(m) || !m.emissive || m.emissiveMap || m.emissive.getHex() === 0 || m.emissiveIntensity < 1) return;
      obj.geometry.computeBoundingSphere();
      const { center: c, radius: r } = obj.geometry.boundingSphere;
      const size = r * normalize * entry.scale;
      if (size > 0.2) return;
      flares.push({ mesh: obj, center: c.clone(), size, color: m.emissive.clone() });
    });
    return { pivot, materials, halfHeight, radius: entry.scale, flares };
  }

  /** Match a preview canvas's pixel size to its CSS size; grows the shared buffer if needed. */
  function sizeCanvas(canvas) {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 1.6);
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (w > bufferW || h > bufferH) {
      bufferW = Math.max(bufferW, w);
      bufferH = Math.max(bufferH, h);
      renderer.setSize(bufferW, bufferH, false);
    }
    return { w, h };
  }

  /**
   * Render `scene` with the shared context into a corner of the buffer and copy
   * it onto the preview's own 2D canvas. `bloom` > 0 runs the glow pipeline.
   */
  function renderInto(canvas, ctx, scene, camera, { bloom = 0 } = {}) {
    const w = canvas.width, h = canvas.height;
    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, w, h);
    renderer.clear();
    if (bloom > 0) {
      const post = composerFor(w, h);
      post.renderPass.scene = scene;
      post.renderPass.camera = camera;
      post.bloom.strength = bloom;
      post.composer.render();
    } else {
      renderer.render(scene, camera);
    }
    ctx.clearRect(0, 0, w, h);
    // The GL origin is bottom-left, so our w×h corner sits at the bottom of the buffer.
    ctx.drawImage(renderer.domElement, 0, bufferH - h, w, h, 0, 0, w, h);
  }

  function mount(node, profile, entry) {
    return load(entry.url).then(gltf => {
      if (!node.isConnected) return null;
      const canvas = document.createElement('canvas');
      canvas.className = 'loot-webgl-canvas loot-gltf-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      const ctx = canvas.getContext('2d');

      const scene = new THREE.Scene();
      scene.environment = environment;
      const { pivot, materials, halfHeight, radius, flares } = prepareModel(gltf, entry, profile);
      const spinner = new THREE.Group();
      spinner.add(pivot);
      scene.add(spinner);

      const tone = new THREE.Color(TONE_HEX[profile.tone] ?? TONE_HEX.arcane);
      const glow = materialAdjustments({ grade: profile.grade }).glow;
      scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x1b1426, 0.25));
      const key = new THREE.DirectionalLight(0xfff1dc, 1.6);
      key.position.set(-2, 3, 2.5);
      scene.add(key);
      // Rarity-coloured rim from behind (half white, so steel doesn't turn cyan):
      // outlines the silhouette against the dark UI.
      const rim = new THREE.DirectionalLight(new THREE.Color(0xffffff).lerp(tone, 0.55), 1.2 + 2.4 * glow);
      rim.position.set(2.5, 1.5, -3);
      scene.add(rim);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false }),
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -Math.max(halfHeight, 0.6) - 0.12;
      shadow.scale.setScalar(1.5 * radius);
      scene.add(shadow);

      const sprites = flares.map(flare => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: starTexture, color: flare.color.clone().lerp(new THREE.Color(0xffffff), 0.35),
          blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false,
        }));
        scene.add(sprite);
        return { sprite, flare, world: new THREE.Vector3(), toCamera: new THREE.Vector3() };
      });
      const hasGlow = sprites.length > 0 || materials.some(m => m.emissive && m.emissive.getHex() !== 0);

      const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
      const reveal = node.classList.contains('is-reveal');
      let shown = false;

      node.prepend(canvas);
      return {
        canvas,
        node,
        sharedContext: true,
        draw(seconds) {
          // The canvas is display:none until the node is marked ready (the SVG stays
          // visible while the model downloads), so reveal it before measuring.
          if (!shown) { shown = true; node.classList.add('loot-webgl-ready'); }
          const { w, h } = sizeCanvas(canvas);

          const [rx, ry, rz] = itemRotation(profile.kind, seconds);
          spinner.rotation.set(rx, ry, rz);
          spinner.position.y = Math.sin(seconds * 1.6) * 0.035;
          spinner.scale.setScalar(reveal ? revealScale(seconds) : 1);

          // Slightly elevated three-quarter camera: the "2.5D" look.
          const aspect = w / h;
          const distance = fitDistance(radius * 1.12, aspect, camera.fov);
          camera.aspect = aspect;
          camera.position.set(0, distance * 0.28, distance);
          camera.lookAt(0, -0.05, 0);
          camera.updateProjectionMatrix();

          scene.updateMatrixWorld();
          for (const { sprite, flare, world, toCamera } of sprites) {
            flare.mesh.localToWorld(world.copy(flare.center));
            // Nudge toward the camera so the star sits on the gem's surface, not inside it.
            toCamera.copy(camera.position).sub(world).normalize();
            sprite.position.copy(world).addScaledVector(toCamera, flare.size * 1.5);
            const pulse = 1 + Math.sin(seconds * 2.3 + flare.size * 40) * 0.08;
            sprite.scale.setScalar(Math.min(0.55, flare.size * (4 + 4 * glow)) * pulse * spinner.scale.x);
            sprite.material.rotation = seconds * 0.25;
            sprite.material.opacity = 0.35 + 0.65 * glow;
          }

          renderInto(canvas, ctx, scene, camera, { bloom: hasGlow ? 0.25 + 0.4 * glow : 0 });
        },
        destroy() {
          for (const m of materials) m.dispose();
          for (const { sprite } of sprites) sprite.material.dispose();
          shadow.geometry.dispose();
          shadow.material.dispose();
          scene.clear();
        },
      };
    });
  }

  // Primitives for other 3D scenes (e.g. the chest game) that share this context.
  return { mount, THREE, environment, load, sizeCanvas, renderInto, starTexture, shadowTexture };
}

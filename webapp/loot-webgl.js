import { normalizeLootKind } from './loot-renderer.js';

const TONE_COLORS = Object.freeze({
  mist: [0.58, 0.62, 0.70], aqua: [0.25, 0.78, 0.92], arcane: [0.58, 0.38, 0.96],
  gold: [0.95, 0.68, 0.25], rose: [0.98, 0.42, 0.62], prismatic: [0.58, 0.86, 1.0],
});
const MATERIAL_COLORS = Object.freeze({
  iron: [0.52, 0.57, 0.63], bronze: [0.62, 0.39, 0.20], moonsteel: [0.62, 0.72, 0.88], obsidian: [0.12, 0.11, 0.18], unknown: [0.48, 0.50, 0.58],
});

const VERTEX_SHADER = `
attribute vec3 a_position;
attribute vec3 a_normal;
uniform mat4 u_mvp;
uniform mat4 u_model;
varying vec3 v_normal;
varying vec3 v_world;
void main(){
  vec4 world = u_model * vec4(a_position, 1.0);
  v_world = world.xyz;
  v_normal = normalize(mat3(u_model) * a_normal);
  gl_Position = u_mvp * vec4(a_position, 1.0);
}`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec3 u_base;
uniform vec3 u_emissive;
uniform float u_quality;
uniform float u_wear;
varying vec3 v_normal;
varying vec3 v_world;
void main(){
  vec3 n = normalize(v_normal);
  vec3 lightDir = normalize(vec3(-0.45, 0.75, 0.65));
  float diffuse = max(dot(n, lightDir), 0.0);
  float rim = pow(1.0 - max(dot(n, normalize(vec3(0.0, 0.05, 1.0))), 0.0), 2.4);
  float gloss = mix(0.08, 0.48, u_quality);
  float specular = pow(max(dot(reflect(-lightDir, n), normalize(vec3(0.0, 0.12, 1.0))), 0.0), mix(8.0, 34.0, u_quality)) * gloss;
  float wearDarken = mix(0.62, 1.0, u_wear);
  vec3 color = u_base * (0.25 + diffuse * 0.72) * wearDarken;
  color += u_emissive * (0.08 + rim * 0.28);
  color += vec3(specular);
  gl_FragColor = vec4(color, 1.0);
}`;

function clamp(value, min, max){ return Math.min(max, Math.max(min, value)); }
function radians(deg){ return deg * Math.PI / 180; }
function identity(){ return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
function multiply(a,b){
  const out=new Array(16).fill(0);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];
  return out;
}
function translation(x,y,z){const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;}
function scaling(x,y,z){const m=identity();m[0]=x;m[5]=y;m[10]=z;return m;}
function rotationX(a){const c=Math.cos(a),s=Math.sin(a);return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1];}
function rotationY(a){const c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1];}
function rotationZ(a){const c=Math.cos(a),s=Math.sin(a);return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1];}
function perspective(fovy,aspect,near,far){
  const f=1/Math.tan(fovy/2),nf=1/(near-far);
  return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0];
}
function compose(position=[0,0,0], scale=[1,1,1], rotation=[0,0,0]){
  return multiply(translation(...position), multiply(rotationY(rotation[1]), multiply(rotationX(rotation[0]), multiply(rotationZ(rotation[2]), scaling(...scale)))));
}
function transformPrimitive(primitive, group={}){
  return {...primitive, group};
}
function primitive(type, position, scale, rotation=[0,0,0], profile=null){ return {type,position,scale,rotation,profile}; }

const CUBE = (()=>{
  const p=[],n=[];
  const faces=[
    [[0,0,1],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],
    [[0,0,-1],[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],
    [[1,0,0],[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],
    [[-1,0,0],[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],
    [[0,1,0],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],
    [[0,-1,0],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],
  ];
  for(const [normal,a,b,c,d] of faces){for(const v of [a,b,c,a,c,d]){p.push(...v);n.push(...normal);}}
  return {positions:new Float32Array(p),normals:new Float32Array(n),count:p.length/3};
})();
const OCTA = (()=>{
  const top=[0,.6,0],bottom=[0,-.6,0],ring=[[.6,0,0],[0,0,.6],[-.6,0,0],[0,0,-.6]],p=[],n=[];
  const tri=(a,b,c)=>{const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;for(const v of [a,b,c]){p.push(...v);n.push(nx/l,ny/l,nz/l);}};
  for(let i=0;i<4;i++){const a=ring[i],b=ring[(i+1)%4];tri(top,a,b);tri(bottom,b,a);}
  return {positions:new Float32Array(p),normals:new Float32Array(n),count:p.length/3};
})();

function ringRecipe(radius=.9,thickness=.16,profile=null){
  const result=[];
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2;
    result.push(primitive('box',[Math.cos(a)*radius,Math.sin(a)*radius,0],[thickness,.42,.16],[0,0,a],profile));
  }
  return result;
}

export function sceneRecipeForKind(kind='relic',{variant=0,swordLength=0,profile=null}={}){
  const v=Number(variant)||0;
  if(kind==='sword'||kind==='dagger'){
    const long=kind==='dagger'?1.25:(swordLength?clamp(Number(swordLength)/75,1.4,2.65):2.15+(v*.12));
    return [
      primitive('box',[0,.35,0],[.24+v*.025,long,.12],[0,0,0],profile),
      primitive('octa',[0,.35+long*.52,0],[.34,.36,.18],[0,0,0],profile),
      primitive('box',[0,-.78,0],[1.05+v*.08,.16,.18],[0,0,radians(v%2?8:-5)],profile),
      primitive('box',[0,-1.17,0],[.16,.72,.16],[0,0,0],profile),
      primitive('octa',[0,-1.58,0],[.30,.30,.25],[0,radians(45),0],profile),
    ];
  }
  if(kind==='shield')return [
    primitive('box',[0,0,0],[1.55+v*.08,1.95,.24],[0,0,0],profile),
    primitive('octa',[0,.05,.22],[.42,.48,.28],[0,radians(45),0],profile),
    primitive('box',[0,-.72,.20],[.82,.13,.20],[0,0,0],profile),
  ];
  if(kind==='staff')return [primitive('box',[0,-.25,0],[.14,2.9,.14],[0,0,0],profile),primitive('octa',[0,1.38,0],[.66,.66,.56],[0,radians(45),0],profile),...ringRecipe(.76,.10,profile).map(p=>({...p,position:[p.position[0],p.position[1]+1.38,p.position[2]]}))];
  if(kind==='hammer')return [primitive('box',[0,-.28,0],[.18,2.55,.18],[0,0,0],profile),primitive('box',[0,1.02,0],[1.55,.68,.72],[0,radians(v*4),0],profile),primitive('octa',[0,1.02,.44],[.42,.42,.25],[0,0,0],profile)];
  if(kind==='bow')return [primitive('box',[-.62,.50,0],[.14,1.55,.14],[0,0,radians(-24)],profile),primitive('box',[-.62,-.76,0],[.14,1.35,.14],[0,0,radians(24)],profile),primitive('box',[.62,.50,0],[.14,1.55,.14],[0,0,radians(24)],profile),primitive('box',[.62,-.76,0],[.14,1.35,.14],[0,0,radians(-24)],profile)];
  if(kind==='crossbow')return [primitive('box',[0,-.35,0],[.18,2.05,.18],[0,0,0],profile),primitive('box',[0,.58,0],[2.15,.16,.20],[0,0,0],profile),primitive('box',[-.82,.65,0],[.13,.9,.16],[0,0,radians(-45)],profile),primitive('box',[.82,.65,0],[.13,.9,.16],[0,0,radians(45)],profile)];
  if(kind==='helmet')return [primitive('box',[0,0,0],[1.42,1.35,.72],[0,0,0],profile),primitive('octa',[0,.78,0],[.48,.65,.46],[0,0,0],profile),primitive('box',[0,-.38,.48],[1.05,.14,.18],[0,0,0],profile)];
  if(kind==='armor')return [primitive('box',[0,0,0],[1.45,1.78,.52],[0,0,0],profile),primitive('box',[-.93,.54,0],[.62,.42,.62],[0,0,radians(-13)],profile),primitive('box',[.93,.54,0],[.62,.42,.62],[0,0,radians(13)],profile),primitive('octa',[0,.25,.42],[.38,.42,.22],[0,radians(45),0],profile)];
  if(kind==='gloves'||kind==='gauntlets')return [primitive('box',[-.55,0,0],[.52,1.25,.50],[0,0,radians(-8)],profile),primitive('box',[.55,0,0],[.52,1.25,.50],[0,0,radians(8)],profile)];
  if(kind==='greaves'||kind==='boots')return [primitive('box',[-.40,0,0],[.55,1.55,.54],[0,0,radians(-3)],profile),primitive('box',[.40,0,0],[.55,1.55,.54],[0,0,radians(3)],profile),primitive('box',[-.40,-.82,.18],[.70,.35,.92],[0,0,0],profile),primitive('box',[.40,-.82,.18],[.70,.35,.92],[0,0,0],profile)];
  if(kind==='cloak')return [primitive('box',[0,0,-.18],[1.65,2.55,.10],[radians(-6),0,0],profile),primitive('octa',[0,1.25,.02],[.26,.26,.18],[0,0,0],profile)];
  if(kind==='ring')return [...ringRecipe(.92,.15,profile),primitive('octa',[0,1.02,.05],[.38,.48,.34],[0,radians(45),0],profile)];
  if(kind==='amulet')return [...ringRecipe(.78,.09,profile),primitive('octa',[0,-.50,.05],[.58,.72,.38],[0,radians(45),0],profile)];
  return [primitive('octa',[0,0,0],[1.10,1.50,.82],[0,radians(20+v*8),radians(8)],profile),primitive('octa',[0,.10,.55],[.36,.42,.24],[0,0,0],profile)];
}

export function motionForKind(kind='relic'){
  if(kind==='shield'||kind==='hammer'||kind==='bow'||kind==='crossbow')return 'heavy-turn';
  if(kind==='helmet')return 'wobble';
  if(kind==='ring'||kind==='amulet'||kind==='relic')return 'orbit';
  if(kind==='armor'||kind==='gloves'||kind==='gauntlets'||kind==='greaves'||kind==='boots'||kind==='cloak')return 'float';
  return 'spin';
}

function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Loot 3D shader failed');return s;}
function program(gl){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VERTEX_SHADER));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,FRAGMENT_SHADER));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Loot 3D link failed');return p;}
function meshBuffer(gl,mesh){
  const position=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,position);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.STATIC_DRAW);
  const normal=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,normal);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);
  return {position,normal,count:mesh.count};
}
function classToken(node,prefix,fallback='unknown'){const match=[...(node?.classList||[])].find(value=>value.startsWith(prefix));return match?match.slice(prefix.length):fallback;}
function profileFromLootNode(node){
  return {
    kind: node.dataset.lootKind || (node.classList.contains('daily-sword-art')?'sword':'relic'),
    variant: Number(node.dataset.lootVariant)||0,
    material: node.dataset.lootMaterial || classToken(node,'material-','iron'),
    tone: node.dataset.lootTone || classToken(node,'tone-','aqua'),
    quality: clamp(Number(node.style.getPropertyValue('--loot-quality'))||.65,0,1),
    durability: clamp(Number(node.style.getPropertyValue('--loot-durability'))||1,0,1),
    swordLength: Number(node.dataset.swordLength)||0,
  };
}
function profileFromAvatarPiece(piece){
  return {
    kind: classToken(piece,'avatar-kind-','relic'),
    material: classToken(piece,'avatar-material-','iron'),
    tone: classToken(piece,'avatar-tone-','arcane'),
    quality: classToken(piece,'avatar-quality-','standard')==='masterwork'?1:.68,
    durability: ['critical','broken'].includes(classToken(piece,'avatar-wear-','pristine'))?.35:.85,
    variant: 0,
  };
}
function mixColor(a,b,t){return [0,1,2].map(i=>a[i]*(1-t)+b[i]*t);}
function colorForProfile(profile){const material=MATERIAL_COLORS[profile.material]||MATERIAL_COLORS.unknown,tone=TONE_COLORS[profile.tone]||TONE_COLORS.arcane;return {base:mixColor(material,tone,.18),emissive:tone};}

function createRenderer(canvas){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'high-performance'});
  if(!gl)throw new Error('Loot WebGL unavailable');
  const p=program(gl);gl.useProgram(p);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.clearColor(0,0,0,0);
  const attrs={position:gl.getAttribLocation(p,'a_position'),normal:gl.getAttribLocation(p,'a_normal')};
  const uniforms={mvp:gl.getUniformLocation(p,'u_mvp'),model:gl.getUniformLocation(p,'u_model'),base:gl.getUniformLocation(p,'u_base'),emissive:gl.getUniformLocation(p,'u_emissive'),quality:gl.getUniformLocation(p,'u_quality'),wear:gl.getUniformLocation(p,'u_wear')};
  const meshes={box:meshBuffer(gl,CUBE),octa:meshBuffer(gl,OCTA)};
  function bind(mesh){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.position);gl.enableVertexAttribArray(attrs.position);gl.vertexAttribPointer(attrs.position,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.normal);gl.enableVertexAttribArray(attrs.normal);gl.vertexAttribPointer(attrs.normal,3,gl.FLOAT,false,0,0);}
  function resize(){const dpr=Math.min(window.devicePixelRatio||1,1.6),w=Math.max(2,Math.floor(canvas.clientWidth*dpr)),h=Math.max(2,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}return w/h;}
  function draw(recipe,{rotation=[0,0,0],camera=5.2,globalProfile=null}={}){
    const aspect=resize();gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const projection=perspective(radians(34),aspect,.1,50);const view=translation(0,0,-camera);const root=multiply(rotationY(rotation[1]),multiply(rotationX(rotation[0]),rotationZ(rotation[2])));
    for(const part of recipe){
      const local=compose(part.position,part.scale,part.rotation);const group=part.group?compose(part.group.position||[0,0,0],part.group.scale||[1,1,1],part.group.rotation||[0,0,0]):identity();const model=multiply(root,multiply(group,local));const mvp=multiply(projection,multiply(view,model));
      gl.uniformMatrix4fv(uniforms.model,false,new Float32Array(model));gl.uniformMatrix4fv(uniforms.mvp,false,new Float32Array(mvp));
      const profile=part.profile||globalProfile||{};const colors=colorForProfile(profile);gl.uniform3fv(uniforms.base,new Float32Array(colors.base));gl.uniform3fv(uniforms.emissive,new Float32Array(colors.emissive));gl.uniform1f(uniforms.quality,clamp(profile.quality??.7,0,1));gl.uniform1f(uniforms.wear,clamp(profile.durability??1,0,1));
      const mesh=meshes[part.type]||meshes.box;bind(mesh);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
  }
  return {draw};
}

function animatedRotation(kind,seconds,reveal=false){
  const motion=motionForKind(kind);
  if(motion==='heavy-turn')return [radians(-7),seconds*.38,radians(2)];
  if(motion==='wobble')return [radians(-6+Math.sin(seconds*1.3)*4),seconds*.28,radians(Math.sin(seconds*.8)*2)];
  if(motion==='orbit')return [radians(-12),seconds*.55,radians(Math.sin(seconds)*5)];
  if(motion==='float')return [radians(-8),seconds*.24,radians(Math.sin(seconds*.7)*2)];
  return [radians(-7),seconds*(reveal?1.15:.62),radians(2)];
}

function mountLootNode(node){
  if(node.dataset.webglMounted==='yes')return null;
  node.dataset.webglMounted='yes';
  const canvas=document.createElement('canvas');canvas.className='loot-webgl-canvas';canvas.setAttribute('aria-hidden','true');node.prepend(canvas);
  try{
    const renderer=createRenderer(canvas),profile=profileFromLootNode(node),recipe=sceneRecipeForKind(profile.kind,{variant:profile.variant,swordLength:profile.swordLength,profile});
    node.classList.add('loot-webgl-ready');
    return {canvas,node,draw:(seconds)=>renderer.draw(recipe,{rotation:animatedRotation(profile.kind,seconds,node.classList.contains('is-reveal')),camera:profile.kind==='ring'||profile.kind==='amulet'?4.6:5.2,globalProfile:profile})};
  }catch(error){canvas.remove();node.dataset.webglMounted='failed';console.warn(error);return null;}
}

function avatarPieces(stage){return [...stage.querySelectorAll('.paper-avatar-piece')];}
function avatarRecipe(stage){
  const neutral={material:'moonsteel',tone:'arcane',quality:.55,durability:1};
  const recipe=[
    primitive('octa',[0,1.42,0],[.50,.60,.44],[0,0,0],neutral),
    primitive('box',[0,.45,0],[.82,1.35,.42],[0,0,0],neutral),
    primitive('box',[-.62,.34,0],[.24,1.28,.25],[0,0,radians(-8)],neutral),primitive('box',[.62,.34,0],[.24,1.28,.25],[0,0,radians(8)],neutral),
    primitive('box',[-.27,-.90,0],[.30,1.42,.31],[0,0,radians(-3)],neutral),primitive('box',[.27,-.90,0],[.30,1.42,.31],[0,0,radians(3)],neutral),
  ];
  for(const piece of avatarPieces(stage)){
    const profile=profileFromAvatarPiece(piece),role=piece.dataset.avatarRole||'torso',side=piece.dataset.avatarSide||'center';
    if(role==='helmet')recipe.push(...sceneRecipeForKind('helmet',{profile}).map(p=>transformPrimitive(p,{position:[0,1.38,.05],scale:[.40,.40,.40]})));
    else if(role==='torso')recipe.push(...sceneRecipeForKind('armor',{profile}).map(p=>transformPrimitive(p,{position:[0,.42,.13],scale:[.54,.54,.54]})));
    else if(role==='cloak')recipe.push(...sceneRecipeForKind('cloak',{profile}).map(p=>transformPrimitive(p,{position:[0,.14,-.34],scale:[.60,.60,.60]})));
    else if(role==='gloves')recipe.push(...sceneRecipeForKind('gloves',{profile}).map(p=>transformPrimitive(p,{position:[0,.24,.17],scale:[.48,.48,.48]})));
    else if(role==='lower')recipe.push(...sceneRecipeForKind('greaves',{profile}).map(p=>transformPrimitive(p,{position:[0,-.82,.12],scale:[.52,.52,.52]})));
    else if(role==='weapon'){
      const kind=profile.kind,offset=side==='left'?[-1.15,.0,.1]:side==='right'?[1.15,.0,.1]:[0,.0,.16],scale=piece.classList.contains('avatar-two-hand')?[.72,.72,.72]:[.54,.54,.54];
      recipe.push(...sceneRecipeForKind(kind,{profile}).map(p=>transformPrimitive(p,{position:offset,scale,rotation:[0,0,side==='left'?radians(8):side==='right'?radians(-8):0]})));
    }
  }
  return recipe;
}
function mountAvatarStage(stage){
  if(stage.dataset.avatarWebglMounted==='yes')return null;stage.dataset.avatarWebglMounted='yes';const canvas=document.createElement('canvas');canvas.className='paper-avatar-webgl-canvas';canvas.setAttribute('aria-hidden','true');stage.querySelector('.paper-doll-figure')?.appendChild(canvas);
  try{const renderer=createRenderer(canvas),recipe=avatarRecipe(stage);stage.classList.add('paper-avatar-webgl-ready');return {canvas,node:stage,draw:(seconds)=>renderer.draw(recipe,{rotation:[radians(-4),Math.sin(seconds*.35)*.13,radians(1)],camera:6.2})};}catch(error){canvas.remove();stage.dataset.avatarWebglMounted='failed';console.warn(error);return null;}
}

function reducedMotion(){try{return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;}catch{return false;}}
function ensureStylesheet(){if(document.getElementById('loot-webgl-styles'))return;const link=document.createElement('link');link.id='loot-webgl-styles';link.rel='stylesheet';link.href='/loot-webgl.css';document.head.appendChild(link);}
export function startLootWebGL(root=document){
  if(typeof window==='undefined'||typeof document==='undefined'||reducedMotion())return ()=>{};
  ensureStylesheet();
  const scenes=new Set();
  const scan=(scope=root)=>{
    const loot=[...(scope.querySelectorAll?.('.loot-art.is-reveal,.daily-sword-art')||[])];
    if(scope.matches?.('.loot-art.is-reveal,.daily-sword-art'))loot.unshift(scope);
    for(const node of loot){const scene=mountLootNode(node);if(scene)scenes.add(scene);}
    const stages=[...(scope.querySelectorAll?.('[data-paper-doll-stage]')||[])];if(scope.matches?.('[data-paper-doll-stage]'))stages.unshift(scope);
    for(const stage of stages){const scene=mountAvatarStage(stage);if(scene)scenes.add(scene);}
  };
  scan();
  const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)scan(node);});observer.observe(document.body,{childList:true,subtree:true});
  const started=performance.now();let raf=0;
  const frame=(now)=>{const seconds=(now-started)/1000;for(const scene of [...scenes]){if(!scene.node.isConnected){scenes.delete(scene);continue;}scene.draw(seconds);}raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);
  return ()=>{observer.disconnect();cancelAnimationFrame(raf);for(const scene of scenes)scene.canvas.remove();scenes.clear();};
}

import { motionForKind, sceneRecipeForKind } from './loot-webgl-v2.js';

const TONE_COLORS=Object.freeze({mist:[.58,.62,.70],aqua:[.25,.78,.92],arcane:[.58,.38,.96],gold:[.95,.68,.25],rose:[.98,.42,.62],prismatic:[.58,.86,1]});
const MATERIALS=Object.freeze({
  iron:{color:[.52,.57,.63],metallic:.82,roughness:.48},
  bronze:{color:[.62,.39,.20],metallic:.78,roughness:.38},
  moonsteel:{color:[.62,.72,.88],metallic:.96,roughness:.20},
  obsidian:{color:[.12,.11,.18],metallic:.44,roughness:.13},
  unknown:{color:[.48,.50,.58],metallic:.65,roughness:.46},
});

const VERTEX_SHADER=`
attribute vec3 a_position;
attribute vec3 a_normal;
uniform mat4 u_mvp;
uniform mat4 u_model;
varying vec3 v_normal;
varying vec3 v_world;
void main(){
  vec4 world=u_model*vec4(a_position,1.0);
  v_world=world.xyz;
  v_normal=normalize(mat3(u_model)*a_normal);
  gl_Position=u_mvp*vec4(a_position,1.0);
}`;

const FRAGMENT_SHADER=`
precision mediump float;
uniform vec3 u_base;
uniform vec3 u_emissive;
uniform float u_quality;
uniform float u_wear;
uniform float u_metallic;
uniform float u_roughness;
varying vec3 v_normal;
varying vec3 v_world;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
void main(){
  vec3 n=normalize(v_normal);
  vec3 key=normalize(vec3(-.48,.78,.62));
  vec3 fill=normalize(vec3(.58,.20,.78));
  vec3 view=normalize(vec3(0.0,.08,1.0));
  float ndl=max(dot(n,key),0.0);
  float fillLight=max(dot(n,fill),0.0)*.18;
  float fresnel=pow(1.0-max(dot(n,view),0.0),2.8);
  float rough=clamp(u_roughness+(1.0-u_quality)*.28+(1.0-u_wear)*.25,.04,.88);
  float shininess=mix(42.0,7.0,rough);
  float spec=pow(max(dot(reflect(-key,n),view),0.0),shininess)*mix(.18,.82,u_metallic)*(1.0-rough*.55);
  float wearDark=mix(.58,1.0,u_wear);
  float micro=hash(floor(v_world*18.0));
  float wearNoise=(1.0-u_wear)*smoothstep(.74,.96,micro)*.22;
  vec3 color=u_base*(.22+ndl*.68+fillLight)*wearDark;
  color*=1.0-wearNoise;
  color+=u_emissive*(.035+fresnel*.25+spec*.12);
  color+=vec3(spec);
  gl_FragColor=vec4(color,1.0);
}`;

function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function radians(deg){return deg*Math.PI/180;}
function identity(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
function multiply(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function translation(x,y,z){const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;}
function scaling(x,y,z){const m=identity();m[0]=x;m[5]=y;m[10]=z;return m;}
function rotationX(a){const c=Math.cos(a),s=Math.sin(a);return[1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1];}
function rotationY(a){const c=Math.cos(a),s=Math.sin(a);return[c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];}
function rotationZ(a){const c=Math.cos(a),s=Math.sin(a);return[c,s,0,0,-s,c,0,0,0,1,0,0,0,0,1];}
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
function compose(position=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){return multiply(translation(...position),multiply(rotationY(rotation[1]),multiply(rotationX(rotation[0]),multiply(rotationZ(rotation[2]),scaling(...scale)))));}
function primitive(type,position,scale,rotation=[0,0,0],profile=null){return{type,position,scale,rotation,profile};}
function transformed(part,group={}){return{...part,group};}

function flatNormal(a,b,c){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;return[nx/l,ny/l,nz/l];}
function meshFromTriangles(tris){const p=[],n=[];for(const tri of tris){const normal=flatNormal(...tri);for(const v of tri){p.push(...v);n.push(...normal);}}return{positions:new Float32Array(p),normals:new Float32Array(n),count:p.length/3};}
function extrudedPolygon(points,depth=.5){const z=depth/2,tris=[];for(let i=1;i<points.length-1;i++){tris.push([[points[0][0],points[0][1],z],[points[i][0],points[i][1],z],[points[i+1][0],points[i+1][1],z]]);tris.push([[points[0][0],points[0][1],-z],[points[i+1][0],points[i+1][1],-z],[points[i][0],points[i][1],-z]]);}for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];tris.push([[a[0],a[1],z],[a[0],a[1],-z],[b[0],b[1],-z]],[[a[0],a[1],z],[b[0],b[1],-z],[b[0],b[1],z]]);}return meshFromTriangles(tris);}
function cylinderMesh(segments=10){const tris=[],r=.5,y=.5;for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;const a0=[Math.cos(a)*r,-y,Math.sin(a)*r],a1=[Math.cos(a)*r,y,Math.sin(a)*r],b0=[Math.cos(b)*r,-y,Math.sin(b)*r],b1=[Math.cos(b)*r,y,Math.sin(b)*r];tris.push([a0,b0,b1],[a0,b1,a1],[[0,y,0],a1,b1],[[0,-y,0],b0,a0]);}return meshFromTriangles(tris);}

const CUBE=extrudedPolygon([[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]],1);
const BEVEL=extrudedPolygon([[-.34,-.5],[.34,-.5],[.5,-.32],[.5,.32],[.34,.5],[-.34,.5],[-.5,.32],[-.5,-.32]],1);
const WEDGE=extrudedPolygon([[-.5,-.5],[.5,-.5],[0,.5]],1);
const DIAMOND=extrudedPolygon([[0,-.6],[.55,0],[0,.6],[-.55,0]],1);
const CYLINDER=cylinderMesh(10);
const OCTA=(()=>{const t=[0,.6,0],d=[0,-.6,0],r=[[.6,0,0],[0,0,.6],[-.6,0,0],[0,0,-.6]],tris=[];for(let i=0;i<4;i++){const a=r[i],b=r[(i+1)%4];tris.push([t,a,b],[d,b,a]);}return meshFromTriangles(tris);})();

function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Character 3D shader failed');return s;}
function makeProgram(gl){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VERTEX_SHADER));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,FRAGMENT_SHADER));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Character 3D link failed');return p;}
function meshBuffer(gl,mesh){const position=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,position);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.STATIC_DRAW);const normal=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,normal);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);return{position,normal,count:mesh.count};}
function classToken(node,prefix,fallback='unknown'){const match=[...(node?.classList||[])].find(value=>value.startsWith(prefix));return match?match.slice(prefix.length):fallback;}
function mixColor(a,b,t){return[0,1,2].map(i=>a[i]*(1-t)+b[i]*t);}
function materialForProfile(profile={}){const material=MATERIALS[profile.material]||MATERIALS.unknown,tone=TONE_COLORS[profile.tone]||TONE_COLORS.arcane;return{base:mixColor(material.color,tone,profile.accent?.42:.16),emissive:tone,metallic:profile.accent?1:material.metallic,roughness:profile.accent?.10:material.roughness};}
function profileFromLootNode(node){return{kind:node.dataset.lootKind||(node.classList.contains('daily-sword-art')?'sword':'relic'),variant:Number(node.dataset.lootVariant)||0,material:node.dataset.lootMaterial||classToken(node,'material-','iron'),tone:node.dataset.lootTone||classToken(node,'tone-','aqua'),quality:clamp(Number(node.style.getPropertyValue('--loot-quality'))||.65,0,1),durability:clamp(Number(node.style.getPropertyValue('--loot-durability'))||1,0,1),swordLength:Number(node.dataset.swordLength)||0};}
function profileFromAvatarPiece(piece){const q=classToken(piece,'avatar-quality-','standard'),wear=classToken(piece,'avatar-wear-','pristine');return{kind:classToken(piece,'avatar-kind-','relic'),material:classToken(piece,'avatar-material-','iron'),tone:classToken(piece,'avatar-tone-','arcane'),quality:q==='masterwork'?1:q==='fine'?.84:q==='rough'?.35:.68,durability:wear==='broken'?0:wear==='critical'?.22:wear==='damaged'?.48:wear==='worn'?.72:.96,variant:0};}

function createRenderer(canvas){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'high-performance'});
  if(!gl)throw new Error('Character WebGL unavailable');
  const p=makeProgram(gl);gl.useProgram(p);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.clearColor(0,0,0,0);
  const attrs={position:gl.getAttribLocation(p,'a_position'),normal:gl.getAttribLocation(p,'a_normal')};
  const uniforms={mvp:gl.getUniformLocation(p,'u_mvp'),model:gl.getUniformLocation(p,'u_model'),base:gl.getUniformLocation(p,'u_base'),emissive:gl.getUniformLocation(p,'u_emissive'),quality:gl.getUniformLocation(p,'u_quality'),wear:gl.getUniformLocation(p,'u_wear'),metallic:gl.getUniformLocation(p,'u_metallic'),roughness:gl.getUniformLocation(p,'u_roughness')};
  const meshes={box:meshBuffer(gl,CUBE),bevel:meshBuffer(gl,BEVEL),wedge:meshBuffer(gl,WEDGE),diamond:meshBuffer(gl,DIAMOND),cylinder:meshBuffer(gl,CYLINDER),octa:meshBuffer(gl,OCTA)};
  function bind(mesh){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.position);gl.enableVertexAttribArray(attrs.position);gl.vertexAttribPointer(attrs.position,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.normal);gl.enableVertexAttribArray(attrs.normal);gl.vertexAttribPointer(attrs.normal,3,gl.FLOAT,false,0,0);}
  function resize(){const dpr=Math.min(window.devicePixelRatio||1,1.6),w=Math.max(2,Math.floor(canvas.clientWidth*dpr)),h=Math.max(2,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}return w/h;}
  function draw(recipe,{rotation=[0,0,0],position=[0,0,0],rootScale=[1,1,1],camera=5.2,globalProfile=null}={}){
    const aspect=resize();gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const projection=perspective(radians(34),aspect,.1,50),view=translation(0,0,-camera),root=compose(position,rootScale,rotation);
    for(const part of recipe){
      const local=compose(part.position,part.scale,part.rotation);
      const group=part.group?compose(part.group.position||[0,0,0],part.group.scale||[1,1,1],part.group.rotation||[0,0,0]):identity();
      const model=multiply(root,multiply(group,local)),mvp=multiply(projection,multiply(view,model));
      gl.uniformMatrix4fv(uniforms.model,false,new Float32Array(model));gl.uniformMatrix4fv(uniforms.mvp,false,new Float32Array(mvp));
      const profile=part.profile||globalProfile||{},mat=materialForProfile(profile);
      gl.uniform3fv(uniforms.base,new Float32Array(mat.base));gl.uniform3fv(uniforms.emissive,new Float32Array(mat.emissive));
      gl.uniform1f(uniforms.quality,clamp(profile.quality??.7,0,1));gl.uniform1f(uniforms.wear,clamp(profile.durability??1,0,1));gl.uniform1f(uniforms.metallic,mat.metallic);gl.uniform1f(uniforms.roughness,mat.roughness);
      const mesh=meshes[part.type]||meshes.box;bind(mesh);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
    }
  }
  return{draw};
}

export function characterPoseForLoadout({leftKind=null,rightKind=null,twoHanded=false}={}){
  const left=leftKind||null,right=rightKind||null,kinds=[left,right].filter(Boolean);
  if(twoHanded){
    const kind=kinds[0]||'sword';
    if(kind==='bow'||kind==='crossbow')return'ranged';
    if(kind==='staff')return'caster';
    return'two-hand';
  }
  if(kinds.some(kind=>kind==='bow'||kind==='crossbow'))return'ranged';
  if(kinds.some(kind=>kind==='staff'))return'caster';
  const shieldCount=kinds.filter(kind=>kind==='shield').length;
  if(shieldCount&&kinds.length>1)return'guard';
  if(shieldCount)return'guard';
  if(kinds.length>1)return'dual';
  if(kinds.length===1)return'one-hand';
  return'neutral';
}

export function characterIdleTransform(pose='neutral',seconds=0){
  const breath=Math.sin(seconds*1.35)*.0105;
  const weight=Math.sin(seconds*.55)*.018;
  const poseYaw={guard:.10,ranged:-.15,caster:.08,dual:0,'two-hand':-.06,'one-hand':-.035,neutral:0}[pose]||0;
  const poseLean={guard:-.025,ranged:.018,caster:-.012,dual:-.008,'two-hand':-.02,'one-hand':-.012,neutral:0}[pose]||0;
  return{
    position:[weight*.28,breath*.34,0],
    rotation:[radians(-3)+poseLean,poseYaw+weight*.32,radians(1)+weight*.30],
    scale:[1+breath*.18,1+breath,1],
  };
}

function weaponDescriptors(stage){
  return[...stage.querySelectorAll('.paper-avatar-piece[data-avatar-role="weapon"]')].map(piece=>({
    piece,
    profile:profileFromAvatarPiece(piece),
    side:piece.dataset.avatarSide||'center',
    twoHanded:piece.classList.contains('avatar-two-hand'),
  }));
}
function stanceContext(weapons){
  const left=weapons.find(w=>w.side==='left')||null,right=weapons.find(w=>w.side==='right')||null,center=weapons.find(w=>w.side==='center')||null;
  const twoHanded=Boolean(center?.twoHanded);
  const leftKind=left?.profile.kind||center?.profile.kind||null,rightKind=right?.profile.kind||(twoHanded?center?.profile.kind:null);
  const pose=characterPoseForLoadout({leftKind,rightKind,twoHanded});
  const shield=weapons.find(w=>w.profile.kind==='shield')||null;
  return{pose,left,right,center,twoHanded,shieldSide:shield?.side||null};
}

function armRecipe(side,stance,profile){
  const s=side==='left'?-1:1;
  const isShield=stance.shieldSide===side;
  let upper={x:s*.60,y:.61,z:0,rx:0,ry:0,rz:s*radians(12)};
  let lower={x:s*.69,y:.06,z:.02,rx:0,ry:0,rz:s*radians(5)};
  if(stance.pose==='guard'){
    if(isShield){upper={x:s*.53,y:.62,z:.18,rx:radians(-22),ry:s*radians(12),rz:s*radians(42)};lower={x:s*.43,y:.31,z:.34,rx:radians(-42),ry:s*radians(18),rz:-s*radians(24)};}
    else{upper={x:s*.61,y:.62,z:.02,rx:radians(-8),ry:s*radians(8),rz:s*radians(22)};lower={x:s*.76,y:.08,z:.05,rx:radians(-5),ry:s*radians(4),rz:s*radians(8)};}
  }else if(stance.pose==='ranged'){
    upper={x:s*.48,y:.68,z:.18,rx:radians(-55),ry:s*radians(18),rz:s*radians(50)};
    lower={x:s*.28,y:.53,z:.50,rx:radians(-64),ry:s*radians(26),rz:-s*radians(32)};
  }else if(stance.pose==='caster'){
    const staffSide=(stance.left?.profile.kind==='staff'?'left':stance.right?.profile.kind==='staff'?'right':stance.center?'center':null);
    if(staffSide===side){upper={x:s*.58,y:.62,z:.02,rx:radians(-8),ry:0,rz:s*radians(15)};lower={x:s*.72,y:.06,z:.03,rx:0,ry:0,rz:s*radians(4)};}
    else{upper={x:s*.50,y:.78,z:.10,rx:radians(-30),ry:s*radians(15),rz:s*radians(58)};lower={x:s*.28,y:.93,z:.28,rx:radians(-35),ry:s*radians(22),rz:-s*radians(38)};}
  }else if(stance.pose==='dual'){
    upper={x:s*.59,y:.60,z:.02,rx:radians(-8),ry:s*radians(8),rz:s*radians(30)};
    lower={x:s*.83,y:.10,z:.04,rx:radians(-4),ry:s*radians(4),rz:s*radians(16)};
  }else if(stance.pose==='two-hand'){
    upper={x:s*.47,y:.67,z:.14,rx:radians(-34),ry:s*radians(12),rz:s*radians(45)};
    lower={x:s*.28,y:.38,z:.34,rx:radians(-38),ry:s*radians(20),rz:-s*radians(22)};
  }else if(stance.pose==='one-hand'){
    const armedSide=stance.left?'left':stance.right?'right':'right';
    if(armedSide===side){upper={x:s*.60,y:.61,z:.02,rx:radians(-5),ry:s*radians(7),rz:s*radians(25)};lower={x:s*.78,y:.08,z:.05,rx:0,ry:0,rz:s*radians(10)};}
  }
  return[
    primitive('cylinder',[upper.x,upper.y,upper.z],[.21,.67,.21],[upper.rx,upper.ry,upper.rz],profile),
    primitive('bevel',[s*.63,.90,.01],[.28,.24,.31],[0,0,s*radians(8)],profile),
    primitive('cylinder',[lower.x,lower.y,lower.z],[.19,.61,.19],[lower.rx,lower.ry,lower.rz],profile),
    primitive('bevel',[lower.x,lower.y-.35,lower.z+.02],[.22,.20,.22],[0,0,lower.rz],profile),
  ];
}

function baseBodyRecipe(stance){
  const neutral={material:'moonsteel',tone:'arcane',quality:.58,durability:1};
  const dark={material:'obsidian',tone:'arcane',quality:.45,durability:1};
  const hipShift=stance.pose==='ranged'?-.07:stance.pose==='guard'?.05:stance.pose==='dual'?.025:0;
  return[
    primitive('octa',[0,1.55,.02],[.43,.52,.40],[radians(-2),0,0],neutral),
    primitive('cylinder',[0,1.13,0],[.18,.27,.18],[0,0,0],dark),
    primitive('bevel',[0,.70,0],[.73,.82,.42],[0,0,radians(hipShift*8)],neutral),
    primitive('bevel',[0,.17,0],[.56,.34,.36],[0,0,0],dark),
    primitive('bevel',[hipShift,-.16,0],[.62,.38,.40],[0,0,radians(-hipShift*12)],neutral),
    ...armRecipe('left',stance,neutral),...armRecipe('right',stance,neutral),
    primitive('cylinder',[-.25,-.67,.01],[.27,.76,.28],[0,0,radians(-4)],neutral),
    primitive('cylinder',[.25,-.67,.01],[.27,.76,.28],[0,0,radians(4)],neutral),
    primitive('bevel',[-.27,-1.29,.08],[.26,.72,.29],[0,0,radians(-2)],neutral),
    primitive('bevel',[.27,-1.29,.08],[.26,.72,.29],[0,0,radians(2)],neutral),
    primitive('bevel',[-.28,-1.72,.25],[.34,.24,.58],[radians(-8),0,0],dark),
    primitive('bevel',[.28,-1.72,.25],[.34,.24,.58],[radians(-8),0,0],dark),
  ];
}

function weaponGroup(weapon,stance){
  const kind=weapon.profile.kind,side=weapon.side;
  if(weapon.twoHanded||side==='center'){
    if(stance.pose==='ranged')return{position:[0,.16,.42],scale:[.64,.64,.64],rotation:[radians(-7),radians(12),radians(88)]};
    if(stance.pose==='caster')return{position:[.06,.08,.12],scale:[.66,.66,.66],rotation:[0,radians(-6),radians(-7)]};
    return{position:[0,.02,.30],scale:[.67,.67,.67],rotation:[radians(-12),radians(8),radians(-28)]};
  }
  const s=side==='left'?-1:1;
  if(kind==='shield')return{position:[s*.86,.25,.38],scale:[.46,.46,.46],rotation:[radians(-4),s*radians(17),s*radians(4)]};
  if(stance.pose==='ranged')return{position:[s*.42,.28,.52],scale:[.53,.53,.53],rotation:[radians(-8),s*radians(18),s*radians(78)]};
  if(kind==='staff')return{position:[s*.95,.10,.06],scale:[.58,.58,.58],rotation:[0,s*radians(7),s*radians(-5)]};
  if(stance.pose==='dual')return{position:[s*1.02,.02,.11],scale:[.51,.51,.51],rotation:[radians(-5),s*radians(8),s*radians(-18)]};
  return{position:[s*1.00,-.02,.10],scale:[.52,.52,.52],rotation:[radians(-4),s*radians(7),s*radians(-12)]};
}

function avatarRecipe(stage){
  const weapons=weaponDescriptors(stage),stance=stanceContext(weapons),recipe=baseBodyRecipe(stance);
  for(const piece of[...stage.querySelectorAll('.paper-avatar-piece')]){
    const profile=profileFromAvatarPiece(piece),role=piece.dataset.avatarRole||'torso';
    if(role==='helmet')recipe.push(...sceneRecipeForKind('helmet',{profile}).map(p=>transformed(p,{position:[0,1.47,.05],scale:[.37,.37,.37]})));
    else if(role==='torso')recipe.push(...sceneRecipeForKind('armor',{profile}).map(p=>transformed(p,{position:[0,.48,.14],scale:[.50,.50,.50]})));
    else if(role==='cloak')recipe.push(...sceneRecipeForKind('cloak',{profile}).map(p=>transformed(p,{position:[0,.12,-.36],scale:[.56,.56,.56]})));
    else if(role==='gloves')recipe.push(...sceneRecipeForKind('gloves',{profile}).map(p=>transformed(p,{position:[0,.20,.18],scale:[.44,.44,.44]})));
    else if(role==='lower')recipe.push(...sceneRecipeForKind('greaves',{profile}).map(p=>transformed(p,{position:[0,-.91,.12],scale:[.47,.47,.47]})));
  }
  for(const weapon of weapons){const group=weaponGroup(weapon,stance);recipe.push(...sceneRecipeForKind(weapon.profile.kind,{profile:weapon.profile}).map(p=>transformed(p,group)));}
  return{recipe,pose:stance.pose};
}

function animatedRotation(kind,seconds,reveal=false){const motion=motionForKind(kind);if(motion==='heavy-turn')return[radians(-7),seconds*.38,radians(2)];if(motion==='wobble')return[radians(-6+Math.sin(seconds*1.3)*4),seconds*.28,radians(Math.sin(seconds*.8)*2)];if(motion==='orbit')return[radians(-12),seconds*.55,radians(Math.sin(seconds)*5)];if(motion==='float')return[radians(-8),seconds*.24,radians(Math.sin(seconds*.7)*2)];return[radians(-7),seconds*(reveal?1.15:.62),radians(2)];}
function mountLootNode(node){
  if(node.dataset.webglMounted==='yes')return null;node.dataset.webglMounted='yes';
  const canvas=document.createElement('canvas');canvas.className='loot-webgl-canvas';canvas.setAttribute('aria-hidden','true');node.prepend(canvas);
  try{
    const renderer=createRenderer(canvas),profile=profileFromLootNode(node),recipe=sceneRecipeForKind(profile.kind,{variant:profile.variant,swordLength:profile.swordLength,profile});
    node.classList.add('loot-webgl-ready');
    return{canvas,node,draw:seconds=>renderer.draw(recipe,{rotation:animatedRotation(profile.kind,seconds,node.classList.contains('is-reveal')),camera:['ring','amulet'].includes(profile.kind)?4.6:5.2,globalProfile:profile})};
  }catch(error){canvas.remove();node.dataset.webglMounted='failed';console.warn(error);return null;}
}
function mountAvatarStage(stage){
  if(stage.dataset.avatarWebglMounted==='yes')return null;stage.dataset.avatarWebglMounted='yes';
  const canvas=document.createElement('canvas');canvas.className='paper-avatar-webgl-canvas';canvas.setAttribute('aria-hidden','true');stage.querySelector('.paper-doll-figure')?.appendChild(canvas);
  try{
    const renderer=createRenderer(canvas),avatar=avatarRecipe(stage);stage.dataset.avatarPose=avatar.pose;stage.classList.add('paper-avatar-webgl-ready');
    return{canvas,node:stage,draw:seconds=>{const idle=characterIdleTransform(avatar.pose,seconds);renderer.draw(avatar.recipe,{rotation:idle.rotation,position:idle.position,rootScale:idle.scale,camera:6.25});}};
  }catch(error){canvas.remove();stage.dataset.avatarWebglMounted='failed';console.warn(error);return null;}
}
function reducedMotion(){try{return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;}catch{return false;}}
function ensureStylesheet(){if(document.getElementById('loot-webgl-styles'))return;const link=document.createElement('link');link.id='loot-webgl-styles';link.rel='stylesheet';link.href='/loot-webgl.css';document.head.appendChild(link);}
export function startLootWebGL(root=document){
  if(typeof window==='undefined'||typeof document==='undefined'||reducedMotion())return()=>{};
  ensureStylesheet();
  const scenes=new Set();
  const scan=(scope=root)=>{
    const loot=[...(scope.querySelectorAll?.('.loot-art.is-reveal,.daily-sword-art')||[])];if(scope.matches?.('.loot-art.is-reveal,.daily-sword-art'))loot.unshift(scope);
    for(const node of loot){const scene=mountLootNode(node);if(scene)scenes.add(scene);}
    const stages=[...(scope.querySelectorAll?.('[data-paper-doll-stage]')||[])];if(scope.matches?.('[data-paper-doll-stage]'))stages.unshift(scope);
    for(const stage of stages){const scene=mountAvatarStage(stage);if(scene)scenes.add(scene);}
  };
  scan();
  const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)scan(node);});
  observer.observe(document.body,{childList:true,subtree:true});
  const started=performance.now();let raf=0;
  const frame=now=>{const seconds=(now-started)/1000;for(const scene of[...scenes]){if(!scene.node.isConnected){scenes.delete(scene);continue;}scene.draw(seconds);}raf=requestAnimationFrame(frame);};
  raf=requestAnimationFrame(frame);
  return()=>{observer.disconnect();cancelAnimationFrame(raf);for(const scene of scenes)scene.canvas.remove();scenes.clear();};
}

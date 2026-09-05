import { normalizeLootKind } from './loot-renderer.js';

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
function transformPrimitive(part,group={}){return{...part,group};}

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

function ringRecipe(radius=.9,thickness=.14,profile=null){const out=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2;out.push(primitive('cylinder',[Math.cos(a)*radius,Math.sin(a)*radius,0],[thickness,.38,thickness],[radians(90),0,a],profile));}return out;}
function accentProfile(profile={}){return{...profile,material:profile.material==='obsidian'?'moonsteel':profile.material,tone:profile.tone||'arcane',quality:1,durability:profile.durability??1,accent:true};}

export function sceneRecipeForKind(kind='relic',{variant=0,swordLength=0,profile=null}={}){
  const v=Number(variant)||0,accent=accentProfile(profile||{});
  if(kind==='sword'||kind==='dagger'){
    const long=kind==='dagger'?1.18:(swordLength?clamp(Number(swordLength)/72,1.38,2.72):2.08+v*.13),width=.24+v*.025;
    return[
      primitive('bevel',[0,.28,0],[width,long,.13],[0,0,0],profile),
      primitive('wedge',[0,.28+long*.59,0],[width*1.12,.52,.13],[0,0,0],profile),
      primitive('box',[0,.35,.075],[width*.20,long*.80,.028],[0,0,0],accent),
      primitive('bevel',[0,-.78,0],[1.05+v*.08,.18,.22],[0,radians(v%2?8:-6),radians(v%2?7:-5)],profile),
      primitive('cylinder',[0,-1.17,0],[.18,.72,.18],[0,0,0],profile),
      primitive('diamond',[0,-1.58,0],[.32,.34,.24],[0,radians(45),0],accent),
    ];
  }
  if(kind==='shield')return[
    primitive('bevel',[0,.18,0],[1.65+v*.07,1.66,.28],[0,0,0],profile),
    primitive('wedge',[0,-.92,0],[1.15,.72,.28],[0,0,radians(180)],profile),
    primitive('bevel',[0,.18,.18],[1.22,1.20,.12],[0,0,0],accent),
    primitive('diamond',[0,.18,.34],[.42,.52,.20],[0,radians(45),0],accent),
    primitive('box',[-.66,.20,.17],[.10,1.22,.11],[0,0,radians(-8)],profile),
    primitive('box',[.66,.20,.17],[.10,1.22,.11],[0,0,radians(8)],profile),
  ];
  if(kind==='staff')return[
    primitive('cylinder',[0,-.28,0],[.16,2.88,.16],[0,0,0],profile),
    primitive('bevel',[0,1.18,0],[.72,.30,.34],[0,0,0],profile),
    primitive('octa',[0,1.48,0],[.56,.64,.50],[0,radians(45),0],accent),
    ...ringRecipe(.78,.09,accent).map(p=>({...p,position:[p.position[0],p.position[1]+1.48,p.position[2]]})),
  ];
  if(kind==='hammer')return[
    primitive('cylinder',[0,-.32,0],[.20,2.56,.20],[0,0,0],profile),
    primitive('bevel',[0,1.00,0],[1.48,.64,.72],[0,radians(v*4),0],profile),
    primitive('wedge',[-.92,1.00,0],[.52,.64,.72],[0,radians(90),radians(90)],profile),
    primitive('wedge',[.92,1.00,0],[.52,.64,.72],[0,radians(-90),radians(-90)],profile),
    primitive('diamond',[0,1.00,.45],[.38,.42,.20],[0,0,0],accent),
  ];
  if(kind==='bow'){
    const parts=[];for(const side of[-1,1])for(let i=0;i<3;i++){const y=.82-i*.72,x=side*(.70+.16*Math.abs(i-1)),rot=side*radians(i===0?28:i===1?10:-24);parts.push(primitive('cylinder',[x,y,0],[.12,.82,.12],[0,0,rot],profile));}
    parts.push(primitive('cylinder',[0,.08,.02],[.05,2.45,.05],[0,0,0],accent),primitive('diamond',[0,.08,.02],[.18,.28,.14],[0,0,0],accent));return parts;
  }
  if(kind==='crossbow')return[
    primitive('cylinder',[0,-.30,0],[.18,2.05,.18],[0,0,0],profile),
    primitive('bevel',[0,.58,0],[1.72,.18,.24],[0,0,radians(90)],profile),
    primitive('cylinder',[-.82,.68,0],[.12,.90,.12],[0,0,radians(-48)],profile),
    primitive('cylinder',[.82,.68,0],[.12,.90,.12],[0,0,radians(48)],profile),
    primitive('cylinder',[0,.72,.04],[.045,2.12,.045],[0,0,radians(90)],accent),
    primitive('diamond',[0,.48,.18],[.28,.36,.18],[0,0,0],accent),
  ];
  if(kind==='helmet')return[
    primitive('bevel',[0,.05,0],[1.42,1.15,.78],[0,0,0],profile),
    primitive('wedge',[0,.88,0],[.62,.70,.58],[0,0,0],profile),
    primitive('bevel',[-.56,-.42,.06],[.32,.78,.56],[0,0,radians(-8)],profile),
    primitive('bevel',[.56,-.42,.06],[.32,.78,.56],[0,0,radians(8)],profile),
    primitive('box',[0,-.30,.48],[1.04,.10,.12],[0,0,0],accent),
    primitive('diamond',[0,.18,.50],[.24,.30,.12],[0,0,0],accent),
  ];
  if(kind==='armor')return[
    primitive('bevel',[0,.34,0],[1.42,1.18,.58],[0,0,0],profile),
    primitive('bevel',[0,-.42,.04],[1.18,.38,.50],[0,0,0],profile),
    primitive('bevel',[0,-.76,.02],[1.02,.28,.44],[0,0,0],profile),
    primitive('bevel',[-.90,.58,0],[.56,.40,.62],[0,0,radians(-15)],profile),
    primitive('bevel',[.90,.58,0],[.56,.40,.62],[0,0,radians(15)],profile),
    primitive('diamond',[0,.38,.43],[.34,.42,.18],[0,0,0],accent),
    primitive('box',[0,.02,.34],[.08,.92,.08],[0,0,0],accent),
  ];
  if(kind==='gloves'||kind==='gauntlets')return[-1,1].flatMap(side=>[
    primitive('cylinder',[side*.54,.20,0],[.36,.82,.36],[0,0,side*radians(6)],profile),
    primitive('bevel',[side*.54,-.38,.06],[.48,.52,.46],[0,0,side*radians(7)],profile),
    primitive('diamond',[side*.54,-.32,.31],[.19,.26,.12],[0,0,0],accent),
  ]);
  if(kind==='greaves'||kind==='boots')return[-1,1].flatMap(side=>[
    primitive('bevel',[side*.39,.20,0],[.50,1.12,.54],[0,0,side*radians(3)],profile),
    primitive('bevel',[side*.39,-.48,.04],[.54,.40,.56],[0,0,side*radians(2)],profile),
    primitive('bevel',[side*.39,-.84,.26],[.68,.30,.86],[radians(-10),0,0],profile),
    primitive('box',[side*.39,.18,.34],[.08,.78,.08],[0,0,0],accent),
  ]);
  if(kind==='cloak')return[
    primitive('bevel',[0,.56,-.20],[1.45,.88,.12],[radians(-7),0,0],profile),
    primitive('bevel',[-.24,-.10,-.24],[1.12,.82,.11],[radians(-9),0,radians(-4)],profile),
    primitive('bevel',[.24,-.76,-.30],[.92,.86,.10],[radians(-12),0,radians(4)],profile),
    primitive('diamond',[0,1.10,.02],[.26,.28,.14],[0,0,0],accent),
  ];
  if(kind==='ring')return[...ringRecipe(.90,.13,profile),primitive('bevel',[0,1.02,.02],[.56,.24,.34],[0,0,0],profile),primitive('octa',[0,1.28,.05],[.34,.42,.30],[0,radians(45),0],accent)];
  if(kind==='amulet')return[...ringRecipe(.80,.075,profile),primitive('diamond',[0,-.56,.04],[.62,.82,.36],[0,radians(45),0],profile),primitive('octa',[0,-.56,.32],[.24,.30,.18],[0,0,0],accent)];
  return[primitive('bevel',[0,0,0],[1.05,1.35,.76],[0,radians(20+v*8),radians(8)],profile),primitive('diamond',[0,.12,.62],[.46,.62,.22],[0,0,0],accent),primitive('octa',[0,.12,.78],[.20,.25,.15],[0,0,0],accent)];
}

export function motionForKind(kind='relic'){if(['shield','hammer','bow','crossbow'].includes(kind))return'heavy-turn';if(kind==='helmet')return'wobble';if(['ring','amulet','relic'].includes(kind))return'orbit';if(['armor','gloves','gauntlets','greaves','boots','cloak'].includes(kind))return'float';return'spin';}
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Loot 3D shader failed');return s;}
function makeProgram(gl){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VERTEX_SHADER));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,FRAGMENT_SHADER));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Loot 3D link failed');return p;}
function meshBuffer(gl,mesh){const position=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,position);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.STATIC_DRAW);const normal=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,normal);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);return{position,normal,count:mesh.count};}
function classToken(node,prefix,fallback='unknown'){const match=[...(node?.classList||[])].find(value=>value.startsWith(prefix));return match?match.slice(prefix.length):fallback;}
function profileFromLootNode(node){return{kind:node.dataset.lootKind||(node.classList.contains('daily-sword-art')?'sword':'relic'),variant:Number(node.dataset.lootVariant)||0,material:node.dataset.lootMaterial||classToken(node,'material-','iron'),tone:node.dataset.lootTone||classToken(node,'tone-','aqua'),quality:clamp(Number(node.style.getPropertyValue('--loot-quality'))||.65,0,1),durability:clamp(Number(node.style.getPropertyValue('--loot-durability'))||1,0,1),swordLength:Number(node.dataset.swordLength)||0};}
function profileFromAvatarPiece(piece){const q=classToken(piece,'avatar-quality-','standard'),wear=classToken(piece,'avatar-wear-','pristine');return{kind:classToken(piece,'avatar-kind-','relic'),material:classToken(piece,'avatar-material-','iron'),tone:classToken(piece,'avatar-tone-','arcane'),quality:q==='masterwork'?1:q==='fine'?.84:q==='rough'?.35:.68,durability:wear==='broken'?0:wear==='critical'?.22:wear==='damaged'?.48:wear==='worn'?.72:.96,variant:0};}
function mixColor(a,b,t){return[0,1,2].map(i=>a[i]*(1-t)+b[i]*t);}
function materialForProfile(profile){const material=MATERIALS[profile.material]||MATERIALS.unknown,tone=TONE_COLORS[profile.tone]||TONE_COLORS.arcane;return{base:mixColor(material.color,tone,profile.accent?.42:.16),emissive:tone,metallic:profile.accent?1:material.metallic,roughness:profile.accent?.10:material.roughness};}

function createRenderer(canvas){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'high-performance'});if(!gl)throw new Error('Loot WebGL unavailable');
  const p=makeProgram(gl);gl.useProgram(p);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.clearColor(0,0,0,0);
  const attrs={position:gl.getAttribLocation(p,'a_position'),normal:gl.getAttribLocation(p,'a_normal')};
  const uniforms={mvp:gl.getUniformLocation(p,'u_mvp'),model:gl.getUniformLocation(p,'u_model'),base:gl.getUniformLocation(p,'u_base'),emissive:gl.getUniformLocation(p,'u_emissive'),quality:gl.getUniformLocation(p,'u_quality'),wear:gl.getUniformLocation(p,'u_wear'),metallic:gl.getUniformLocation(p,'u_metallic'),roughness:gl.getUniformLocation(p,'u_roughness')};
  const meshes={box:meshBuffer(gl,CUBE),bevel:meshBuffer(gl,BEVEL),wedge:meshBuffer(gl,WEDGE),diamond:meshBuffer(gl,DIAMOND),cylinder:meshBuffer(gl,CYLINDER),octa:meshBuffer(gl,OCTA)};
  function bind(mesh){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.position);gl.enableVertexAttribArray(attrs.position);gl.vertexAttribPointer(attrs.position,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.normal);gl.enableVertexAttribArray(attrs.normal);gl.vertexAttribPointer(attrs.normal,3,gl.FLOAT,false,0,0);}
  function resize(){const dpr=Math.min(window.devicePixelRatio||1,1.6),w=Math.max(2,Math.floor(canvas.clientWidth*dpr)),h=Math.max(2,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}return w/h;}
  function draw(recipe,{rotation=[0,0,0],camera=5.2,globalProfile=null}={}){const aspect=resize();gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const projection=perspective(radians(34),aspect,.1,50),view=translation(0,0,-camera),root=multiply(rotationY(rotation[1]),multiply(rotationX(rotation[0]),rotationZ(rotation[2])));for(const part of recipe){const local=compose(part.position,part.scale,part.rotation),group=part.group?compose(part.group.position||[0,0,0],part.group.scale||[1,1,1],part.group.rotation||[0,0,0]):identity(),model=multiply(root,multiply(group,local)),mvp=multiply(projection,multiply(view,model));gl.uniformMatrix4fv(uniforms.model,false,new Float32Array(model));gl.uniformMatrix4fv(uniforms.mvp,false,new Float32Array(mvp));const profile=part.profile||globalProfile||{},mat=materialForProfile(profile);gl.uniform3fv(uniforms.base,new Float32Array(mat.base));gl.uniform3fv(uniforms.emissive,new Float32Array(mat.emissive));gl.uniform1f(uniforms.quality,clamp(profile.quality??.7,0,1));gl.uniform1f(uniforms.wear,clamp(profile.durability??1,0,1));gl.uniform1f(uniforms.metallic,mat.metallic);gl.uniform1f(uniforms.roughness,mat.roughness);const mesh=meshes[part.type]||meshes.box;bind(mesh);gl.drawArrays(gl.TRIANGLES,0,mesh.count);}}
  return{draw};
}
function animatedRotation(kind,seconds,reveal=false){const motion=motionForKind(kind);if(motion==='heavy-turn')return[radians(-7),seconds*.38,radians(2)];if(motion==='wobble')return[radians(-6+Math.sin(seconds*1.3)*4),seconds*.28,radians(Math.sin(seconds*.8)*2)];if(motion==='orbit')return[radians(-12),seconds*.55,radians(Math.sin(seconds)*5)];if(motion==='float')return[radians(-8),seconds*.24,radians(Math.sin(seconds*.7)*2)];return[radians(-7),seconds*(reveal?1.15:.62),radians(2)];}
function mountLootNode(node){if(node.dataset.webglMounted==='yes')return null;node.dataset.webglMounted='yes';const canvas=document.createElement('canvas');canvas.className='loot-webgl-canvas';canvas.setAttribute('aria-hidden','true');node.prepend(canvas);try{const renderer=createRenderer(canvas),profile=profileFromLootNode(node),recipe=sceneRecipeForKind(profile.kind,{variant:profile.variant,swordLength:profile.swordLength,profile});node.classList.add('loot-webgl-ready');return{canvas,node,draw:seconds=>renderer.draw(recipe,{rotation:animatedRotation(profile.kind,seconds,node.classList.contains('is-reveal')),camera:['ring','amulet'].includes(profile.kind)?4.6:5.2,globalProfile:profile})};}catch(error){canvas.remove();node.dataset.webglMounted='failed';console.warn(error);return null;}}
function avatarPieces(stage){return[...stage.querySelectorAll('.paper-avatar-piece')];}
function avatarRecipe(stage){
  const neutral={material:'moonsteel',tone:'arcane',quality:.58,durability:1};
  const recipe=[
    primitive('octa',[0,1.48,0],[.48,.56,.43],[0,0,0],neutral),primitive('cylinder',[0,1.05,0],[.20,.30,.20],[0,0,0],neutral),
    primitive('bevel',[0,.48,0],[.78,1.02,.42],[0,0,0],neutral),primitive('bevel',[0,-.12,0],[.66,.34,.39],[0,0,0],neutral),
    primitive('cylinder',[-.62,.52,0],[.22,.70,.22],[0,0,radians(-10)],neutral),primitive('cylinder',[-.72,-.02,0],[.20,.62,.20],[0,0,radians(-5)],neutral),
    primitive('cylinder',[.62,.52,0],[.22,.70,.22],[0,0,radians(10)],neutral),primitive('cylinder',[.72,-.02,0],[.20,.62,.20],[0,0,radians(5)],neutral),
    primitive('bevel',[-.27,-.67,0],[.30,.66,.32],[0,0,radians(-3)],neutral),primitive('bevel',[.27,-.67,0],[.30,.66,.32],[0,0,radians(3)],neutral),
    primitive('bevel',[-.27,-1.27,.08],[.27,.66,.30],[0,0,radians(-2)],neutral),primitive('bevel',[.27,-1.27,.08],[.27,.66,.30],[0,0,radians(2)],neutral),
  ];
  for(const piece of avatarPieces(stage)){const profile=profileFromAvatarPiece(piece),role=piece.dataset.avatarRole||'torso',side=piece.dataset.avatarSide||'center';if(role==='helmet')recipe.push(...sceneRecipeForKind('helmet',{profile}).map(p=>transformPrimitive(p,{position:[0,1.40,.06],scale:[.39,.39,.39]})));else if(role==='torso')recipe.push(...sceneRecipeForKind('armor',{profile}).map(p=>transformPrimitive(p,{position:[0,.42,.14],scale:[.53,.53,.53]})));else if(role==='cloak')recipe.push(...sceneRecipeForKind('cloak',{profile}).map(p=>transformPrimitive(p,{position:[0,.12,-.34],scale:[.58,.58,.58]})));else if(role==='gloves')recipe.push(...sceneRecipeForKind('gloves',{profile}).map(p=>transformPrimitive(p,{position:[0,.18,.16],scale:[.46,.46,.46]})));else if(role==='lower')recipe.push(...sceneRecipeForKind('greaves',{profile}).map(p=>transformPrimitive(p,{position:[0,-.84,.12],scale:[.50,.50,.50]})));else if(role==='weapon'){const kind=profile.kind,offset=side==='left'?[-1.14,0,.10]:side==='right'?[1.14,0,.10]:[0,0,.16],scale=piece.classList.contains('avatar-two-hand')?[.70,.70,.70]:[.53,.53,.53];recipe.push(...sceneRecipeForKind(kind,{profile}).map(p=>transformPrimitive(p,{position:offset,scale,rotation:[0,0,side==='left'?radians(8):side==='right'?radians(-8):0]})));}}
  return recipe;
}
function mountAvatarStage(stage){if(stage.dataset.avatarWebglMounted==='yes')return null;stage.dataset.avatarWebglMounted='yes';const canvas=document.createElement('canvas');canvas.className='paper-avatar-webgl-canvas';canvas.setAttribute('aria-hidden','true');stage.querySelector('.paper-doll-figure')?.appendChild(canvas);try{const renderer=createRenderer(canvas),recipe=avatarRecipe(stage);stage.classList.add('paper-avatar-webgl-ready');return{canvas,node:stage,draw:seconds=>renderer.draw(recipe,{rotation:[radians(-4),Math.sin(seconds*.35)*.13,radians(1)],camera:6.2})};}catch(error){canvas.remove();stage.dataset.avatarWebglMounted='failed';console.warn(error);return null;}}
function reducedMotion(){try{return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;}catch{return false;}}
function ensureStylesheet(){if(document.getElementById('loot-webgl-styles'))return;const link=document.createElement('link');link.id='loot-webgl-styles';link.rel='stylesheet';link.href='/loot-webgl.css';document.head.appendChild(link);}
export function startLootWebGL(root=document){if(typeof window==='undefined'||typeof document==='undefined'||reducedMotion())return()=>{};ensureStylesheet();const scenes=new Set(),scan=(scope=root)=>{const loot=[...(scope.querySelectorAll?.('.loot-art.is-reveal,.daily-sword-art')||[])];if(scope.matches?.('.loot-art.is-reveal,.daily-sword-art'))loot.unshift(scope);for(const node of loot){const scene=mountLootNode(node);if(scene)scenes.add(scene);}const stages=[...(scope.querySelectorAll?.('[data-paper-doll-stage]')||[])];if(scope.matches?.('[data-paper-doll-stage]'))stages.unshift(scope);for(const stage of stages){const scene=mountAvatarStage(stage);if(scene)scenes.add(scene);}};scan();const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)scan(node);});observer.observe(document.body,{childList:true,subtree:true});const started=performance.now();let raf=0;const frame=now=>{const seconds=(now-started)/1000;for(const scene of[...scenes]){if(!scene.node.isConnected){scenes.delete(scene);continue;}scene.draw(seconds);}raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);return()=>{observer.disconnect();cancelAnimationFrame(raf);for(const scene of scenes)scene.canvas.remove();scenes.clear();};}

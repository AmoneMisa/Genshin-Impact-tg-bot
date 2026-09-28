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
uniform mat3 u_normal_matrix;
varying vec3 v_normal;
varying vec3 v_local;
void main(){
  v_local=a_position;
  // Inverse-transpose normal matrix: primitives use heavily non-uniform scales
  // (e.g. a blade is .24 x 2.08 x .13), which skews normals under plain mat3(model).
  v_normal=normalize(u_normal_matrix*a_normal);
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
varying vec3 v_local;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
void main(){
  vec3 n=normalize(v_normal);
  vec3 key=normalize(vec3(-.48,.78,.62));
  vec3 fill=normalize(vec3(.58,.20,.78));
  vec3 view=normalize(vec3(0.0,.08,1.0));
  float ndl=max(dot(n,key),0.0);
  // Soft wrap on the key light keeps the terminator from banding on low-poly facets.
  float wrap=clamp((dot(n,key)+.35)/1.35,0.0,1.0);
  float fillLight=max(dot(n,fill),0.0)*.18;
  float hemi=mix(.10,.24,n.y*.5+.5);
  float fresnel=pow(1.0-max(dot(n,view),0.0),2.8);
  float rough=clamp(u_roughness+(1.0-u_quality)*.28+(1.0-u_wear)*.25,.04,.88);
  float shininess=mix(42.0,7.0,rough);
  float spec=pow(max(dot(reflect(-key,n),view),0.0),shininess)*mix(.18,.82,u_metallic)*(1.0-rough*.55)*step(0.0001,ndl);
  float wearDark=mix(.58,1.0,u_wear);
  // Object-space noise: world-space noise "swims" across the surface while the item spins.
  float micro=hash(floor(v_local*9.0));
  float wearNoise=(1.0-u_wear)*smoothstep(.74,.96,micro)*.22;
  vec3 color=u_base*(hemi+wrap*.60+ndl*.12+fillLight)*wearDark;
  color*=1.0-wearNoise;
  color+=u_emissive*(.035+fresnel*.30+spec*.12);
  color+=vec3(spec);
  gl_FragColor=vec4(color,1.0);
}`;

function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function radians(deg){return deg*Math.PI/180;}
function identity(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
function multiply(a,b,o=new Array(16)){const r=o===a||o===b?new Array(16):o;for(let c=0;c<4;c++)for(let row=0;row<4;row++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+row]*b[c*4+k];r[c*4+row]=v;}if(r!==o)for(let i=0;i<16;i++)o[i]=r[i];return o;}
function translation(x,y,z){const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;}
function scaling(x,y,z){const m=identity();m[0]=x;m[5]=y;m[10]=z;return m;}
function rotationX(a){const c=Math.cos(a),s=Math.sin(a);return[1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1];}
function rotationY(a){const c=Math.cos(a),s=Math.sin(a);return[c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];}
function rotationZ(a){const c=Math.cos(a),s=Math.sin(a);return[c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];}
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
function compose(position=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){return multiply(translation(...position),multiply(rotationY(rotation[1]),multiply(rotationX(rotation[0]),multiply(rotationZ(rotation[2]),scaling(...scale)))));}
// Inverse-transpose of the model's upper 3x3, written into a 9-element column-major array.
function normalMatrix(m,out){const a00=m[0],a01=m[1],a02=m[2],a10=m[4],a11=m[5],a12=m[6],a20=m[8],a21=m[9],a22=m[10];const b01=a22*a11-a12*a21,b11=-a22*a10+a12*a20,b21=a21*a10-a11*a20;let det=a00*b01+a01*b11+a02*b21;det=det?1/det:0;out[0]=b01*det;out[1]=b11*det;out[2]=b21*det;out[3]=(-a22*a01+a02*a21)*det;out[4]=(a22*a00-a02*a20)*det;out[5]=(-a21*a00+a01*a20)*det;out[6]=(a12*a01-a02*a11)*det;out[7]=(-a12*a00+a02*a10)*det;out[8]=(a11*a00-a01*a10)*det;return out;}
function primitive(type,position,scale,rotation=[0,0,0],profile=null){return{type,position,scale,rotation,profile};}
function transformPrimitive(part,group={}){return{...part,group};}

function flatNormal(a,b,c){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,l=Math.hypot(nx,ny,nz)||1;return[nx/l,ny/l,nz/l];}
function meshFromTriangles(tris){const p=[],n=[];for(const tri of tris){const normal=flatNormal(...tri);for(const v of tri){p.push(...v);n.push(...normal);}}return{positions:new Float32Array(p),normals:new Float32Array(n),count:p.length/3};}
function extrudedPolygon(points,depth=.5){const z=depth/2,tris=[];for(let i=1;i<points.length-1;i++){tris.push([[points[0][0],points[0][1],z],[points[i][0],points[i][1],z],[points[i+1][0],points[i+1][1],z]]);tris.push([[points[0][0],points[0][1],-z],[points[i+1][0],points[i+1][1],-z],[points[i][0],points[i][1],-z]]);}for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];tris.push([[a[0],a[1],z],[a[0],a[1],-z],[b[0],b[1],-z]],[[a[0],a[1],z],[b[0],b[1],-z],[b[0],b[1],z]]);}return meshFromTriangles(tris);}
// Counter-clockwise (outward-facing) winding so back-face culling keeps the outer
// shell; side vertices carry radial normals so grips, limbs and staffs shade round
// instead of showing 10 flat facets.
function cylinderMesh(segments=16){const p=[],n=[],r=.5,y=.5;const push=(v,nv)=>{p.push(...v);n.push(...nv);};for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);const a0=[ca*r,-y,sa*r],a1=[ca*r,y,sa*r],b0=[cb*r,-y,sb*r],b1=[cb*r,y,sb*r],na=[ca,0,sa],nb=[cb,0,sb];push(a0,na);push(b1,nb);push(b0,nb);push(a0,na);push(a1,na);push(b1,nb);push([0,y,0],[0,1,0]);push(b1,[0,1,0]);push(a1,[0,1,0]);push([0,-y,0],[0,-1,0]);push(a0,[0,-1,0]);push(b0,[0,-1,0]);}return{positions:new Float32Array(p),normals:new Float32Array(n),count:p.length/3};}

const CUBE=extrudedPolygon([[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]],1);
const BEVEL=extrudedPolygon([[-.34,-.5],[.34,-.5],[.5,-.32],[.5,.32],[.34,.5],[-.34,.5],[-.5,.32],[-.5,-.32]],1);
const WEDGE=extrudedPolygon([[-.5,-.5],[.5,-.5],[0,.5]],1);
const DIAMOND=extrudedPolygon([[0,-.6],[.55,0],[0,.6],[-.55,0]],1);
const CYLINDER=cylinderMesh(16);
const OCTA=(()=>{const t=[0,.6,0],d=[0,-.6,0],r=[[.6,0,0],[0,0,.6],[-.6,0,0],[0,0,-.6]],tris=[];for(let i=0;i<4;i++){const a=r[i],b=r[(i+1)%4];tris.push([t,b,a],[d,a,b]);}return meshFromTriangles(tris);})();

// Bounding sphere of a recipe in its own space. Loot previews spin freely, so the
// camera frames the sphere (not the box) — that's the only framing that can't clip
// a long blade or staff at some angle.
const PRIMITIVE_EXTENT={octa:.6,diamond:.6};
export function recipeBounds(recipe=[]){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],corners=[];
  for(const part of recipe){
    const local=compose(part.position,part.scale,part.rotation),m=part.group?multiply(compose(part.group.position||[0,0,0],part.group.scale||[1,1,1],part.group.rotation||[0,0,0]),local):local,e=PRIMITIVE_EXTENT[part.type]||.5;
    for(const x of[-e,e])for(const y of[-e,e])for(const z of[-e,e]){const c=[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];corners.push(c);for(let i=0;i<3;i++){min[i]=Math.min(min[i],c[i]);max[i]=Math.max(max[i],c[i]);}}
  }
  if(!corners.length)return{center:[0,0,0],radius:1};
  const center=[0,1,2].map(i=>(min[i]+max[i])/2);let radius=0;
  for(const c of corners)radius=Math.max(radius,Math.hypot(c[0]-center[0],c[1]-center[1],c[2]-center[2]));
  return{center,radius};
}
const FOV_Y=radians(34);
export function fitCameraDistance(radius,aspect,padding=1.04){const halfY=FOV_Y/2,halfX=Math.atan(Math.tan(halfY)*Math.max(.05,aspect||1));return radius*padding/Math.sin(Math.min(halfY,halfX));}

export const __geometryForTests=Object.freeze({CUBE,BEVEL,WEDGE,DIAMOND,CYLINDER,OCTA,rotationZ,compose,normalMatrix,multiply});

// 12 segments laid tangent to the circle (a cylinder's long axis is Y, and Rz(a)
// turns it along the tangent) and long enough to overlap into a closed band.
function ringRecipe(radius=.9,thickness=.14,profile=null){const out=[],segment=2*Math.PI*radius/12*1.12;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;out.push(primitive('cylinder',[Math.cos(a)*radius,Math.sin(a)*radius,0],[thickness,segment,thickness],[0,0,a],profile));}return out;}
function accentProfile(profile={}){return{...profile,material:profile.material==='obsidian'?'moonsteel':profile.material,tone:profile.tone||'arcane',quality:1,durability:profile.durability??1,accent:true};}

export function sceneRecipeForKind(kind='relic',{variant=0,swordLength=0,profile=null}={}){
  // Procedural stand-ins for kinds that only have glTF art: reuse the closest silhouette.
  if(kind==='tiara')kind='helmet';
  if(kind==='earring')kind='amulet';
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

export function motionForKind(kind='relic'){if(['shield','hammer','bow','crossbow'].includes(kind))return'heavy-turn';if(kind==='helmet'||kind==='tiara')return'wobble';if(['ring','earring','amulet','relic'].includes(kind))return'orbit';if(['armor','gloves','gauntlets','greaves','boots','cloak'].includes(kind))return'float';return'spin';}
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Loot 3D shader failed');return s;}
function makeProgram(gl){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,VERTEX_SHADER));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,FRAGMENT_SHADER));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Loot 3D link failed');return p;}
function meshBuffer(gl,mesh){const position=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,position);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.STATIC_DRAW);const normal=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,normal);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);return{position,normal,count:mesh.count};}
function classToken(node,prefix,fallback='unknown'){const match=[...(node?.classList||[])].find(value=>value.startsWith(prefix));return match?match.slice(prefix.length):fallback;}
function profileFromLootNode(node){return{kind:node.dataset.lootKind||(node.classList.contains('daily-sword-art')?'sword':'relic'),variant:Number(node.dataset.lootVariant)||0,material:node.dataset.lootMaterial||classToken(node,'material-','iron'),tone:node.dataset.lootTone||classToken(node,'tone-','aqua'),quality:clamp(Number(node.style.getPropertyValue('--loot-quality'))||.65,0,1),durability:clamp(Number(node.style.getPropertyValue('--loot-durability'))||1,0,1),swordLength:Number(node.dataset.swordLength)||0};}
function profileFromAvatarPiece(piece){const q=classToken(piece,'avatar-quality-','standard'),wear=classToken(piece,'avatar-wear-','pristine');return{kind:classToken(piece,'avatar-kind-','relic'),material:classToken(piece,'avatar-material-','iron'),tone:classToken(piece,'avatar-tone-','arcane'),quality:q==='masterwork'?1:q==='fine'?.84:q==='rough'?.35:.68,durability:wear==='broken'?0:wear==='critical'?.22:wear==='damaged'?.48:wear==='worn'?.72:.96,variant:0};}
function mixColor(a,b,t){return[0,1,2].map(i=>a[i]*(1-t)+b[i]*t);}
function materialForProfile(profile){const material=MATERIALS[profile.material]||MATERIALS.unknown,tone=TONE_COLORS[profile.tone]||TONE_COLORS.arcane;return{base:mixColor(material.color,tone,profile.accent?.42:.16),emissive:tone,metallic:profile.accent?1:material.metallic,roughness:profile.accent?.10:material.roughness};}

// Shared by loot-webgl-v3.js / loot-webgl-v4.js so the matrix math, geometry and
// shading live in exactly one place.
export function createRenderer(canvas){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'high-performance'});if(!gl)throw new Error('Loot WebGL unavailable');
  const p=makeProgram(gl);gl.useProgram(p);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.clearColor(0,0,0,0);
  const attrs={position:gl.getAttribLocation(p,'a_position'),normal:gl.getAttribLocation(p,'a_normal')};
  const uniforms={mvp:gl.getUniformLocation(p,'u_mvp'),normalMatrix:gl.getUniformLocation(p,'u_normal_matrix'),base:gl.getUniformLocation(p,'u_base'),emissive:gl.getUniformLocation(p,'u_emissive'),quality:gl.getUniformLocation(p,'u_quality'),wear:gl.getUniformLocation(p,'u_wear'),metallic:gl.getUniformLocation(p,'u_metallic'),roughness:gl.getUniformLocation(p,'u_roughness')};
  const meshes={box:meshBuffer(gl,CUBE),bevel:meshBuffer(gl,BEVEL),wedge:meshBuffer(gl,WEDGE),diamond:meshBuffer(gl,DIAMOND),cylinder:meshBuffer(gl,CYLINDER),octa:meshBuffer(gl,OCTA)};
  gl.enableVertexAttribArray(attrs.position);gl.enableVertexAttribArray(attrs.normal);
  let bound=null;
  function bind(mesh){if(bound===mesh)return;bound=mesh;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.position);gl.vertexAttribPointer(attrs.position,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.normal);gl.vertexAttribPointer(attrs.normal,3,gl.FLOAT,false,0,0);}
  function resize(){const dpr=Math.min(window.devicePixelRatio||1,1.6),w=Math.max(2,Math.floor(canvas.clientWidth*dpr)),h=Math.max(2,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}return w/h;}
  // A part's group/local transforms and material never change after mount, so
  // they're computed once instead of re-multiplied and re-allocated every frame.
  const partCache=new WeakMap();
  const prepared=(part,globalProfile)=>{let entry=partCache.get(part);if(!entry){const local=compose(part.position,part.scale,part.rotation),group=part.group?compose(part.group.position||[0,0,0],part.group.scale||[1,1,1],part.group.rotation||[0,0,0]):null,profile=part.profile||globalProfile||{},mat=materialForProfile(profile);entry={matrix:group?multiply(group,local):local,base:new Float32Array(mat.base),emissive:new Float32Array(mat.emissive),quality:clamp(profile.quality??.7,0,1),wear:clamp(profile.durability??1,0,1),metallic:mat.metallic,roughness:mat.roughness,mesh:meshes[part.type]||meshes.box};partCache.set(part,entry);}return entry;};
  const model=new Array(16),viewModel=new Array(16),mvp=new Array(16),mvpF=new Float32Array(16),normalF=new Float32Array(9),view=identity();
  function draw(recipe,{rotation=[0,0,0],position=[0,0,0],rootScale=[1,1,1],camera=5.2,globalProfile=null,bounds=null}={}){
    if(gl.isContextLost())return;
    const aspect=resize();gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    // With bounds, rotate around the item's own center and frame its bounding sphere.
    let root=compose(position,rootScale,rotation);
    if(bounds){root=multiply(root,translation(-bounds.center[0],-bounds.center[1],-bounds.center[2]));camera=fitCameraDistance(bounds.radius,aspect);}
    const projection=perspective(FOV_Y,aspect,.1,50);view[14]=-camera;
    for(const part of recipe){
      const entry=prepared(part,globalProfile);
      multiply(root,entry.matrix,model);multiply(view,model,viewModel);multiply(projection,viewModel,mvp);
      mvpF.set(mvp);normalMatrix(model,normalF);
      gl.uniformMatrix4fv(uniforms.mvp,false,mvpF);gl.uniformMatrix3fv(uniforms.normalMatrix,false,normalF);
      gl.uniform3fv(uniforms.base,entry.base);gl.uniform3fv(uniforms.emissive,entry.emissive);
      gl.uniform1f(uniforms.quality,entry.quality);gl.uniform1f(uniforms.wear,entry.wear);gl.uniform1f(uniforms.metallic,entry.metallic);gl.uniform1f(uniforms.roughness,entry.roughness);
      bind(entry.mesh);gl.drawArrays(gl.TRIANGLES,0,entry.mesh.count);
    }
  }
  // Browsers cap live WebGL contexts (~8 on mobile, 16 on desktop) and silently
  // kill the OLDEST one past the cap — which is the full-screen background. Every
  // paper-doll re-render mounts a new canvas, so contexts must be released explicitly.
  function destroy(){try{gl.getExtension('WEBGL_lose_context')?.loseContext();}catch{}}
  return{draw,destroy};
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

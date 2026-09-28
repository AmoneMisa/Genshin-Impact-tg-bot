import { motionForKind, sceneRecipeForKind } from './loot-webgl-v2.js';
import { createRenderer } from './loot-webgl-v2.js';

function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function radians(deg){return deg*Math.PI/180;}
function primitive(type,position,scale,rotation=[0,0,0],profile=null){return{type,position,scale,rotation,profile};}
function transformed(part,group={}){return{...part,group};}
function classToken(node,prefix,fallback='unknown'){const match=[...(node?.classList||[])].find(value=>value.startsWith(prefix));return match?match.slice(prefix.length):fallback;}
function profileFromLootNode(node){return{kind:node.dataset.lootKind||(node.classList.contains('daily-sword-art')?'sword':'relic'),variant:Number(node.dataset.lootVariant)||0,material:node.dataset.lootMaterial||classToken(node,'material-','iron'),tone:node.dataset.lootTone||classToken(node,'tone-','aqua'),quality:clamp(Number(node.style.getPropertyValue('--loot-quality'))||.65,0,1),durability:clamp(Number(node.style.getPropertyValue('--loot-durability'))||1,0,1),swordLength:Number(node.dataset.swordLength)||0};}
function profileFromAvatarPiece(piece){const q=classToken(piece,'avatar-quality-','standard'),wear=classToken(piece,'avatar-wear-','pristine');return{kind:classToken(piece,'avatar-kind-','relic'),material:classToken(piece,'avatar-material-','iron'),tone:classToken(piece,'avatar-tone-','arcane'),quality:q==='masterwork'?1:q==='fine'?.84:q==='rough'?.35:.68,durability:wear==='broken'?0:wear==='critical'?.22:wear==='damaged'?.48:wear==='worn'?.72:.96,variant:0};}

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

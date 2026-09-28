import { motionForKind, sceneRecipeForKind } from './loot-webgl-v2.js';
import { characterIdleTransform, characterPoseForLoadout } from './loot-webgl-v3.js';
import { createRenderer, recipeBounds } from './loot-webgl-v2.js';
import { getGltfStage, loadModelManifest, resolveModelEntry } from './loot-gltf.js';

function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
function radians(deg){return deg*Math.PI/180;}
function primitive(type,position,scale,rotation=[0,0,0],profile=null){return{type,position,scale,rotation,profile};}
function transformed(part,group={}){return{...part,group};}
function lerp(a,b,t){return a+(b-a)*t;}
function lerp3(a,b,t){return[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];}
function classToken(node,prefix,fallback='unknown'){const match=[...(node?.classList||[])].find(value=>value.startsWith(prefix));return match?match.slice(prefix.length):fallback;}
function profileFromLootNode(node){return{kind:node.dataset.lootKind||(node.classList.contains('daily-sword-art')?'sword':'relic'),variant:Number(node.dataset.lootVariant)||0,material:node.dataset.lootMaterial||classToken(node,'material-','iron'),tone:node.dataset.lootTone||classToken(node,'tone-','aqua'),quality:clamp(Number(node.style.getPropertyValue('--loot-quality'))||.65,0,1),durability:clamp(Number(node.style.getPropertyValue('--loot-durability'))||1,0,1),swordLength:Number(node.dataset.swordLength)||0};}
function profileFromAvatarPiece(piece){const q=classToken(piece,'avatar-quality-','standard'),wear=classToken(piece,'avatar-wear-','pristine');return{kind:classToken(piece,'avatar-kind-','relic'),material:classToken(piece,'avatar-material-','iron'),tone:classToken(piece,'avatar-tone-','arcane'),quality:q==='masterwork'?1:q==='fine'?.84:q==='rough'?.35:.68,durability:wear==='broken'?0:wear==='critical'?.22:wear==='damaged'?.48:wear==='worn'?.72:.96,variant:0};}

const DEFAULT_FOCUS=Object.freeze({position:[0,0,0],camera:6.25,yaw:0});
const SLOT_FOCUS=Object.freeze({
  head:{position:[0,-.92,0],camera:4.72,yaw:0},leftEar:{position:[.13,-1.02,0],camera:4.55,yaw:.16},rightEar:{position:[-.13,-1.02,0],camera:4.55,yaw:-.16},
  necklace:{position:[0,-.59,0],camera:4.92,yaw:0},up:{position:[0,-.28,0],camera:5.05,yaw:0},cloak:{position:[0,-.18,0],camera:5.20,yaw:.48},
  hands:{position:[0,-.03,0],camera:5.02,yaw:0},leftHand:{position:[.47,-.02,0],camera:4.94,yaw:.24},rightHand:{position:[-.47,-.02,0],camera:4.94,yaw:-.24},
  leftRing:{position:[.58,.06,0],camera:4.56,yaw:.28},rightRing:{position:[-.58,.06,0],camera:4.56,yaw:-.28},down:{position:[0,.55,0],camera:5.05,yaw:0},legs:{position:[0,1.03,0],camera:4.84,yaw:0},
});
export function characterFocusForSlot(slot=''){const f=SLOT_FOCUS[String(slot||'')]||DEFAULT_FOCUS;return{position:[...f.position],camera:f.camera,yaw:f.yaw};}
export function characterDragRotation(current={yaw:0,pitch:0},deltaX=0,deltaY=0,pointerType='mouse'){return{yaw:clamp((Number(current.yaw)||0)+Number(deltaX||0)*.008,-1.45,1.45),pitch:clamp((Number(current.pitch)||0)+(pointerType==='touch'?0:Number(deltaY||0)*.0045),-.28,.20)};}
// Converts a per-frame lerp factor tuned at 60 fps into a time-based one, so easing
// feels identical on 60/90/120 Hz screens and doesn't lurch after a dropped frame.
export function dampFactor(perFrameAt60,dtSeconds){const rate=-Math.log(1-clamp(Number(perFrameAt60)||0,0,.999))*60;return 1-Math.exp(-rate*clamp(Number(dtSeconds)||0,0,.25));}
export function characterReturnRotation(current={yaw:0,pitch:0},strength=.08){const t=clamp(Number(strength)||0,0,1);return{yaw:lerp(Number(current.yaw)||0,0,t),pitch:lerp(Number(current.pitch)||0,0,t)};}

function weaponDescriptors(stage){return[...stage.querySelectorAll('.paper-avatar-piece[data-avatar-role="weapon"]')].map(piece=>({piece,profile:profileFromAvatarPiece(piece),side:piece.dataset.avatarSide||'center',twoHanded:piece.classList.contains('avatar-two-hand')}));}
function stanceContext(weapons){const left=weapons.find(w=>w.side==='left')||null,right=weapons.find(w=>w.side==='right')||null,center=weapons.find(w=>w.side==='center')||null,twoHanded=Boolean(center?.twoHanded),leftKind=left?.profile.kind||center?.profile.kind||null,rightKind=right?.profile.kind||(twoHanded?center?.profile.kind:null),pose=characterPoseForLoadout({leftKind,rightKind,twoHanded}),shield=weapons.find(w=>w.profile.kind==='shield')||null;return{pose,left,right,center,twoHanded,shieldSide:shield?.side||null};}
function armRecipe(side,stance,profile){const s=side==='left'?-1:1,isShield=stance.shieldSide===side;let upper={x:s*.60,y:.61,z:0,rx:0,ry:0,rz:s*radians(12)},lower={x:s*.69,y:.06,z:.02,rx:0,ry:0,rz:s*radians(5)};if(stance.pose==='guard'){if(isShield){upper={x:s*.53,y:.62,z:.18,rx:radians(-22),ry:s*radians(12),rz:s*radians(42)};lower={x:s*.43,y:.31,z:.34,rx:radians(-42),ry:s*radians(18),rz:-s*radians(24)};}else{upper={x:s*.61,y:.62,z:.02,rx:radians(-8),ry:s*radians(8),rz:s*radians(22)};lower={x:s*.76,y:.08,z:.05,rx:radians(-5),ry:s*radians(4),rz:s*radians(8)};}}else if(stance.pose==='ranged'){upper={x:s*.48,y:.68,z:.18,rx:radians(-55),ry:s*radians(18),rz:s*radians(50)};lower={x:s*.28,y:.53,z:.50,rx:radians(-64),ry:s*radians(26),rz:-s*radians(32)};}else if(stance.pose==='caster'){const staffSide=(stance.left?.profile.kind==='staff'?'left':stance.right?.profile.kind==='staff'?'right':stance.center?'center':null);if(staffSide===side){upper={x:s*.58,y:.62,z:.02,rx:radians(-8),ry:0,rz:s*radians(15)};lower={x:s*.72,y:.06,z:.03,rx:0,ry:0,rz:s*radians(4)};}else{upper={x:s*.50,y:.78,z:.10,rx:radians(-30),ry:s*radians(15),rz:s*radians(58)};lower={x:s*.28,y:.93,z:.28,rx:radians(-35),ry:s*radians(22),rz:-s*radians(38)};}}else if(stance.pose==='dual'){upper={x:s*.59,y:.60,z:.02,rx:radians(-8),ry:s*radians(8),rz:s*radians(30)};lower={x:s*.83,y:.10,z:.04,rx:radians(-4),ry:s*radians(4),rz:s*radians(16)};}else if(stance.pose==='two-hand'){upper={x:s*.47,y:.67,z:.14,rx:radians(-34),ry:s*radians(12),rz:s*radians(45)};lower={x:s*.28,y:.38,z:.34,rx:radians(-38),ry:s*radians(20),rz:-s*radians(22)};}else if(stance.pose==='one-hand'){const armedSide=stance.left?'left':stance.right?'right':'right';if(armedSide===side){upper={x:s*.60,y:.61,z:.02,rx:radians(-5),ry:s*radians(7),rz:s*radians(25)};lower={x:s*.78,y:.08,z:.05,rx:0,ry:0,rz:s*radians(10)};}}return[primitive('cylinder',[upper.x,upper.y,upper.z],[.21,.67,.21],[upper.rx,upper.ry,upper.rz],profile),primitive('bevel',[s*.63,.90,.01],[.28,.24,.31],[0,0,s*radians(8)],profile),primitive('cylinder',[lower.x,lower.y,lower.z],[.19,.61,.19],[lower.rx,lower.ry,lower.rz],profile),primitive('bevel',[lower.x,lower.y-.35,lower.z+.02],[.22,.20,.22],[0,0,lower.rz],profile)];}
function baseBodyRecipe(stance){const neutral={material:'moonsteel',tone:'arcane',quality:.58,durability:1},dark={material:'obsidian',tone:'arcane',quality:.45,durability:1},hipShift=stance.pose==='ranged'?-.07:stance.pose==='guard'?.05:stance.pose==='dual'?.025:0;return[primitive('octa',[0,1.55,.02],[.43,.52,.40],[radians(-2),0,0],neutral),primitive('cylinder',[0,1.13,0],[.18,.27,.18],[0,0,0],dark),primitive('bevel',[0,.70,0],[.73,.82,.42],[0,0,radians(hipShift*8)],neutral),primitive('bevel',[0,.17,0],[.56,.34,.36],[0,0,0],dark),primitive('bevel',[hipShift,-.16,0],[.62,.38,.40],[0,0,radians(-hipShift*12)],neutral),...armRecipe('left',stance,neutral),...armRecipe('right',stance,neutral),primitive('cylinder',[-.25,-.67,.01],[.27,.76,.28],[0,0,radians(-4)],neutral),primitive('cylinder',[.25,-.67,.01],[.27,.76,.28],[0,0,radians(4)],neutral),primitive('bevel',[-.27,-1.29,.08],[.26,.72,.29],[0,0,radians(-2)],neutral),primitive('bevel',[.27,-1.29,.08],[.26,.72,.29],[0,0,radians(2)],neutral),primitive('bevel',[-.28,-1.72,.25],[.34,.24,.58],[radians(-8),0,0],dark),primitive('bevel',[.28,-1.72,.25],[.34,.24,.58],[radians(-8),0,0],dark)];}
function weaponGroup(weapon,stance){const kind=weapon.profile.kind,side=weapon.side;if(weapon.twoHanded||side==='center'){if(stance.pose==='ranged')return{position:[0,.16,.42],scale:[.64,.64,.64],rotation:[radians(-7),radians(12),radians(88)]};if(stance.pose==='caster')return{position:[.06,.08,.12],scale:[.66,.66,.66],rotation:[0,radians(-6),radians(-7)]};return{position:[0,.02,.30],scale:[.67,.67,.67],rotation:[radians(-12),radians(8),radians(-28)]};}const s=side==='left'?-1:1;if(kind==='shield')return{position:[s*.86,.25,.38],scale:[.46,.46,.46],rotation:[radians(-4),s*radians(17),s*radians(4)]};if(stance.pose==='ranged')return{position:[s*.42,.28,.52],scale:[.53,.53,.53],rotation:[radians(-8),s*radians(18),s*radians(78)]};if(kind==='staff')return{position:[s*.95,.10,.06],scale:[.58,.58,.58],rotation:[0,s*radians(7),s*radians(-5)]};if(stance.pose==='dual')return{position:[s*1.02,.02,.11],scale:[.51,.51,.51],rotation:[radians(-5),s*radians(8),s*radians(-18)]};return{position:[s*1.00,-.02,.10],scale:[.52,.52,.52],rotation:[radians(-4),s*radians(7),s*radians(-12)]};}
function avatarRecipe(stage){const weapons=weaponDescriptors(stage),stance=stanceContext(weapons),recipe=baseBodyRecipe(stance);for(const piece of[...stage.querySelectorAll('.paper-avatar-piece')]){const profile=profileFromAvatarPiece(piece),role=piece.dataset.avatarRole||'torso';if(role==='helmet')recipe.push(...sceneRecipeForKind('helmet',{profile}).map(p=>transformed(p,{position:[0,1.47,.05],scale:[.37,.37,.37]})));else if(role==='torso')recipe.push(...sceneRecipeForKind('armor',{profile}).map(p=>transformed(p,{position:[0,.48,.14],scale:[.50,.50,.50]})));else if(role==='cloak')recipe.push(...sceneRecipeForKind('cloak',{profile}).map(p=>transformed(p,{position:[0,.12,-.36],scale:[.56,.56,.56]})));else if(role==='gloves')recipe.push(...sceneRecipeForKind('gloves',{profile}).map(p=>transformed(p,{position:[0,.20,.18],scale:[.44,.44,.44]})));else if(role==='lower')recipe.push(...sceneRecipeForKind('greaves',{profile}).map(p=>transformed(p,{position:[0,-.91,.12],scale:[.47,.47,.47]})));}for(const weapon of weapons){const group=weaponGroup(weapon,stance);recipe.push(...sceneRecipeForKind(weapon.profile.kind,{profile:weapon.profile}).map(p=>transformed(p,group)));}return{recipe,pose:stance.pose};}

function animatedRotation(kind,seconds,reveal=false){const motion=motionForKind(kind);if(motion==='heavy-turn')return[radians(-7),seconds*.38,radians(2)];if(motion==='wobble')return[radians(-6+Math.sin(seconds*1.3)*4),seconds*.28,radians(Math.sin(seconds*.8)*2)];if(motion==='orbit')return[radians(-12),seconds*.55,radians(Math.sin(seconds)*5)];if(motion==='float')return[radians(-8),seconds*.24,radians(Math.sin(seconds*.7)*2)];return[radians(-7),seconds*(reveal?1.15:.62),radians(2)];}
function mountLootNode(node){if(node.dataset.webglMounted==='yes')return null;node.dataset.webglMounted='yes';const canvas=document.createElement('canvas');canvas.className='loot-webgl-canvas';canvas.setAttribute('aria-hidden','true');node.prepend(canvas);try{const renderer=createRenderer(canvas),profile=profileFromLootNode(node),recipe=sceneRecipeForKind(profile.kind,{variant:profile.variant,swordLength:profile.swordLength,profile});const bounds=recipeBounds(recipe);node.classList.add('loot-webgl-ready');return{canvas,node,destroy:renderer.destroy,draw:seconds=>renderer.draw(recipe,{rotation:animatedRotation(profile.kind,seconds,node.classList.contains('is-reveal')),bounds,globalProfile:profile})};}catch(error){canvas.remove();node.dataset.webglMounted='failed';console.warn(error);return null;}}

function mountAvatarStage(stage){
  if(stage.dataset.avatarWebglMounted==='yes')return null;stage.dataset.avatarWebglMounted='yes';
  const figure=stage.querySelector('.paper-doll-figure'),canvas=document.createElement('canvas');canvas.className='paper-avatar-webgl-canvas';canvas.setAttribute('aria-hidden','true');figure?.appendChild(canvas);
  try{
    const renderer=createRenderer(canvas),avatar=avatarRecipe(stage),interaction={dragging:false,pointerId:null,lastX:0,lastY:0,lastInput:0,manual:{yaw:0,pitch:0},focus:characterFocusForSlot(),currentFocus:characterFocusForSlot()};
    stage.dataset.avatarPose=avatar.pose;stage.dataset.avatarFocus='body';stage.classList.add('paper-avatar-webgl-ready','paper-avatar-interactive');
    const selectFocus=(slot='')=>{interaction.focus=characterFocusForSlot(slot);interaction.lastInput=performance.now();stage.dataset.avatarFocus=slot||'body';for(const el of stage.querySelectorAll('.paper-doll-slot[data-slot]'))el.classList.toggle('preview-focused',Boolean(slot)&&el.dataset.slot===slot);};
    const down=event=>{if(event.pointerType==='mouse'&&event.button!==0)return;if(event.target.closest?.('.paper-doll-slot'))return;interaction.dragging=true;interaction.pointerId=event.pointerId;interaction.lastX=event.clientX;interaction.lastY=event.clientY;interaction.lastInput=performance.now();stage.classList.add('is-character-dragging');try{figure?.setPointerCapture?.(event.pointerId);}catch{}};
    const move=event=>{if(!interaction.dragging||event.pointerId!==interaction.pointerId)return;const dx=event.clientX-interaction.lastX,dy=event.clientY-interaction.lastY;interaction.manual=characterDragRotation(interaction.manual,dx,dy,event.pointerType);interaction.lastX=event.clientX;interaction.lastY=event.clientY;interaction.lastInput=performance.now();};
    const up=event=>{if(event.pointerId!==interaction.pointerId)return;interaction.dragging=false;interaction.pointerId=null;interaction.lastInput=performance.now();stage.classList.remove('is-character-dragging');try{figure?.releasePointerCapture?.(event.pointerId);}catch{}};
    const click=event=>{const slot=event.target.closest?.('.paper-doll-slot[data-slot]');if(slot&&stage.contains(slot))selectFocus(slot.dataset.slot||'');};
    figure?.addEventListener('pointerdown',down);figure?.addEventListener('pointermove',move);figure?.addEventListener('pointerup',up);figure?.addEventListener('pointercancel',up);stage.addEventListener('click',click);
    return{canvas,node:stage,draw:(seconds,now,dt=1/60)=>{if(!interaction.dragging&&now-interaction.lastInput>1100)interaction.manual=characterReturnRotation(interaction.manual,dampFactor(.055,dt));const ease=dampFactor(.09,dt);interaction.currentFocus.position=lerp3(interaction.currentFocus.position,interaction.focus.position,ease);interaction.currentFocus.camera=lerp(interaction.currentFocus.camera,interaction.focus.camera,ease);interaction.currentFocus.yaw=lerp(interaction.currentFocus.yaw,interaction.focus.yaw,ease);const idle=characterIdleTransform(avatar.pose,seconds),rotation=[idle.rotation[0]+interaction.manual.pitch,idle.rotation[1]+interaction.currentFocus.yaw+interaction.manual.yaw,idle.rotation[2]],position=[idle.position[0]+interaction.currentFocus.position[0],idle.position[1]+interaction.currentFocus.position[1],idle.position[2]+interaction.currentFocus.position[2]];renderer.draw(avatar.recipe,{rotation,position,rootScale:idle.scale,camera:interaction.currentFocus.camera});},destroy:()=>{figure?.removeEventListener('pointerdown',down);figure?.removeEventListener('pointermove',move);figure?.removeEventListener('pointerup',up);figure?.removeEventListener('pointercancel',up);stage.removeEventListener('click',click);renderer.destroy();}};
  }catch(error){canvas.remove();stage.dataset.avatarWebglMounted='failed';console.warn(error);return null;}
}
function reducedMotion(){try{return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;}catch{return false;}}
function ensureStylesheet(){if(document.getElementById('loot-webgl-styles'))return;const link=document.createElement('link');link.id='loot-webgl-styles';link.rel='stylesheet';link.href='/loot-webgl.css';document.head.appendChild(link);}
// Mobile browsers allow ~8 live WebGL contexts and evict the oldest (the page
// background) past that. Scenes beyond this budget keep their SVG art instead.
export const MAX_LIVE_SCENES=4;
// glTF previews share one context, so they get their own (draw-cost) budget.
export const MAX_GLTF_SCENES=10;
const ownContexts=scenes=>[...scenes].filter(scene=>!scene.sharedContext).length;
const sharedContexts=scenes=>[...scenes].filter(scene=>scene.sharedContext).length;
export function startLootWebGL(root=document){
  if(typeof window==='undefined'||typeof document==='undefined'||reducedMotion())return()=>{};
  ensureStylesheet();
  const scenes=new Set();
  // Offscreen scenes (scrolled-away paper doll, reveal behind a sheet) skip their
  // GPU work entirely; this is most of the battery cost on phones.
  const visibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)for(const scene of scenes)if(scene.node===entry.target)scene.visible=entry.isIntersecting;}):null;
  const add=scene=>{if(!scene)return;scene.visible=true;scene.started=performance.now();scenes.add(scene);visibility?.observe(scene.node);};
  const prune=()=>{for(const scene of[...scenes])if(!scene.node.isConnected)release(scene);};
  // The paper doll is mounted first: it's the interactive centrepiece, loot previews are decoration.
  const scan=(scope=root)=>{prune();const stages=[...(scope.querySelectorAll?.('[data-paper-doll-stage]')||[])];if(scope.matches?.('[data-paper-doll-stage]'))stages.unshift(scope);for(const stage of stages){if(ownContexts(scenes)>=MAX_LIVE_SCENES)break;add(mountAvatarStage(stage));}const loot=[...(scope.querySelectorAll?.('.loot-art.is-reveal,.daily-sword-art')||[])];if(scope.matches?.('.loot-art.is-reveal,.daily-sword-art'))loot.unshift(scope);for(const node of loot)mountLoot(node);};
  // Prefer an artist-made glTF model for the item's kind; keep the SVG visible
  // while it downloads and fall back to the procedural mesh if there's none or it fails.
  const pending=new WeakSet();
  const procedural=node=>{if(ownContexts(scenes)<MAX_LIVE_SCENES)add(mountLootNode(node));};
  const mountLoot=node=>{
    if(pending.has(node)||node.dataset.webglMounted)return;pending.add(node);
    const profile=profileFromLootNode(node);
    loadModelManifest().then(manifest=>{
      const entry=resolveModelEntry(manifest,{kind:profile.kind,grade:node.dataset.lootGrade});
      if(!entry||sharedContexts(scenes)>=MAX_GLTF_SCENES)return procedural(node);
      node.dataset.webglMounted='gltf';
      return getGltfStage().then(stage=>stage.mount(node,{...profile,grade:node.dataset.lootGrade||'noGrade'},entry)).then(add).catch(error=>{console.warn(error);delete node.dataset.webglMounted;procedural(node);});
    }).finally(()=>pending.delete(node));
  };
  const release=scene=>{visibility?.unobserve(scene.node);scene.destroy?.();scenes.delete(scene);};
  scan();
  const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)scan(node);});
  observer.observe(document.body,{childList:true,subtree:true});
  let raf=0,last=performance.now();
  const frame=now=>{
    const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
    for(const scene of[...scenes]){
      if(!scene.node.isConnected){release(scene);continue;}
      if(!scene.visible||document.hidden)continue;
      // Each scene has its own clock so a freshly revealed item starts its spin
      // from the front instead of mid-rotation.
      scene.draw((now-scene.started)/1000,now,dt);
    }
    raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);
  return()=>{observer.disconnect();visibility?.disconnect();cancelAnimationFrame(raf);for(const scene of[...scenes]){release(scene);scene.canvas.remove();}};
}

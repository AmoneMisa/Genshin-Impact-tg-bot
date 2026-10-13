import {inventoryActionIcon} from './inventory-layout.js';
import {escapeHtml} from './escape-html.js';

export function itemTrashButton({label='Выбросить',attribute='',className='',disabled=false}={}){
 return `<button type="button" class="ui-button ui-icon-button item-trash ${className}" data-item-trash ${attribute} title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" ${disabled?'disabled':''}>${inventoryActionIcon('discard')}</button>`;
}

/** Shared mouse drag / touch hold-and-drag. Dropping only requests the existing confirmation. */
export function bindItemTrash({root,selector,getItem,canDrop=()=>true,onDrop}){
 let gesture=null,timer=null,ghost=null,hover=null,suppressClick=false;
 const removeEvents=()=>{
  document.removeEventListener('pointermove',mouseMove);document.removeEventListener('pointerup',mouseEnd);
  document.removeEventListener('pointercancel',cancel);document.removeEventListener('touchmove',touchMove);
  document.removeEventListener('touchend',touchEnd);document.removeEventListener('touchcancel',cancel);
 };
 function cleanup(){
  clearTimeout(timer);timer=null;removeEvents();ghost?.remove();ghost=null;hover?.classList.remove('is-drop-target');hover=null;
  if(gesture){gesture.source.classList.remove('is-dragging');if(gesture.target?.isConnected)gesture.target.disabled=gesture.wasDisabled;}
  gesture=null;
 }
 function start(source,x,y,touch){
  const item=getItem(source),target=root.querySelector('[data-item-trash]');
  if(!item||!target||!canDrop(item))return;
  cleanup();gesture={source,item,target,wasDisabled:target.disabled,x,y,touch,ready:!touch,active:false};
  if(touch)timer=setTimeout(()=>{if(gesture)gesture.ready=true;},240);
 }
 function move(x,y,event){
  const g=gesture;if(!g)return;
  const distance=Math.hypot(x-g.x,y-g.y);
  if(!g.active){
   if(!g.ready){if(distance>8)cleanup();return;}
   if(distance<6)return;
   g.active=true;suppressClick=true;g.target.disabled=false;g.source.classList.add('is-dragging');
   ghost=document.createElement('div');ghost.className='item-drag-preview';ghost.innerHTML=g.source.innerHTML;ghost.setAttribute('aria-hidden','true');document.body.append(ghost);
  }
  if(event.cancelable)event.preventDefault();
  ghost.style.transform=`translate(${x-24}px,${y-24}px)`;
  const at=document.elementFromPoint(x,y)?.closest('[data-item-trash]');
  if(hover!==at){hover?.classList.remove('is-drop-target');hover=at===g.target?at:null;hover?.classList.add('is-drop-target');}
 }
 function end(x,y){
  const g=gesture;if(!g)return;
  const dropped=g.active&&document.elementFromPoint(x,y)?.closest('[data-item-trash]')===g.target;
  const item=g.item;cleanup();if(dropped&&root.isConnected&&canDrop(item))onDrop(item);
  // Suppress the synthesized click after a drag, while leaving ordinary taps untouched.
  if(g.active)setTimeout(()=>{suppressClick=false;},350);
 }
 function cancel(){const active=gesture?.active;cleanup();if(active)setTimeout(()=>{suppressClick=false;},350);}
 function mouseStart(e){if(e.pointerType==='touch'||e.button!==0)return;const source=e.target.closest(selector);if(!source||!root.contains(source))return;start(source,e.clientX,e.clientY,false);if(gesture){document.addEventListener('pointermove',mouseMove,{passive:false});document.addEventListener('pointerup',mouseEnd);document.addEventListener('pointercancel',cancel);}}
 function mouseMove(e){move(e.clientX,e.clientY,e);}
 function mouseEnd(e){end(e.clientX,e.clientY);}
 function touchStart(e){if(e.touches.length!==1)return;const source=e.target.closest(selector);if(!source||!root.contains(source))return;const t=e.touches[0];start(source,t.clientX,t.clientY,true);if(gesture){document.addEventListener('touchmove',touchMove,{passive:false});document.addEventListener('touchend',touchEnd);document.addEventListener('touchcancel',cancel);}}
 function touchMove(e){if(e.touches.length!==1)return cancel();const t=e.touches[0];move(t.clientX,t.clientY,e);}
 function touchEnd(e){const t=e.changedTouches[0];if(t)end(t.clientX,t.clientY);else cancel();}
 function click(e){if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}}
 function key(e){if(e.key!=='Delete')return;const source=e.target.closest(selector),item=source&&getItem(source);if(item&&canDrop(item)){e.preventDefault();onDrop(item);}}
 function nativeDrag(e){if(e.target.closest(selector))e.preventDefault();}
 function contextMenu(e){if(gesture&&e.target.closest(selector))e.preventDefault();}
 root.addEventListener('pointerdown',mouseStart);root.addEventListener('touchstart',touchStart,{passive:true});root.addEventListener('click',click,true);root.addEventListener('keydown',key);root.addEventListener('dragstart',nativeDrag);root.addEventListener('contextmenu',contextMenu);
 return ()=>{cleanup();suppressClick=false;root.removeEventListener('pointerdown',mouseStart);root.removeEventListener('touchstart',touchStart);root.removeEventListener('click',click,true);root.removeEventListener('keydown',key);root.removeEventListener('dragstart',nativeDrag);root.removeEventListener('contextmenu',contextMenu);};
}

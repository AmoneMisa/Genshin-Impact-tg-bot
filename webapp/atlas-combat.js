import {bar,hotbar,escapeHtml} from './boss-hud.js';
import {COMBAT_ACTIONS,combatActionButton} from './combat-actions.js';
import {enhanceSelects,syncSelect} from './design/select.js';
import {combatSuppliesHtml} from './combat-supplies.js';
import {showLootDetails} from './loot-notice.js';

/** Existing combat controls mounted in the Atlas; owns no polling or animation loop. */
export function createAtlasCombat(root,action,{mapAvailable=true}={}){
 const host=document.createElement('section');host.className='atlas-combat';host.hidden=true;host.setAttribute('aria-label','Бой на местности');
 root.querySelector('.atlas-panel').insertBefore(host,root.querySelector('.atlas-footer'));
 let state=null,selection='',optionsKey='';
 host.innerHTML='<div class="atlas-combat-meters"></div><div class="atlas-combat-target"></div><div class="atlas-combat-controls"><label>Цель рядом<select aria-label="Цель рядом" data-native-target></select></label><div data-native-attack></div></div><div data-native-skills></div>';
 const select=host.querySelector('select');enhanceSelects(host);
 host.insertAdjacentHTML('beforeend','<details class="ui-disclosure"><summary>Расходники</summary><div data-native-supplies></div></details>');
 host.insertAdjacentHTML('beforeend','<button type="button" class="ui-button ui-compact" data-last-loot hidden>Последняя добыча</button>');
 if(!mapAvailable)host.insertAdjacentHTML('beforeend','<div class="atlas-combat-directions" role="group" aria-label="Шаг по местности">'+[['north','На север'],['west','На запад'],['east','На восток'],['south','На юг']].map(([id,label])=>`<button type="button" class="ui-button" data-native-step="${id}">${label}</button>`).join('')+'</div>');
 select.onchange=()=>{if(select.value)action('/api/hunt/target',{targetId:select.value});};
 host.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.hasAttribute('data-attack'))action('/api/hunt/attack',{enabled:!state?.field?.autoAttack});
  else if(button.hasAttribute('data-skill'))action('/api/hunt/skill',{skillIndex:Number(button.dataset.skill)});
  else if(button.hasAttribute('data-native-step')&&state?.field?.native){
   const [dx,dy]={north:[0,-200],south:[0,200],east:[200,0],west:[-200,0]}[button.dataset.nativeStep],p=state.field.native.point;
   action('/api/world/action',{action:'native_move',point:{x:p.x+dx,y:p.y+dy}});
  }
  else if(button.hasAttribute('data-shots'))action('/api/shots/auto',{kind:button.dataset.shots,enabled:button.dataset.shots!==state.shots.selected||!state.shots.enabled});
  else if(button.hasAttribute('data-supply')){
   const item=state.supplies.rows.find(p=>p.slot===button.dataset.supply);
   if(state.supplies.enabled)action('/api/hunt/supplies',{slot:item.slot,active:!item.auto});
   else if(item.key!=null)action('/api/inventory/use',{key:item.key});
  }
  else if(button.hasAttribute('data-last-loot'))showLootDetails(state.lastLoot);
 });
 function render(next){
  state=next;
  if(!state?.field?.native){host.hidden=true;return;}
  host.hidden=false;
  const p=state.player,target=state.field.mobs.find(m=>m.instanceId===state.field.target),alive=p.hp>0;
  host.querySelector('.atlas-combat-meters').innerHTML=(p.maxCp?bar('cp',p.cp,p.maxCp):'')+bar('hp',p.hp,p.maxHp)+bar('mp',p.mp,p.maxMp);
  host.querySelector('.atlas-combat-target').innerHTML=target?'<span>'+escapeHtml(target.name)+' · '+target.level+' ур.</span>'+bar('hp',target.currentHp,target.hp,{label:'Цель'}):'<span>Выберите цель на местности</span>';
  const mobs=state.field.mobs.slice(0,matchMedia('(max-width: 600px)').matches?8:16),key=mobs.map(m=>m.instanceId+':'+m.name).join('|');
  if(key!==optionsKey&&!host.querySelector('.ds-select [aria-expanded="true"]')){
   select.innerHTML='<option value="">Выберите цель</option>'+mobs.map(m=>`<option value="${escapeHtml(m.instanceId)}">${escapeHtml(m.name)} · ${m.level}</option>`).join('');optionsKey=key;
  }
  selection=state.field.target||'';select.value=selection;select.disabled=!alive;syncSelect(select);
  const focused=host.contains(document.activeElement)?document.activeElement.closest('[data-skill],[data-attack]'):null;
  const focusSelector=focused?.hasAttribute('data-attack')?'[data-attack]':focused?'[data-skill="'+focused.dataset.skill+'"]':null;
  host.querySelector('[data-native-attack]').innerHTML=combatActionButton(COMBAT_ACTIONS[0],{disabled:!alive||!target,active:state.field.autoAttack});
  host.querySelector('[data-native-skills]').innerHTML=hotbar(p.skills,{className:p.className,chosen:p.hotbar.filter(i=>typeof i==='number').slice(0,8)});
  host.querySelector('[data-native-supplies]').innerHTML=combatSuppliesHtml(state,{idPrefix:'atlas'});
  host.querySelector('[data-last-loot]').hidden=!state.lastLoot;
  if(focusSelector)host.querySelector(focusSelector)?.focus({preventScroll:true});
 }
 return {render,hide:()=>{state=null;host.hidden=true;},select:id=>action('/api/hunt/target',{targetId:id})};
}

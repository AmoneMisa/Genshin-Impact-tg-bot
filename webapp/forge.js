import {escapeHtml as esc} from './escape-html.js';
import {dialogHeading} from './dialog-heading.js';
import {itemGridHtml} from './item-grid.js';
import {inventoryItemArt} from './inventory-layout.js';
import {materialIcon} from './material-icons.js';
import {augmentBlock,saBlock} from './equipment.js';
import {confirmDialog} from './confirm-dialog.js';
import {openAttributeEnchant} from './attribute-enchant.js';

export function attributeItemAvailability(item,materialKey){
 const [,tier,element]=/^(?:bound_)?attr_(stone|crystal|jewel)_(fire|water|wind|earth|holy|dark)$/.exec(materialKey||'')||[];
 if(!tier)return {ok:false,reason:'unknown_stone'};
 const status=item.attribute?.eligibility?.find(o=>o.tier===tier&&o.element===element);
 if(status)return status;
 const option=item.attribute?.options?.find(o=>o.tier===tier&&o.element===element);
 return option&&!option.full?{ok:true}:{ok:false,reason:option?.full?'attribute_tier_max':'not_attributable'};
}
const ATTRIBUTE_REASONS={not_attributable:'Этот предмет не поддерживает атрибут.',timed_item:'Временный предмет.',wrong_element:'У оружия другой атрибут.',opposite_element:'У брони уже противоположный атрибут.',attribute_slots_full:'Все три атрибута брони заняты.',attribute_tier_max:'Достигнут предел для этого камня.'};

export async function openForgeGame({api:baseApi,renderState=()=>{},haptic=()=>{},statusElement,onClose,materialKey=null,serviceNpc=null}){
 const api=(path,options)=>baseApi(serviceNpc&&path==='/api/equipment'?path+'?serviceNpc='+encodeURIComponent(serviceNpc):path,serviceNpc&&options?.body?{...options,body:JSON.stringify({...JSON.parse(options.body),serviceNpc})}:options);
 materialKey=materialKey?.replace(/^bound_/,'')||null;
 let equipment=await api('/api/equipment'),mode=serviceNpc?'unseal':materialKey?'attribute':'ls',pending=false,closed=false,dialog=null,selected=null,result='';
 if(materialKey)return openAttributeEnchant({api,renderState,haptic,onClose,materialKey,equipment,availability:attributeItemAvailability});
 const overlay=document.createElement('section');overlay.className='game-overlay equipment-overlay';
 overlay.innerHTML=`<div class="overlay-backdrop"></div><div class="overlay-panel game-dialog-panel l2-window craft-book-panel">${dialogHeading('Кузница').replace('data-dismiss','class="overlay-close" data-dismiss')}<div data-forge-body></div></div>`;
 const body=overlay.querySelector('[data-forge-body]');
 function closeDialog(){dialog?.close();dialog?.remove();dialog=null;selected=null;}
 function close(){if(closed)return;closed=true;closeDialog();overlay.remove();if(!pending)onClose?.();}
 overlay.querySelector('.overlay-close').onclick=close;overlay.querySelector('.overlay-backdrop').onclick=close;
 if(materialKey)overlay.querySelector('h2').textContent='Атрибут';
 const rows=()=>mode==='unseal'?(equipment.unseal||[]):(equipment.items||[]).filter(i=>mode==='ls'?i.augment:mode==='attribute'?true:i.sa);
 function render(){
  body.innerHTML=`<nav class="ui-folder-tabs" aria-label="Услуги кузницы">${[['ls','Камень жизни'],['sa','SA'],['unseal','Распечатка'],['craft','Крафт']].filter(([id])=>!serviceNpc||id==='unseal').map(([id,label])=>`<button type="button" data-forge-mode="${id}" class="${mode===id?'active':''}">${label}</button>`).join('')}</nav><p>Выбери предмет.</p>${itemGridHtml(rows().map(i=>`<button class="item-grid-cell" data-forge-select="${esc(i.key||i.id)}" ${mode==='attribute'&&!attributeItemAvailability(i,materialKey).ok?'disabled':''} title="${esc(mode==='attribute'?ATTRIBUTE_REASONS[attributeItemAvailability(i,materialKey).reason]||i.name:i.name||i.sourceName)}" aria-label="${esc(i.name||i.sourceName)}">${mode==='unseal'?materialIcon('l2_'+i.source):inventoryItemArt(i)}</button>`),{className:'craft-recipe-grid',min:30})}<p aria-live="polite">${esc(result)}</p><button class="ui-button" data-open-book ${serviceNpc?'hidden':''}>Книга рецептов</button>`;
  body.querySelectorAll('[data-forge-mode]').forEach(b=>b.onclick=async()=>{if(pending)return;if(b.dataset.forgeMode==='craft'){await (await import('./craft.js')).openCraftGame({api,renderState,haptic,statusElement,npc:true,onClose:async()=>{if(closed)return;equipment=await api('/api/equipment');render();}});return;}mode=b.dataset.forgeMode;result='';render();});
  body.querySelectorAll('[data-forge-select]').forEach(b=>b.onclick=()=>{if(pending||b.disabled)return;selected=b.dataset.forgeSelect;openItem();});
  body.querySelector('[data-open-book]').onclick=async()=>{if(pending)return;await(await import('./craft.js')).openCraftGame({api,renderState,haptic,statusElement,onClose:async()=>{if(closed)return;equipment=await api('/api/equipment');render();}});};
  if(serviceNpc)body.querySelector('[data-open-book]').remove();
  if(materialKey){body.querySelector('nav').remove();body.querySelector('[data-open-book]').remove();}
 }
 function openItem(){
  dialog?.close();dialog?.remove();dialog=document.createElement('dialog');dialog.className='game-dialog-panel l2-window forge-service-dialog';overlay.append(dialog);
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});renderItem();dialog.showModal();
 }
 function renderItem(){
  if(!dialog)return;const item=rows().find(i=>(i.key||i.id)===selected);if(!item){closeDialog();return;}
  const content=mode==='ls'?augmentBlock({...item,attribute:null,augment:{...item.augment,active:null}}):mode==='sa'?saBlock(item):mode==='attribute'?'':`<div class="craft-product"><span class="item-preview-icon">${inventoryItemArt(item.product)}</span><strong>${esc(item.name)}</strong></div><p>${item.gold?item.gold.toLocaleString('ru-RU')+' адены':item.aa?item.aa.toLocaleString('ru-RU')+' древней адены':'Без платы'}</p><button class="ui-button primary" data-unseal ${item.canUnseal?'':'disabled'}>Распечатать</button>`;
  dialog.innerHTML=`${dialogHeading(mode==='unseal'?'Распечатка доспехов':item.name)}${content}`;
  if(mode==='attribute')dialog.innerHTML=`${dialogHeading(item.name)}${augmentBlock({...item,augment:null,attribute:{...item.attribute,options:item.attribute.options.filter(o=>`attr_${o.tier}_${o.element}`===materialKey)}})}`;
  dialog.querySelector('[data-dismiss]').onclick=closeDialog;
  dialog.querySelectorAll('details').forEach(el=>el.open=true);
  dialog.querySelectorAll('button:not([data-dismiss])').forEach(b=>{
   b.classList.add('ui-button');if(pending)b.disabled=true;
   b.onclick=async()=>{
    if(pending||b.disabled)return;pending=true;
    const args=b.hasAttribute('data-unseal')?{key:item.id,action:'unseal'}:b.dataset.attrKey?{key:item.key,action:'attribute',element:b.dataset.attrEl,tier:b.dataset.attrTier}:b.dataset.attrClear?{key:item.key,action:'attribute_clear'}:b.dataset.augmentKey?{key:item.key,action:'augment',tier:b.dataset.augmentTier}:{key:item.key,action:b.dataset.saRemove?'sa_remove':'sa_install',saId:b.dataset.saId};
    try{
     if(!await confirmDialog({owner:overlay,title:mode==='unseal'?'Распечатать доспехи':'Подтвердить улучшение',text:mode==='ls'?'Камень жизни и самоцветы будут израсходованы. Текущая аугментация будет заменена.':'Материалы и указанная плата будут израсходованы.',confirmLabel:'Подтвердить'}))return;
     if(closed)return;renderItem();
     const p=await api('/api/equipment/action',{method:'POST',body:JSON.stringify(args)});if(p.state)renderState(p.state);if(closed)return;
     equipment=p.equipment;result=mode==='unseal'?'Доспехи распечатаны.':mode==='ls'?'Камень жизни установлен.':mode==='attribute'?(p.success===false?'Установка не удалась. Камень израсходован, предмет сохранён.':args.action==='attribute_clear'?'Атрибут снят.':'Атрибут применён.'):'SA изменено.';closeDialog();haptic('light');
    }catch(e){if(closed)return;if(e.payload?.equipment)equipment=e.payload.equipment;result=e.payload?.reason==='not_enough_aa'?'Не хватает древней адены.':e.payload?.reason==='not_enough_gold'?'Не хватает адены.':e.message;closeDialog();}
    finally{pending=false;if(!closed){render();renderItem();}else onClose?.();}
   };
  });
 }
 render();document.body.append(overlay);requestAnimationFrame(()=>overlay.classList.add('visible'));
}

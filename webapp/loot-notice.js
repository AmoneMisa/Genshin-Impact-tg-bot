import {systemToast} from './system-toasts.js';
import {escapeHtml} from './escape-html.js';
import {dialogHeading} from './dialog-heading.js';
import {installOverlayA11y} from './overlay-a11y.js';
import {materialIcon} from './material-icons.js';
import {icon} from './icons.js';

const number=n=>Number(n||0).toLocaleString('ru-RU');
function openLootDialog(title,body,{preview=false,onClose}={}){
  installOverlayA11y();
  document.querySelector('.loot-notice-overlay')?.remove();
  const overlay=document.createElement('section');overlay.className='game-overlay loot-notice-overlay';
  if(preview)overlay.classList.add('loot-preview-overlay');
  overlay.innerHTML=`<div class="overlay-backdrop"></div><div class="overlay-panel game-dialog-panel loot-notice-panel" role="dialog" aria-modal="true" aria-labelledby="loot-notice-heading">${dialogHeading(title,{id:'loot-notice-heading'})}${body}</div>`;
  const close=()=>{overlay.remove();if(onClose)requestAnimationFrame(onClose);};overlay.querySelector('[data-dismiss]').addEventListener('click',close);overlay.querySelector('.overlay-backdrop').addEventListener('click',close);
  document.body.append(overlay);requestAnimationFrame(()=>overlay.classList.add('visible'));
}
export function showLootDetails(loot){
  if(!loot)return;
  openLootDialog('Полученная добыча',`<p>${number(loot.exp)} опыта · ${number(loot.sp)} SP · ${number(loot.gold)} адены${loot.leveledUp?' · Новый уровень!':''}</p><div class="loot-notice-items">${(loot.items||[]).map(i=>`<div class="ui-content-row"><span>${escapeHtml(i.name)}</span><b>×${number(i.amount)}</b></div>`).join('')||'<p>Предметы не выпали.</p>'}</div>`);
}
const chance=value=>new Intl.NumberFormat('ru-RU',{maximumSignificantDigits:5}).format(Math.max(0,Math.min(100,Number(value)||0)))+'%';
export function dropPreviewHtml(preview){
  return `<p>Шанс группы — получить хотя бы один её предмет. «В группе» — шанс предмета при таком выпадении. Могут выпасть несколько предметов.</p><div class="loot-notice-items" data-drop-groups>${(preview.groups||[]).map(group=>`<details class="ui-drop-group" open><summary><strong>${escapeHtml(group.label)}</strong><span>Шанс группы: ${chance(group.chance)}</span></summary><div class="ui-drop-items">${group.items.map(row=>`<div class="ui-content-row ui-drop-item"><span class="ui-drop-art">${String(row.key).startsWith('custom:')?icon('shield'):materialIcon(row.key,escapeHtml(row.icon||''))}</span><span class="ui-drop-copy"><strong>${escapeHtml(row.name)}</strong><small>Количество: ${number(row.min)}${row.min===row.max?'':'–'+number(row.max)}</small></span><span class="ui-drop-chances"><span>За убийство: ${chance(row.chance)}</span><span>В группе: ${chance(row.withinGroupChance)}</span></span></div>`).join('')}</div></details>`).join('')||'<p>Нет доступных данных о дропе.</p>'}</div>`;
}
export function showDropPreview(preview,{onClose}={}){
  if(preview)openLootDialog('Дроп · '+preview.name,dropPreviewHtml(preview),{preview:true,onClose});
}
export function lootToast(loot){
  const items=loot.items||[],preview=items.slice(0,2).map(i=>`${i.name} ×${number(i.amount)}`).join(', ');
  systemToast(`Получено: ${number(loot.exp)} опыта, ${number(loot.sp)} SP${loot.gold?`, ${number(loot.gold)} адены`:''}${preview?'. '+preview:''}${items.length>2?` · ещё ${items.length-2} поз.`:''}`, '', {action:{label:'Добыча',onClick:()=>showLootDetails(loot)}});
}

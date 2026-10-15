import {systemToast} from './system-toasts.js';
import {escapeHtml} from './escape-html.js';
import {dialogHeading} from './dialog-heading.js';
import {installOverlayA11y} from './overlay-a11y.js';

const number=n=>Number(n||0).toLocaleString('ru-RU');
export function showLootDetails(loot){
  if(!loot)return;installOverlayA11y();
  document.querySelector('.loot-notice-overlay')?.remove();
  const overlay=document.createElement('section');overlay.className='game-overlay loot-notice-overlay';
  overlay.innerHTML=`<div class="overlay-backdrop"></div><div class="overlay-panel game-dialog-panel loot-notice-panel" role="dialog" aria-modal="true" aria-labelledby="loot-notice-heading">${dialogHeading('Полученная добыча',{id:'loot-notice-heading'})}<p>${number(loot.exp)} опыта · ${number(loot.sp)} SP · ${number(loot.gold)} адены${loot.leveledUp?' · Новый уровень!':''}</p><div class="loot-notice-items">${(loot.items||[]).map(i=>`<div class="ui-content-row"><span>${escapeHtml(i.name)}</span><b>×${number(i.amount)}</b></div>`).join('')||'<p>Предметы не выпали.</p>'}</div></div>`;
  const close=()=>overlay.remove();overlay.querySelector('[data-dismiss]').addEventListener('click',close);overlay.querySelector('.overlay-backdrop').addEventListener('click',close);
  document.body.append(overlay);requestAnimationFrame(()=>overlay.classList.add('visible'));
}
export function lootToast(loot){
  const items=loot.items||[],preview=items.slice(0,2).map(i=>`${i.name} ×${number(i.amount)}`).join(', ');
  systemToast(`Получено: ${number(loot.exp)} опыта, ${number(loot.sp)} SP${loot.gold?`, ${number(loot.gold)} адены`:''}${preview?'. '+preview:''}${items.length>2?` · ещё ${items.length-2} поз.`:''}`, '', {action:{label:'Добыча',onClick:()=>showLootDetails(loot)}});
}

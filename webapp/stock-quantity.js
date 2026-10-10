import {escapeHtml} from './escape-html.js';
import {stockArt} from './stock-grid.js';

export function stockQuantity({row,action,owner,max=row.count}){
 if(document.querySelector('.stock-quantity'))return Promise.resolve(null);
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='stock-quantity storage-panel';
  dialog.innerHTML=`<form class="stock-transfer"><h2>${escapeHtml(action)}</h2><div class="quantity-item">${stockArt(row)}<strong>${escapeHtml(row.title)}</strong></div>${row.stats?.length?`<p class="storage-note">${escapeHtml(row.stats.join(' · '))}</p>`:''}<label>Количество · доступно ${max}<input name="count" type="number" inputmode="numeric" min="1" max="${max}" value="1" placeholder="Количество" required autofocus></label><div class="storage-actions"><button type="submit">${escapeHtml(action)}</button><button type="button" data-quantity-cancel>Отмена</button></div></form>`;
  let done=false;
  const finish=value=>{if(done)return;done=true;observer.disconnect();dialog.close();dialog.remove();resolve(value);};
  const observer=new MutationObserver(()=>{if(!owner.isConnected)finish(null);});
  observer.observe(document.body,{childList:true,subtree:true});
  dialog.querySelector('form').onsubmit=event=>{event.preventDefault();const count=Number(event.target.elements.count.value);if(Number.isSafeInteger(count)&&count>0&&count<=max)finish(count);};
  dialog.querySelector('[data-quantity-cancel]').onclick=()=>finish(null);
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
  document.body.append(dialog);dialog.showModal();dialog.querySelector('input').select();
 });
}

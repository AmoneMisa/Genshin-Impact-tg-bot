import {dialogHeading} from './dialog-heading.js';
import {escapeHtml} from './escape-html.js';
import {stockArt} from './stock-grid.js';

/** Inline variant for item operations that already have their own confirmation window. */
export function quantityControlHtml({value=1,max=1,label='Количество'}={}){
 return `<label>${escapeHtml(label)}</label><div class="ui-quantity-control"><button type="button" class="ui-button ui-icon-button" data-quantity-step="-1" aria-label="Уменьшить количество">−</button><input data-quantity-value aria-label="${escapeHtml(label)}" type="number" inputmode="numeric" min="1" max="${max}" value="${value}"><button type="button" class="ui-button ui-icon-button" data-quantity-step="1" aria-label="Увеличить количество">+</button></div>`;
}
export function bindQuantityControl(root,{max=1,onChange=()=>{}}={}){
 const input=root.querySelector('[data-quantity-value]');
 const update=value=>{const n=Math.min(max,Math.max(1,Math.floor(Number(value)||1)));input.value=n;root.querySelectorAll('[data-quantity-step]').forEach(b=>b.disabled=max<1||Number(b.dataset.quantityStep)<0&&n<=1||Number(b.dataset.quantityStep)>0&&n>=max);onChange(n);};
 input.disabled=max<1;input.onchange=()=>update(input.value);
 root.querySelectorAll('[data-quantity-step]').forEach(b=>b.onclick=()=>update(Number(input.value)+Number(b.dataset.quantityStep)));
 update(input.value);
}

export function stockQuantity({row,action,owner,max=row.count,note=''}){
 if(document.querySelector('.stock-quantity'))return Promise.resolve(null);
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='stock-quantity storage-panel game-dialog-panel';
  dialog.innerHTML=`<form class="stock-transfer">${dialogHeading(action,{dismissible:false})}<div class="quantity-item">${stockArt(row)}<strong>${escapeHtml(row.title)}</strong></div>${note?`<p class="storage-note" data-quantity-note>${escapeHtml(note)}</p>`:''}${row.stats?.length?`<p class="storage-note">${escapeHtml(row.stats.join(' · '))}</p>`:''}<label>Количество · доступно ${max}<input name="count" type="number" inputmode="numeric" min="1" max="${max}" value="1" placeholder="Количество" required autofocus></label><div class="storage-actions"><button type="submit">${escapeHtml(action)}</button><button type="button" data-quantity-cancel>Отмена</button></div></form>`;
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

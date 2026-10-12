import {dialogHeading} from './dialog-heading.js';
import {escapeHtml} from './escape-html.js';

/** Shared destructive-action confirmation. No request is issued by this component. */
export function confirmDialog({owner=document.body,title,text,confirmLabel='Подтвердить',confirmValue=null}) {
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='game-dialog-panel game-confirm-dialog';
  dialog.innerHTML=`${dialogHeading(title)}<p>${escapeHtml(text)}</p><form>${confirmValue!==null?`<label>Для подтверждения введи ID ${escapeHtml(confirmValue)}<input name="confirmation" aria-label="ID для подтверждения" autocomplete="off" inputmode="numeric" required></label>`:''}<div class="storage-actions"><button class="ui-button primary" type="submit" ${confirmValue!==null?'disabled':''}>${escapeHtml(confirmLabel)}</button><button class="ui-button" type="button" data-cancel>Отмена</button></div></form>`;
  let done=false;
  const finish=value=>{if(done)return;done=true;observer.disconnect();dialog.close();dialog.remove();resolve(value);};
  const observer=new MutationObserver(()=>{if(!owner.isConnected)finish(false);});
  observer.observe(document.body,{childList:true,subtree:true});
  const field=dialog.querySelector('input'),submit=dialog.querySelector('[type="submit"]');
  field?.addEventListener('input',()=>{submit.disabled=field.value.trim()!==String(confirmValue);});
  dialog.querySelector('form').onsubmit=e=>{e.preventDefault();if(confirmValue===null||field.value.trim()===String(confirmValue))finish(true);};
  dialog.querySelector('[data-cancel]').onclick=()=>finish(false);
  dialog.querySelector('[data-dismiss]').onclick=()=>finish(false);
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);});
  document.body.append(dialog);dialog.showModal();(field||dialog.querySelector('[data-cancel]')).focus();
 });
}

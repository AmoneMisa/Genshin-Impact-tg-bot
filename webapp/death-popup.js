// Shared atlas/combat death dialog; destinations are revalidated by the server.
import {escapeHtml as esc} from './escape-html.js';
import {dialogHeading} from './dialog-heading.js';
let dialog=null,loading=false,context=null;
export function updateDeathPopup({dead,world,api,onResolved}){
 if(!dead){dialog?.remove();dialog=null;context=null;return;}
 context={api,onResolved};
 if(!dialog){dialog=document.createElement('section');dialog.className='death-overlay';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','death-title');dialog.innerHTML='<div class="death-panel game-dialog-panel">'+dialogHeading('Персонаж погиб',{id:'death-title',dismissible:false})+'<p>Выбери место возвращения или дождись воскрешения другим игроком.</p><div data-death-options>Загружаю места возвращения…</div><p data-death-error role="status"></p></div>';document.body.append(dialog);}
 if(world?.death?.choices){paint(world.death.choices);return;}
 if(loading||dialog.querySelector('[data-respawn]'))return;
 loading=true;const current=dialog;
 api('/api/world').then(next=>{if(dialog===current&&next.world?.death?.choices)paint(next.world.death.choices);}).catch(()=>{if(dialog===current)dialog.querySelector('[data-death-error]').textContent='Не удалось загрузить места возвращения.';}).finally(()=>loading=false);
}
function paint(choices){
 if(!dialog||dialog.dataset.busy)return;const key=JSON.stringify(choices);if(dialog.dataset.choices===key)return;dialog.dataset.choices=key;
 const military=choices.find(c=>c.label==='В форт'||c.label==='В замок');const rows=[choices.find(c=>c.id==='city'),choices.find(c=>c.label==='В клан холл')||{label:'В клан холл'},military||{label:'В форт'}].filter(Boolean);
 dialog.querySelector('[data-death-options]').innerHTML=rows.map(c=>`<button data-respawn="${esc(c.id||'')}" ${c.id?'':'disabled'}>${esc(c.label)}</button>`).join('');
 dialog.querySelectorAll('[data-respawn]').forEach(b=>b.onclick=async()=>{const current=dialog,ctx=context;current.dataset.busy='true';current.querySelectorAll('button').forEach(b=>b.disabled=true);try{const next=await ctx.api('/api/world/action',{method:'POST',body:JSON.stringify({action:'respawn',destination:b.dataset.respawn})});if(dialog===current){dialog.remove();dialog=null;context=null;}ctx.onResolved?.(next);}catch(e){if(dialog===current){delete current.dataset.busy;delete current.dataset.choices;paint(e.payload?.world?.death?.choices||choices);current.querySelector('[data-death-error]').textContent=e.payload?.reason==='respawn_destination_unavailable'?'Это владение больше не принадлежит клану.':'Не удалось вернуться. Попробуй ещё раз.';}}});
 dialog.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
}

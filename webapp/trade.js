import {stockGrid,TRANSFER_REASONS} from './stock-grid.js';
import {escapeHtml} from './escape-html.js';
import {stockQuantity} from './stock-quantity.js';
export async function openTradeGame({api,renderState,haptic,targetId=null,onClose}){
 let state=await api('/api/trade'),selected=-1,pending=false,closed=false,timer,epoch=0;
 const overlay=document.createElement('section');overlay.className='game-overlay trade-overlay';
 overlay.innerHTML='<div class="overlay-backdrop"></div><div class="overlay-panel glass storage-panel trade-panel"><header><h2>Обмен</h2><button type="button" class="overlay-close" aria-label="Закрыть">×</button></header><div data-trade-body></div><p class="utility-feedback" data-trade-feedback aria-live="polite"></p></div>';
 const body=overlay.querySelector('[data-trade-body]'),feedback=overlay.querySelector('[data-trade-feedback]');
 const close=()=>{closed=true;clearInterval(timer);overlay.remove();onClose?.();};overlay.querySelector('.overlay-close').onclick=close;overlay.querySelector('.overlay-backdrop').onclick=close;
 async function act(action,extra={}){
  if(pending||closed)return;pending=true;epoch++;
  try{
   const result=await api('/api/trade/action',{method:'POST',body:JSON.stringify({action,id:state.trade?.id,revision:state.trade?.revision,...extra})});
   state=result.tradeState;selected=-1;if(result.state)renderState?.(result.state);feedback.textContent=result.message||'';haptic?.('light');
  }catch(error){if(error.payload?.tradeState)state=error.payload.tradeState;feedback.textContent=TRANSFER_REASONS[error.payload?.reason]||error.message;}
  finally{pending=false;if(!closed)render();}
 }
 function render(){
  const t=state.trade;
  if(!t){body.innerHTML=`<p class="storage-note">Выбери игрока в этом игровом чате. Обмен завершается после подтверждения обеих сторон.</p><div class="trade-peers">${state.peers.map(p=>`<button type="button" data-trade-peer="${p.userId}">${escapeHtml(p.name)}</button>`).join('')||'<p>Других игроков нет.</p>'}</div>`;
   body.querySelectorAll('[data-trade-peer]').forEach(b=>b.onclick=()=>act('request',{targetId:b.dataset.tradePeer}));return;}
  const other=state.me===t.from?t.to:t.from;
  if(t.status==='invited'){
   body.innerHTML=`<h3>${escapeHtml(t.names[other])}</h3><p class="storage-note">${state.me===t.to?'Предлагает обмен.':'Ждём ответа на приглашение.'}</p><div class="storage-actions">${state.me===t.to?'<button type="button" data-trade-join>Принять приглашение</button>':''}<button type="button" data-trade-cancel>Отменить</button></div>`;
   body.querySelector('[data-trade-join]')?.addEventListener('click',()=>act('join'));body.querySelector('[data-trade-cancel]').onclick=()=>act('cancel');return;
  }
  const mine=t.offers[state.me]||[],theirs=t.offers[other]||[],row=state.inventory[selected],accepted=t.accepted[state.me]===t.revision;
  body.innerHTML=`<p class="storage-note">${escapeHtml(t.names[other])} · ещё ${Math.max(0,Math.ceil((t.expiresAt-Date.now())/60000))} мин.</p><section class="stock-section" data-trade-inventory><h3>Инвентарь</h3>${stockGrid(state.inventory,{select:true,selected})}</section>
   <section class="stock-section" data-my-offer><h3>Моё предложение <span class="trade-ready ${accepted?'on':''}">${accepted?'Подтверждено':'Не подтверждено'}</span></h3>${stockGrid(mine,{select:true,min:12})}<p class="storage-note">Нажми предмет, чтобы убрать. Изменения сбрасывают оба подтверждения.</p></section>
   <section class="stock-section"><h3>${escapeHtml(t.names[other])} <span class="trade-ready ${t.accepted[other]===t.revision?'on':''}">${t.accepted[other]===t.revision?'Подтверждено':'Не подтверждено'}</span></h3>${stockGrid(theirs,{min:12})}</section><div class="storage-actions"><button type="button" data-trade-confirm ${accepted||pending||!mine.length&&!theirs.length?'disabled':''}>Подтвердить обмен</button><button type="button" data-trade-cancel>Отменить</button></div>`;
  body.querySelectorAll('[data-trade-inventory] [data-stock-index]').forEach(b=>b.onclick=async()=>{
   if(pending)return;const row=state.inventory[Number(b.dataset.stockIndex)],existingCount=mine.find(i=>i.kind===row.kind&&i.ref===row.ref)?.count||0;
   if(row.count<=existingCount){feedback.textContent='Все предметы этой позиции уже добавлены.';return;}
   const count=await stockQuantity({row,action:'Добавить',owner:overlay,max:row.count-existingCount});
   if(count===null||closed)return;
   if(t.revision!==state.trade?.revision){feedback.textContent=TRANSFER_REASONS.trade_changed;return;}
   const items=mine.map(i=>({kind:i.kind,ref:i.ref,count:i.count})),existing=items.find(i=>i.kind===row.kind&&i.ref===row.ref);
   if(existing)existing.count+=count;else items.push({kind:row.kind,ref:row.ref,count});act('offer',{items});
  });
  body.querySelectorAll('[data-my-offer] [data-stock-index]').forEach(b=>b.onclick=()=>act('offer',{items:mine.filter((_,i)=>i!==Number(b.dataset.stockIndex)).map(i=>({kind:i.kind,ref:i.ref,count:i.count}))}));
  body.querySelector('[data-trade-confirm]').onclick=()=>act('confirm');body.querySelector('[data-trade-cancel]').onclick=()=>act('cancel');
 }
 render();document.body.append(overlay);requestAnimationFrame(()=>overlay.classList.add('visible'));
 if(targetId&&!state.trade)await act('request',{targetId:String(targetId)});
 if(closed)return;
 timer=setInterval(async()=>{if(pending||closed)return;const version=epoch;
  try{const fresh=await api('/api/trade');if(closed||pending||version!==epoch)return;
   if(JSON.stringify(fresh.trade)!==JSON.stringify(state.trade)){const previous=state.trade;state=fresh;selected=-1;render();if(previous&&!fresh.trade)feedback.textContent='Обмен завершён, отменён или истёк. Проверь инвентарь.';}
  }catch(error){if(!closed)feedback.textContent=error.message;}
 },3000);
}

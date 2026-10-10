import {stockGrid,TRANSFER_REASONS} from './stock-grid.js';
import {escapeHtml} from './escape-html.js';
import {stockQuantity} from './stock-quantity.js';
export async function openWarehouseGame({api,renderState,haptic,scope='character',onClose}){
 let state=await api(`/api/warehouse?scope=${scope}`),direction='deposit',selected=-1,pending=false;
 const overlay=document.createElement('section');overlay.className='game-overlay storage-overlay';
 overlay.innerHTML='<div class="overlay-backdrop"></div><div class="overlay-panel glass storage-panel"><header><h2></h2><button type="button" class="overlay-close" aria-label="Закрыть">×</button></header><div data-storage-body></div><p class="utility-feedback" data-storage-feedback aria-live="polite"></p></div>';
 const body=overlay.querySelector('[data-storage-body]'),feedback=overlay.querySelector('[data-storage-feedback]');
 const close=()=>{overlay.remove();onClose?.();};overlay.querySelector('.overlay-close').onclick=close;overlay.querySelector('.overlay-backdrop').onclick=close;
 async function transfer(row){
  if(pending)return;
  const count=await stockQuantity({row,action:direction==='deposit'?'Внести':'Забрать',owner:overlay});
  if(count===null||!overlay.isConnected)return;
  pending=true;
  try{
   const result=await api('/api/warehouse/transfer',{method:'POST',body:JSON.stringify({scope,direction,kind:row.kind,ref:row.ref,count})});
   state=result.warehouse;selected=-1;if(result.state)renderState?.(result.state);feedback.textContent='Предметы переданы.';haptic?.('light');
  }catch(error){if(error.payload?.warehouse)state=error.payload.warehouse;feedback.textContent=TRANSFER_REASONS[error.payload?.reason]||error.message;}
  finally{pending=false;render();}
 }
 function render(){
  if(!state){body.innerHTML='<p>Хранилище недоступно.</p>';return;}
  overlay.querySelector('h2').textContent=state.title;
  const source=direction==='deposit'?state.inventory:state.stored,target=direction==='deposit'?state.stored:state.inventory,row=source[selected],allowed=direction==='deposit'?state.canDeposit:state.canWithdraw;
  body.innerHTML=`<nav class="storage-tabs"><button type="button" data-direction="deposit" aria-pressed="${direction==='deposit'}">Внести</button><button type="button" data-direction="withdraw" aria-pressed="${direction==='withdraw'}">Забрать</button></nav><p class="storage-note">${scope==='clan'?'Все участники могут внести. Глава и два со-лидера могут забрать.':'Личное хранилище персонажа.'} · ${state.slots} / ${state.maxSlots} позиций</p>
   <section class="stock-section"><h3>${direction==='deposit'?'Инвентарь':'Хранилище'}</h3>${stockGrid(source,{select:allowed,selected})}</section>
   <p class="storage-note">Нажми предмет, чтобы выбрать количество.${scope==='clan'?' Аугментированные вещи внести нельзя.':''}</p>
   ${!allowed?'<p class="storage-note">У тебя нет прав на снятие предметов.</p>':''}
   <section class="stock-section"><h3>${direction==='deposit'?'Хранилище':'Инвентарь'}</h3>${stockGrid(target)}</section>
   ${state.history?.length?`<details class="storage-history"><summary>Журнал хранилища</summary>${state.history.map(h=>`<p>${new Date(h.at).toLocaleString('ru-RU')} · ${escapeHtml(h.userId)} · ${h.direction==='deposit'?'Внёс':'Забрал'} ${escapeHtml(h.title)} ×${h.count}</p>`).join('')}</details>`:''}`;
  body.querySelectorAll('[data-direction]').forEach(b=>b.onclick=()=>{direction=b.dataset.direction;selected=-1;render();});
  body.querySelectorAll('[data-stock-index]').forEach(b=>b.onclick=()=>transfer(source[Number(b.dataset.stockIndex)]));
 }
 render();document.body.append(overlay);requestAnimationFrame(()=>overlay.classList.add('visible'));
}

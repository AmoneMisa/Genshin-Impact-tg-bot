import { renderDailySwordArt } from './loot-renderer.js';

const REASONS = { cooldown: 'Сегодня попытка уже использована.' };

function formatNumber(value) { return new Intl.NumberFormat('ru-RU').format(Number(value) || 0); }
function escapeHtml(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function rankingHtml(ranking) {
  if (!Array.isArray(ranking) || ranking.length === 0) return '<div class="sword-ranking-empty">Ещё никто не отрастил свой меч.</div>';
  return ranking.map(entry => {
    const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
    return `<div class="sword-ranking-row ${entry.isCurrent ? 'current' : ''}"><span class="sword-ranking-rank">${medal}</span><span class="sword-ranking-name">${escapeHtml(entry.name)}</span><strong>${formatNumber(entry.length)} <small>мм</small></strong></div>`;
  }).join('');
}
function duration(ms) { const total=Math.max(0,Math.ceil((Number(ms)||0)/1000)),hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),seconds=total%60;return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`; }
function modifierText(state) { if(state.decreaseImmune)return '🛡️ Следующий бросок не сможет уменьшить меч.';if(state.forceDecrease)return '⤵️ Следующий бросок гарантированно уменьшит меч.';return '🎲 Обычный диапазон: от −10 до +15 мм.'; }

export async function openSwordGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/sword');
  let pending = false;
  let timer = null;
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay sword-overlay';
  overlay.innerHTML = `<div class="overlay-backdrop"></div><div class="overlay-panel glass sword-panel"><header class="overlay-head"><div><div class="eyebrow">DAILY · SWORD</div><h2>Меч</h2></div><button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button></header><div data-sword-content></div><div class="sword-feedback" data-sword-feedback aria-live="polite"></div></div>`;
  const content = overlay.querySelector('[data-sword-content]');
  const feedback = overlay.querySelector('[data-sword-feedback]');
  const close = () => { if(timer)window.clearInterval(timer);overlay.classList.add('closing');window.setTimeout(()=>overlay.remove(),180); };
  overlay.querySelector('.overlay-close').addEventListener('click',close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click',close);
  async function refresh(){state=await api('/api/sword');renderAll();}
  function resultBanner(payload){const delta=Number(payload.delta)||0,growing=delta>0,text=delta===0?'Сегодня без изменений':growing?`+${delta} мм`:`−${Math.abs(delta)} мм`;const banner=document.createElement('div');banner.className=`sword-result ${growing?'positive':delta<0?'negative':'neutral'}`;banner.dataset.swordDelta=String(delta);banner.innerHTML=`<span>${growing?'⬆️':delta<0?'⬇️':'➖'}</span><strong>${text}</strong>`;overlay.querySelector('.sword-panel').prepend(banner);requestAnimationFrame(()=>banner.classList.add('visible'));window.setTimeout(()=>{banner.classList.add('leaving');window.setTimeout(()=>banner.remove(),180);},2400);}
  async function roll(){if(pending||!state.canRoll)return;pending=true;overlay.classList.add('busy','rolling');feedback.textContent='Бросаем кубик на сервере…';haptic('heavy');try{const payload=await api('/api/sword/roll',{method:'POST'});state=payload.sword;if(payload.state)renderState(payload.state);resultBanner(payload);feedback.textContent=payload.delta>0?`Меч вырос на ${payload.delta} мм.`:payload.delta<0?`Меч уменьшился на ${Math.abs(payload.delta)} мм.`:'Длина меча не изменилась.';renderAll();statusElement.textContent=`Меч: ${formatNumber(state.length)} мм.`;}catch(error){feedback.textContent=REASONS[error.payload?.reason]||error.message;if(error.payload?.sword){state=error.payload.sword;renderAll();}else{try{await refresh();}catch{}}haptic('light');}finally{pending=false;window.setTimeout(()=>overlay.classList.remove('busy','rolling'),360);}}
  function bind(){content.querySelector('[data-sword-roll]')?.addEventListener('click',roll);content.querySelector('[data-sword-refresh]')?.addEventListener('click',async()=>{haptic('light');await refresh();});}
  function renderAll(){const canRoll=Boolean(state.canRoll);content.innerHTML=`<section class="sword-hero">${renderDailySwordArt(state.length,{animated:true})}<div class="sword-length"><small>ТЕКУЩАЯ ДЛИНА</small><strong>${formatNumber(state.length)} <em>мм</em></strong></div><p>${modifierText(state)}</p></section><section class="sword-action-card"><div><small>${canRoll?'ПОПЫТКА ГОТОВА':'СЛЕДУЮЩАЯ ПОПЫТКА'}</small><strong data-sword-countdown>${canRoll?'Сейчас':duration(state.remainMs)}</strong></div><button type="button" data-sword-refresh aria-label="Обновить">↻</button></section><button class="sword-roll" type="button" data-sword-roll ${canRoll?'':'disabled'}><span>⚔️</span><div><strong>${canRoll?'Испытать удачу':'Попытка использована'}</strong><small>${canRoll?'−10…+15 мм, модификаторы учитываются сервером':'Новая попытка будет в 00:00'}</small></div></button><section class="sword-ranking"><div class="sword-ranking-head"><div><small>ГРУППОВОЙ РЕЙТИНГ</small><strong>Мечи группы</strong></div><span>${Array.isArray(state.ranking)?state.ranking.length:0}</span></div><div class="sword-ranking-list">${rankingHtml(state.ranking)}</div></section><div class="sword-rules"><span>🛡️ Иммунитет к уменьшению расходуется на одну попытку.</span><span>⤵️ Негативный эффект из сундука также одноразовый.</span></div>`;bind();}
  function tick(){if(state.canRoll)return;const remain=Math.max(0,Number(state.resetAt||0)-Date.now());const node=content.querySelector('[data-sword-countdown]');if(node)node.textContent=remain>0?duration(remain):'Сейчас';if(remain<=0){state={...state,canRoll:true,remainMs:0};renderAll();}}
  renderAll();document.body.appendChild(overlay);requestAnimationFrame(()=>overlay.classList.add('visible'));timer=window.setInterval(tick,1000);
}

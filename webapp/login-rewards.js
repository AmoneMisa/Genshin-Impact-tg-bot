import {escapeHtml as esc} from './escape-html.js';
import {icon} from './icons.js';
import {materialIcon} from './material-icons.js';

const REASONS={day_changed:'Наступил новый день. Календарь обновлён.',already_claimed:'Сегодня награда уже получена.',inventory_full:'Освободите место в инвентаре.',coupon_missing:'Купон больше недоступен.',invalid_choice:'Выберите награду из списка.',level_too_low:'Сохраните купон до нужного уровня.',not_fallen:'Персонаж уже жив.'};
const number=value=>new Intl.NumberFormat('ru-RU').format(value||0);
const rowsHtml=rows=>`<ul class="login-reward-list">${rows.map(row=>`<li><span class="login-item-icon">${row.key?.startsWith('login_')?icon(row.key.includes('_box_')?'gift':'scroll'):row.key?.startsWith('l2_')||row.key?.startsWith('bound_')?materialIcon(row.key.replace(/^bound_/,'')):`<span aria-hidden="true">${esc(row.icon||'✦')}</span>`}</span><span>${esc(row.name)}</span><b>×${number(row.count)}</b></li>`).join('')}</ul>`;

export async function openLoginRewards({api,renderState,haptic=()=>{},onClose,initialTab='calendar',initialKey=null}) {
    let state=await api('/api/login-rewards'),tab=initialTab,selectedDay=null,selectedKey=initialKey,pending=false,timer;
    const overlay=document.createElement('section');overlay.className='game-overlay login-overlay';
    overlay.innerHTML=`<div class="overlay-backdrop"></div><div class="overlay-panel login-panel"><header class="login-head"><div><small>Награды за вход</small><h2>Календарь</h2></div><button type="button" class="overlay-close" aria-label="Закрыть">${icon('x')}</button></header><div data-login-content></div><p class="login-feedback" data-login-feedback role="status" aria-live="polite"></p></div>`;
    const content=overlay.querySelector('[data-login-content]'),feedback=overlay.querySelector('[data-login-feedback]');
    const close=()=>{if(pending)return;clearTimeout(timer);overlay.remove();onClose?.();};
    overlay.querySelector('.overlay-close').onclick=close;overlay.querySelector('.overlay-backdrop').onclick=close;
    function detail() {
        const coupon=state.coupons.find(c=>c.key===selectedKey);
        if(coupon){const required=coupon.choices.length>0;
            return `<section class="login-detail"><button type="button" class="login-back" data-login-back>← Купоны</button><h3>${esc(coupon.name)}</h3><p>${esc(coupon.description)}</p><small>Количество · ${number(coupon.count)}</small>
                ${coupon.needLevel>1?`<p>Нужен уровень ${coupon.needLevel}</p>`:''}
                ${required?`<label class="login-choice">Выберите награду<select data-login-choice><option value="">Выбрать…</option>${coupon.choices.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${number(c.count)} шт.</option>`).join('')}</select></label><p class="login-selected-reward" data-login-choice-hint></p>`:''}
                ${coupon.pendingReward?`<p>Подарок сохранён до освобождения места.</p>${rowsHtml(coupon.pendingReward)}`:''}
                <button type="button" class="login-primary" data-login-redeem ${required?'disabled':''}>${coupon.kind==='box'?'Открыть коробку':'Использовать купон'}</button>
                ${coupon.kind==='box'?boxHtml():''}</section>`;
        }
        const day=state.days.find(d=>d.day===selectedDay);
        if(day)return `<section class="login-detail"><button type="button" class="login-back" data-login-back>← Календарь</button><h3>День ${day.day}</h3>${rowsHtml(day.rewards)}${day.rewards.some(r=>r.key?.includes('_box_'))?boxHtml():''}<button type="button" class="login-primary" data-login-claim ${day.status!=='today'||!state.canClaim?'disabled':''}>${day.status==='claimed'?'Получено':day.status==='missed'?'День пропущен':day.status==='future'?'Пока недоступно':'Получить награду'}</button></section>`;
        return '';
    }
    function boxHtml(){const pool=state.coupons.find(c=>c.key===selectedKey)?.boxPool||state.days.find(d=>d.day===selectedDay)?.boxPool||state.boxPool;return `<details class="login-box-pool"><summary>Возможные подарки</summary><p>Один случайный подарок. Вероятности зависят от грейда коробки.</p><ul>${pool.map(row=>`<li><span>${esc(row.name)}</span><small>${row.chance}%</small></li>`).join('')}</ul></details>`;}
    function render() {
        const page=detail();
        const month=new Date(state.startsAt).toLocaleDateString('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'});
        content.innerHTML=`<div class="login-meta"><strong>${esc(month)}</strong><span>${esc(state.grade)}</span></div><p class="login-hint">Обновление в 03:00 МСК · пропущенные дни не переносятся.</p><nav class="login-tabs" aria-label="Награды за вход"><button type="button" data-login-tab="calendar" aria-pressed="${tab==='calendar'}">Календарь</button><button type="button" data-login-tab="coupons" aria-pressed="${tab==='coupons'}">Купоны · ${state.coupons.reduce((sum,c)=>sum+c.count,0)}</button></nav>
            ${page|| (tab==='calendar'?`<div class="login-weekdays" aria-hidden="true">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>`<span>${d}</span>`).join('')}</div><div class="login-grid" aria-label="Дни месяца">${Array.from({length:state.firstWeekday},()=>'<span></span>').join('')}${state.days.map(day=>`<button type="button" class="login-day is-${day.status}" data-login-day="${day.day}" aria-label="День ${day.day}: ${esc(day.rewards.map(r=>r.name).join(', '))}" ${day.day===state.day?'aria-current="date"':''}><b>${day.day}</b><span aria-hidden="true">${day.status==='claimed'?'✓':day.rewards.some(r=>r.key.includes('_box_'))?icon('gift'):day.rewards.some(r=>r.key.includes('shadow_'))?icon('shield'):day.rewards.some(r=>r.key.includes('rune_'))?'✦':day.rewards.some(r=>r.key.includes('shots_'))?'◆':day.rewards[0].icon||'✦'}</span></button>`).join('')}</div><button type="button" class="login-primary" data-login-claim ${!state.canClaim?'disabled':''}>${state.canClaim?'Получить сегодняшнюю награду':'Сегодня получено'}</button>`:
                `<div class="login-coupons">${state.coupons.length?state.coupons.map(c=>`<button type="button" data-login-coupon="${esc(c.key)}"><span class="login-item-icon">${icon(c.kind==='box'?'gift':'scroll')}</span><span><strong>${esc(c.name)}</strong><small>Привязан к персонажу · без срока хранения</small></span><b>×${number(c.count)}</b></button>`).join(''):'<p>Купоны появятся после получения наград.</p>'}</div>`)}
            ${state.runes.length?`<aside class="login-runes"><strong>Активные руны</strong>${state.runes.map(r=>`<p>${esc(r.name)}<small>До ${new Date(r.until).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})} МСК</small></p>`).join('')}</aside>`:''}`;
        content.querySelectorAll('[data-login-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.loginTab;selectedKey=null;selectedDay=null;render();});
        content.querySelectorAll('[data-login-day]').forEach(b=>b.onclick=()=>{selectedDay=Number(b.dataset.loginDay);selectedKey=null;render();});
        content.querySelectorAll('[data-login-coupon]').forEach(b=>b.onclick=()=>{selectedKey=b.dataset.loginCoupon;selectedDay=null;render();});
        content.querySelector('[data-login-back]')?.addEventListener('click',()=>{selectedKey=null;selectedDay=null;render();});
        content.querySelector('[data-login-choice]')?.addEventListener('change',e=>{
            const coupon=state.coupons.find(c=>c.key===selectedKey),choice=coupon.choices.find(c=>c.id===e.target.value);
            content.querySelector('[data-login-redeem]').disabled=!choice;
            content.querySelector('[data-login-choice-hint]').textContent=choice?`${choice.name} ×${number(choice.count)}`:'';
        });
        content.querySelector('[data-login-claim]')?.addEventListener('click',()=>act({action:'claim'}));
        content.querySelector('[data-login-redeem]')?.addEventListener('click',()=>act({action:'redeem',key:selectedKey,choice:content.querySelector('[data-login-choice]')?.value||''}));
        if(pending)content.querySelectorAll('button,select').forEach(e=>e.disabled=true);
    }
    async function act(body) {
        if(pending)return;pending=true;content.querySelectorAll('button,select').forEach(e=>e.disabled=true);feedback.textContent='';
        try{const result=await api('/api/login-rewards/action',{method:'POST',body:JSON.stringify(body.action==='claim'?{...body,month:state.month,day:state.day}:body)});state=result.loginRewards;selectedKey=null;selectedDay=null;
            if(body.action==='claim')tab='coupons';feedback.textContent=result.rewards.map(r=>`${r.name} ×${number(r.count)}`).join(' · ');if(result.state)renderState?.(result.state);haptic('light');
        }catch(error){if(error.payload?.loginRewards)state=error.payload.loginRewards;feedback.textContent=REASONS[error.payload?.reason]||error.message;}
        finally{pending=false;if(overlay.isConnected)render();}
    }
    async function reset(){if(!overlay.isConnected)return;if(pending){timer=setTimeout(reset,1000);return;}try{state=await api('/api/login-rewards');if(!overlay.isConnected)return;selectedDay=null;render();schedule();}catch(error){if(!overlay.isConnected)return;feedback.textContent=error.message;timer=setTimeout(reset,60000);}}
    function schedule(){clearTimeout(timer);timer=setTimeout(reset,Math.max(1000,state.nextResetAt-state.serverNow+250));}
    document.body.append(overlay);render();schedule();requestAnimationFrame(()=>overlay.classList.add('visible'));overlay.querySelector('.overlay-close').focus();
    return overlay;
}

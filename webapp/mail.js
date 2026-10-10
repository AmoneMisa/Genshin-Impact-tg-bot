import { escapeHtml } from './escape-html.js';
import { luckCoinHtml } from './currency-icons.js';
import {icon} from './icons.js';
import {materialIcon} from './material-icons.js';
import {stockGrid,TRANSFER_REASONS} from './stock-grid.js';
import {stockQuantity} from './stock-quantity.js';

// Mail (rewards and letters) and the promo code field. Promo rewards are not
// applied on redeem: they arrive as a letter and are claimed from the mail.

const KIND_LABELS = { gold: [materialIcon('gold'), 'адены'], crystals: [icon('gem'), 'кристаллов'], luckCoins: [luckCoinHtml(16), 'монет удачи'], ironOre: [icon('pickaxe'), 'железной руды'], bonusChances: [icon('gift'), 'попыток бонуса'] };

export function rewardsHtml(rewards = []) {
  return rewards.map(reward => {
    const [art, label] = KIND_LABELS[reward.kind] || [icon('gift'), reward.kind];
    return `<span class="mail-reward">${art} ${new Intl.NumberFormat('ru-RU').format(reward.amount)} <small>${escapeHtml(label)}</small></span>`;
  }).join('');
}

function daysLeft(expiresAt) {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000));
}

function shell({ title, icon, body }) {
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay mail-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass feedback-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>${title}</h2>
        <span class="ds-round" aria-hidden="true">${icon}</span>
      </header>
      ${body}
    </div>`;
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  return overlay;
}

/** The promo field. Calls `onRedeemed(mail)` so a mailbox open behind it can refresh. */
function promoFormHtml() {
  return `
    <div class="feedback-card mail-promo">
      <label class="feedback-field">
        <span>Промокод</span>
        <input type="text" maxlength="40" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Например, WELCOME" data-promo-code />
      </label>
      <button type="button" class="feedback-submit" data-promo-submit>Применить</button>
      <div class="feedback-result" data-promo-result hidden></div>
    </div>`;
}

function bindPromoForm(root, { api, haptic, statusElement, onRedeemed = () => {} }) {
  const input = root.querySelector('[data-promo-code]');
  const submit = root.querySelector('[data-promo-submit]');
  const result = root.querySelector('[data-promo-result]');
  const show = (kind, text) => {
    result.hidden = false;
    result.className = `feedback-result ${kind}`;
    result.textContent = text;
  };
  const run = async () => {
    const code = input.value.trim();
    if (!code) return show('error', 'Введи промокод.');
    submit.disabled = true;
    try {
      haptic?.('medium');
      const payload = await api('/api/promo/redeem', { method: 'POST', body: JSON.stringify({ code }) });
      input.value = '';
      show('success', payload.message);
      if (statusElement) statusElement.textContent = payload.message;
      haptic?.('light');
      onRedeemed(payload.mail);
    } catch (error) {
      show('error', error.payload?.error || error.message);
    } finally {
      submit.disabled = false;
    }
  };
  submit.addEventListener('click', run);
  input.addEventListener('keydown', event => { if (event.key === 'Enter') run(); });
}

/** Settings → Промокод: only the code field. */
export async function openPromoGame({ api, haptic, statusElement }) {
  const overlay = shell({ title: 'Промокод', icon: '🎟️', body: promoFormHtml() });
  bindPromoForm(overlay, { api, haptic, statusElement });
  overlay.querySelector('[data-promo-code]').focus();
}

const MAIL_ERRORS={...TRANSFER_REASONS,mail_text:'Укажи тему до 80 символов и текст до 2000 символов.',mail_items:'В письме максимум 12 вложений.',mail_price:'Укажи целую сумму оплаты и добавь вложение.',mail_postage:'Для отправки нужно 100 адены.',mail_payment:'Не хватает адены для оплаты письма.',mail_full:'Слишком много неполученных писем.',mail_claim_first:'Сначала забери награду.',mail_not_found:'Письмо не найдено.',already_claimed:'Вложения уже получены или возвращены.'};
const MAIL_STATUS={pending:'Ожидает получения',claimed:'Получено',read:'Прочитано',returned:'Возвращено'};
const fmt=n=>new Intl.NumberFormat('ru-RU').format(n||0);
export async function openMailGame({api,haptic,statusElement,renderState}){
  let mail=await api('/api/mail'),tab='inbox',page=0,letter=null,compose=null,busy=false;
  const overlay=shell({title:'Почта',icon:icon('mail'),body:'<div data-mail-body></div><div class="feedback-result" data-mail-result role="status" hidden></div>'});
  overlay.querySelector('.overlay-panel').classList.add('mail-panel');
  const content=overlay.querySelector('[data-mail-body]'),result=overlay.querySelector('[data-mail-result]');
  function notice(text,error=false){result.hidden=false;result.className=`feedback-result ${error?'error':'success'}`;result.textContent=text;if(statusElement)statusElement.textContent=text;}
  async function action(body){
    if(busy)return;busy=true;content.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{haptic?.('light');const payload=await api('/api/mail/action',{method:'POST',body:JSON.stringify(body)});mail=payload.mail;if(payload.state)renderState?.(payload.state);notice(payload.message||'Готово.');if(body.action==='send'||body.action==='delete'){compose=null;letter=null;}else if(letter)letter=mail.letters.find(l=>l.id===letter.id)||letter;}
    catch(e){if(e.payload?.mail)mail=e.payload.mail;notice(MAIL_ERRORS[e.payload?.reason]||e.message,true);}
    finally{busy=false;render();}
  }
  function composeNew(type='regular',to=null){result.hidden=true;compose={type,to:to?.userId||'',name:to?.name||'',title:letter?`Re: ${letter.title}`.slice(0,80):'',text:'',price:'',items:[]};letter=null;render();}
  function render(){
    content.innerHTML=compose?composeHtml():letter?letterHtml():listHtml();
    content.querySelectorAll('[data-mail-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.mailTab;page=0;render();});
    content.querySelectorAll('[data-mail-open]').forEach(b=>b.onclick=()=>{letter=[...mail.letters,...(mail.sent||[])].find(l=>l.id===b.dataset.mailOpen);render();});
    content.querySelectorAll('[data-mail-compose]').forEach(b=>b.onclick=()=>composeNew(b.dataset.mailCompose));
    content.querySelector('[data-mail-back]')?.addEventListener('click',()=>{compose=null;letter=null;render();});
    content.querySelectorAll('[data-mail-page]').forEach(b=>b.onclick=()=>{page+=Number(b.dataset.mailPage);render();});
    content.querySelector('[data-mail-claim]')?.addEventListener('click',()=>action({action:'claim',id:letter.id}));
    content.querySelector('[data-mail-delete]')?.addEventListener('click',e=>{
      if(letter.status==='pending'&&!letter.system&&tab==='inbox'&&!e.currentTarget.dataset.confirm){e.currentTarget.dataset.confirm='1';e.currentTarget.textContent='Вернуть вложения и удалить?';return;}
      action({action:'delete',id:letter.id});
    });
    content.querySelector('[data-mail-reply]')?.addEventListener('click',()=>composeNew('regular',{userId:letter.from,name:letter.fromName}));
    if(compose)bindCompose();
    if(content.querySelector('[data-promo-code]'))bindPromoForm(content,{api,haptic,statusElement,onRedeemed:async()=>{mail=await api('/api/mail');render();}});
  }
  function listHtml(){
    const rows=tab==='inbox'?mail.letters:(mail.sent||[]),pages=Math.max(1,Math.ceil(rows.length/8));page=Math.min(page,pages-1);
    return `<nav class="mail-tabs" aria-label="Письма"><button type="button" data-mail-tab="inbox" aria-pressed="${tab==='inbox'}">Входящие <small>${mail.letters.length}</small></button><button type="button" data-mail-tab="sent" aria-pressed="${tab==='sent'}">Отправленные <small>${(mail.sent||[]).length}</small></button></nav>
    <section class="mail-table" aria-label="Список писем"><div class="mail-table-head"><span>Тип</span><span>${tab==='inbox'?'Отправитель':'Получатель'}</span><span>Тема</span><span>Срок</span></div>${rows.slice(page*8,page*8+8).map(l=>`<button type="button" class="mail-table-row ${l.status}" data-mail-open="${escapeHtml(l.id)}"><span title="${l.type==='payment'?'Наложенный платёж':'Обычное письмо'}">${(l.type==='payment'?materialIcon('gold'):icon('mail'))}</span><span>${escapeHtml(tab==='inbox'?l.fromName:l.toName)}</span><strong>${escapeHtml(l.title)}</strong><small>${l.status==='pending'?`${daysLeft(l.expiresAt)} дн.`:escapeHtml(MAIL_STATUS[l.status]||'')}</small></button>`).join('')||'<p class="mail-empty">Писем пока нет.</p>'}</section>
    <div class="mail-pagination"><button type="button" data-mail-page="-1" ${page===0?'disabled':''} aria-label="Предыдущая страница">←</button><span>${page+1} / ${pages}</span><button type="button" data-mail-page="1" ${page>=pages-1?'disabled':''} aria-label="Следующая страница">→</button></div>
    <div class="mail-actions"><button type="button" data-mail-compose="payment">Наложенный платёж</button><button type="button" class="mail-primary" data-mail-compose="regular">${icon('mail')} Написать письмо</button></div><details class="mail-promo-details"><summary>Промокод</summary>${promoFormHtml()}</details>`;
  }
  function letterHtml(){
    const l=letter,incoming=tab==='inbox';
    return `<button type="button" class="mail-back" data-mail-back>← К списку</button><div class="mail-meta"><span>${incoming?'Отправитель':'Получатель'}</span><strong>${escapeHtml(incoming?l.fromName:l.toName)}</strong><span>Тип письма</span><strong>${l.type==='payment'?'Наложенный платёж':'Обычное письмо'}</strong><span>Срок хранения</span><strong>${daysLeft(l.expiresAt)} дн.</strong></div><h3 class="mail-subject">${escapeHtml(l.title)}</h3><div class="mail-message">${escapeHtml(l.text||'Без сообщения.')}</div><section class="mail-attachments"><h3>Вложения <small>${escapeHtml(MAIL_STATUS[l.status]||'')}</small></h3>${l.system?`<div class="mail-rewards">${rewardsHtml(l.rewards)}</div>`:stockGrid(l.attachments||[],{min:6})}${!(l.rewards?.length||l.attachments?.length)?'<p class="mail-note">Без вложений.</p>':''}</section>${l.price?`<div class="mail-payment"><span>К оплате</span><strong>${materialIcon('gold')} ${fmt(l.price)} адены</strong></div>`:''}<div class="mail-actions">${incoming&&l.status==='pending'?`<button type="button" class="mail-primary" data-mail-claim>${l.price?`Оплатить ${fmt(l.price)} и забрать`:'Забрать всё'}</button>`:''}${incoming&&!l.system?'<button type="button" data-mail-reply>Ответить</button>':''}<button type="button" data-mail-delete ${l.system&&l.status==='pending'?'disabled':''}>Удалить</button></div>`;
  }
  function composeHtml(){
    const chosen=new Set(compose.items.map(r=>r.kind+':'+r.ref)),available=(mail.inventory||[]).filter(r=>!chosen.has(r.kind+':'+r.ref));
    return `<button type="button" class="mail-back" data-mail-back>← К списку</button><form class="mail-compose"><label>Получатель<input data-mail-recipient maxlength="100" autocomplete="off" placeholder="Имя игрока из чата" value="${escapeHtml(compose.name)}" required></label><div class="mail-recipients" data-mail-recipients></div><div class="mail-tabs"><button type="button" data-mail-type="regular" aria-pressed="${compose.type==='regular'}">Обычное письмо</button><button type="button" data-mail-type="payment" aria-pressed="${compose.type==='payment'}">Наложенный платёж</button></div><label>Тема<input data-mail-field="title" maxlength="80" placeholder="Тема письма" value="${escapeHtml(compose.title)}" required></label><label>Сообщение<textarea data-mail-field="text" maxlength="2000" rows="4" placeholder="Напиши сообщение получателю">${escapeHtml(compose.text)}</textarea></label>${compose.type==='payment'?`<label>Сумма к оплате · адена<input data-mail-field="price" type="number" inputmode="numeric" min="1" max="9007199254740991" placeholder="Например, 50000" value="${escapeHtml(compose.price)}" required></label>`:''}<section class="mail-attachments"><h3>Вложения <small>${compose.items.length} / ${mail.maxSlots||12}</small></h3><div data-mail-attached>${stockGrid(compose.items,{select:true,min:6})}</div><p class="mail-note">Нажми на вложение, чтобы убрать его.</p></section><section class="mail-attachments"><h3>Предметы в сумке</h3><div data-mail-stock>${stockGrid(available,{select:true,min:6})}</div><p class="mail-note">Выбери предмет и укажи количество.</p></section><div class="mail-payment"><span>Почтовый сбор</span><strong>${materialIcon('gold')} ${fmt(mail.postage)} адены</strong></div><button type="submit" class="mail-primary">Отправить письмо</button></form>`;
  }
  function bindCompose(){
    const input=content.querySelector('[data-mail-recipient]'),suggestions=content.querySelector('[data-mail-recipients]');
    function suggest(){const peers=(mail.peers||[]).filter(p=>p.name.toLocaleLowerCase().includes(input.value.toLocaleLowerCase())).slice(0,6);suggestions.innerHTML=peers.map(p=>`<button type="button" data-mail-to="${escapeHtml(p.userId)}">${escapeHtml(p.name)} <small>#${escapeHtml(p.userId)}</small></button>`).join('');suggestions.querySelectorAll('button').forEach(b=>b.onclick=()=>{const p=peers.find(p=>p.userId===b.dataset.mailTo);compose.to=p.userId;compose.name=p.name;input.value=p.name;suggestions.innerHTML='';});}
    input.oninput=()=>{compose.to='';compose.name=input.value;suggest();};input.onfocus=suggest;
    content.querySelectorAll('[data-mail-field]').forEach(n=>n.oninput=()=>compose[n.dataset.mailField]=n.value);
    content.querySelectorAll('[data-mail-type]').forEach(b=>b.onclick=()=>{compose.type=b.dataset.mailType;render();});
    content.querySelector('[data-mail-attached]').querySelectorAll('[data-stock-index]').forEach(b=>b.onclick=()=>{compose.items.splice(Number(b.dataset.stockIndex),1);render();});
    const chosen=new Set(compose.items.map(r=>r.kind+':'+r.ref)),available=(mail.inventory||[]).filter(r=>!chosen.has(r.kind+':'+r.ref));
    content.querySelector('[data-mail-stock]').querySelectorAll('[data-stock-index]').forEach(b=>b.onclick=async()=>{if(compose.items.length>=(mail.maxSlots||12))return notice(MAIL_ERRORS.mail_items,true);const row=available[Number(b.dataset.stockIndex)],draft=compose;const count=await stockQuantity({row,action:'Прикрепить',owner:overlay});if(count&&compose===draft){compose.items.push({...row,count});render();}});
    content.querySelector('form').onsubmit=e=>{e.preventDefault();if(!compose.to)return notice('Выбери получателя из списка.',true);action({action:'send',...compose,price:Number(compose.price)});};
  }
  render();return overlay;
}

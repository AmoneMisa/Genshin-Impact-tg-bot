import {dialogHeading} from './dialog-heading.js';
import {l2SkillIcon} from './art/l2-extra-art.js';
import { materialIcon } from './material-icons.js';
import { escapeHtml } from './escape-html.js';
import {icon} from './icons.js';

// Fishing: no minigame. Cast by hand or switch on auto fishing; a daily number of casts limits both. The catch is
// fish, which turn into oils, scales and bones (the dye ingredients) when opened.

const REASONS = {
  no_rod: 'Нужна удочка. Купи её у рыбака (раздел «Торговцы»).',
  not_ready: 'Удочка ещё не готова.',
  not_a_fish: 'Это не рыба.',
  not_learned: 'Сначала выучи рыбалку и мастерство в Гильдии рыбаков (раздел ниже).',
  not_enough_tickets: 'Не хватает «Доказательств улова». Обменяй добычу в Гильдии.',
  level_too_low: 'Твой уровень слишком низкий для этого уровня мастерства.',
  max_level: 'Мастерство рыбалки уже на максимуме.',
  nothing_to_exchange: 'Нечего менять: нужны масла, чешуя, кости или самоцветы.',
  not_exchangeable: 'Это не принимает Гильдия.',
  no_fish: 'Рыбы нет.',
};
const number = value => new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
const seconds = ms => `${Math.ceil(Math.max(0, ms) / 1000)} с`;

export async function openFishingGame({ api, renderState, haptic, statusElement }) {
  let state = null;
  let pending = false;
  let feedback = '';
  let timer = 0;
  let nextReadyAt = 0, nextPollAt = 0;
  let tab = 'cast', phase = 'idle', lastCatch = [], closed = false;
  const sceneStill=()=>`/art/fishing/${phase==='success'||phase==='failure'?phase+'-still':'poster'}.webp`;
  const sceneSource=()=>document.hidden||navigator.connection?.saveData?sceneStill():`/art/fishing/${phase}.webp`;
  const lifetime = new AbortController();
  const pause = ms => new Promise(resolve => { if(lifetime.signal.aborted)return resolve(false); const stop=()=>{clearTimeout(id);resolve(false);}; const id=setTimeout(()=>{lifetime.signal.removeEventListener('abort',stop);resolve(true);},window.matchMedia('(prefers-reduced-motion: reduce)').matches?60:ms); lifetime.signal.addEventListener('abort',stop,{once:true}); });

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay fishing-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass fishing-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Рыбалка</h2>
        <button class="ds-round" type="button" data-fishing-info aria-label="Где взять удочку и соски">${icon('circle-help')}</button>
      </header>
      <div data-content></div>
      <div class="boss-feedback" data-feedback aria-live="polite"></div>
    </div>`;
  const content = overlay.querySelector('[data-content]');
  const feedbackNode = overlay.querySelector('[data-feedback]');
  document.addEventListener('visibilitychange',()=>{const image=content.querySelector('.fishing-animation');if(image)image.src=sceneSource();},{signal:lifetime.signal});
  const close = () => { closed = true; lifetime.abort(); window.clearInterval(timer); overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.querySelector('[data-fishing-info]').onclick=()=>{
    if(overlay.querySelector('.fishing-info'))return;
    const dialog=document.createElement('dialog');dialog.className='fishing-info storage-panel game-dialog-panel';
    dialog.innerHTML=`${dialogHeading('Снаряжение рыбака',{dismissible:false})}<p>Удочки и рыболовные соски продаёт Рыбак: Магазин → Все товары → Торговцы → Рыбак.</p><p>Соски называются Fishing Shot (рыболовные соски). Выбирай грейд своей удочки. Они расходуются при забросе и ускоряют ловлю вдвое.</p><p>Во вкладке «Гильдия» изучи рыбалку и первый уровень мастерства за Доказательства улова. Они получаются при обмене материалов из разобранной рыбы.</p><div class="storage-actions"><button type="button" data-fisher-shop>К рыбаку</button><button type="button" data-info-close>Понятно</button></div>`;
    const dismiss=()=>{dialog.close();dialog.remove();};dialog.querySelector('[data-info-close]').onclick=dismiss;dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});
    dialog.querySelector('[data-fisher-shop]').onclick=async()=>{dismiss();const {openMerchantsGame}=await import('./merchants.js');if(!closed)await openMerchantsGame({api,renderState,haptic,statusElement,initialMerchant:'fisher'});};
    overlay.append(dialog);dialog.showModal();
  };

  const caughtText = list => (list || []).map(row => `${row.name} ×${row.amount}`).join(', ');

  async function run(action = 'state', body = {}, quiet = false) {
    if (pending) return;
    pending = true;
    if (!quiet) overlay.classList.add('busy');
    try {
      let payload;
      if(action==='cast'){
        phase='casting';lastCatch=[];render();
        // The server decides the catch once; the animation only presents that result.
        const request=api('/api/fishing',{method:'POST',body:JSON.stringify({action,...body})}).then(value=>({value}),error=>({error}));
        if(!await pause(600))return;
        phase='waiting';render();if(!await pause(1200))return;
        const outcome=await request;if(closed)return;if(outcome.error)throw outcome.error;
        payload=outcome.value;phase='pulling';render();if(!await pause(650))return;
        lastCatch=payload.caught||[];phase=lastCatch.length?'success':'failure';
      }else payload=await api('/api/fishing', { method: 'POST', body: JSON.stringify({ action, ...body }) });
      if(closed)return;
      state = payload.fishing;
      nextReadyAt=Date.now()+(state.nextCastMs||0);
      if(action==='auto')phase=state.auto?'waiting':'idle';
      if (action === 'cast' || action === 'state') feedback = payload.caught?.length ? `Улов: ${caughtText(payload.caught)}.` : (quiet ? feedback : '');
      if(action==='cast'&&!payload.caught?.length)feedback='Рыба сорвалась. Попробуй ещё раз.';
      if(action==='state'&&payload.caught?.length){lastCatch=payload.caught;phase='success';}
      if (action === 'learn') feedback = payload.learned === 'fishing' ? 'Навык рыбалки изучен.' : `Мастерство рыбалки: ${payload.level} ур.`;
      if (action === 'exchange') feedback = `Обменено ${number(payload.given)} шт. на ${number(payload.tickets)} доказательств улова.`;
      if (action === 'auto') feedback = payload.auto ? 'Автоловля включена.' : 'Автоловля выключена.';
      if (action === 'open') feedback = payload.items.length ? `Разобрано ${number(payload.opened)}: ${payload.items.map(row => `${row.name} ×${row.amount}`).join(', ')}.` : `Разобрано ${number(payload.opened)}, ничего не выпало.`;
      if (action !== 'state' && payload.state) renderState?.(payload.state);
    } catch (error) {
      if(closed)return;
      if(action==='cast')phase='idle';
      if (error.payload?.fishing) state = error.payload.fishing;
      feedback = REASONS[error.payload?.reason] || error.message;
      haptic?.('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      if(!closed)render();
    }
  }

  function rodsHtml() {
    return `<div class="fishing-rods">${state.rods.map(rod => `<article class="${rod.owned ? 'owned' : ''} ${rod.usable ? '' : 'locked'}">${materialIcon(`l2_${rod.item}`)}<div><strong><span>${escapeHtml(rod.name)}</span><b>${rod.grade === 'noGrade' ? 'NG' : rod.grade}</b></strong><small>${rod.level} ур. · скорость ${rod.damage}<br>${number(rod.limit)} рыб в день${rod.owned ? ' · есть' : ''}</small></div></article>`).join('')}</div>`;
  }

  function fishHtml() {
    if (!state.fishBag.length) return '<p class="party-note">Рыбы в сумке нет.</p>';
    return `<div class="fishing-bag">${state.fishBag.map(fish => `<article class="fishing-fish">
      <span class="shop-icon">${materialIcon(`l2_${fish.item}`)}</span>
      <div class="shop-item-copy"><h3>${escapeHtml(fish.name)} <small>×${number(fish.count)}</small></h3>
        <p>${fish.can.map(product => `${materialIcon(`l2_${product.item}`)} ${escapeHtml(product.name)} ×${product.amount} (${product.chance}%)`).join(' · ')}</p></div>
      <button type="button" class="shop-price" data-open="${fish.item}">Разобрать</button>
    </article>`).join('')}</div>`;
  }

  function guildHtml() {
    const skill = state.skill, next = skill.next;
    const upgrade = next
      ? `<button type="button" class="equipment-action forge-action" data-learn ${state.tickets >= next.tickets ? '' : 'disabled'}>${next.kind === 'fishing' ? 'Изучить рыбалку' : `Мастерство ${next.level} ур.`} · ${number(next.tickets)} ${materialIcon('l2_7609')}${next.needLevel > 1 ? ` · с ${next.needLevel} ур. героя` : ''}</button>`
      : '<p class="party-note">Мастерство рыбалки на максимуме.</p>';
    const rows = state.exchange.map(row => `<div class="guild-row">${materialIcon(`l2_${row.item}`)}<div><strong>${escapeHtml(row.name)} ×${number(row.count)}</strong><small>по ${row.rate} ${materialIcon('l2_7609')}</small></div></div>`).join('');
    return `<section class="mmo-frame">
      <div class="mmo-section-title"><strong>${l2SkillIcon('fishing-expertise')} Гильдия рыбаков</strong><small>${materialIcon('l2_7609')} ${number(state.tickets)}</small></div>
      <p class="party-note">${skill.learned ? `Мастерство рыбалки: ${skill.expertise} / ${skill.max} — ловится рыба до ${skill.expertise} уровня.` : 'Навык рыбалки не изучен.'}</p>
      ${upgrade}
      <div class="guild-exchange">${rows || '<p class="party-note">Масла, чешуя, кости и самоцветы из разобранной рыбы меняются на «Доказательства улова».</p>'}</div>
      ${state.exchange.length ? `<button type="button" class="equipment-action" data-exchange-all>Обменять всё на ${materialIcon('l2_7609')}</button>` : ''}
    </section>`;
  }

  function render() {
    if (!state) { content.innerHTML = '<p class="shop-empty">Загрузка…</p>'; return; }
    const ready = state.rod && state.skill.learned && state.fishLevel>0 && state.nextCastMs <= 0 && !pending;
    const phases={idle:state.rod?'Готов к забросу':'Нужна удочка',casting:'Забрасываем удочку…',waiting:'Ждём поклёвку…',pulling:'Вытягиваем рыбу…',success:'Успешный улов!',failure:'Рыба сорвалась'};
    const scene=`<figure class="fishing-scene" data-phase="${phase}"><picture><source media="(prefers-reduced-motion: reduce)" srcset="${sceneStill()}"><img class="fishing-animation" src="${sceneSource()}" width="256" height="160" alt="" decoding="async"></picture><figcaption class="fishing-phase" role="status">${phases[phase]}</figcaption></figure>`;
    const castHtml = `
      <section class="mmo-frame">
        ${scene}
        <div class="mmo-section-title"><strong>${state.rod ? materialIcon(`l2_${state.rod.item}`)+' '+escapeHtml(state.rod.name) : 'Нет удочки'}</strong><small>рыба до ${state.fishLevel} ур.</small></div>
        ${state.skill.learned && state.fishLevel > 0 ? '' : '<p class="party-note">Изучи рыбалку и мастерство во вкладке «Гильдия».</p>'}
        <p class="party-note">Заброс: ${state.rod ? seconds(state.rod.castMs) : '—'} · рыбы сегодня ${number(state.fishToday)} / ${number(state.limit)} · всего забросов ${number(state.total)}</p>
        ${state.overLimit ? `<p class="party-note">Дневная норма выловлена: теперь клюёт крайне редко (${(state.overChance * 100).toFixed(1)}% на заброс).</p>` : ''}
        ${state.shot ? `<label class="merchant-filter"><input type="checkbox" data-shots ${state.shots ? 'checked' : ''}> ${materialIcon(state.shot.key)} ${escapeHtml(state.shot.name)}: ${number(state.shot.count)} шт. — вдвое быстрее</label>` : ''}
        <div class="party-actions">
          <button type="button" class="equipment-action forge-action" data-cast ${ready ? '' : 'disabled'}>${state.nextCastMs > 0 && state.rod ? `Через ${seconds(state.nextCastMs)}` : l2SkillIcon('fishing')+' Забросить удочку'}</button>
          <button type="button" class="equipment-action ${state.auto ? 'active' : ''}" data-auto="${state.auto ? '0' : '1'}" ${state.rod ? '' : 'disabled'}>${state.auto ? 'Остановить автоловлю' : 'Автоловля'}</button>
        </div>
      </section>`;
    const bagHtml=`<section class="mmo-frame">
        <div class="mmo-section-title"><strong>Улов</strong><small>${number(state.fishBag.reduce((sum, fish) => sum + fish.count, 0))} рыб</small></div>
        ${state.fishBag.length ? '<button type="button" class="equipment-action" data-open-all>Разобрать всё</button>' : ''}
        ${fishHtml()}
      </section>`;
    const previousScene=content.querySelector('.fishing-scene');
    const previousPicture=previousScene?.dataset.phase===phase?previousScene.querySelector('picture'):null;
    content.innerHTML=`<nav class="fishing-tabs" aria-label="Разделы рыбалки">${[['cast','Ловля'],['bag','Улов'],['guild','Гильдия'],['rods','Удочки']].map(([id,title])=>`<button type="button" data-fishing-tab="${id}" aria-pressed="${tab===id}">${title}</button>`).join('')}</nav><div class="fishing-tab-body">${tab==='cast'?castHtml:tab==='bag'?bagHtml:tab==='guild'?guildHtml():rodsHtml()}</div>`;
    // Preserve the animation playback when only counters or controls change.
    if(previousPicture)content.querySelector('.fishing-scene picture')?.replaceWith(previousPicture);
    content.querySelectorAll('[data-fishing-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.fishingTab;render();});
    feedbackNode.textContent = feedback;
    content.querySelector('[data-cast]')?.addEventListener('click', () => { haptic('light'); run('cast'); });
    content.querySelector('[data-auto]')?.addEventListener('click', event => { haptic('medium'); run('auto', { enabled: event.currentTarget.dataset.auto === '1' }); });
    content.querySelector('[data-learn]')?.addEventListener('click', () => { haptic('medium'); run('learn'); });
    content.querySelector('[data-exchange-all]')?.addEventListener('click', () => { haptic('medium'); run('exchange', { item: 'all', count: 'all' }); });
    content.querySelector('[data-shots]')?.addEventListener('change', event => { run('shots', { enabled: event.target.checked }, true); });
    content.querySelector('[data-open-all]')?.addEventListener('click', () => { haptic('medium'); run('open', { item: 'all', count: 'all' }); });
    content.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => { haptic('light'); run('open', { item: Number(button.dataset.open), count: 'all' }); }));
    content.querySelectorAll('[data-auto],[data-learn],[data-exchange-all],[data-open-all],[data-open],[data-shots]').forEach(b=>{b.disabled=pending||b.disabled;});
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  render();
  await run('state');
  if(closed)return;
  // while auto fishing runs the catch is settled by asking; the screen asks every few seconds
  nextPollAt=Date.now()+15000;
  timer = window.setInterval(() => {
    if(pending||document.hidden)return;
    if(state?.auto&&Date.now()>=nextPollAt){nextPollAt=Date.now()+15000;run('state',{},true);return;}
    if(state){const remaining=Math.max(0,nextReadyAt-Date.now());if(Math.ceil(remaining/1000)!==Math.ceil(state.nextCastMs/1000)){state.nextCastMs=remaining;if(tab==='cast')render();}}
  }, 1000);
  if (statusElement) statusElement.textContent = 'Рыбалка';
}

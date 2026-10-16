import {dialogHeading} from './dialog-heading.js';
import {materialIcon} from './material-icons.js';
import {costumeIconHtml,costumeRewardHtml,openCostumePreview} from './costume-preview.js';
import {installAvatarCostumeMotion} from './avatar-costume-view.js';
import {escapeHtml} from './escape-html.js';
import {itemGridHtml} from './item-grid.js';
import {avatarCostumeIconUrl} from './art/avatar-costume-icons.js';
import { formatNumber } from './format.js';

// Daily bonus as a prize wheel: segments in proportion to each prize's chance,
// interleaved; the wheel spins to a segment of the prize the server picked.



const SEGMENT_COLORS = { gold: ['#6a4f1f', '#4a3614'], moonDew: ['#243a6a', '#182848'], ironOre: ['#3a3440', '#26222c'] };

/** Seven light SVG sectors: exact percentages, including a distinct 5% costume sector. */
export function prizeWheelSectors(prizes=[]){
  const total=prizes.reduce((n,p)=>n+p.chance,0)||1;
  const half=prizes.filter(p=>p.chance>10),small=prizes.filter(p=>p.chance<=10);
  let angle=0;
  return [...half.map(p=>({...p,chance:p.chance/2})),...small,...half.map(p=>({...p,chance:p.chance/2}))].map(p=>{
    const start=angle;angle+=p.chance/total*360;return {...p,start,end:angle};
  });
}
export function prizeWheelHtml(prizes,costumeId,rotation=0){
  const point=(a,r)=>[160+Math.sin(a*Math.PI/180)*r,160-Math.cos(a*Math.PI/180)*r];
  const sectors=prizeWheelSectors(prizes).map((p,i)=>{
    const a=point(p.start,145),b=point(p.end,145),c=point((p.start+p.end)/2,112);
    const art=p.name==='costume'?avatarCostumeIconUrl(costumeId):materialIcon(p.name).match(/<img[^>]+src="([^"]+)"/)?.[1];
    const mark=art?`<image href="${art}" x="${c[0]-12}" y="${c[1]-12}" width="24" height="24"/>`:`<text x="${c[0]}" y="${c[1]}" text-anchor="middle" dominant-baseline="central" font-size="23">${escapeHtml(p.icon||'✦')}</text>`;
    return `<path d="M160 160 L${a} A145 145 0 ${p.end-p.start>180?1:0} 1 ${b} Z" fill="${p.name==='costume'?'#68477c':(SEGMENT_COLORS[p.name]||SEGMENT_COLORS.gold)[i%2]}" stroke="#ad915c" stroke-width="1"/>${mark}`;
  }).join('');
  return `<div class="bonus-prize-wheel"><svg viewBox="0 0 320 320" role="img" aria-label="Колесо наград: костюм — 5%" data-bonus-wheel style="transform:rotate(${rotation}deg)">${sectors}<circle cx="160" cy="160" r="18" fill="#211d28" stroke="#d4b67e" stroke-width="3"/></svg><span class="bonus-wheel-pointer" aria-hidden="true">▼</span></div>`;
}
async function spinPrizeWheel(node,prizes,name,from,signal){
  const sector=prizeWheelSectors(prizes).find(s=>s.name===name);
  const target=Math.ceil(from/360)*360+1800+360-(sector.start+sector.end)/2;
  if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){node.style.transform=`rotate(${target}deg)`;return target;}
  await new Promise(resolve=>{
    const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);document.removeEventListener('visibilitychange',hidden);node.style.transition='none';node.style.transform=`rotate(${target}deg)`;resolve();};
    const hidden=()=>{if(document.hidden)finish();};
    const timer=setTimeout(finish,1700);signal.addEventListener('abort',finish,{once:true});document.addEventListener('visibilitychange',hidden);
    node.style.transition='transform 1.65s cubic-bezier(.12,.65,.16,1)';node.style.transform=`rotate(${target}deg)`;
  });
  return target;
}

/** Prize names for `count` wheel segments, weighted by chance and spread out. */
export function wheelSegments(prizes = [], count = 10) {
  const total = prizes.reduce((sum, prize) => sum + (Number(prize.chance) || 0), 0) || 1;
  const quotas = prizes.map(prize => ({ name: prize.name, left: Math.max(1, Math.round((Number(prize.chance) || 0) / total * count)) }));
  const segments = [];
  while (quotas.some(quota => quota.left > 0) && segments.length < count * 2) {
    // Take the prize with the most segments left that differs from the last one.
    const pick = quotas
      .filter(quota => quota.left > 0 && quota.name !== segments.at(-1))
      .sort((a, b) => b.left - a.left)[0] || quotas.find(quota => quota.left > 0);
    segments.push(pick.name);
    pick.left -= 1;
  }
  return segments;
}

/** Absolute wheel rotation (deg) that stops the top pointer on a segment of `name`. */
export function landingRotation(segments, name, { from = 0, turns = 5, random = Math.random } = {}) {
  const slots = segments.map((segment, index) => (segment === name ? index : -1)).filter(index => index >= 0);
  const index = slots.length ? slots[Math.floor(random() * slots.length)] : 0;
  const size = 360 / segments.length;
  const jitter = (random() - 0.5) * size * 0.6;
  const target = 360 - (index + 0.5) * size + jitter;
  const base = Math.ceil(from / 360) * 360;
  return base + turns * 360 + ((target % 360) + 360) % 360;
}

export async function openBonusGame({ api, renderState, haptic, statusElement }) {
  installAvatarCostumeMotion();
  let state = await api('/api/bonus');
  let lastPrize = null;
  let pending = false;
  let rotation=0;
  let closed=false;const lifetime=new AbortController();
  const segments = wheelSegments(state.prizes);

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay bonus-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel bonus-panel">
      ${dialogHeading('Ежедневный бонус',{rules:'Крути колесо за доступную попытку. Возможные награды и их шансы показаны в списке; награду определяет сервер.'}).replace('data-dismiss', 'class="overlay-close" data-dismiss')}
      <div data-bonus-content></div>
      <div class="bonus-feedback" data-bonus-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-bonus-content]');
  const feedback = overlay.querySelector('[data-bonus-feedback]');
  const close = () => { closed=true;lifetime.abort();overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function render() {
    content.innerHTML = `
      <div class="bonus-animation">${prizeWheelHtml(state.prizes,state.costumes?.[0]?.id,rotation)}</div>
      ${lastPrize ? `<section class="bonus-win">${lastPrize.costumeId ? costumeRewardHtml(lastPrize,state.player) : `<span>${materialIcon(lastPrize.name)}</span><strong>+${formatNumber(lastPrize.amount)} ${escapeHtml(lastPrize.label)}</strong>`}</section>` : ''}
      <button class="bonus-spin ui-button primary" type="button" data-bonus-claim ${state.chances <= 0 || pending ? 'disabled' : ''}>
        <strong>${state.chances > 0 ? 'Крутить колесо' : 'Попытки закончились'}</strong>
        <small>${state.chances > 0 ? `Попыток сегодня: ${state.chances}` : 'Новые — после ежедневного сброса'}</small>
      </button>
      <section class="bonus-prizes">
        ${state.prizes.map(prize => `
          <article class="bonus-prize ui-content-row">
            <span>${prize.name==='costume'?costumeIconHtml(state.costumes?.[0]?.id):materialIcon(prize.name)}</span>
            <div><strong>${prize.label}</strong><small>${formatNumber(prize.minAmount)}–${formatNumber(prize.maxAmount)}</small></div>
            <b>${prize.chance}%</b>
          </article>`).join('')}
      </section>
      ${(state.costumes||[]).length?`<details class="ui-disclosure"><summary>Костюмы · 24 ч.–7 дней · 5%</summary>${itemGridHtml(state.costumes.map(c=>`<button type="button" class="item-grid-cell" data-costume-preview="${escapeHtml(c.id)}" aria-label="Превью: ${escapeHtml(c.name)}" title="${escapeHtml(c.name)}">${costumeIconHtml(c.id)}</button>`),{min:0})}</details>`:''}`;
    content.querySelectorAll('[data-costume-preview]').forEach(b=>b.onclick=()=>openCostumePreview(b.dataset.costumePreview,state.player));
    content.querySelector('[data-bonus-claim]')?.addEventListener('click', claim);
  }

  async function claim() {
    if (pending || state.chances <= 0) return;
    pending = true;
    feedback.textContent = '';
    haptic('heavy');
    content.querySelector('[data-bonus-claim]').disabled = true;
    try {
      const payload = await api('/api/bonus/claim', { method: 'POST' });
      if(closed)return;
      rotation=await spinPrizeWheel(content.querySelector('[data-bonus-wheel]'),state.prizes,payload.prize.name,rotation,lifetime.signal);
      if(closed)return;
      state = payload.bonus;
      lastPrize = payload.prize;
      if (payload.state) renderState(payload.state);
      statusElement.textContent = `Бонус: ${lastPrize.icon} +${formatNumber(lastPrize.amount)} ${lastPrize.label}`;
      haptic('heavy');
    } catch (error) {
      if(closed)return;
      if (error.payload?.bonus) state = error.payload.bonus;
      feedback.textContent = error.payload?.reason === 'no_chances' ? 'Попытки на сегодня закончились.' : error.payload?.reason==='inventory_full' ? 'Освободи место в инвентаре. Попытка сохранена.' : error.message;
      haptic('light');
    } finally {
      pending = false;
      if(!closed)render();
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

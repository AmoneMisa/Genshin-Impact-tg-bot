import {escapeHtml as esc} from './escape-html.js';
import {materialIcon} from './material-icons.js';
import {icon} from './icons.js';

const fmt=value=>new Intl.NumberFormat('ru-RU').format(Math.max(0,Math.round(Number(value)||0)));
export const BOUNTY_QUALITY=Object.freeze([
  {label:'Обычное',color:'#a4a0ac'}, {label:'Необычное',color:'#78ce94'},
  {label:'Редкое',color:'#68baff'}, {label:'Эпическое',color:'#bf94ee'}, {label:'Легендарное',color:'#ecc36d'},
]);
const level=q=>Math.max(1,Math.min(5,Math.floor(Number(q.quality)||1)));
const grade=q=>q.grade==='noGrade'?'NG':q.grade||'NG';
const hint=q=>({experience:'Опыт · SP',resources:'Ресурсы',consumables:'Расходники'})[q.category]||'Награды';
export const qualityStyle=q=>`--bounty-color:${BOUNTY_QUALITY[level(q)-1].color}`;
export function qualityHtml(q) {
  const value=level(q);
  return `<span class="bounty-quality">${esc(BOUNTY_QUALITY[value-1].label)} · ${esc(grade(q))}-грейд</span>
    <span class="bounty-pips" aria-label="${esc(`Качество ${value} из 5`)}">${Array.from({length:5},(_,i)=>`<i class="${i<value?'on':''}"></i>`).join('')}</span>`;
}
function questIcon(q) {
  return q.category==='resources'?materialIcon('l2_1880'):q.category==='consumables'
    ?materialIcon(q.reward?.items?.[0]?.key||'spiritshot_C'):icon('swords');
}
const progress=q=>Math.max(0,Math.min(100,(Number(q.progress)||0)/Math.max(1,Number(q.target)||1)*100));
export function bountyListRow(scope,q) {
  const ready=q.progress>=q.target&&!q.claimed;
  return `<button type="button" class="bounty-list-row ${q.claimed?'claimed':ready?'ready':''}" style="${qualityStyle(q)}"
      data-bounty-open="${esc(scope)}:${esc(q.id)}" aria-label="${esc(q.title)} · ${esc(BOUNTY_QUALITY[level(q)-1].label)} · ${fmt(q.progress)} / ${fmt(q.target)}${ready?' · Можно забрать':''}">
    <span class="bounty-list-icon" aria-hidden="true">${questIcon(q)}</span>
    <span class="bounty-list-text"><strong>${esc(q.title)}</strong><span class="bounty-meta">${qualityHtml(q)}</span>
      <span class="bounty-progress"><span class="bounty-progress-track"><i style="width:${progress(q)}%"></i></span><span>${fmt(q.progress)} / ${fmt(q.target)}</span></span>
      <small>${q.claimed?'Получено':ready?'Можно забрать':hint(q)}</small></span><span class="bounty-chevron" aria-hidden="true">›</span>
  </button>`;
}
export function bountyLegend() {
  return `<div class="bounty-legend" aria-label="Качество задания">${BOUNTY_QUALITY.map(row=>`<span><i style="background:${row.color}"></i>${esc(row.label)}</span>`).join('')}</div>`;
}
function rewardsHtml(reward={}) {
  const rows=[];
  const add=(art,name,count)=>rows.push(`<li><span class="bounty-reward-icon" aria-hidden="true">${art}</span><span><strong>${fmt(count)}</strong><small>${esc(name)}</small></span></li>`);
  if(reward.displayExp)add('<b>EXP</b>','Опыт',reward.displayExp);
  if(reward.sp)add('<b>SP</b>','Очки навыков',reward.sp);
  for(const [key,name] of [['gold','Адена'],['moonDew','Лунная роса'],['ironOre','Железная руда'],['luckCoins','Монеты удачи']]) {
    if(reward[key])add(materialIcon(key),name,reward[key]);
  }
  for(const item of reward.items||[])add(materialIcon(item.key),item.name,item.count);
  return `<ul class="bounty-rewards">${rows.join('')}</ul>`;
}
export function bountyDetail(q,{kind='',pending=false,openingFarm=false,message='',canFarm=true}={}) {
  const ready=q.progress>=q.target&&!q.claimed;
  return `<header class="bounty-detail-head"><div class="bounty-meta">${qualityHtml(q)}</div><h2>${esc(q.title)}</h2>
      <button type="button" class="overlay-close" data-bounty-close aria-label="Закрыть">×</button></header>
    <p class="bounty-description">${esc(({experience:'Покажи мастерство в охоте и получи опыт и очки навыков.',resources:'Помоги кузнице пополнить запасы для нового снаряжения.',consumables:'Подготовь боевой запас для следующих сражений.'})[q.category]||'Выполни поручение Академии.')}</p>
    <section class="bounty-detail-section"><h3>Цель</h3><strong>${esc(kind)} · ${fmt(q.target)}</strong>
      ${q.minMobLevel?`<p>Монстры от ${fmt(q.minMobLevel)} уровня. Разница с персонажем — не более 10 уровней.</p>`:''}
      <div class="bounty-progress"><span class="bounty-progress-track"><i style="width:${progress(q)}%"></i></span><span>${fmt(q.progress)} / ${fmt(q.target)}</span></div></section>
    <section class="bounty-detail-section"><h3>Награды</h3>${rewardsHtml(q.reward)}
      ${q.reward?.displayExp?'<p class="bounty-energy-note">Энергия увеличивает получаемый опыт.</p>':''}</section>
    <div class="bounty-detail-actions">
      ${canFarm&&!q.claimed?`<button type="button" class="city-btn upgrade" data-bounty-farm ${openingFarm||pending?'disabled':''}>К охотничьим полям →</button>`:''}
      <button type="button" class="city-btn" data-academy-claim ${ready&&!pending&&!openingFarm?'':'disabled'}>${q.claimed?'Получено':pending?'Получаем награду…':'Забрать награду'}</button></div>
    <p class="bounty-feedback" role="status">${esc(message)}</p>`;
}

import {worldArtUrl} from './art/world-art.js';
import {l2SkillIcon} from './art/l2-extra-art.js';
import {materialIcon} from './material-icons.js';
import {escapeHtml} from './escape-html.js';

const number=value=>new Intl.NumberFormat('ru-RU').format(Number(value)||0);
// Custom Hall perks use original L2 icons matching their effect family.
const ICONS={greed:'Residence Death Fortune',hunter:'Residence Might',clarity:'Residence Clarity',elementalism:'Protection of Elemental',treatment:'Greater Heal',excellence:'Berserker Spirit',savage:'Might',reinforcement:'Residence Shield Defense','ghost-form':'Residence Agility','mental-crush':'Mental Shield',guidance:'Residence Guidance',bash:'Shield Stun',murder:'Death Whisper',ambidexter:'Haste',courage:'Residence Shield',persistence:'Resist Shock',strength:'Shield',renewal:'Clarity'};

export function clanHallView(hall,{section='skills',level=null,pending=false}={}) {
 if(!hall)return '';
 const chosen=Math.min(hall.level,Math.max(1,Number(level)||hall.level)),next=hall.next;
 const requirements=next?`<span>${number(next.glory)} славы</span><span>${materialIcon('gold')} ${number(next.gold)} адены</span>`:'<span>Максимальный уровень</span>';
 const skills=`<div class="hall-levels" aria-label="Уровень навыков">${Array.from({length:hall.level},(_,i)=>i+1).map(l=>`<button type="button" data-hall-level="${l}" aria-pressed="${l===chosen}">${l} ур.</button>`).join('')}</div>
   ${chosen<hall.level?'<p class="hall-note">Просмотр навыков предыдущего уровня. Настройки применяются к текущему залу.</p>':''}
   <div class="hall-services">${hall.skills.map(skill=>{
    const preview=skill.levels?.find(l=>l.level===Math.min(chosen,skill.maxLevel));
    const enabled=skill.enabled!==false&&skill.active;
    return `<article class="hall-service">
      <span class="hall-service-icon">${l2SkillIcon(ICONS[skill.key]||skill.name)}</span>
      <div class="hall-service-body"><h4>${escapeHtml(skill.name)} <small>${Math.min(chosen,skill.maxLevel)} / ${skill.maxLevel}</small></h4>
        <p>${escapeHtml(preview?.text||skill.current||'—')}</p>
        <div class="hall-service-requirement">Зал ${Math.min(chosen,skill.maxLevel)} ур.${skill.next?` · далее: ${escapeHtml(skill.next)}`:''}</div>
      </div>
      ${skill.active?`<button class="hall-switch ${enabled?'on':''}" type="button" role="switch" aria-checked="${enabled}" aria-label="${escapeHtml(skill.name)}" data-hall-skill="${skill.key}" data-enabled="${!enabled}" ${hall.canManage&&!pending?'':'disabled'}><span>${enabled?'On':'Off'}</span><i aria-hidden="true"></i></button>`:'<span class="hall-unavailable">Нет эффекта</span>'}
    </article>`;
   }).join('')}</div>`;
 const development=`<section class="hall-development"><h4>Развитие зала</h4><p class="hall-note">Уровень зала открывает навыки, телепорты и бонусы для клана.</p><div class="hall-requirements">${requirements}</div><div class="clan-actions-row"><button type="button" class="clan-play" data-hall-deposit ${hall.coins>0&&!pending?'':'disabled'}>Передать славу · ${number(hall.coins)}</button>${next&&hall.canManage?`<button type="button" class="clan-play" data-hall-upgrade ${next.canUpgrade&&!pending?'':'disabled'}>Развить до ${next.level} ур.</button>`:''}</div></section>`;
 const teleports=`<section class="hall-development"><h4>Телепорты зала</h4><p class="hall-note">Направления, открытые уровнем зала.</p><ul class="hall-destinations">${hall.teleports.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul></section>`;
 return `<section class="clan-section clan-hall-settings">
   <img class="clan-hall-art" src="${worldArtUrl('clan/clan-hall',512)}" alt="Зал клана" width="512" height="341" loading="lazy">
   <div class="hall-management">
    <aside class="hall-sidebar"><div class="hall-emblem"><strong>Зал клана</strong><span>Уровень ${hall.level} / ${hall.maxLevel}</span></div>
      <nav class="hall-menu" aria-label="Настройки зала">${[['skills','Навыки зала'],['development','Развитие'],['teleports','Телепорты']].map(([key,label])=>`<button type="button" data-hall-section="${key}" aria-pressed="${section===key}">${label}</button>`).join('')}
      <button type="button" data-clan-tab="warehouse">Хранилище</button>${hall.canManage?'<button type="button" data-clan-tab="management">Управление</button>':''}</nav>
      <dl class="hall-summary"><div><dt>Слава</dt><dd>${number(hall.glory)}</dd></div><div><dt>Фарм / час</dt><dd>+${number(hall.farmGloryPerHour)}</dd></div><div><dt>Заточка</dt><dd>+${Math.round(hall.enchantBonus*100)}%</dd></div><div><dt>Магазин</dt><dd>${hall.shopLevel} ур.</dd></div></dl>
      ${hall.estate?`<p class="hall-note">${escapeHtml(hall.estate.name)} · до ${new Date(hall.estate.until).toLocaleDateString('ru-RU')}</p>`:''}
    </aside>
    <div class="hall-content">${section==='development'?development:section==='teleports'?teleports:skills}</div>
   </div></section>`;
}

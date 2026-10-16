import {bar,escapeHtml} from './boss-hud.js';
import {icon,controlIcon} from './icons.js';
import {createCombatChat} from './combat-chat.js';

export function combatPartyRows(party,selected) {
  return (party?.members||[]).slice(0,9).filter(member=>!member.me).map(member=>`<button type="button" class="ui-button ui-party-member" data-party-target="${escapeHtml(member.userId)}" aria-pressed="${String(member.userId)===String(selected)}" aria-label="${escapeHtml(member.name)}${member.leader?' · Лидер':''}" title="${escapeHtml(member.name+' · '+member.classTitle+(member.leader?' · Лидер':''))}">
    <span class="ui-party-name"><strong>${escapeHtml(member.name)}</strong></span>
    <span class="ui-party-vitals" role="group" aria-label="CP ${Number(member.cp)||0}, HP ${Number(member.hp)||0}, MP ${Number(member.mp)||0}">${['cp','hp','mp'].map(kind=>bar(kind,member[kind],member['max'+kind[0].toUpperCase()+kind.slice(1)],{text:'',variant:'l2'})).join('')}</span>
  </button>`).join('');
}

/** Persistent party controls and chat preview survive combat redraws. */
export function createCombatSocial({api,onTarget,onManage}) {
  const element=document.createElement('aside');element.className='combat-social';
  let mini=true;try{mini=localStorage.getItem('hunt:party-mini')!=='0';}catch{}
  element.innerHTML=`<section class="ui-hud ui-combat-readout combat-party ${mini?'is-mini':''}" aria-label="Группа">
    <div class="combat-social-heading combat-party-heading"><button type="button" class="ui-button ui-icon-button ui-hud-icon ui-hud-mini" data-party-collapse aria-label="Свернуть группу" title="Свернуть группу" aria-expanded="true" aria-controls="combat-party-roster">${controlIcon('chevron-down')}</button><span data-party-count>9/9</span><button type="button" class="ui-button ui-icon-button ui-hud-icon ui-hud-mini" data-party-mini aria-label="Мини-режим группы" title="Мини-режим группы" aria-pressed="${mini}">${controlIcon('minimize')}</button><button type="button" class="ui-button ui-icon-button ui-hud-icon ui-hud-mini" data-party-manage aria-label="Управление группой" title="Управление группой">${icon('settings')}</button></div>
    <div id="combat-party-roster" class="combat-party-roster"></div></section>`;
  const roster=element.querySelector('#combat-party-roster'),chat=createCombatChat({api});element.append(chat.element);
  let rosterKey='';
  element.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-party-target'))onTarget(button.dataset.partyTarget);
    if(button.hasAttribute('data-party-manage'))onManage();
    if(button.hasAttribute('data-party-collapse')){roster.hidden=!roster.hidden;button.setAttribute('aria-expanded',String(!roster.hidden));}
    if(button.hasAttribute('data-party-mini')){mini=!mini;element.querySelector('.combat-party').classList.toggle('is-mini',mini);button.setAttribute('aria-pressed',String(mini));try{localStorage.setItem('hunt:party-mini',mini?'1':'0');}catch{}}
  });
  return {element,refresh:chat.refresh,closeChat:chat.closeChat,openChat:chat.openChat,notice:chat.notice,combat:chat.combat,loot:chat.loot,tick:chat.tick,destroy(){chat.destroy();element.remove();},update(state,selected){
    chat.update(state);
    element.querySelector('.combat-party').hidden=!state.party;
    element.querySelector('[data-party-count]').textContent=`${state.party?.members?.length||0}/9`;
    element.querySelector('[data-party-collapse]').setAttribute('aria-label',`Группа ${state.party?.members?.length||0} из 9 · свернуть или развернуть`);
    const next=combatPartyRows(state.party,selected);if(next!==rosterKey){const focused=roster.contains(document.activeElement)?document.activeElement?.dataset.partyTarget:null;rosterKey=next;roster.innerHTML=next;if(focused!=null)roster.querySelector(`[data-party-target="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});}
  }};
}

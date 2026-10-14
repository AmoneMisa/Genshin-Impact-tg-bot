import {dialogHeading} from './dialog-heading.js';
import { escapeHtml } from './escape-html.js';
import { menuArtFor } from './menu-art.js';
import {confirmDialog} from './confirm-dialog.js';
import {classEmblemHtml} from './class-emblem.js';
import {installOverlayA11y} from './overlay-a11y.js';
import {enhanceSelects} from './design/select.js';

const REASONS = {
  unknown_class: 'Такого класса нет.',
  same_class: 'Этот класс уже выбран.',
  not_enough_luck_coins:'Недостаточно CoL.',
  same_gender:'Этот пол уже выбран.',
  unknown_gender: 'Недопустимое значение пола.',
  profession_locked:'Можно выбрать профессию только на уже полученной ступени.',
  level_too_low:'Недостаточный уровень.',
  unknown_race:'Такой расы нет.',
  same_race:'Эта раса уже выбрана.',
  subclass_level_required:'Для нового саб-класса нужен 75 уровень основного и активного классов.',
  previous_subclass_level_required:'Сначала прокачайте все взятые саб-классы до 75 уровня.',
  main_profession_required:'Сначала получите вторую профессию основного класса.',
  subclass_limit:'Все три слота саб-классов заняты.',
  player_dead:'Сначала воскресните.',
  in_combat:'В бою переключить профессию нельзя.',
  not_peaceful:'Вернитесь в город для смены саб-класса.',
  summon_active:'Сначала отзовите призванное существо.',
  invalid_subclass:'Эта профессия недоступна для саб-класса.',
  forbidden_subclass:'Эту профессию нельзя взять саб-классом.',
  similar_main_class:'Нельзя выбрать профессию из группы основного класса.',
  duplicate_subclass:'Эта ветка уже занята другим саб-классом.',
  opposing_elf_race:'Эльфы и тёмные эльфы не могут брать саб-классы друг друга.',
  kamael_subclass_only:'Саб-классы камаэлей доступны только камаэлям.',
  kamael_gender_variant:'Этот вариант профессии недоступен для саб-класса.',
  inspector_locked:'Инспектор доступен после двух саб-классов 75 уровня.',
  subclass_conflict:'Эта профессия несовместима с уже взятыми саб-классами.',
  invalid_main_class:'Эта профессия доступна только как саб-класс.',
  unknown_profession_slot:'Такого слота профессии нет.',
  same_profession_slot:'Эта профессия уже активна.',
};

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function stat(label, value) {
  return `<div class="ui-stat-row"><span>${escapeHtml(label)}</span><strong>${formatNumber(value)}</strong></div>`;
}

function statsHtml(stats) {
  return `<div class="profile-stats ui-stat-table">
    ${stat('Физ. атака', stats.pAtk ?? stats.attack)}${stat('Маг. атака', stats.mAtk ?? stats.attack)}
    ${stat('Физ. защита', stats.pDef ?? stats.defence)}${stat('Маг. защита', stats.mDef ?? stats.defence)}
    ${stat('HP', stats.maxHp)}${stat('MP', stats.maxMp)}
    ${stat('CP', stats.maxCp)}${stat('Скорость', stats.speed)}
    ${stat('Точность', stats.accuracy)}${stat('Уклонение', stats.evasion)}
    ${stat('Шанс крита', stats.criticalChance)}
  </div>`;
}

function professionHtml(node, currentName, selectedProfession, pending) {
  if (!node) return '';
  const tag = node.selectable ? 'button' : 'div';
  const action = node.selectable ? `type="button" data-profile-profession="${escapeHtml(node.name)}" aria-pressed="${node.name===selectedProfession}" ${pending?'disabled':''}` : '';
  return `<li data-profession="${escapeHtml(node.name)}">
    <${tag} class="ui-inline-content ui-tree-row ${node.selectable ? 'ui-button ui-choice-row compact' : ''} ${node.name===selectedProfession?'active':''}" ${action} ${node.name === currentName ? 'aria-current="true"' : ''}>
      ${classEmblemHtml({className:node.name,classTitle:node.title})}
      <span>${escapeHtml(node.title)}${node.name === currentName ? '<small>Текущая профессия</small>' : ''}</span>
      <small>Ур. ${node.level}</small>
    </${tag}>
    ${node.children.length ? `<ul>${node.children.map(child=>professionHtml(child,currentName,selectedProfession,pending)).join('')}</ul>` : ''}
  </li>`;
}

export function classArt(className, gender, width = 256) {
  return menuArtFor('profile', { className, gender }, width);
}

export async function openPlayerProfile({ api, renderState=()=>{}, haptic=()=>{}, statusElement, context }) {
  let profile = await api('/api/profile');
  let pending = false;
  let closed = false;
  let selected = profile.currentClass.baseClass || profile.classes[0]?.name;
  let selectedRace = profile.classes.find(item=>item.name===selected)?.race || profile.classes[0]?.race;
  let appearanceRace = profile.currentClass.race || profile.races[0]?.name;
  let selectedProfession = profile.currentClass.name;
  let chooserOpen = false;
  let tab = 'class';
  installOverlayA11y();

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay profile-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel game-dialog-panel l2-status-window profile-panel">
      ${dialogHeading("Класс и облик").replace('data-dismiss','class="overlay-close" data-dismiss')}
      <div data-profile-content></div>
      <div class="utility-feedback" data-profile-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-profile-content]');
  const feedback = overlay.querySelector('[data-profile-feedback]');
  const close = () => {
    if(closed)return;closed=true;
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function classCard(item) {
    const chosen = item.name === selected;
    return `<button type="button" class="ui-button ui-choice-row compact ${chosen ? 'active' : ''}" data-profile-select="${escapeHtml(item.name)}" aria-pressed="${chosen}" ${pending ? 'disabled' : ''}>
      <span class="ui-inline-content">${classEmblemHtml({className:item.name,classTitle:item.title})}<span>${escapeHtml(item.title)}</span></span>
    </button>`;
  }

  function chosenHtml() {
    const item = profile.classes.find(entry => entry.name === selected);
    if (!item) return '';
    const target = profile.eligibleClasses.find(entry=>entry.name===selectedProfession);
    const blocked = pending || !profile.canChangeClass;
    return `<section class="profile-chosen">
      <h3>${escapeHtml(item.title)}</h3>
      ${target ? `<p>${escapeHtml(target.title)} · ${escapeHtml(target.raceTitle)}</p><p>${escapeHtml(target.description)}</p>
      <details class="ui-disclosure"><summary>Базовые параметры · ур. ${profile.level}</summary>${statsHtml(target.stats)}<p>Без экипировки, татуировок и эффектов.</p></details>` : ''}
      <h3>Ветки профессий</h3>
      <p>Профессии открываются через квесты на 20, 40 и 76 уровнях.</p>
      <p>При смене расы выбирается профессия на уже полученной ступени. Повторять её квесты не нужно.</p>
      <ul class="ui-profession-tree">${professionHtml(item.professions,profile.currentClass.name,selectedProfession,pending)}</ul>
      ${target && target.name !== profile.currentClass.name ? `<button type="button" class="ui-button primary profile-confirm" data-profile-class="${escapeHtml(target.name)}" ${blocked ? 'disabled' : ''}>Стать: ${escapeHtml(target.title)} · ${formatNumber(profile.classChangeCost)} CoL</button>` : ''}
    </section>`;
  }

  function render() {
    const current = profile.currentClass;
    const raceChoices = [...new Map(profile.classes.map(item=>[item.race,item.raceTitle])).entries()];
    const root = profile.classes.find(item=>item.name===selected);
    const branchNames = new Set();
    function visit(node){if(!node)return;branchNames.add(node.name);node.children.forEach(visit);}
    visit(root?.professions);
    if(!branchNames.has(selectedProfession) || !profile.eligibleClasses.some(item=>item.name===selectedProfession)) {
      selectedProfession = profile.eligibleClasses.find(item=>branchNames.has(item.name))?.name;
    }
    const servicePrice = current.name === 'noClass'?'Первый класс можно выбрать сразу':`Раса и профессия · ${formatNumber(profile.classChangeCost)} CoL`;
    const genderLocked = pending || !profile.canChangeGender;
    const tabs=`<nav class="ui-folder-tabs ui-window-tabs" role="tablist" aria-label="Раздел">${[['class','Класс и облик'],['subclasses','Саб-классы']].map(([id,label])=>`<button type="button" class="ui-button ${tab===id?'active':''}" role="tab" aria-selected="${tab===id}" data-profile-tab="${id}">${label}</button>`).join('')}</nav>`;
    if(tab==='subclasses'&&profile.subclasses){content.innerHTML=tabs+subclassesHtml();bind();return;}
    content.innerHTML = tabs+`
      <section class="profile-hero">
        <div class="profile-hero-copy">
          <div class="ui-inline-content">${classEmblemHtml({className:current.name,classTitle:current.title})}<strong>${escapeHtml(current.title)} · ур. ${profile.level}</strong></div>
          ${current.raceTitle ? `<span>Раса: ${escapeHtml(current.raceTitle)}</span>` : ''}
          <span>${servicePrice}</span>
          <span>Пол · ${formatNumber(profile.genderChangeCost)} CoL · Баланс: ${formatNumber(profile.luckCoins)} CoL</span>
        </div>
        <div class="profile-genders" role="group" aria-label="Пол персонажа">
          ${['male', 'female'].map(gender=>`<button type="button" data-profile-gender="${gender}" class="ui-button ${profile.gender===gender ? 'primary' : ''}" ${genderLocked || profile.gender===gender ? 'disabled' : ''} aria-pressed="${profile.gender===gender}">${gender==='male'?'Мужской':'Женский'}</button>`).join('')}
        </div>
        <details class="ui-disclosure"><summary>Сменить только расу · ${formatNumber(profile.raceChangeCost)} CoL</summary>
          <p>Профессия, её характеристики и прогресс сохраняются.</p>
          <label class="profile-select-label">Новая раса<select data-profile-race-only ${pending?'disabled':''}>${profile.races.map(race=>`<option value="${escapeHtml(race.name)}" ${race.name===appearanceRace?'selected':''}>${escapeHtml(race.title)}</option>`).join('')}</select></label>
          <button type="button" class="ui-button primary" data-profile-race-change ${pending||!profile.canChangeRace||appearanceRace===current.race?'disabled':''}>Сменить расу · ${formatNumber(profile.raceChangeCost)} CoL</button>
        </details>
      </section>
      <section class="profile-classes">
        <details class="ui-disclosure" data-profile-chooser ${chooserOpen?'open':''}><summary>Раса и профессия · ${escapeHtml(root?.raceTitle||'Выбор')}</summary>
          <div class="profile-race-list" role="group" aria-label="Раса персонажа">${raceChoices.map(([race,title])=>`<button type="button" class="ui-button ${race===selectedRace?'primary':''}" data-profile-race="${escapeHtml(race)}" aria-pressed="${race===selectedRace}" ${pending?'disabled':''}>${escapeHtml(title)}</button>`).join('')}</div>
          <div class="profile-class-list">${profile.classes.filter(item=>item.race===selectedRace).map(classCard).join('')}</div>
        </details>
        ${chosenHtml()}
      </section>`;
    bind();
    enhanceSelects(content);
  }

  function subclassesHtml() {
    const state=profile.subclasses;
    if(!state)return '';
    const full=state.addReason==='subclass_limit';
    return `<section class="profile-subclasses"><h3>Саб-классы · ${state.slots.length-1} / ${state.maxSubclasses}</h3>
      <div class="profile-slot-list">${state.slots.map(slot=>`<div class="profile-slot-row">
        <button type="button" class="ui-button ui-choice-row compact ${slot.active?'active':''}" data-profile-slot="${slot.index}" ${pending||slot.active||state.switchReason?'disabled':''} aria-pressed="${slot.active}">
          <span class="ui-inline-content">${classEmblemHtml({className:slot.className,classTitle:slot.classTitle})}<span>${escapeHtml(slot.classTitle)}<small>${slot.index===0?'Основной класс':'Саб-класс'} · ур. ${slot.level}</small></span></span>
        </button>
        ${slot.index>0?`<button type="button" class="ui-button" data-profile-subclass-remove="${slot.index}" aria-label="Удалить саб-класс ${escapeHtml(slot.classTitle)}" ${pending||state.switchReason?'disabled':''}>Удалить</button>`:''}
      </div>`).join('')}</div>
      ${full?'<p>Все слоты заняты. Удалите один саб-класс, чтобы взять новый.</p>':''}
      ${state.switchReason?`<p>${escapeHtml(REASONS[state.switchReason]||state.switchReason)}</p>`:''}
      ${full?'':state.addReason?`<p>${escapeHtml(REASONS[state.addReason]||state.addReason)}</p>`:state.choices.length?`<details class="ui-disclosure"><summary>Добавить саб-класс</summary>
        <p>Новая профессия начинает с 40 уровня. Опыт, SP, навыки и татуировки у каждого класса отдельные. Переключение бесплатное.</p>
        <label class="profile-select-label">Новая профессия<select data-profile-subclass-select ${pending?'disabled':''}>${profile.races.map(race=>`<optgroup label="${escapeHtml(race.title)}">${state.choices.filter(choice=>choice.race===race.name).map(choice=>`<option value="${escapeHtml(choice.name)}">${escapeHtml(choice.title)}</option>`).join('')}</optgroup>`).join('')}</select></label>
        <button type="button" class="ui-button primary" data-profile-subclass-add ${pending?'disabled':''}>Взять саб-класс</button>
      </details>`:'<p>Доступных саб-классов нет.</p>'}
    </section>`;
  }

  function bind() {
    content.querySelector('[data-profile-race-only]')?.addEventListener('change',event=>{
      appearanceRace=event.target.value;
      const button=content.querySelector('[data-profile-race-change]');button.disabled=pending||!profile.canChangeRace||appearanceRace===profile.currentClass.race;
    });
    content.querySelector('[data-profile-race-change]')?.addEventListener('click',()=>{
      const title=profile.races.find(race=>race.name===appearanceRace)?.title;
      mutateProfile('/api/profile/race',{race:appearanceRace},{title:'Сменить расу',text:`${title}. Стоимость: ${formatNumber(profile.raceChangeCost)} CoL. Профессия и характеристики сохраняются.`});
    });
    content.querySelectorAll('[data-profile-tab]').forEach(button=>button.addEventListener('click',()=>{
      if(pending||tab===button.dataset.profileTab)return;
      tab=button.dataset.profileTab;feedback.textContent='';render();
    }));
    content.querySelectorAll('[data-profile-subclass-remove]').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.profileSubclassRemove);
      const slot=profile.subclasses.slots.find(item=>item.index===index);
      mutateProfile('/api/profile/subclass',{action:'remove',index},{title:'Удалить саб-класс',text:`${slot?.classTitle||'Саб-класс'} · ур. ${slot?.level||''}. Опыт, SP, навыки и татуировки этого класса будут потеряны.`});
    }));
    content.querySelectorAll('[data-profile-slot]').forEach(button=>button.addEventListener('click',()=>mutateProfile('/api/profile/subclass',{action:'switch',index:Number(button.dataset.profileSlot)})));
    content.querySelector('[data-profile-subclass-add]')?.addEventListener('click',()=>{
      const className=content.querySelector('[data-profile-subclass-select]').value;
      const title=profile.subclasses.choices.find(choice=>choice.name===className)?.title;
      mutateProfile('/api/profile/subclass',{action:'add',className},{title:'Взять саб-класс',text:`${title} · ур. 40. Отдельные опыт, SP и навыки.`});
    });
    content.querySelector('[data-profile-chooser]')?.addEventListener('toggle',event=>{if(event.currentTarget.isConnected)chooserOpen=event.currentTarget.open;});
    content.querySelectorAll('[data-profile-race]').forEach(button=>button.addEventListener('click',()=>{
      if(pending)return;
      selectedRace=button.dataset.profileRace;
      selected=profile.classes.find(item=>item.race===selectedRace)?.name;
      chooserOpen=true;feedback.textContent='';haptic('light');render();
      content.querySelector(`[data-profile-race="${selectedRace}"]`)?.focus({preventScroll:true});
    }));
    content.querySelectorAll('[data-profile-profession]').forEach(button=>button.addEventListener('click',()=>{
      if(pending)return;
      selectedProfession=button.dataset.profileProfession;feedback.textContent='';haptic('light');render();
      content.querySelector(`[data-profile-profession="${selectedProfession}"]`)?.focus({preventScroll:true});
    }));
    content.querySelectorAll('[data-profile-select]').forEach(button => {
      button.addEventListener('click', () => {
        if (pending) return;
        selected = button.dataset.profileSelect;
        chooserOpen = false;
        feedback.textContent = '';
        haptic('light');
        render();
        content.querySelector(`[data-profile-profession="${selectedProfession}"]`)?.focus({preventScroll:true});
      });
    });
    content.querySelectorAll('[data-profile-class]').forEach(button => {
      button.addEventListener('click', () => changeClass(button.dataset.profileClass));
    });
    content.querySelectorAll('[data-profile-gender]').forEach(button => {
      button.addEventListener('click', () => changeGender(button.dataset.profileGender));
    });
  }

  async function mutateProfile(url,body,confirmation) {
    if(pending||closed)return;
    pending=true;render();
    try {
      if(confirmation && !await confirmDialog({owner:overlay,...confirmation,confirmLabel:'Подтвердить'}))return;
      if(closed)return;
      const payload=await api(url,{method:'POST',body:JSON.stringify(body)});
      profile=payload.profile;
      selected=profile.currentClass.baseClass||profile.classes[0]?.name;
      selectedRace=profile.classes.find(item=>item.name===selected)?.race||profile.classes[0]?.race;
      selectedProfession=profile.currentClass.name;appearanceRace=profile.currentClass.race||profile.races[0]?.name;
      chooserOpen=false;
      if(payload.state)renderState(payload.state);
      feedback.textContent=url.endsWith('/race')?'Раса изменена. Профессия сохранена.':body.action==='remove'?'Саб-класс удалён.':'Профессия активирована.';
      haptic('light');
    }catch(error){if(error.payload?.profile)profile=error.payload.profile;feedback.textContent=REASONS[error.payload?.reason]||error.message;}
    finally{pending=false;if(!closed)render();}
  }

  async function changeClass(className) {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy');
    render();
    try {
      const target=profile.eligibleClasses.find(item=>item.name===className);
      if(!target)return;
      if(!await confirmDialog({owner:overlay,title:'Сменить расу и профессию',text:`${target.raceTitle} · ${target.title}. Стоимость: ${formatNumber(profile.classChangeCost)} CoL.`,confirmLabel:'Сменить'})||closed)return;
      feedback.textContent = 'Меняем класс…';haptic('heavy');
      const payload = await api('/api/profile/class', {
        method: 'POST',
        body: JSON.stringify({ className }),
      });
      profile = payload.profile;
      selected = profile.currentClass.baseClass || profile.classes[0]?.name;
      selectedRace=profile.classes.find(item=>item.name===selected)?.race || profile.classes[0]?.race;
      appearanceRace=profile.currentClass.race || profile.races[0]?.name;
      selectedProfession=profile.currentClass.name;
      if (payload.state) renderState(payload.state);
      feedback.textContent = `Раса и профессия изменены: ${payload.raceTitle} · ${payload.classTitle}.`;
      if(statusElement)statusElement.textContent = `Персонаж: выбран класс ${payload.classTitle}.`;
      haptic('medium');
    } catch (error) {
      const base = REASONS[error.payload?.reason] || error.message;
      if(error.payload?.profile)profile=error.payload.profile;
      feedback.textContent = base;
      haptic('light');
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      if(!closed)render();
    }
  }

  async function changeGender(gender) {
    if (pending || gender === profile.gender) return;
    pending = true;
    overlay.classList.add('busy');
    render();
    try {
      if(!await confirmDialog({owner:overlay,title:'Сменить пол',text:`Стоимость: ${formatNumber(profile.genderChangeCost)} CoL.`,confirmLabel:'Сменить пол'})||closed)return;
      feedback.textContent = 'Сохраняем…';
      const payload = await api('/api/profile/gender', {
        method: 'POST',
        body: JSON.stringify({ gender }),
      });
      profile = payload.profile;
      if (payload.state) renderState(payload.state);
      feedback.textContent = 'Пол персонажа сохранён.';
      if(statusElement)statusElement.textContent = 'Профиль персонажа обновлён.';
      haptic('light');
    } catch (error) {
      if(error.payload?.profile)profile=error.payload.profile;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      if(!closed)render();
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

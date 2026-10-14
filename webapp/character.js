import {skillBookHtml} from './skill-book.js';
import {classEmblemHtml} from './class-emblem.js';
import {itemGridHtml} from './item-grid.js';
import {inventoryItemArt} from './inventory-layout.js';
import {installOverlayA11y} from './overlay-a11y.js';
import {dialogHeading} from './dialog-heading.js';
import {materialIcon} from './material-icons.js';
import {l2SlotBackground} from './l2-slot-background.js';
import {l2SkillIcon} from './art/l2-extra-art.js';
import {l2EffectIcon} from './art/l2-effects-art.js';
import { escapeHtml as esc } from './escape-html.js';
import { icon,controlIcon } from './icons.js';
import { paintedIconHtml, elementIcon } from './art/painted-icon-art.js';
import { menuArtFor } from './menu-art.js';
import { fullBodyHeroUrl } from './art/world-art.js';
import { avatarOutfit } from './art/avatar-art.js';
import {avatarCostumeAttributes, avatarCostumeImage, installAvatarCostumeMotion} from './avatar-costume-view.js';
import { renderLootArt } from './loot-renderer.js';
import { equippedItemForSlot } from './equipment-paper-doll.js';
import { openPlayerProfile } from './profile.js';
import { openEquipmentGame } from './equipment.js';
import { openSkillsGame } from './skills.js';
import { openBuffsGame } from './buffs.js';
import {openWarehouseGame} from './warehouse.js';
import {openTradeGame} from './trade.js';

export const CHARACTER_TABS = [['stats','Статы'],['equipment','Эквип'],['skills','Навыки'],['effects','Эффекты']];
const TAB_TEXTURES={stats:'Icon_DF_MenuWnd_Character',equipment:'Icon_DF_MenuWnd_Inventory',skills:'Icon_DF_MenuWnd_Skill'};
function tabIcon(id){return id==='effects'?l2SkillIcon('1040'):'<img src="/art/l2ui/navigation/'+TAB_TEXTURES[id]+'-icon.webp" alt="" aria-hidden="true" width="24" height="24" decoding="async">';}
const LEFT = [['head','Голова'],['up','Верх'],['down','Низ'],['hands','Руки'],['legs','Ноги'],['cloak','Плащ'],['shirt','Майка'],['belt','Пояс']];
const RIGHT = [['costume','Костюм'],['leftEar','Левая серьга'],['rightEar','Правая серьга'],['necklace','Ожерелье'],['leftRing','Левое кольцо'],['rightRing','Правое кольцо']];
const WEAPONS = [['rightHand','Оружие'],['leftHand','Вторая рука']];
const ELEMENTS = [['fire','Огонь'],['water','Вода'],['wind','Ветер'],['earth','Земля'],['holy','Святость'],['dark','Тьма']];
const SKILL_ICONS = {damage:'sword',attack:'sword',might:'sword','addDamageToBoss':'sword','clan-might':'sword',shield:'shield',guard:'shield','clan-shield':'shield',heal:'heart',vitality:'heart','clan-vitality':'heart',haste:'wind','wind-walk':'wind',evade:'wind','clan-agility':'wind',focus:'target',guidance:'target','clan-precision':'target',buff:'sparkles',debuff:'skull',restore:'flask-conical',utility:'book-open','death-whisper':'skull','clan-fury':'swords',addCritChanceToBoss:'target',addCritDamageToBoss:'swords'};
const fmt = value => value == null || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(value));
const row = (label,value) => '<div class="character-row"><span>' + label + '</span><strong>' + esc(String(value ?? '—')) + '</strong></div>';
const section = (title,content) => '<section class="character-section"><h3>' + esc(title) + '</h3><div class="character-section-body">' + content + '</div></section>';
const empty = text => '<p class="character-empty">' + esc(text) + '</p>';
const action = (name,label,data='',disabled=false) => '<button type="button" class="ui-button" data-character-action="' + name + '" ' + data + (disabled ? ' disabled' : '') + '><span class="character-button-label">' + label + '</span></button>';
const iconAction = (name,label,glyph,data='',disabled=false) => '<button type="button" class="ui-button ui-icon-button" data-character-action="'+name+'" aria-label="'+esc(label)+'" title="'+esc(label)+'" '+data+(disabled?' disabled':'')+'>'+controlIcon(glyph)+'</button>';

export function characterSkillIcon(key) {
  const art = l2EffectIcon(key) || l2SkillIcon(key) || (key === 'lifestone' ? paintedIconHtml('lifestone') : icon(SKILL_ICONS[key] || (/defen|shield|barrier|armor|tough/.test(key) ? 'shield' : /magic|empower|int/.test(key) ? 'wand-sparkles' : /crit|focus|accuracy/.test(key) ? 'target' : /speed|haste|agility/.test(key) ? 'wind' : /health|vital|heal/.test(key) ? 'heart' : 'book-open')));
  return '<span class="character-skill-icon" aria-hidden="true">' + art + '</span>';
}
function meter(label,current,max) {
  const pct = Math.min(100,Math.max(0,(Number(current)||0)/Math.max(1,Number(max)||1)*100));
  return '<div class="character-meter ' + label.toLowerCase() + '"><b>' + label + '</b><div class="character-meter-track"><i style="width:' + pct + '%"></i><b>' + (label==='EXP'?fmt(current)+'%':fmt(current) + ' / ' + fmt(max)) + '</b></div></div>';
}
function elementTable(values = []) {
  return '<div class="character-elements">' + ELEMENTS.map(([id,label]) => {
    const entry = values.find(value => value.element === id);
    return row('<span class="character-element-label">' + elementIcon(id) + esc(label) + '</span>',fmt(entry?.value ?? 0));
  }).join('') + '</div>';
}
function countdown(effect, now=Date.now()) {
  if (effect.charges != null) return effect.charges + ' зар.';
  if (!effect.until) return '∞';
  const seconds = Math.max(0,Math.ceil((effect.until-now)/1000));
  return Math.floor(seconds/60) + ':' + String(seconds%60).padStart(2,'0');
}
function effectDetail(effect) {
  return section(effect.name,
    row('Источник',effect.source) + row('Осталось',countdown(effect))
    + '<p class="character-note">' + esc(effect.description || 'Боевой эффект действует на персонажа.') + '</p>');
}
function itemDetails(item,slot) {
  const label = [...LEFT,...RIGHT,...WEAPONS].find(entry => entry[0] === slot)?.[1] || '';
  if (!item) return '';
  const attr = item.attribute;
  const current = attr?.current;
  const augmentation = item.augment?.current;
  const lines = (item.stats || []).map(stat => row(esc(stat.name || 'Бонус'),stat.text || fmt(stat.value))).join('');
  const lineage = Object.entries(item.lineage || {}).filter(([key,value]) => ['pAtk','mAtk','pDef','mDef'].includes(key) && Number.isFinite(Number(value)))
    .map(([key,value]) => row(esc(({pAtk:'P. Atk',mAtk:'M. Atk',pDef:'P. Def',mDef:'M. Def'})[key]),fmt(value))).join('');
  const attrHtml = attr?.side === 'armor'
    ? section('Защитный атрибут',elementTable(attr.currents || (current ? [current] : [])))
    : current ? section('Атрибут атаки',row('<span class="character-element-label">' + elementIcon(current.element) + esc(current.label) + '</span>',fmt(current.value)))
    : empty(attr ? 'Атрибут не установлен.' : 'Атрибуция этого предмета недоступна.');
  return section(item.name,
    '<div class="character-item-head"><div><small>' + esc(item.isUsed ? 'Надет' : 'В инвентаре') + '</small></div></div>'
    + '<div class="character-item-meta">' + row('Грейд',item.grade === 'noGrade' ? 'NG' : item.grade) + row('Заточка','+' + (item.enchant || 0)) + '</div>'
    + (item.sa?row('SA',item.sa.current?esc(item.sa.current.label)+' · '+item.sa.current.stage:'—'):'')
    + lineage + lines + (item.description ? '<p class="character-note">' + esc(item.description) + '</p>' : '')
    + (item.set ? '<p class="character-note">Комплект: ' + esc(item.set.name || item.set.id) + '</p>' : '')
    + (item.timed ? row('Осталось дней',fmt(item.daysLeft)) : '')
    + '<div class="character-tools">' + action('unequip','Снять','data-key="' + esc(item.key) + '"',!item.isUsed || !item.key) + '</div>')
    + attrHtml + (augmentation ? section('Аугментация ЛС',empty(augmentation.text) + (augmentation.skill ? l2SkillIcon(augmentation.skill.id) + empty(augmentation.skill.title + ': ' + augmentation.skill.name + ' · ' + augmentation.skill.text) : '')) : '');
}
function listEntry(iconKey,title,copy,buttons='') {
  return '<article class="character-list-row">' + characterSkillIcon(iconKey) + '<div class="character-list-copy"><strong>' + esc(title) + '</strong><p>' + esc(copy) + '</p>' + buttons + '</div></article>';
}

export function renderCharacterTab(data,tab,{slot='rightHand',effectId=null,skillTab='active'}={}) {
  if (tab === 'stats') {
    const player = data.player;
    const attrs = data.attributes || {};
    const combatOrder=['pAtk','mAtk','pDef','mDef','accuracy','evasion','criticalChance','speed','attackSpeed','castSpeed'];
    const combatRows=combatOrder.map(id=>(data.combat||[]).find(s=>s.id===id)||({attackSpeed:{label:'Скор. атаки',value:null},castSpeed:{label:'Скор. магии',value:null}}[id])).filter(Boolean);
    const xp = player.level >= player.maxLevel ? 100 : Math.min(100, Math.max(0,(player.currentExp || 0)/Math.max(1,player.needExp)*100));
    const base = '<div class="character-base ui-stat-table">' + (data.characteristics || []).map(stat =>
      '<div class="ui-stat-row" data-base-stat="' + esc(stat.id) + '"><span class="character-stat-label">' + esc(stat.id) + '</span><b>' + fmt(stat.total) + (stat.bonus?'<small class="character-stat-delta '+(stat.bonus>0?'positive':'negative')+'" aria-label="'+esc('Изменение '+stat.id)+'">'+(stat.bonus>0?'+':'')+fmt(stat.bonus)+'</small>':'')+'</b></div>').join('') + '</div>';
    return row('Клан',data.clanName || '—')+section('Состояние','<div class="character-status-grid">'+meter('HP',player.hp,player.maxHp)+meter('CP',player.cp,player.maxCp)+meter('MP',player.mp,player.maxMp)+'<div class="character-meter sp"><b>SP</b><strong class="character-status-value">'+fmt(player.sp)+'</strong></div>'+meter('EXP',xp,100)+'</div>')
      +(player.penalties?.length?section('Штрафы','<div class="character-penalties">'+player.penalties.map(p=>'<span title="'+esc(p.name)+'">'+l2SkillIcon(p.id)+esc(p.name)+' · '+p.level+'</span>').join('')+'</div>'):'')
      +section('Боевые','<div class="character-combat ui-stat-table">'+combatRows.map(stat=>row(esc(stat.label),fmt(stat.value))).join('')+'</div>')
      +section('Базовые',base)
      +section('Социальные','<div class="character-combat ui-stat-table">'+row('Карма',fmt(data.social?.karma))+row('PvP / PK',data.social?fmt(data.social.pvp)+' / '+fmt(data.social.pk):'—')+'</div>')
      +section('Атрибут атаки',attrs.attack ? row('<span class="character-element-label">'+elementIcon(attrs.attack.element)+esc(attrs.attack.label)+'</span>',fmt(attrs.attack.value)) : empty('Оружие без атрибута.'))
      +section('Защита от стихий · сумма экипировки',elementTable(attrs.resist));
  }
  if (tab === 'equipment') {
    const equipment = data.equipment || {};
    const source = fullBodyHeroUrl(data.player) || menuArtFor('profile',data.player);
    const outfit = avatarOutfit(data.player);
    const slots = (entries,side) => '<div class="character-slots '+side+'">'+entries.map(([id,label])=>{
      const item = equippedItemForSlot(equipment,id);
      return '<button type="button" class="ui-button character-slot" title="'+esc(label+(item?' · '+item.name:''))+'" data-character-slot="'+id+'" aria-pressed="'+(id===slot)+'" aria-label="'+esc(label+': '+(item?.name || 'Пусто')+(item?.enchant?' +'+item.enchant:'')+(item?.augment?.current?' · ЛС':''))+'"><span class="character-slot-icon'+(item?.enchant>=10?' enchant-high':item?.enchant>=4?' enchanted':'')+(item?.augment?.current?' augmented':'')+'">'
        +(item?renderLootArt(item):l2SlotBackground(id))+(item?'<b class="character-grade">'+esc(item.grade==='noGrade'?'NG':item.grade)+'</b>':'')
        +(item?.enchant?'<b class="character-enchant">+'+esc(String(item.enchant))+'</b>':'')
        +(item?.augment?.current?'<span class="character-ls" aria-hidden="true">'+paintedIconHtml('lifestone')+'</span>':'')
        +'</span></button>';
    }).join('')+'</div>';
    const sets = (equipment.sets || []).map(set=>empty((set.complete?'Полный комплект: ':'Комплект: ')+(set.name || set.id)+' · '+set.pieces)+(set.bonus || []).map(stat=>row(esc(stat?.name || 'Бонус'),stat?.text || fmt(stat?.value))).join('')).join('');
    return '<div class="character-doll" '+avatarCostumeAttributes(outfit?.id)+(outfit?' data-avatar-race="'+esc(outfit.race)+'"':'')+'>'+avatarCostumeImage({src:source,imageClass:'character-body-art',name:outfit ? 'Декоративный наряд: '+outfit.name : 'Облик класса'})+slots(LEFT,'left')+slots(RIGHT,'right')+'</div>'+slots(WEAPONS,'weapons')
      +((data.tattoos||[]).length?'<div class="character-symbols" aria-label="Нанесённые символы">'+data.tattoos.map((t,index)=>'<button type="button" class="ui-button ui-icon-button" data-tattoo-detail="'+index+'" title="'+esc(t.symbol?.name||'Символ')+'" aria-label="'+esc(t.symbol?.name||'Символ')+'">'+(t.symbol?'<img src="/art/henna/'+esc(t.symbol.icon)+'.webp" alt="" width="32" height="32" decoding="async">':'')+'</button>').join('')+'</div>':'')
      +(sets?'<details class="ui-disclosure"><summary>Комплекты</summary>'+sets+'</details>':'')
      +'<div class="character-tools">'+iconAction('inventory','Инвентарь','backpack')+iconAction('forge','Кузница','anvil')+iconAction('warehouse','Хранилище','package-open')+iconAction('trade','Обмен','arrow-left-right')+'</div>'
      ;
  }
  if (tab === 'skills') {
    const book={...(data.skills||{}),book:(data.skills?.book||[]).filter(s=>skillTab!=='passive'||!['equipment','itemPassive','clanPassive'].includes(s.group))};
    const bonuses = skillTab==='passive' ? passiveBonuses(data) : '';
    return '<nav class="ui-folder-tabs ui-window-tabs character-skill-tabs" role="tablist" aria-label="Тип навыков">'+[['active','Активные'],['passive','Пассивные'],['learn','Изучение']].map(([id,title])=>'<button type="button" role="tab" data-skill-tab="'+id+'" aria-selected="'+(skillTab===id)+'">'+title+'</button>').join('')+'</nav>'+skillBookHtml(book,skillTab)+bonuses+'<div class="character-footer">'+iconAction('skill-info','Книга и заточка навыков','book-open')+'</div>';
  }

  const effects = (data.effects || []).filter(effect=>!effect.until || effect.until>Date.now());
  const group = kind => {
    const entries=effects.filter(effect=>effect.kind===kind);
    return entries.length?'<div class="character-buff-grid">'+entries.map(effect=>'<button type="button" class="character-effect" data-effect-id="'+esc(effect.id)+'" aria-pressed="'+(effect.id===effectId)+'" aria-label="'+esc(effect.name)+'" title="'+esc(effect.name)+'">'
      +characterSkillIcon(effect.iconKey)+'<small data-effect-timer="'+esc(effect.id)+'">'+countdown(effect)+'</small></button>').join('')+'</div>':empty(kind==='debuff'?'Дебаффов нет.':'Действующих баффов нет.');
  };
  const casts=(data.buffs?.buffs || []).map(buff=>listEntry(buff.id,buff.name+' · ур. '+buff.level,buff.effect,
    buff.level>0?'<div class="character-cast-action">'+iconAction('cast','Наложить '+buff.name,'arrow-up','data-buff-id="'+esc(buff.id)+'"',buff.cooldownUntil>Date.now())+'<small>'+fmt(buff.cost)+' MP</small></div>':'<small>Откроется на '+buff.firstLevelAt+' ур.</small>')).join('');
  return section('Действующие баффы',group('buff'))+section('Дебаффы',group('debuff'))
    +section('Баффы класса','<div class="character-casts">'+(casts || empty('Этот класс пока не умеет накладывать баффы.'))+'</div>')
    +(data.buffs?.support?'<div class="character-tools">'+iconAction('buff-target','Наложить на другого игрока','users')+'</div>':'');
}

function passiveBonuses(data){
  const cells=(entries,label)=>entries.length?section(label,itemGridHtml(entries.map((entry,index)=>'<button type="button" class="item-grid-cell" data-passive-detail="'+label+':'+index+'" title="'+esc(entry.name+' · '+entry.text)+'" aria-label="'+esc(entry.name)+'">'+(entry.art||'')+'</button>'),{min:entries.length,label})):'';
  const equipment=(data.skills?.book||[]).filter(s=>s.level&&s.kind==='passive'&&['equipment','itemPassive'].includes(s.group)).map(s=>({name:s.name,text:s.description,art:l2SkillIcon(s.id)}));
  for(const item of data.equipment?.items||[])if(item.isUsed&&item.augment?.current){const a=item.augment.current;equipment.push({name:item.name,text:a.name+' '+a.text+(a.skill?.kind==='passive'?' · '+a.skill.name+' '+a.skill.text:''),art:a.skill?.kind==='passive'?l2SkillIcon(a.skill.id):inventoryItemArt(item)});}
  for(const set of data.equipment?.sets||[])if(set.bonus?.length){const item=data.equipment.items?.find(i=>i.isUsed&&i.set?.id===set.id);equipment.push({name:set.name,text:set.bonus.map(s=>s.text).join(' · '),art:item?inventoryItemArt(item):''});}
  const clan=(data.clanPassives||[]).map(s=>({name:s.name,text:s.stat+' '+s.bonus,art:l2SkillIcon(s.id)}));
  for(const s of data.skills?.book||[])if(s.level&&s.kind==='passive'&&s.group==='clanPassive'&&!(data.clanPassives||[]).some(c=>Number(c.id)===Number(s.id)))clan.push({name:s.name,text:s.description,art:l2SkillIcon(s.id)});
  return cells(equipment,'LS и экипировка')+cells(clan,'Клан');
}

const ERRORS = {
  not_enough_sp:'Недостаточно SP.', not_enough_gold:'Недостаточно Адены.', level_too_low:'Недостаточный уровень.',
  max_level:'Достигнут максимальный уровень.', stale_item:'Снаряжение изменилось. Список обновлён.',
  cooldown:'Бафф ещё восстанавливается.', not_enough_mp:'Недостаточно MP.', player_dead:'Сначала воскресните.',
  skill_cooldown:'Навык ЛС ещё восстанавливается.', not_equipped:'Предмет уже снят.', gold_level_locked:'Операция пока недоступна.',
};

export async function openCharacterPage(options,initialTab='stats') {
  installOverlayA11y();
  const {api,renderState,haptic}=options;
  let data=await api('/api/character'), tab=initialTab, skillTab='active', slot='rightHand',effectId=null,pending=false,closed=false;
  const overlay=document.createElement('section');
  overlay.className='game-overlay character-overlay';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Персонаж');
  overlay.innerHTML='<div class="overlay-backdrop"></div><div class="overlay-panel game-dialog-panel l2-status-window character-panel">'+dialogHeading('Персонаж',{leadingAction:{action:'appearance',label:'Класс и облик',icon:icon('settings')}}).replace('data-dismiss','class="overlay-close" data-dismiss')+'<div data-character-identity></div><nav class="ui-folder-tabs ui-window-tabs ui-icon-tabs character-tabs" role="tablist" aria-label="Разделы персонажа"></nav><div class="character-scroll" role="tabpanel" id="character-content" tabindex="0"></div><p class="character-feedback" role="status" aria-live="polite"></p></div>';
  const panel=overlay.querySelector('.character-scroll'), tabs=overlay.querySelector('.character-tabs'),feedback=overlay.querySelector('.character-feedback');
  const previousFocus=document.activeElement;
  let detail=null;
  function showDetail(title,html){
    detail?.remove();detail=document.createElement('dialog');detail.className='game-dialog-panel character-detail-dialog';
    detail.innerHTML=dialogHeading(title)+html;overlay.append(detail);
    detail.querySelector('[data-dismiss]').onclick=()=>{detail.close();detail.remove();};detail.showModal();
  }
  function draw() {
    const scroll=panel.scrollTop;
    overlay.querySelector('[data-character-identity]').innerHTML='<div class="character-identity">'+classEmblemHtml(data.player)+'<div class="character-name"><strong>'+esc(data.name)+'</strong><small>Ур. '+fmt(data.player.level)+'</small></div></div>';
    tabs.innerHTML=CHARACTER_TABS.map(([id,label])=>'<button type="button" role="tab" id="character-tab-'+id+'" aria-label="'+esc(label)+'" title="'+esc(label)+'" aria-controls="character-content" aria-selected="'+(id===tab)+'" tabindex="'+(id===tab?0:-1)+'" data-character-tab="'+id+'">'+tabIcon(id)+'</button>').join('');
    panel.setAttribute('aria-labelledby','character-tab-'+tab);
    panel.innerHTML=renderCharacterTab(data,tab,{slot,effectId,skillTab});panel.scrollTop=scroll;
    overlay.querySelectorAll('button:not([data-dismiss])').forEach(button=>{if(pending)button.disabled=true;});
    syncTimer();
  }
  async function refresh() {
    if(closed)return;
    data=await api('/api/character');
    if(!closed)draw();
  }
  function selectTab(next) {
    if(!CHARACTER_TABS.some(([id])=>id===next))return;
    tab=next;panel.scrollTop=0;draw();haptic?.('light');
  }
  async function mutate(path,body) {
    if(pending)return;
    pending=true;feedback.textContent='Сохраняем…';draw();
    try {
      const result=await api(path,{method:'POST',body:JSON.stringify(body)});
      if(result.state)renderState?.(result.state);
      feedback.textContent='Готово.';haptic?.('light');
    } catch(error) {
      feedback.textContent=ERRORS[error.payload?.reason] || error.message || 'Не удалось сохранить.';
    } finally {
      pending=false;
      try{await refresh();}catch(error){feedback.textContent+=' Не удалось обновить данные: '+error.message;draw();}
    }
  }
  async function child(open,extra={}) {
    if(pending)return;
    pending=true;draw();
    try {
      await open({...options,player:data.player,...extra});
      const childOverlay=[...document.querySelectorAll('.game-overlay')].filter(node=>node!==overlay).at(-1);
      if(childOverlay) {
        await new Promise(resolve=>{
          const observer=new MutationObserver(()=>{if(!childOverlay.isConnected){observer.disconnect();resolve();}});
          observer.observe(document.body,{childList:true});
        });
      }
      if(!closed)await refresh();
    } finally {pending=false;if(!closed)draw();}
  }
  overlay.addEventListener('click',async event=>{
    const button=event.target.closest('button');
    if(!button || pending || closed)return;
    try {
      if(button.hasAttribute('data-character-refresh')){pending=true;draw();try{await refresh();}finally{pending=false;draw();}return;}
      if(button.dataset.skillId){
        const s=data.skills?.book?.find(s=>Number(s.id)===Number(button.dataset.skillId));if(!s)return;
        const kit=data.skills.skills?.find(k=>k.l2Id===s.id),passive=data.skills.passives?.find(p=>Number(p.id)===Number(s.id));
        const cost=kit?.learn||passive?.cost,enabled=kit?.learn?kit.learn.canLearn:passive?.canLearn;
        const learn=cost? action(kit?.learn?'learn-class':'learn','Изучить · '+fmt(cost.sp)+' SP',kit?.learn?'data-learn-slot="'+esc(kit.slot)+'"':'data-passive-id="'+esc(passive.id)+'"',!enabled):'';
        showDetail(s.name,'<div class="skill-detail-icon">'+l2SkillIcon(s.id)+'</div>'+empty(s.description)+row('Уровень',fmt(s.level))+(s.mp?row('MP',fmt(s.mp)):'')+learn);return;
      }
      if(button.dataset.skillTab){skillTab=button.dataset.skillTab;draw();haptic?.('light');return;}
      if(button.dataset.characterTab){selectTab(button.dataset.characterTab);return;}
      if(button.dataset.characterSlot){slot=button.dataset.characterSlot;draw();
        if(slot==='costume')return await child(openPlayerProfile);
        const item=equippedItemForSlot(data.equipment,slot),label=[...LEFT,...RIGHT,...WEAPONS].find(s=>s[0]===slot)?.[1];
        showDetail(item?.name||label,item?itemDetails(item,slot):action('inventory','Выбрать предмет'));return;}
      if(button.dataset.effectId){effectId=button.dataset.effectId;const effect=data.effects.find(e=>e.id===effectId);if(effect)showDetail(effect.name,effectDetail(effect));return;}
      if(button.hasAttribute('data-passive-detail')){showDetail(button.getAttribute('aria-label'),empty(button.title));return;}
      if(button.hasAttribute('data-tattoo-detail')){const t=data.tattoos[Number(button.dataset.tattooDetail)];showDetail(t.symbol?.name||'Символ',empty(Object.entries(t.stats).map(([id,v])=>id+' '+(v>0?'+':'')+fmt(v)).join(' · ')));return;}
      const name=button.dataset.characterAction||button.dataset.headingAction;
      if(detail?.open&&name){detail.close();detail.remove();}
      if(name==='unequip')return await mutate('/api/equipment/action',{key:button.dataset.key,action:'unequip'});
      if(name==='learn')return await mutate('/api/passives/learn',{id:button.dataset.passiveId});
      if(name==='learn-class')return await mutate('/api/skills/learn',{slot:button.dataset.learnSlot});
      if(name==='ls-activate')return await mutate('/api/equipment/action',{key:button.dataset.key,action:'ls_activate'});
      if(name==='cast')return await mutate('/api/buffs/cast',{buffId:button.dataset.buffId});
      if(name==='tab-equipment'){selectTab('equipment');return;}
      if(name==='tab-skills'){selectTab('skills');return;}
      if(name==='appearance')return await child(openPlayerProfile);
      if(name==='warehouse')return await child(openWarehouseGame);
      if(name==='trade')return await child(openTradeGame);
      if(name==='inventory'||name==='forge')return await child(openEquipmentGame,{initialView:name==='forge'?'forge':'inventory'});
      if(name==='skill-info')return await child(openSkillsGame);
      if(name==='buff-target')return await child(openBuffsGame);
    }catch(error){feedback.textContent=error.message || 'Не удалось открыть раздел.';}
  });
  tabs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    if(pending)return;
    const index=CHARACTER_TABS.findIndex(([id])=>id===tab);
    const next=event.key==='Home'?0:event.key==='End'?3:(index+(event.key==='ArrowRight'?1:3))%4;
    selectTab(CHARACTER_TABS[next][0]);tabs.querySelector('[aria-selected="true"]').focus();
  });
  const close=()=>{
    if(closed)return;
    closed=true;detail?.remove();clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);
    overlay.classList.add('closing');setTimeout(()=>{overlay.remove();previousFocus?.focus?.();},180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click',close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click',close);
  let timer=null;
  const onVisible=()=>{syncTimer();if(!document.hidden&&!pending)refresh().catch(error=>{feedback.textContent=error.message;});};
  function tick(){
    if(closed || document.hidden)return;
    const expired=(data.effects || []).some(effect=>effect.until && effect.until<=Date.now());
    if(expired&&!pending){data.effects=data.effects.filter(effect=>!effect.until || effect.until>Date.now());if(tab==='effects')draw();}
    panel.querySelectorAll('[data-effect-timer]').forEach(node=>{
      const effect=(data.effects||[]).find(effect=>effect.id===node.dataset.effectTimer);
      if(effect)node.textContent=countdown(effect);
    });
  }
  function syncTimer(){clearInterval(timer);timer=null;if(!closed&&!document.hidden&&!pending&&tab==='effects'&&(data.effects||[]).some(e=>e.until))timer=setInterval(tick,1000);}
  document.addEventListener('visibilitychange',onVisible);
  document.body.appendChild(overlay);installAvatarCostumeMotion();draw();requestAnimationFrame(()=>{overlay.classList.add('visible');overlay.querySelector('.overlay-close').focus();});
}

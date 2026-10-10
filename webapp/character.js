import {l2SkillIcon} from './art/l2-extra-art.js';
import {l2EffectIcon} from './art/l2-effects-art.js';
import { escapeHtml as esc } from './escape-html.js';
import { icon } from './icons.js';
import { paintedIconHtml, elementIcon } from './art/painted-icon-art.js';
import { menuArtFor } from './menu-art.js';
import { fullBodyHeroUrl } from './art/world-art.js';
import { renderLootArt } from './loot-renderer.js';
import { equippedItemForSlot } from './equipment-paper-doll.js';
import { openPlayerProfile } from './profile.js';
import { openEquipmentGame } from './equipment.js';
import { openSkillsGame } from './skills.js';
import { openBuffsGame } from './buffs.js';

export const CHARACTER_TABS = [['stats','Статы'],['equipment','Эквип'],['skills','Навыки'],['effects','Эффекты']];
const LEFT = [['head','Голова','user'],['leftEar','Л. ухо','gem'],['up','Верх','shield'],['hands','Руки','hand'],['leftHand','Л. рука','shield'],['leftRing','Л. кольцо','circle'],['legs','Ноги','user']];
const RIGHT = [['necklace','Шея','gem'],['rightEar','П. ухо','gem'],['cloak','Плащ','flag'],['down','Низ','shield'],['rightHand','П. рука','wand-sparkles'],['rightRing','П. кольцо','circle']];
const ELEMENTS = [['fire','Огонь'],['water','Вода'],['wind','Ветер'],['earth','Земля'],['holy','Святость'],['dark','Тьма']];
const SKILL_ICONS = {damage:'sword',attack:'sword',might:'sword','addDamageToBoss':'sword','clan-might':'sword',shield:'shield',guard:'shield','clan-shield':'shield',heal:'heart',vitality:'heart','clan-vitality':'heart',haste:'wind','wind-walk':'wind',evade:'wind','clan-agility':'wind',focus:'target',guidance:'target','clan-precision':'target',buff:'sparkles',debuff:'skull',restore:'flask-conical',utility:'book-open','death-whisper':'skull','clan-fury':'swords',addCritChanceToBoss:'target',addCritDamageToBoss:'swords'};
const fmt = value => value == null || !Number.isFinite(Number(value)) ? '—' : new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(value));
const row = (label,value) => '<div class="character-row"><span>' + label + '</span><strong>' + esc(String(value ?? '—')) + '</strong></div>';
const section = (title,content) => '<section class="character-section"><h3>' + esc(title) + '</h3><div class="character-section-body">' + content + '</div></section>';
const empty = text => '<p class="character-empty">' + esc(text) + '</p>';
const action = (name,label,data='',disabled=false) => '<button type="button" data-character-action="' + name + '" ' + data + (disabled ? ' disabled' : '') + '><span class="character-button-label">' + label + '</span></button>';

export function characterSkillIcon(key) {
  const art = l2EffectIcon(key) || l2SkillIcon(key) || (key === 'lifestone' ? paintedIconHtml('lifestone') : icon(SKILL_ICONS[key] || (/defen|shield|barrier|armor|tough/.test(key) ? 'shield' : /magic|empower|int/.test(key) ? 'wand-sparkles' : /crit|focus|accuracy/.test(key) ? 'target' : /speed|haste|agility/.test(key) ? 'wind' : /health|vital|heal/.test(key) ? 'heart' : 'book-open')));
  return '<span class="character-skill-icon" aria-hidden="true">' + art + '</span>';
}
function meter(label,current,max) {
  const pct = Math.min(100,Math.max(0,(Number(current)||0)/Math.max(1,Number(max)||1)*100));
  return '<div class="character-meter ' + label.toLowerCase() + '"><b>' + label + '</b><div class="character-meter-track"><i style="width:' + pct + '%"></i><b>' + fmt(current) + ' / ' + fmt(max) + '</b></div></div>';
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
  const label = [...LEFT,...RIGHT].find(entry => entry[0] === slot)?.[1] || '';
  if (!item) return section(label || 'Предмет',empty('Слот свободен.') + action('inventory','Выбрать предмет'));
  const attr = item.attribute;
  const current = attr?.current;
  const augmentation = item.augment?.current;
  const lines = (item.stats || []).map(stat => row(esc(stat.name || 'Бонус'),stat.text || fmt(stat.value))).join('');
  const lineage = Object.entries(item.lineage || {}).filter(([key,value]) => ['pAtk','mAtk','pDef','mDef'].includes(key) && Number.isFinite(Number(value)))
    .map(([key,value]) => row(esc(({pAtk:'P. Atk',mAtk:'M. Atk',pDef:'P. Def',mDef:'M. Def'})[key]),fmt(value))).join('');
  const attrHtml = attr?.side === 'armor'
    ? section('Защитный атрибут',elementTable(current ? [current] : []))
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

export function renderCharacterTab(data,tab,{slot='rightHand',effectId=null}={}) {
  if (tab === 'stats') {
    const player = data.player;
    const attrs = data.attributes || {};
    const xp = player.level >= player.maxLevel ? 100 : Math.min(100, Math.max(0,(player.currentExp || 0)/Math.max(1,player.needExp)*100));
    const base = '<div class="character-base">' + (data.characteristics || []).map(stat =>
      '<button type="button" data-base-stat="' + esc(stat.id) + '" title="' + esc(stat.text) + '"><span>' + esc(stat.id) + '</span><b>' + fmt(stat.total) + '</b></button>').join('') + '</div><div data-base-detail></div>';
    return section('Состояние',meter('CP',player.cp,player.maxCp)+meter('HP',player.hp,player.maxHp)+meter('MP',player.mp,player.maxMp)
      +row('SP',fmt(player.sp))+row('Опыт',player.level >= player.maxLevel ? 'MAX' : fmt(player.currentExp)+' / '+fmt(player.needExp))
      +'<div class="character-xp"><i style="width:'+xp+'%"></i></div>'
      + (player.vitality ? row('Vitality','×'+fmt(player.vitality.rate*player.vitality.bonus)+' · '+fmt(player.vitality.points)) : ''))
      +section('Базовые характеристики',base)
      +section('Боевые характеристики',(data.combat || []).map(stat=>row(esc(stat.label),fmt(stat.value))).join(''))
      +section('Атрибут атаки',attrs.attack ? row('<span class="character-element-label">'+elementIcon(attrs.attack.element)+esc(attrs.attack.label)+'</span>',fmt(attrs.attack.value)) : empty('Оружие без атрибута.'))
      +section('Защита от стихий · сумма экипировки',elementTable(attrs.resist))
      +'<div class="character-tools">'+action('appearance',icon('user')+'Класс и облик')+'</div>';
  }
  if (tab === 'equipment') {
    const equipment = data.equipment || {};
    const source = fullBodyHeroUrl(data.player) || menuArtFor('profile',data.player);
    const slots = (entries,side) => '<div class="character-slots '+side+'">'+entries.map(([id,label,glyph])=>{
      const item = equippedItemForSlot(equipment,id);
      return '<button type="button" class="character-slot" data-character-slot="'+id+'" aria-pressed="'+(id===slot)+'" aria-label="'+esc(label+': '+(item?.name || 'Пусто')+(item?.enchant?' +'+item.enchant:'')+(item?.augment?.current?' · ЛС':''))+'"><span class="character-slot-icon'+(item?.enchant>=10?' enchant-high':item?.enchant>=4?' enchanted':'')+(item?.augment?.current?' augmented':'')+'">'
        +(item?renderLootArt(item):icon(glyph))+(item?'<b class="character-grade">'+esc(item.grade==='noGrade'?'NG':item.grade)+'</b>':'')
        +(item?.enchant?'<b class="character-enchant">+'+esc(String(item.enchant))+'</b>':'')
        +(item?.augment?.current?'<span class="character-ls" aria-hidden="true">'+paintedIconHtml('lifestone')+'</span>':'')
        +'</span><span>'+label+'</span></button>';
    }).join('')+'</div>';
    const sets = (equipment.sets || []).map(set=>empty((set.complete?'Полный комплект: ':'Комплект: ')+(set.name || set.id)+' · '+set.pieces)+(set.bonus || []).map(stat=>row(esc(stat?.name || 'Бонус'),stat?.text || fmt(stat?.value))).join('')).join('');
    return '<div class="character-doll"><img class="character-body-art" src="'+esc(source)+'" alt="'+esc('Облик класса')+'">'+slots(LEFT,'left')+slots(RIGHT,'right')+'</div>'
      +itemDetails(equippedItemForSlot(equipment,slot),slot)
      +(sets?section('Комплекты',sets):'')
      +'<div class="character-tools">'+action('inventory',icon('backpack')+'Инвентарь')+action('forge',icon('hammer')+'Кузница')+'</div>'
      ;
  }
  if (tab === 'skills') {
    const active = (data.skills?.skills || []).map(skill=>listEntry(skill.name,
      skill.name+' +'+skill.enchantLevel,
      skill.description+' · '+(skill.locked?'Откроется на '+skill.needLevel+' ур.':'MP '+fmt(skill.usage?.mp)+' · CD '+fmt(skill.usage?.cooldownSeconds)+' сек.'),
      action('skill-info','Описание и улучшение','data-skill-slot="'+skill.slot+'"'))).join('');
    const passives = (data.passives?.passives || []).map(skill=>listEntry(skill.id,skill.name+' · '+skill.level+'/'+skill.maxLevel,
      skill.stat+': '+(skill.current || 'Не изучено')+(skill.next?' → '+skill.next:''),
      skill.cost ? '<small>Нужен '+skill.needLvl+' ур. · '+fmt(skill.cost.sp)+' SP · '+fmt(skill.cost.gold)+' Мора</small>'+action('learn','Изучить','data-passive-id="'+esc(skill.id)+'"',!skill.canLearn) : '<small>Максимальный уровень</small>')).join('');
    const ls = (data.equipment?.items || []).filter(item=>item.isUsed && item.augment?.current).map(item=>{
      const current = item.augment.current, skill = current.skill, activeState = item.augment.active;
      return listEntry(skill?.id || 'lifestone',(skill?skill.title+': '+skill.name:'Бонус ЛС')+' · '+item.name,
        current.text+(skill?' · '+skill.text:''),
        activeState? action('ls-activate',activeState.cooldownMs>0 ? 'CD '+Math.ceil(activeState.cooldownMs/60000)+' мин.' : 'Активировать',
          'data-key="'+esc(item.key)+'"',activeState.cooldownMs>0):'');
    }).join('');
    const clan = (data.clanPassives || []).map(skill=>listEntry(skill.id,skill.name+' · ур. '+skill.level,skill.stat+' '+skill.bonus)).join('');
    return row('Очки навыков',fmt(data.player.sp)+' SP')
      +section('Активные','<div class="character-active">'+(active || empty('Для этого класса нет активных умений.'))+'</div>')
      +section('Пассивные',passives || empty('Пассивных умений пока нет.'))
      +section('ЛС · Аугментация',ls || empty('На надетых предметах нет аугментации.'))
      +section('Клановые пассивки',clan || empty('Активных клановых бонусов нет.'));
  }
  const effects = (data.effects || []).filter(effect=>!effect.until || effect.until>Date.now());
  const group = kind => {
    const entries=effects.filter(effect=>effect.kind===kind);
    return entries.length?'<div class="character-buff-grid">'+entries.map(effect=>'<button type="button" class="character-effect" data-effect-id="'+esc(effect.id)+'" aria-pressed="'+(effect.id===effectId)+'" aria-label="'+esc(effect.name)+'" title="'+esc(effect.name)+'">'
      +characterSkillIcon(effect.iconKey)+'<small data-effect-timer="'+esc(effect.id)+'">'+countdown(effect)+'</small></button>').join('')+'</div>':empty(kind==='debuff'?'Дебаффов нет.':'Действующих баффов нет.');
  };
  const selected=effects.find(effect=>effect.id===effectId) || effects[0];
  const casts=(data.buffs?.buffs || []).map(buff=>listEntry(buff.id,buff.name+' · ур. '+buff.level,buff.effect,
    buff.level>0?action('cast','Наложить · '+fmt(buff.cost)+' MP','data-buff-id="'+esc(buff.id)+'"',buff.cooldownUntil>Date.now()):'<small>Откроется на '+buff.firstLevelAt+' ур.</small>')).join('');
  return section('Действующие баффы',group('buff'))+section('Дебаффы',group('debuff'))
    +(selected?effectDetail(selected):'')
    +section('Баффы класса','<div class="character-casts">'+(casts || empty('Этот класс пока не умеет накладывать баффы.'))+'</div>')
    +(data.buffs?.support?'<div class="character-tools">'+action('buff-target','Наложить на другого игрока')+'</div>':'')
    +section('Постоянные бонусы','<div class="character-tools">'+action('tab-equipment',icon('shield')+'Экипировка')+action('tab-skills',icon('book-open')+'Навыки / ЛС / клан')+'</div>');
}

const ERRORS = {
  not_enough_sp:'Недостаточно SP.', not_enough_gold:'Недостаточно Моры.', level_too_low:'Недостаточный уровень.',
  max_level:'Достигнут максимальный уровень.', stale_item:'Снаряжение изменилось. Список обновлён.',
  cooldown:'Бафф ещё восстанавливается.', not_enough_mp:'Недостаточно MP.', player_dead:'Сначала воскресните.',
  skill_cooldown:'Навык ЛС ещё восстанавливается.', not_equipped:'Предмет уже снят.', gold_level_locked:'Операция пока недоступна.',
};

export async function openCharacterPage(options,initialTab='stats') {
  const {api,renderState,haptic}=options;
  let data=await api('/api/character'), tab=initialTab, slot='rightHand',effectId=null,pending=false,closed=false;
  const overlay=document.createElement('section');
  overlay.className='game-overlay character-overlay';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Персонаж');
  overlay.innerHTML='<div class="overlay-backdrop"></div><div class="overlay-panel character-panel"><header class="character-title"><button class="overlay-close" type="button" aria-label="Закрыть">'+icon('chevron-left')+'</button><h2>Персонаж</h2><button type="button" data-character-refresh aria-label="Обновить">'+icon('rotate-cw')+'</button></header><div data-character-identity></div><nav class="character-tabs" role="tablist" aria-label="Разделы персонажа"></nav><div class="character-scroll" role="tabpanel" id="character-content" tabindex="0"></div><p class="character-feedback" role="status" aria-live="polite"></p></div>';
  const panel=overlay.querySelector('.character-scroll'), tabs=overlay.querySelector('.character-tabs'),feedback=overlay.querySelector('.character-feedback');
  const previousFocus=document.activeElement;
  function draw() {
    const scroll=panel.scrollTop;
    overlay.querySelector('[data-character-identity]').innerHTML='<div class="character-identity"><img class="character-portrait" src="'+esc(menuArtFor('profile',data.player))+'" alt=""><b class="character-level">'+fmt(data.player.level)+'</b><div class="character-name"><strong>'+esc(data.name)+'</strong><small>'+esc(data.player.classTitle)+'</small></div></div>';
    tabs.innerHTML=CHARACTER_TABS.map(([id,label])=>'<button type="button" role="tab" id="character-tab-'+id+'" aria-controls="character-content" aria-selected="'+(id===tab)+'" tabindex="'+(id===tab?0:-1)+'" data-character-tab="'+id+'">'+label+'</button>').join('');
    panel.setAttribute('aria-labelledby','character-tab-'+tab);
    panel.innerHTML=renderCharacterTab(data,tab,{slot,effectId});panel.scrollTop=scroll;
    overlay.querySelectorAll('button[data-character-action],button[data-character-slot],button[data-character-tab],button[data-character-refresh]').forEach(button=>{if(pending)button.disabled=true;});
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
      if(button.dataset.characterTab){selectTab(button.dataset.characterTab);return;}
      if(button.dataset.characterSlot){slot=button.dataset.characterSlot;draw();return;}
      if(button.dataset.effectId){effectId=button.dataset.effectId;draw();return;}
      if(button.dataset.baseStat) {
        const stat=data.characteristics.find(stat=>stat.id===button.dataset.baseStat);
        panel.querySelector('[data-base-detail]').innerHTML='<div class="character-detail"><h4>'+esc(stat.id+' · '+stat.name)+'</h4>'+esc(stat.text)+row('База',fmt(stat.base))+row('Бонус экипировки',fmt(stat.bonus))+(stat.effect?empty(stat.effect):'')+'</div>';
        return;
      }
      const name=button.dataset.characterAction;
      if(name==='unequip')return await mutate('/api/equipment/action',{key:button.dataset.key,action:'unequip'});
      if(name==='learn')return await mutate('/api/passives/learn',{id:button.dataset.passiveId});
      if(name==='ls-activate')return await mutate('/api/equipment/action',{key:button.dataset.key,action:'ls_activate'});
      if(name==='cast')return await mutate('/api/buffs/cast',{buffId:button.dataset.buffId});
      if(name==='tab-equipment'){selectTab('equipment');return;}
      if(name==='tab-skills'){selectTab('skills');return;}
      if(name==='appearance')return await child(openPlayerProfile);
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
    closed=true;clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);
    overlay.classList.add('closing');setTimeout(()=>{overlay.remove();previousFocus?.focus?.();},180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click',close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click',close);
  const onVisible=()=>{if(!document.hidden&&!pending)refresh().catch(error=>{feedback.textContent=error.message;});};
  const timer=setInterval(()=>{
    if(closed || document.hidden)return;
    const expired=(data.effects || []).some(effect=>effect.until && effect.until<=Date.now());
    if(expired&&!pending){data.effects=data.effects.filter(effect=>!effect.until || effect.until>Date.now());if(tab==='effects')draw();}
    panel.querySelectorAll('[data-effect-timer]').forEach(node=>{
      const effect=data.effects.find(effect=>effect.id===node.dataset.effectTimer);
      if(effect)node.textContent=countdown(effect);
    });
  },1000);
  document.addEventListener('visibilitychange',onVisible);
  document.body.appendChild(overlay);draw();requestAnimationFrame(()=>{overlay.classList.add('visible');overlay.querySelector('.overlay-close').focus();});
}

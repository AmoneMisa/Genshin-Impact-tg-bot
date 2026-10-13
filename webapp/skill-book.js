import {dialogHeading} from './dialog-heading.js';
import {escapeHtml as esc} from './escape-html.js';
import {l2SkillIcon} from './art/l2-extra-art.js';
import {materialIcon} from './material-icons.js';
import {itemGridHtml} from './item-grid.js';
const fmt=n=>new Intl.NumberFormat('ru-RU').format(n||0);
const groups={physical:'Физические навыки',magic:'Магические навыки',reinforce:'Усиливающие навыки',weaken:'Ослабляющие навыки',item:'Предметные навыки',toggle:'Переключаемые навыки',transform:'Трансформации',equipment:'Навыки экипировки',ability:'Особые способности',race:'Расовые навыки',occupation:'Профессиональные навыки',clan:'Клановые навыки',clanPassive:'Клановые и героические навыки',itemPassive:'Предметные способности',otherActive:'Другие активные навыки',otherPassive:'Другие пассивные навыки'};
const modes={normal:'Обычная',mastery:'Mastery',change:'Смена пути',untrain:'Отмена заточки'};
const actions={normal:'Заточить',mastery:'Безопасная заточка',change:'Сменить путь',untrain:'Снять уровень заточки'};
const reasons={enchant_class_required:'Нужны 76 уровень и третья профессия.',skill_not_maxed:'Сначала изучите последний уровень навыка.',not_enchantable:'Этот навык нельзя заточить.',not_enough_resources:'Недостаточно Адены, SP или книги.',player_dead:'Сначала воскресните.',other_route_chosen:'Для другого пути используйте смену пути.',same_route:'Выберите другой путь.',no_route:'Навык ещё не заточен.',max_level:'Максимальная заточка.'};
const art=s=>l2SkillIcon(s.id)||l2SkillIcon(s.name);
const tip=s=>[s.name+' · ур. '+s.level,s.description,s.mp?'MP '+fmt(s.mp):'',s.reuseMs?'Перезарядка '+s.reuseMs/1000+' сек.':''].filter(Boolean).join('\n');
export function skillBookHtml(state,tab='active'){
 const book=state.book||[];
 return (tab==='passive'?['equipment','ability','race','occupation','clanPassive','itemPassive','otherPassive']:tab==='learn'?Object.keys(groups):['physical','magic','reinforce','weaken','clan','item','toggle','transform','otherActive']).map(kind=>{
  const rows=book.filter(s=>(tab==='learn'?(!s.level||state.passives?.some(p=>Number(p.id)===s.id&&p.cost&&!p.automatic)):tab==='passive'?s.kind==='passive':s.kind!=='passive')&&(s.group||({passive:'occupation',summon:'magic'}[s.kind]||s.kind))===kind);if(!rows.length)return '';
  return '<details class="ui-disclosure skill-book-group" open data-skill-group="'+kind+'"><summary>'+groups[kind]+'</summary>'+itemGridHtml(rows.map(s=>`<button type="button" class="item-grid-cell ${!s.level?'unlearned':''}" data-skill-id="${s.id}" title="${esc(tip(s))}" aria-label="${esc(s.name)}">${art(s)}${s.level?'<em>'+s.level+'</em>':''}</button>`),{min:7,label:groups[kind]})+'</details>';
 }).join('')||'<p class="ui-empty">В этом разделе пока нет навыков.</p>';
}
export async function openSkillBook({api,renderState,haptic=()=>{},initialSkill=null}){
 let state=await api('/api/skills'),tab='active',busy=false,popup=null;
 const overlay=document.createElement('section');overlay.className='game-overlay skills-overlay';
 overlay.innerHTML='<div class="overlay-backdrop"></div><div class="overlay-panel glass skills-panel">'+dialogHeading('Навыки').replace('data-dismiss','class="overlay-close" data-dismiss')+'<nav class="ui-folder-tabs" data-book-tabs></nav><div data-book-content></div><p data-feedback role="status"></p></div>';
 document.body.append(overlay);requestAnimationFrame(()=>overlay.classList.add('visible'));
 const content=overlay.querySelector('[data-book-content]'),feedback=overlay.querySelector('[data-feedback]');
 const close=()=>{popup?.remove();overlay.remove();};
 overlay.querySelector('.overlay-close').onclick=close;overlay.querySelector('.overlay-backdrop').onclick=close;
 function makePopup(name,body){
  popup?.remove();popup=document.createElement('section');popup.className='game-overlay skill-detail-overlay';
  popup.innerHTML='<div class="overlay-backdrop"></div><div class="overlay-panel game-dialog-panel skill-detail">'+dialogHeading(name)+body+'</div>';
  document.body.append(popup);const opened=popup;requestAnimationFrame(()=>opened.classList.add('visible'));popup.querySelector('[data-dismiss]').onclick=()=>popup.remove();popup.querySelector('.overlay-backdrop').onclick=()=>popup.remove();return popup;
 }
 async function mutate(url,body){
  if(busy)return;busy=true;popup?.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{const next=await api(url,{method:'POST',body:JSON.stringify(body)});state=next.skills||await api('/api/skills');if(next.state)renderState?.(next.state);feedback.textContent=next.success===false?'Заточка не удалась. Уровень +'+next.level:'Готово'+(next.level!=null?' · +'+next.level:'');haptic('medium');}
  catch(e){if(e.payload?.skills)state=e.payload.skills;feedback.textContent=reasons[e.payload?.reason]||e.message;}
  finally{popup?.remove();busy=false;draw();}
 }
 function showSkill(id){
  const s=state.book.find(s=>s.id===id);if(!s)return;
  const root=makePopup(s.name,'<div class="skill-detail-icon">'+art(s)+'</div><p>'+esc(s.description)+'</p><p>Уровень '+s.level+(s.mp?' · '+fmt(s.mp)+' MP':'')+(s.reuseMs?' · '+s.reuseMs/1000+' сек.':'')+'</p>');
  const kit=state.skills?.find(k=>k.l2Id===s.id),passive=state.passives?.find(p=>Number(p.id)===s.id);
  if(passive?.automatic)root.querySelector('.skill-detail').insertAdjacentHTML('beforeend','<p>Навык изучается автоматически при достижении нужного уровня.</p>');
  else if(kit?.learn||passive?.cost){const cost=kit?.learn||passive.cost,enabled=kit?.learn?kit.learn.canLearn:passive.canLearn;root.querySelector('.skill-detail').insertAdjacentHTML('beforeend','<button class="ui-button primary" data-learn '+(enabled?'':'disabled')+'>Изучить · '+fmt(cost.sp)+' SP</button>');root.querySelector('[data-learn]').onclick=()=>mutate(kit?.learn?'/api/skills/learn':'/api/passives/learn',kit?.learn?{slot:kit.slot}:{id:passive.id});}
 }
 function showEnchant(id){
  const skill=state.enchantBook.find(s=>s.id===id);let route=skill.route||skill.routes[0].id,mode='normal';
  const root=makePopup('Заточка: '+skill.name,'<div data-enchant-detail></div>'),detail=root.querySelector('[data-enchant-detail]');
  function paint(){
   const selected=skill.routes.find(r=>r.id===Number(route)),offer=selected.offers[mode],cost=offer.cost;
   const warning={normal:'При неудаче заточка сбрасывается до +0.',mastery:'При неудаче уровень сохраняется. Расходы Адены и SP ×5.',change:'При смене пути теряется от 0 до 3 уровней заточки.',untrain:'Снимает один уровень и возвращает 80% SP этого уровня.'}[mode];
   const select=(key,list)=>'<label class="ui-field">'+(key==='route'?'Путь':'Способ')+'<select data-'+key+'>'+list+'</select></label>';
   detail.innerHTML='<div class="skill-detail-icon">'+art(skill)+'</div><p>Заточка +'+skill.level+' / '+selected.max+'</p>'+select('route',skill.routes.map(r=>'<option value="'+r.id+'" '+(r.id===Number(route)?'selected':'')+'>'+esc(r.name)+'</option>').join(''))+select('mode',Object.entries(modes).map(([id,name])=>'<option value="'+id+'" '+(id===mode?'selected':'')+'>'+name+'</option>').join(''))+'<p>'+warning+'</p>'+(offer.ok?'<p>Шанс '+Math.round(offer.chance*100)+'%</p><p>'+fmt(cost.gold)+' Адена · '+fmt(cost.sp)+' SP</p><div class="skill-book-cost">'+Object.entries(cost.items).map(([key,n])=>materialIcon(key)+' ×'+n).join(' ')+'</div><p>'+['power','mpConsume','reuseDelay','abnormalTime','elementPower'].filter(k=>offer.after?.[k]!==offer.before?.[k]).map(k=>({power:'Сила',mpConsume:'MP',reuseDelay:'Перезарядка',abnormalTime:'Время',elementPower:'Атрибут'}[k])+': '+offer.before?.[k]+' → '+offer.after?.[k]).join(' · ')+'</p>':'<p>'+esc(reasons[offer.reason]||offer.reason)+'</p>')+'<button class="ui-button primary" data-enchant '+(!offer.ok||!offer.affordable?'disabled':'')+'>'+modes[mode]+'</button>';
   detail.querySelector('[data-enchant]').textContent=actions[mode];
   detail.querySelector('[data-route]').onchange=e=>{route=Number(e.target.value);paint();};detail.querySelector('[data-mode]').onchange=e=>{mode=e.target.value;paint();};detail.querySelector('[data-enchant]').onclick=()=>mutate('/api/skills/enchant',{id:skill.id,route,mode});
  }paint();
 }
 function draw(){
  overlay.querySelector('[data-book-tabs]').innerHTML=[['active','Активные'],['passive','Пассивные'],['learn','Изучение'],['enchant','Заточка']].map(([id,name])=>'<button type="button" data-book-tab="'+id+'" aria-selected="'+(tab===id)+'">'+name+'</button>').join('');
  overlay.querySelectorAll('[data-book-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.bookTab;draw();});
  if(tab==='enchant'){
   content.innerHTML='<p>Адена '+fmt(state.inventory.gold)+' · SP '+fmt(state.inventory.sp)+'</p>'+itemGridHtml((state.enchantBook||[]).map(s=>'<button class="item-grid-cell" data-enchant-id="'+s.id+'" aria-label="'+esc(s.name)+'" title="'+esc(s.name)+'">'+art(s)+(s.level?'<em>+'+s.level+'</em>':'')+'</button>'),{min:24,label:'Заточка навыков'});
   content.querySelectorAll('[data-enchant-id]').forEach(b=>b.onclick=()=>showEnchant(Number(b.dataset.enchantId)));
  }else{content.innerHTML=skillBookHtml(state,tab);content.querySelectorAll('[data-skill-id]').forEach(b=>b.onclick=()=>showSkill(Number(b.dataset.skillId)));}
 }draw();if(initialSkill)showSkill(Number(initialSkill));return {close};
}

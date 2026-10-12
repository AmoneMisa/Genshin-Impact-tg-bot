import {escapeHtml as esc} from './escape-html.js';
import {dialogHeading} from './dialog-heading.js';
import {confirmDialog} from './confirm-dialog.js';
import {itemGridHtml} from './item-grid.js';
import {inventoryItemArt} from './inventory-layout.js';
import {materialIcon} from './material-icons.js';
import {enhanceSelects} from './design/select.js';
import {bar} from './resource-bar.js';

const number=value=>new Intl.NumberFormat('ru-RU').format(Number(value)||0);
const PAGE_SIZE=30;
const ERRORS={recipe_book_full:'Книга рецептов заполнена. Удали старый рецепт или повысь уровень кузни.',recipe_not_learned:'Сначала изучи рецепт.',not_enough_mp:'Не хватает MP.',not_enough_materials:'Не хватает материалов.',inventory_full:'Инвентарь заполнен.',not_enough_gold:'Не хватает адены.',craft_level_too_low:'Недостаточный навык ковки.',level_too_low:'Недостаточный уровень персонажа.',profession_too_low:'Недостаточная профессия.'};
export function craftProductArt(recipe){return recipe.productKey?materialIcon(recipe.productKey):recipe.unavailable?'':inventoryItemArt(recipe);}
export function recipeCell(recipe){return `<button type="button" class="item-grid-cell" data-craft-select="${esc(recipe.id)}" title="${esc(recipe.name)}" aria-label="${esc(recipe.name)}">${craftProductArt(recipe)}</button>`;}

export async function openCraftGame({api,renderState=()=>{},haptic=()=>{},statusElement,onClose,npc=false}){
 let equipment=await api('/api/equipment'),mode='book',grade='all',query='',page=0,pending=false,closed=false,dialog=null,selected=null,result='',ingredient=null;
 const overlay=document.createElement('section');overlay.className='game-overlay craft-overlay';
 overlay.innerHTML=`<div class="overlay-backdrop"></div><div class="overlay-panel game-dialog-panel l2-window craft-book-panel">${dialogHeading(npc?'Крафт кузнеца':'Книга рецептов').replace('data-dismiss','class="overlay-close" data-dismiss')}<div data-craft-book></div></div>`;
 const body=overlay.querySelector('[data-craft-book]');
 const craft=()=>npc?{...equipment.craft,recipes:equipment.npcCraft||[],recipeBook:equipment.npcCraft||[]}:(equipment.craft||{recipes:[],recipeBook:[]});
 function closeDialog(){dialog?.close();dialog?.remove();dialog=null;selected=null;result='';ingredient=null;}
 function close(){if(closed)return;closed=true;closeDialog();overlay.remove();if(!pending)onClose?.();}
 overlay.querySelector('.overlay-close').onclick=close;overlay.querySelector('.overlay-backdrop').onclick=close;
 function rows(){return (mode==='book'?craft().recipeBook:craft().recipes.filter(r=>!r.learned)).filter(r=>(grade==='all'||r.grade===grade)&&(!query||`${r.name} ${r.translatedName||''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())));}
 function renderBook(){
  if(closed)return;
  const c=craft(),all=rows(),pages=Math.max(1,Math.ceil(all.length/PAGE_SIZE));page=Math.min(page,pages-1);
  const grades=[...new Set((mode==='book'?c.recipeBook:c.recipes).map(r=>r.grade).filter(Boolean))];
  const cells=all.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(recipeCell);
  body.innerHTML=`<nav class="ui-folder-tabs" aria-label="Раздел книги"><button type="button" data-book-mode="book" class="${mode==='book'?'active':''}">Книга</button><button type="button" data-book-mode="learn" class="${mode==='learn'?'active':''}">Изучение</button></nav>
   <div class="craft-book-info"><span class="craft-capacity">${number(c.learnedCount)} / ${number(c.recipeCapacity)}</span><small>Навык ковки ${number(c.level)}</small></div>
   <div class="craft-book-filters"><input type="text" data-recipe-search aria-label="Поиск рецепта" placeholder="Поиск рецепта" value="${esc(query)}"><select data-recipe-grade aria-label="Грейд рецепта"><option value="all">Все грейды</option>${grades.map(g=>`<option value="${esc(g)}" ${grade===g?'selected':''}>${esc(g==='noGrade'?'NG':g)}</option>`).join('')}</select></div>
   ${itemGridHtml(cells,{className:'craft-recipe-grid',min:PAGE_SIZE,label:'Рецепты'})}
   ${!all.length?`<p class="craft-empty">${mode==='book'?'В книге пока нет рецептов.':'Нет подходящих рецептов.'}</p>`:''}
   ${pages>1?`<div class="craft-pagination"><button class="ui-button" data-page="-1" aria-label="Предыдущая страница" ${page===0?'disabled':''}>‹</button><span>${page+1} / ${pages}</span><button class="ui-button" data-page="1" aria-label="Следующая страница" ${page===pages-1?'disabled':''}>›</button></div>`:''}
   <small class="craft-book-hint">Кузница расширяет книгу до 70 рецептов.</small>`;
  body.querySelectorAll('[data-book-mode]').forEach(button=>button.onclick=()=>{if(pending)return;mode=button.dataset.bookMode;grade='all';page=0;renderBook();});
  body.querySelectorAll('[data-craft-select]').forEach(button=>button.onclick=()=>{if(pending)return;openRecipe(button.dataset.craftSelect);});
  body.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{if(pending)return;page+=Number(button.dataset.page);renderBook();});
  body.querySelector('[data-recipe-grade]').onchange=e=>{grade=e.target.value;page=0;renderBook();};
  body.querySelector('[data-recipe-search]').oninput=e=>{query=e.target.value;page=0;const cursor=e.target.selectionStart;renderBook();const field=body.querySelector('[data-recipe-search]');field.focus();if(cursor!==null)field.setSelectionRange?.(cursor,cursor);};
  if(npc){body.querySelector('nav').remove();body.querySelector('.craft-book-info').remove();body.querySelector('.craft-book-hint').textContent='Указанный рецепт должен быть в сумке и не расходуется. Крафт оплачивается аденой.';}
  enhanceSelects(body);body.querySelectorAll('button,input,select').forEach(el=>{if(pending)el.disabled=true;});
 }
 function findRecipe(id){return craft().recipeBook.find(r=>r.id===id)||craft().recipes.find(r=>r.id===id);}
 function openRecipe(id){
  const r=findRecipe(id);if(!r)return;
  closeDialog();selected=id;dialog=document.createElement('dialog');dialog.className='game-dialog-panel l2-window craft-create-dialog';overlay.append(dialog);
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});renderRecipe();dialog.showModal();
 }
 function renderRecipe(){
  const r=findRecipe(selected);if(!r||!dialog)return;
  const known=npc||r.learned;
  const c=craft(),materials=(r.materials||[]).filter(m=>m.need>0),costs=[];
  if(r.gold)costs.push(`${number(r.gold)} адены`);
  const rate=Math.round((Number(r.successRate)||0)*100),mpEnough=(c.mp||0)>=(r.mp||0);
  const canLearn=!r.unavailable&&r.levelOk&&r.craftLevelOk&&r.professionOk!==false&&c.learnedCount<c.recipeCapacity&&(r.bookCount>0||(equipment.resources?.gold||0)>=r.learnPrice);
  dialog.innerHTML=`${dialogHeading(known?'Создание предмета':'Изучение рецепта')}
   <div class="craft-product"><span class="item-preview-icon">${craftProductArt(r)}</span><div><strong>${esc(r.name)}</strong><dl>${npc?'':`<dt>MP</dt><dd>${number(r.mp)}</dd>`}<dt>Шанс</dt><dd>${rate}%</dd><dt>Результат</dt><dd>×${number(r.amount||1)}</dd></dl></div></div>
   <p class="craft-label">Материалы</p>${itemGridHtml(materials.map((m,i)=>`<button type="button" class="item-grid-cell ${m.have<m.need?'insufficient':''}" data-ingredient="${i}" title="${esc(m.name)}: ${number(m.have)} / ${number(m.need)}" aria-label="${esc(m.name)}: ${number(m.have)} / ${number(m.need)}">${materialIcon(m.key)}<em class="item-grid-count">${number(m.need)}</em></button>`),{className:'craft-ingredient-grid',min:12,label:'Материалы для крафта'})}
   <div class="craft-material-detail" aria-live="polite">${ingredient!==null&&materials[ingredient]?`${esc(materials[ingredient].name)} · ${number(materials[ingredient].have)} / ${number(materials[ingredient].need)}`:''}</div>
   ${npc?'':bar('mp',c.mp,c.maxMp)}${costs.length?`<p class="craft-price">${esc(costs.join(' · '))}</p>`:''}
   <div class="craft-result ui-result-log" aria-live="polite">${esc(result)}</div>
   ${!known?`<p class="craft-price">${r.bookCount>0?'Изучение по рецепту из инвентаря':`${number(r.learnPrice)} адены · изучение`}</p>`:''}
   <div class="craft-create-actions"><button class="ui-button primary" data-create ${pending||!(known?r.canCraft&&(npc||mpEnough):canLearn)?'disabled':''}>${pending?'Создание…':known?'Создать':'Изучить'}</button><button class="ui-button" data-craft-previous ${pending?'disabled':''}>Назад</button><button class="ui-button" data-craft-close>Закрыть</button></div>
   ${r.learned&&!npc?'<button class="ui-button craft-delete" data-recipe-forget>Удалить рецепт</button>':''}`;
  dialog.querySelector('[data-dismiss]').onclick=closeDialog;dialog.querySelector('[data-craft-close]').onclick=closeDialog;dialog.querySelector('[data-craft-previous]').onclick=closeDialog;
  dialog.querySelectorAll('[data-ingredient]').forEach(button=>button.onclick=()=>{ingredient=Number(button.dataset.ingredient);dialog.querySelector('.craft-material-detail').textContent=`${materials[ingredient].name} · ${number(materials[ingredient].have)} / ${number(materials[ingredient].need)}`;});
  dialog.querySelector('[data-create]').onclick=()=>mutate(known?'craft':'learn',r.id);
  const forget=dialog.querySelector('[data-recipe-forget]');if(forget)forget.onclick=async()=>{
   if(pending)return;
   if(await confirmDialog({owner:overlay,title:'Удалить рецепт',text:'Рецепт будет удалён из книги. Для повторного крафта его нужно изучить заново.',confirmLabel:'Удалить'}))await mutate('forget',r.id);
  };
 }
 async function mutate(action,id){
  if(pending||closed)return;pending=true;result='';renderBook();renderRecipe();haptic('light');
  try{
   const payload=await api(action==='craft'?(npc?'/api/equipment/npc-craft':'/api/equipment/craft'):'/api/equipment/recipe',{method:'POST',body:JSON.stringify(action==='craft'?{itemId:id}:{itemId:id,action})});
   if(payload.state)renderState(payload.state);if(closed)return;
   equipment=payload.equipment;
   result=action==='craft'?(payload.success?`Создано: ${payload.product?.name||payload.item?.name} ×${number(payload.product?.amount||1)}.`:'Создание не удалось. Материалы израсходованы.'):'Рецепт изучен.';
   if(statusElement)statusElement.textContent=result;
   if(action==='forget')closeDialog();haptic('light');
  }catch(error){if(closed)return;if(error.payload?.equipment)equipment=error.payload.equipment;result=ERRORS[error.payload?.reason]||error.message;}
  finally{pending=false;if(!closed){renderBook();renderRecipe();}else onClose?.();}
 }
 renderBook();document.body.append(overlay);requestAnimationFrame(()=>overlay.classList.add('visible'));
}

import { DYES, TATTOO_RULES, tattooStats, tattooPreview, applyTattoo, removeTattoo, buyDye } from './tattoo-model.js';
import { createForgeState, forgeCombatStats } from './economy-model.js';
import { createEconomyScreens } from './economy-ui.js';

const screens = [
  ['city','Город','Компактная шапка: герой, CP / HP / MP, четыре валюты и тонкие шкалы опыта и Vitality.'],
  ['cloaks','Плащи РБ','Полный комплект S80+ открывает слот. Плащи Закена, Фреи и Фринтеззы: дроп, распечатка и душевная версия.'],
  ['epics','Эпики · Blessed','Фрея, Белеф и остальные эпики. Сравнение обычной и Blessed версии, бутыль души соответствующего РБ.'],
  ['status','Состояние','Плотное окно характеристик. SP находится здесь; базовые параметры отделены от боевых.'],
  ['inventory','Инвентарь','Персонаж между слотами экипировки, фильтры предметов и сетка с грейдом, заточкой и количеством.'],
  ['item','Предмет','Информационная карточка: свойства, прибавки от заточки, комплект и особые эффекты.'],
  ['trade','Торговая лавка','Выбор из инвентаря → слоты продажи → цена за штуку → итог перед открытием лавки.'],
  ['tattoos','Тату и краски','Три символа, краски с обменом характеристик и точное сравнение до нанесения.'],
  ['weapon','Заточка оружия','Предмет и свиток, шанс, материалы, последствия неудачи и результат попытки.'],
  ['skills','Заточка навыков','Выбор навыка и пути, сравнение до / после, необходимые книги, SP и золото.'],
  ['sa','SA · Кристалл души','Особая способность оружия: цвет и ступень кристалла, установка и снятие, сохранение заточки.'],
  ['masterwork','Masterwork','Редкая заготовка Foundation превращается в Masterwork. Печать и особый бонус показаны отдельно.'],
  ['craft','Запечатанный крафт','Рецепт, материалы и исходы крафта: обычная запечатанная вещь, Foundation или неудача.'],
  ['unseal','Распечатка','Маммон: A/S за древнюю адену. Ишума: S80/S84 за Gemstone S и обычную адену.'],
  ['catacombs','Катакомбы','Походы за синими, зелёными и красными камнями печати. Общие запасы, энергия и HP.'],
  ['aa','Обмен на AA','Камни печати → древняя адена. Выбор количества, курс и итог перед обменом.'],
  ['shoulders','Плечи Династии','Специализация нагрудника через эссенцию I, улучшение эссенцией II и влияние на характеристики.'],
];
const $ = id => document.getElementById(id);
const fmt = value => new Intl.NumberFormat('ru-RU').format(value);
const esc = value => String(value).replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ui = name => `../art/ui/v1/${({'flask-conical':'potion-mp',castle:'palace','user-round':'spirit',dices:'dice-icon','shopping-cart':'shopping-basket'})[name]||name}-128.webp`;
const art = name => `../art/items/v1/catalog-s80-${name}-128.webp`;
const img = (url,cls='') => `<img src="${url}" class="${cls}" alt="" decoding="async">`;
const row = (label,value,cls='') => `<div class="stat-row"><span>${label}</span><b class="${cls}">${value}</b></div>`;
const section = title => `<div class="section-label"><span>${title}</span></div>`;
const button = (label,action,cls='',disabled=false) => `<button type="button" class="l2-button ${cls}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
const windowHtml = (title,body,meta='') => `<article class="window"><header class="window-title">${title}${meta?`<small>${meta}</small>`:''}<button type="button" data-action="close" aria-label="Закрыть окно">×</button></header><div class="window-body">${body}</div></article>`;
const items = [
  { name:'Меч Архангела', type:'weapon',url:art('weapon-onehandedsword'),grade:'S',enchant:6,pAtk:350,mAtk:256 },
  { name:'Посох Звёздного света',type:'weapon',url:ui('staff'),grade:'S',enchant:4 },
  { name:'Мантия Элегии',type:'armor',url:art('armor-robe-fullbody'),grade:'S80' },
  { name:'Шлем Элегии',type:'armor',url:art('armor-robe-helmet'),grade:'S80' },
  { name:'Перчатки Элегии',type:'armor',url:art('armor-robe-gloves'),grade:'S80' },
  { name:'Кольцо Элегии',type:'jewelry',url:art('jewelry-ring'),grade:'S80' },
  { name:'Свиток заточки',type:'other',url:'../art/icons/scroll-128.webp',count:24 },
  { name:'Благословенный свиток',type:'other',url:'../art/icons/scroll-blessed-128.webp',count:8 },
  { name:'Кристалл атрибута',type:'other',url:'../art/icons/attr-crystal-128.webp',count:12 },
  { name:'Книга гигантов',type:'other',url:ui('book-open'),count:3 },
  { name:'Зелье защиты',type:'other',url:ui('potion-shield'),count:30 },
  { name:'Кристаллы',type:'other',url:ui('crystal'),count:1650 },
];
function slot(item,index,selected=false,action='select-item') {
  if (!item) return '<div class="item-slot empty" aria-hidden="true"></div>';
  return `<button type="button" class="item-slot ${selected?'selected':''}" data-action="${action}" data-index="${index}" aria-label="${esc(item.name)}${item.enchant?' +'+item.enchant:''}" aria-pressed="${selected}">${img(item.url)}${item.enchant?`<b class="enchant">+${item.enchant}</b>`:''}${item.grade?`<b class="grade">${item.grade}</b>`:''}${item.count?`<b class="count">${fmt(item.count)}</b>`:''}</button>`;
}
let active = 'city', filter = 'all', chosen = 0, trade = [], prices = {}, shopOpen = false;
let dyeId = 'wit-men', tattooMode = 'apply', pendingRemoval = null;
let scroll = 'blessed', weaponLevel = 6, weaponResult = '', skillLevel = 2, route = 'power', skillResult = '', skillId = 0, skillTab = 'active';
let weaponDestroyed = false;
let skillLevels = [2,2];
const freshState = () => ({ ...createForgeState(),base:{STR:22,DEX:21,CON:27,INT:41,WIT:20,MEN:39},symbols:[],stock:Object.fromEntries(DYES.map(dye=>[dye.id,30])),sp:9200000,books:3,scrolls:{normal:24,blessed:8} });
let model = freshState();
function meter(label,current,max) { return `<div class="top-bar ${label.toLowerCase()}"><span>${label}</span><div class="top-bar-track"><i style="width:${current/max*100}%"></i><b>${fmt(current)} / ${fmt(max)}</b></div></div>`; }
function city() {
  const currencies = [['coin',33000,'Золото'],['crystal',1650,'Кристаллы'],['luck',0,'Монеты удачи'],['ore',165,'Руда']];
  return `<div class="city-demo"><header class="top-hud is-city-compact" aria-label="Состояние персонажа"><div class="th-frame"><div class="th-id"><button type="button" class="hero-portrait-shell top-portrait" data-action="status" aria-label="Персонаж"></button><div class="th-level">24</div><div class="th-name"><strong>White Amorality</strong><div class="th-sub"><small>Маг</small></div></div><div class="th-btns"><button type="button" class="top-icon" data-action="mail" aria-label="Почта">${img(ui('mail'))}</button><button type="button" class="top-icon" data-action="settings" aria-label="Настройки">${img(ui('settings'))}</button></div></div><div class="th-bars">${meter('CP',10589,10589)}${meter('HP',49773,49773)}${meter('MP',16211,16211)}</div><div class="top-resources">${currencies.map(([key,value,label])=>`<div class="top-res">${img(key==='luck'?'../art/world/v1/currency/luck-coin-128.webp':ui(key))}<strong title="${label}: ${fmt(value)}">${fmt(value)}</strong>${key==='ore'?'<i></i>':`<button class="resource-plus" type="button" data-action="currency" aria-label="Пополнить: ${label}">+</button>`}</div>`).join('')}</div><div class="th-foot"><div class="th-charges"><i class="on"></i><i class="on"></i><i class="on"></i></div><div class="th-thin"><div class="top-bar exp"><div class="top-bar-track"><i style="width:62%"></i></div></div><div class="top-bar vit"><div class="top-bar-track"><i style="width:90%"></i></div></div></div></div></div></header><div class="city-landscape"><h2>WhitesLove</h2><small>GAME</small><p>Больше, чем игра — наше королевство</p><div class="city-quest-demo">${img(ui('coin'))}<div><strong>Урожай готов</strong><small>Собери ресурсы золотой шахты</small></div></div></div><nav class="city-nav-demo" aria-label="Разделы">${[['city','castle','Город'],['status','user-round','Герой'],['weapon','swords-icon','Бой'],['skills','dices','Игры'],['inventory','users','Клан'],['trade','shopping-cart','Магазин']].map(([id,key,label])=>`<button type="button" class="${id==='city'?'active':''}" data-action="${id}">${img(ui(key))}<span>${label}</span></button>`).join('')}</nav></div>`;
}
function status() {
  const stats = tattooStats(model.base,model.symbols);
  const combat=forgeCombatStats(model,stats);
  const combatRows=[['pAtk','Физ. атака · P. Atk'],['mAtk','Маг. атака · M. Atk'],['pDef','Физ. защита · P. Def'],['mDef','Маг. защита · M. Def'],['attackSpeed','Скорость атаки'],['castingSpeed','Скорость магии'],['accuracy','Точность'],['evasion','Уклонение'],['physicalCrit','Физ. крит, %'],['magicalCrit','Маг. крит, %'],['moveSpeed','Скорость бега'],['mpRegen','Восстановление MP']];
  return windowHtml('Состояние персонажа',`<div class="item-head"><div class="item-slot" style="width:44px">${img('../art/classes/mage-male.webp')}</div><div><h3>White Amorality</h3><p>Маг · Уровень ${model.level}</p></div></div><div class="th-bars" style="margin:12px 0">${meter('CP',combat.maxCp,combat.maxCp)}${meter('HP',Math.min(model.hp,combat.maxHp),combat.maxHp)}${meter('MP',combat.maxMp,combat.maxMp)}</div>${row('Опыт','62,00 %')}${row('SP',fmt(model.sp))}${row('Vitality','×15 · 18 000')}${section('Боевые характеристики · раздельные значения')}<div class="combat-detail-grid">${combatRows.map(([key,label])=>`<div class="combat-detail"><span>${label}</span><strong data-combat-stat="${key}">${fmt(combat[key])}</strong></div>`).join('')}</div><p class="note">В примере учитываются надетые вещи кузницы, их заточка, SA, Masterwork, плечи и тату. Формулы и бонусы — адаптация для WhitesLove.</p>${forgeWindows.balance()}${section('Базовые параметры')}<div class="attributes">${Object.entries(stats).map(([key,value])=>`<div class="attribute"><small>${key}</small><b>${value}</b>${value!==model.base[key]?`<small class="positive">${model.base[key]} ${value>model.base[key]?'+':''}${value-model.base[key]}</small>`:''}</div>`).join('')}</div>${section('Нанесённые символы')}<div class="tattoo-slots">${[0,1,2].map(index=>{const dye=DYES.find(d=>d.id===model.symbols[index]);return `<div class="tattoo-slot"><span>${dye?dyeIcon(dye):""}</span><small>${dye?`${dye.plus} +4 / ${dye.minus} −4`:'Пустой слот'}</small></div>`;}).join('')}</div><div class="actions">${button('Инвентарь','inventory')}${button('Тату и краски','tattoos','primary')}</div>`);
}
function filters() { return `<div class="tabs" aria-label="Категории предметов">${[['all','Все'],['weapon','Оружие'],['armor','Броня'],['jewelry','Биж.'],['other','Прочее']].map(([id,label])=>`<button type="button" data-action="filter" data-value="${id}" class="${id===filter?'active':''}" aria-pressed="${id===filter}">${label}</button>`).join('')}</div>`; }
function itemCard(item=items[chosen]) {
  return `<div class="tooltip"><div class="item-head"><div class="item-slot">${img(item.url)}</div><div><h3><span class="gold">${item.enchant?'+'+item.enchant+' ':''}</span>${item.name}</h3><p>${item.type==='weapon'?'Оружие / Одноручное':item.type==='armor'?'Доспех / Магический':item.type==='jewelry'?'Бижутерия':'Расходуемый предмет'} ${item.grade?'· '+item.grade:''}</p></div></div>${item.type==='weapon'?`${row('Физ. атака','350 <span class="muted">(292</span> <span class="positive">+58</span><span class="muted">)</span>')}${row('Маг. атака','256 <span class="muted">(222</span> <span class="positive">+34</span><span class="muted">)</span>')}${row('Скорость атаки','Быстро')}${row('Заряд души','×1')}${row('Вес','1 520')}`:item.type==='armor'?`${row('Физ. защита','204')}${row('Вес','4 140')}`:item.type==='jewelry'?`${row('Маг. защита','92')}${row('Вес','150')}`:row('Количество',fmt(item.count||1))}${section(item.type==='weapon'?'〈Свойство кристалла души〉':item.type==='armor'?'〈Комплект Элегии〉':'〈Свойства〉')}<p class="note">${item.type==='weapon'?'Увеличивает скорость магии на 15%. Наносит дополнительный урон в PvP.':item.type==='armor'?'INT +2, WIT +2, MEN −2. Комплект: мантия, шлем, перчатки и сапоги.':item.type==='jewelry'?'Усиливает магическую защиту персонажа.':'Материал для улучшения. Хранится в инвентаре.'}</p>${item.type==='weapon'?`${section('〈Эффекты аугментации〉')}${row('Физ. защита','+25,97')}${row('Восстановление HP','+0,29')}<p class="note gold">Нельзя продать или выбросить.</p>`:''}</div>`;
}
function inventory() {
  const visible=items.map((item,index)=>({item,index})).filter(({item})=>filter==='all'||filter===item.type);
  return windowHtml('Инвентарь',`<div class="equipment-scene"><div class="equipment-column">${[3,4,2,5,0].map(index=>slot(items[index],index,false)).join('')}</div><div class="hero-stage">${img('../art/world/v1/heroes/mage-male-512.webp')}<span>WHITE AMORALITY</span></div><div class="equipment-column">${[5,5,1].map(index=>slot(items[index],index,false)).join('')}${slot(null)}${slot(null)}</div></div>${filters()}<div class="grid">${visible.map(({item,index})=>slot(item,index,index===chosen)).join('')}${Array.from({length:Math.max(0,24-visible.length)},()=>slot(null)).join('')}</div><div class="wallet"><span>Золото <strong>${fmt(model.gold)}</strong></span><span>Вес · 18,6 % <div class="weight"><i></i></div></span></div>${itemCard()}<div class="actions">${button('Подробнее','item')}${button('Заточить','weapon','primary')}</div>`, '24 / 120');
}
function item() { return windowHtml('Описание предмета',itemCard()+`<div class="actions">${button('В инвентарь','inventory')}${button('Заточка','weapon','primary',items[chosen].type!=='weapon')}</div>`); }
function tradeWindow() {
  const total=trade.reduce((sum,index)=>sum+(prices[index]||0),0);
  return windowHtml('Личная торговая лавка · Продажа',`${section('Выберите предметы из инвентаря')}<div class="grid">${items.slice(0,9).map((item,index)=>slot(item,index,trade.includes(index),'trade-add')).join('')}</div>${section(`Продажа · ${trade.length} / 4`)}<div class="trade-grid">${Array.from({length:4},(_,i)=>{const index=trade[i];return index===undefined?slot(null):`<div class="trade-slot">${slot(items[index],index,true,'trade-remove')}<label>Цена за 1 шт.<input type="number" min="1" max="999999999" data-price="${index}" value="${prices[index]||10000}" aria-label="Цена: ${items[index].name}" ${shopOpen?'disabled':''}></label></div>`;}).join('')}</div><p class="note">Выбрана 1 штука каждого предмета. Нажмите слот продажи, чтобы убрать предмет.</p><div class="select-row"><label for="sale-message">Сообщение лавки</label><input id="sale-message" maxlength="40" placeholder="Снаряжение для мага" ${shopOpen?'disabled':''}></div><div class="inset">${row('Вы получите',`<span id="sale-total">${fmt(total)}</span> золота`)}${row('Баланс',fmt(model.gold))}</div>${shopOpen?'<div class="sale-result">Лавка открыта в макете. Предметы выставлены; продажи здесь не происходят.</div>':''}<div class="actions">${button('Закрыть лавку','trade-stop','',!shopOpen)}${button('Открыть лавку','trade-start','primary',shopOpen||!trade.length||trade.some(i=>!prices[i]))}</div>`);
}
function dyeIcon(dye) { return `<span class="dye-icon" style="--dye-color:${dye.color}">${img(ui("flask-conical"))}</span>`; }
function tattoos() {
  const dye=DYES.find(d=>d.id===dyeId), preview=tattooPreview(model,dyeId);
  const existing=tattooStats(model.base,model.symbols);
  const after=pendingRemoval!==null?tattooStats(model.base,model.symbols.filter((_,index)=>index!==pendingRemoval)):preview.after;
  return windowHtml('Мастер символов',`<div class="tabs"><button type="button" data-action="tattoo-tab" data-value="apply" class="${tattooMode==='apply'?'active':''}">Нанести символ</button><button type="button" data-action="tattoo-tab" data-value="remove" class="${tattooMode==='remove'?'active':''}">Снять символ</button></div><div class="tattoo-slots">${[0,1,2].map(index=>{const d=DYES.find(d=>d.id===model.symbols[index]);return `<div class="tattoo-slot"><span>${d?dyeIcon(d):""}</span><small>${d?`${d.plus} +4 / ${d.minus} −4`:'Свободный слот'}</small>${d&&tattooMode==='remove'?`<button type="button" data-action="remove-select" data-index="${index}">${pendingRemoval===index?'Выбран':'Выбрать'}</button>`:''}</div>`;}).join('')}</div>${tattooMode==='apply'?`${section('Краски в инвентаре')}<div>${DYES.map(d=>`<button type="button" class="dye-row ${d.id===dyeId?'selected':''}" data-action="dye" data-value="${d.id}" aria-pressed="${d.id===dyeId}">${dyeIcon(d)}<span class="dye-copy"><b>${d.name}</b><small><span class="positive">${d.plus} +4</span> / <span class="negative">${d.minus} −4</span></small></span><span class="dye-stock">${model.stock[d.id]} / 10</span></button>`).join('')}</div>`:'<p class="note">Выберите нанесённый символ. Снятие возвращает 5 красок того же типа.</p>'}${section('Характеристики · до → после')}<div class="two-col">${Object.entries(existing).map(([key,value])=>`<div class="preview-stat"><span>${key}</span><strong>${value}<em>→</em><span class="${after[key]>value?'positive':after[key]<value?'negative':''}">${tattooMode==='remove'&&pendingRemoval===null?value:after[key]}</span></strong></div>`).join('')}</div><p class="note">Бонус от тату — до +5 на характеристику. Штрафы складываются полностью; минимальное значение — 1.</p><div class="inset">${row(tattooMode==='apply'?'Нанесение':'Снятие',`${fmt(tattooMode==='apply'?TATTOO_RULES.applyFee:TATTOO_RULES.removeFee)} золота`)}${row('Баланс',fmt(model.gold))}${row('Краска у Маммона',`${fmt(TATTOO_RULES.dyePriceAa)} AA · есть ${fmt(model.aa)}`)}${tattooMode==='apply'?row('Будет потрачено',`10 красок · ${dye.plus} +4 / ${dye.minus} −4`):row('Будет возвращено','5 красок')}</div>${tattooMode==='apply'&&preview.reason?`<p class="note negative">${preview.reason}</p>`:''}<div class="actions">${button('Состояние','status')}${tattooMode==='apply'?button('Купить 10 красок','dye-buy','',(model.aa||0)<TATTOO_RULES.dyePriceAa*10)+button('Нанести символ','tattoo-apply','primary',!preview.allowed):button('Подтвердить снятие','tattoo-remove','primary',pendingRemoval===null||model.gold<TATTOO_RULES.removeFee)}</div>`);
}
function materials(entries) { return `<div class="materials">${entries.map(([url,label,value])=>`<div class="material">${img(url)}<div>${label}<br><span class="gold">${value}</span></div></div>`).join('')}</div>`; }
function weapon() {
  const safe=weaponLevel<3, chance=safe?100:66, count=model.scrolls[scroll];
  return windowHtml('Зачаровать предмет',`<div class="item-head"><div class="item-slot">${img(items[0].url)}</div><div><h3><span class="gold">+${weaponLevel}</span> Меч Архангела</h3><p>Одноручный меч · S · Надет</p></div></div><div class="select-row"><label for="scroll-type">Свиток</label><select id="scroll-type" data-select="scroll"><option value="normal" ${scroll==='normal'?'selected':''}>Обычный · ${model.scrolls.normal} шт.</option><option value="blessed" ${scroll==='blessed'?'selected':''}>Благословенный · ${model.scrolls.blessed} шт.</option></select></div><div class="enchant-stage"><div class="item-slot">${img(items[0].url)}<b class="enchant">+${weaponLevel}</b></div><span class="stage-arrow">+</span><div class="item-slot">${img(scroll==='blessed'?'../art/icons/scroll-blessed-128.webp':'../art/icons/scroll-128.webp')}</div></div><div class="chance"><div><i style="width:${chance}%"></i></div><p><span>Шанс успеха · демонстрационный</span><b>${chance} %</b></p></div>${section('После успешной заточки')}<div class="inset">${row('Заточка',`+${weaponLevel} → <span class="positive">+${weaponLevel+1}</span>`)}${row('Физ. атака',`${292+weaponLevel*9} → <span class="positive">${292+(weaponLevel+1)*9}</span>`)}${row('Маг. атака',`${222+weaponLevel*5} → <span class="positive">${222+(weaponLevel+1)*5}</span>`)}</div>${section('Требуется для улучшения')}${materials([[scroll==='blessed'?'../art/icons/scroll-blessed-128.webp':'../art/icons/scroll-128.webp','Свиток',`${count} / 1`],[ui('coin'),'Золото',`${fmt(model.gold)} / 30 000`]])}<p class="note ${safe?'positive':'negative'}">${safe?'Безопасная заточка: до +3 включительно.':scroll==='blessed'?'Неудача: оружие останется, заточка сбросится до +0. Свиток и золото будут потрачены.':'Неудача: оружие будет разрушено. Свиток и золото будут потрачены.'}</p>${weaponResult}<div class="actions">${button('Успех · пример','weapon-success','primary',!count||model.gold<30000)}${button('Неудача · пример','weapon-fail','',safe||!count||model.gold<30000)}</div><p class="note">Кнопки показывают оба исхода. Реальные шансы и стоимость определяет игровая система.</p>`);
}
const skillDefs=[{name:'Великое лечение',icon:'heart',power:2192,amount:110,unit:'HP'}, {name:'Магический удар',icon:'staff',power:1780,amount:90,unit:'урона'}];
function skills() {
  const sk=skillDefs[skillId], resource='стоимость MP', before=route==='power'?`${sk.power+skillLevel*sk.amount} ${sk.unit}`:route==='cost'?`${100-skillLevel*2} MP`:`${9+skillLevel*.3} сек.`, after=route==='power'?`${sk.power+(skillLevel+1)*sk.amount} ${sk.unit}`:route==='cost'?`${100-(skillLevel+1)*2} MP`:`${(9+(skillLevel+1)*.3).toFixed(1)} сек.`;
  const ready=model.books>0&&model.sp>=250000&&model.gold>=100000;
  return windowHtml('Улучшение умения',`<div class="tabs"><button type="button" data-action="skill-tab" data-value="active" class="${skillTab==='active'?'active':''}">Активные</button><button type="button" data-action="skill-tab" data-value="passive" class="${skillTab==='passive'?'active':''}">Пассивные</button></div>${skillTab==='passive'?'<div class="inset"><p class="note">Пассивные умения этого персонажа пока недоступны для заточки.</p></div>':`${skillDefs.map((s,index)=>`<button type="button" class="skill-entry ${skillId===index?'selected':''}" data-action="skill" data-index="${index}">${img(ui(s.icon))}<span><b>${s.name} <span class="gold">+${skillId===index?skillLevel:0}</span></b><small>Активное умение · Ур. 33</small></span></button>`).join('')}${section('Путь улучшения')}<div class="route-grid">${[['power','element-fire','Мощность'],['cost','coin','Стоимость'],['time','hourglass','Время']].map(([id,glyph,label])=>`<button type="button" data-action="route" data-value="${id}" class="${route===id?'active':''}" aria-pressed="${route===id}"><span>${img(ui(glyph))}</span>${label}</button>`).join('')}</div><p class="note">В макете пути можно свободно сравнивать. В игре смена выбранного пути — отдельное действие с ценой и подтверждением.</p><div class="two-col"><div class="inset"><div class="section-label">До улучшения</div>${img(ui(sk.icon),'skill-art')}<p class="gold">+${skillLevel} ${route==='power'?'Мощность':route==='cost'?'Стоимость':'Время'}</p><small class="muted">${route==='power'?'Сила умения':route==='cost'?resource:'Длительность'}</small><p>${before}</p></div><div class="inset"><div class="section-label">После улучшения</div>${img(ui(sk.icon),'skill-art')}<p class="gold">+${skillLevel+1} ${route==='power'?'Мощность':route==='cost'?'Стоимость':'Время'}</p><small class="muted">${route==='power'?'Сила умения':route==='cost'?resource:'Длительность'}</small><p class="positive">${after}</p></div></div>${section('Требуется для улучшения')}${materials([[ui('book-open'),'Книга гигантов',`${model.books} / 1`]])}<div class="inset" style="margin-top:8px">${row('SP',`${fmt(model.sp)} / 250 000`)}${row('Золото',`${fmt(model.gold)} / 100 000`)}</div><p class="note">Баланс и стоимость здесь демонстрационные. Результат примера — успешное улучшение.</p>${skillResult}<div class="actions">${button('Улучшить · пример','skill-upgrade','primary',!ready)}</div>`}`);
}
const forgeWindows=createEconomyScreens({getState:()=>model,windowHtml,row,section,button,img,ui,fmt,esc,toast});
const renderers={city,status,inventory,item,trade:tradeWindow,tattoos,weapon,skills,...forgeWindows.renderers};
function render(focusAction=null) {
  const screen=screens.find(s=>s[0]===active);
  $('screen-title').textContent=screen[1]; $('screen-description').textContent=screen[2];
  $('lab-nav').innerHTML=screens.map(([id,label],index)=>`<a href="#${id}" class="${id===active?'active':''}" ${id===active?'aria-current="page"':''}><small>${String(index+1).padStart(2,'0')}</small>${label}</a>`).join('');
  $('screen').innerHTML=renderers[active]();
  const illustration={sa:'../art/icons/crystal-128.webp',masterwork:'../art/icons/gem-128.webp',craft:'../art/icons/binder-128.webp',unseal:'../art/icons/scroll-128.webp',catacombs:'../art/hunt/zones/catacombs-480.webp',aa:'../art/icons/crystal-128.webp',shoulders:'../art/icons/leather-128.webp',cloaks:'../art/icons/fiber-128.webp',epics:'../art/icons/gem-128.webp',tattoos:'../art/icons/attr-stone-128.webp',skills:ui('book-open'),weapon:'../art/icons/scroll-blessed-128.webp'}[active];
  if(illustration)$('screen').querySelector('.window-body')?.insertAdjacentHTML('afterbegin','<img class="mechanic-illustration" src="'+illustration+'" alt="" style="display:block;width:'+(active==='catacombs'?'100%':'48px')+';height:'+(active==='catacombs'?'140px':'48px')+';object-fit:'+(active==='catacombs'?'cover':'contain')+';margin:0 0 10px;border-radius:4px">');
  if(active==='inventory')$('screen').querySelector('.window-body').insertAdjacentHTML('beforeend',forgeWindows.inventorySection());
  $('screen').querySelectorAll('.skill-art').forEach(node=>{node.style.width='36px';node.style.height='36px';node.style.objectFit='contain';});
  if(focusAction) $('screen').querySelector(`[data-action="${focusAction}"]:not(:disabled)`)?.focus({preventScroll:true});
}
function navigate(id) { if(renderers[id]) location.hash=id; }
let toastTimer;
function toast(text) { $('toast').textContent=text; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500); }
$('screen').addEventListener('click',event=>{
  const node=event.target.closest('[data-action]'); if(!node||node.disabled)return;
  const action=node.dataset.action,index=Number(node.dataset.index),value=node.dataset.value;
  if(renderers[action]) { navigate(action); return; }
  if(action==='close') { navigate('city'); return; }
  if(forgeWindows.handle(action,node)){render(action);return;}
  if(['mail','settings','currency'].includes(action)) { toast('Переход в соответствующее игровое окно. Здесь показан дизайн шапки.');return; }
  if(action==='filter')filter=value;
  if(action==='select-item'){chosen=index;render();return;}
  if(action==='trade-add') {
    if(shopOpen){toast('Сначала закройте лавку.');return;}
    if(trade.includes(index)){trade=trade.filter(i=>i!==index);}else if(trade.length<4){trade.push(index);prices[index]=10000;}else{toast('Все четыре слота продажи заняты.');return;}
  }
  if(action==='trade-remove'&&!shopOpen) trade=trade.filter(i=>i!==index);
  if(action==='trade-start') { if(!trade.length||trade.some(i=>!prices[i]))return;shopOpen=true;toast('Лавка открыта в демонстрационном режиме.'); }
  if(action==='trade-stop')shopOpen=false;
  if(action==='dye')dyeId=value;
  if(action==='tattoo-tab'){tattooMode=value;pendingRemoval=null;}
  if(action==='remove-select')pendingRemoval=index;
  if(action==='dye-buy'){const result=buyDye(model,dyeId,10);toast(result.ok?'Куплено 10 красок за 1 740 000 AA.':result.reason);}
  if(action==='tattoo-apply'){const result=applyTattoo(model,dyeId);toast(result.ok?'Символ нанесён. Потрачено 10 красок и 628 000 золота.':result.reason);}
  if(action==='tattoo-remove'){const result=removeTattoo(model,pendingRemoval);pendingRemoval=null;toast(result.ok?'Символ снят. Возвращено 5 красок.':result.reason);}
  if(action==='weapon-success'||action==='weapon-fail') {
    if(weaponDestroyed){toast('Оружие разрушено. Сбросьте пример, чтобы повторить.');return;}
    if(!model.scrolls[scroll]||model.gold<30000)return;
    model.scrolls[scroll]--;model.gold-=30000;
    if(action==='weapon-success'){weaponLevel++;weaponResult=`<div class="result">Предмет успешно зачарован!<br><strong>Меч Архангела +${weaponLevel}</strong></div>`;}
    else { weaponLevel=0;weaponResult=`<div class="result fail">${scroll==='blessed'?'Неудача. Оружие сохранено, заточка +0.':'Неудача. Оружие разрушено в примере.'}</div>`;weaponDestroyed=scroll==='normal'; }
  }
  if(action==='route'){route=value;skillResult='';}
  if(action==='skill'){skillId=index;skillLevel=skillLevels[index];skillResult='';}
  if(action==='skill-tab')skillTab=value;
  if(action==='skill-upgrade'&&model.books>0&&model.sp>=250000&&model.gold>=100000){model.books--;model.sp-=250000;model.gold-=100000;skillLevel++;skillLevels[skillId]=skillLevel;skillResult=`<div class="result">Умение улучшено до +${skillLevel}.</div>`;}
  render(action);
});
$('screen').addEventListener('change',event=>{if(event.target.dataset.select==='scroll'){scroll=event.target.value;if(!weaponDestroyed)weaponResult='';render();}});
$('screen').addEventListener('input',event=>{
  const node=event.target;if(forgeWindows.input(node))return;if(node.dataset.price===undefined)return;
  const amount=Number(node.value);prices[Number(node.dataset.price)]=Number.isInteger(amount)&&amount>0&&amount<=999999999?amount:0;
  $('sale-total').textContent=fmt(trade.reduce((sum,index)=>sum+(prices[index]||0),0));
  $('screen').querySelector('[data-action="trade-start"]').disabled=shopOpen||!trade.length||trade.some(i=>!prices[i]);
});
$('reset').addEventListener('click',()=>{model=freshState();forgeWindows.reset();trade=[];prices={};shopOpen=false;weaponLevel=6;weaponResult='';weaponDestroyed=false;scroll='blessed';skillLevels=[2,2];skillLevel=2;skillResult='';pendingRemoval=null;render();toast('Демонстрационные данные сброшены.');});
window.addEventListener('hashchange',()=>{active=renderers[location.hash.slice(1)]?location.hash.slice(1):'city';render();});
active=renderers[location.hash.slice(1)]?location.hash.slice(1):'city';render();

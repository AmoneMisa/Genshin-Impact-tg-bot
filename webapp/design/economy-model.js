// Design-only adaptation. Prices, rates, bonuses and drops are illustrative.
export const SEAL_STONES = Object.freeze({blue:{name:'Синий камень печати',rate:3,color:'#79b4e2'},green:{name:'Зелёный камень печати',rate:5,color:'#9cba73'},red:{name:'Красный камень печати',rate:10,color:'#d3897b'}});
// Real High Five prices (L2J Mobius CT 2.6 multisell, Blacksmith / Merchant of Mammon). AA = Ancient Adena.
// Unsealing: 'Sealed X' + AA at the Blacksmith of Mammon (A grade is plain adena at any blacksmith).
export const UNSEAL_COSTS = Object.freeze({
  darkGloves:{gold:87000},
  arcanaGloves:{aa:268500},arcanaRing:{aa:488000},
  dynasty:{aa:1372000},dynastyHelmet:{aa:686000},dynastyGloves:{aa:457000},dynastyBoots:{aa:457000},
  elegia:{aa:12553000},elegiaHelmet:{aa:6276000},elegiaGloves:{aa:4184000},elegiaBoots:{aa:4184000},
});
// Masterwork: Foundation + Mammon's Varnish Enhancer(s); no AA. The Enhancer costs 100 000 adena at the Merchant of Mammon.
// Elegia has no retail Foundation, its count is extrapolated from Dynasty 7 -> Icarus/Vesper weapons 14-16.
export const VARNISH_PRICE_GOLD = 100000;
export const VARNISH_COUNTS = Object.freeze({darkGloves:2,arcanaGloves:4,arcanaRing:3,dynasty:7,dynastyHelmet:7,dynastyGloves:7,dynastyBoots:7,elegia:8,elegiaHelmet:8,elegiaGloves:8,elegiaBoots:8,arcana:7});
export const FORGE_CATALOG = Object.freeze({
  arcana:{name:'Посох Тайн · Arcana Mace',grade:'S',type:'weapon',slot:'weapon',art:'weapon-mace',stats:{pAtk:225,mAtk:175},masterwork:{mAtk:12},stage:13,sa:['acumen','mana','regen']},
  darkGloves:{name:'Перчатки Тёмного Кристалла',grade:'A',type:'armor',slot:'gloves',art:'armor-robe-gloves',stats:{pDef:48},masterwork:{castingSpeed:10}},
  arcanaGloves:{name:'Перчатки Аркана',grade:'S',type:'armor',slot:'gloves',art:'armor-robe-gloves',stats:{pDef:55},masterwork:{mAtk:12}},
  dynasty:{name:'Мантия Династии',grade:'S80',type:'armor',slot:'body',art:'armor-robe-fullbody',set:'dynasty',stats:{pDef:110},masterwork:{mAtk:18}},
  dynastyGloves:{name:'Перчатки Династии',grade:'S80',type:'armor',slot:'gloves',art:'armor-robe-gloves',set:'dynasty',stats:{pDef:62},masterwork:{castingSpeed:18}},
  dynastyHelmet:{name:'Шлем Династии',grade:'S80',type:'armor',slot:'helmet',art:'armor-robe-helmet',set:'dynasty',stats:{pDef:54},masterwork:{mDef:10}},
  dynastyBoots:{name:'Сапоги Династии',grade:'S80',type:'armor',slot:'boots',art:'armor-robe-boots',set:'dynasty',stats:{pDef:62},masterwork:{mDef:12}},
  elegiaBoots:{name:'Сапоги Элегии',grade:'S84',type:'armor',slot:'boots',art:'armor-robe-boots',set:'elegia',stats:{pDef:85},masterwork:{mDef:20}},
  elegia:{name:'Мантия Элегии',grade:'S84',type:'armor',slot:'body',art:'armor-robe-fullbody',set:'elegia',stats:{pDef:150},masterwork:{mAtk:24}},
  elegiaGloves:{name:'Перчатки Элегии',grade:'S84',type:'armor',slot:'gloves',art:'armor-robe-gloves',set:'elegia',stats:{pDef:85},masterwork:{castingSpeed:24}},
  elegiaHelmet:{name:'Шлем Элегии',grade:'S84',type:'armor',slot:'helmet',art:'armor-robe-helmet',set:'elegia',stats:{pDef:72},masterwork:{mDef:16}},
  cloakZaken:{name:'Плащ Закена',grade:'S80',type:'cloak',slot:'cloak',artPath:'../art/items/v1/cloak-dusk-128.webp',boss:'Закен · сложный режим',call:'Призыв Закена',stats:{pDef:20},bonus:{darkResist:15}},
  cloakFreya:{name:'Плащ Фреи',grade:'S84',type:'cloak',slot:'cloak',artPath:'../art/items/v1/cloak-starfield-128.webp',boss:'Фрея · обычный / экстремальный режим',call:'Призыв Фреи',stats:{pDef:30},bonus:{waterResist:15}},
  cloakFrintezza:{name:'Плащ Фринтеззы',grade:'S80',type:'cloak',slot:'cloak',artPath:'../art/items/v1/cloak-128.webp',boss:'Алый Ван Халиша',call:'Призыв Фринтеззы',stats:{pDef:20},bonus:{fireResist:15}},
  freya:{name:'Ожерелье Фреи',grade:'S84',type:'jewelry',slot:'necklace',artPath:'../art/items/v1/epic-valakas-128.webp',epic:true,boss:'Фрея',stats:{mDef:114},bonus:{maxMp:50,mpRegen:.23,healPower:10,waterResist:10},blessed:{stats:{mDef:132},bonus:{maxMp:50,mpRegen:.46,healPower:15,waterResist:15}}},
  beleth:{name:'Кольцо Белефа',grade:'S80',type:'jewelry',slot:'ring',artPath:'../art/items/v1/epic-core-128.webp',epic:true,boss:'Белеф',stats:{mDef:48},bonus:{maxHp:105,maxMp:38,mentalResist:10},blessed:{stats:{mDef:64},bonus:{maxHp:160,maxMp:50,mentalResist:15}}},
  zaken:{name:'Серьга Закена',grade:'S',type:'jewelry',slot:'earring',artPath:'../art/items/v1/epic-zaken-128.webp',epic:true,boss:'Закен',stats:{mDef:60},bonus:{maxMp:31,healPower:10},blessed:{grade:'S84',stats:{mDef:71},bonus:{maxMp:37,healPower:15,darkResist:15}}},
  queenAnt:{name:'Кольцо Королевы Муравьёв',grade:'B',type:'jewelry',slot:'ring',artPath:'../art/items/v1/epic-queenAnt-128.webp',epic:true,boss:'Королева Муравьёв',stats:{mDef:48},bonus:{physicalCrit:4},blessed:{stats:{mDef:64},bonus:{physicalCrit:6}}},
  core:{name:'Кольцо Ядра',grade:'B',type:'jewelry',slot:'ring',artPath:'../art/items/v1/epic-core-128.webp',epic:true,boss:'Ядро',stats:{mDef:48},bonus:{evasion:2},blessed:{stats:{mDef:64},bonus:{evasion:3}}},
  orfen:{name:'Серьга Орфен',grade:'B',type:'jewelry',slot:'earring',artPath:'../art/items/v1/epic-orfen-128.webp',epic:true,boss:'Орфен',stats:{mDef:60},bonus:{healPower:6},blessed:{stats:{mDef:78},bonus:{healPower:10}}},
  baium:{name:'Кольцо Баюма',grade:'S',type:'jewelry',slot:'ring',artPath:'../art/items/v1/epic-baium-128.webp',epic:true,boss:'Баюм',stats:{mDef:48},bonus:{attackSpeedMul:.04,castingSpeedMul:.04},blessed:{stats:{mDef:66},bonus:{attackSpeedMul:.06,castingSpeedMul:.06}}},
  antharas:{name:'Серьга Антараса',grade:'S84',type:'jewelry',slot:'earring',artPath:'../art/items/v1/epic-antharas-128.webp',epic:true,boss:'Антарас',stats:{mDef:94},bonus:{maxMp:37,healPower:10},blessed:{stats:{mDef:112},bonus:{maxMp:50,healPower:15}}},
  valakas:{name:'Ожерелье Валакаса',grade:'S84',type:'jewelry',slot:'necklace',artPath:'../art/items/v1/epic-valakas-128.webp',epic:true,boss:'Валакас',stats:{mDef:125},bonus:{maxHp:445,mAtkMul:.08},blessed:{stats:{mDef:145},bonus:{maxHp:600,mAtkMul:.12}}},
  frintezza:{name:'Ожерелье Фринтеззы',grade:'A',type:'jewelry',slot:'necklace',artPath:'../art/items/v1/epic-frintezza-128.webp',epic:true,boss:'Фринтезза',stats:{mDef:95},bonus:{mentalResist:10},blessed:{stats:{mDef:120},bonus:{mentalResist:15}}},
  arcanaRing:{name:'Кольцо Аркана',grade:'S',type:'jewelry',slot:'ring',art:'jewelry-ring',stats:{mDef:48},masterwork:{mDef:8}},
});
export const FORGE_RECIPES = Object.freeze([
  {id:'darkGloves',gold:60000,materials:{parts:12,alloy:8},rate:60,foundationRate:5},
  {id:'arcanaGloves',gold:90000,materials:{parts:18,alloy:12},rate:60,foundationRate:5},
  {id:'dynasty',gold:180000,materials:{parts:30,alloy:24,gemS:4},rate:60,foundationRate:5},
  {id:'dynastyGloves',gold:140000,materials:{parts:24,alloy:18,gemS:3},rate:60,foundationRate:5},
  {id:'elegiaBoots',gold:280000,materials:{parts:40,alloy:30,gemS:8},rate:60,foundationRate:5},
  {id:'elegia',gold:360000,materials:{parts:40,alloy:30,gemS:4},rate:60,foundationRate:5},
  {id:'elegiaGloves',gold:280000,materials:{parts:30,alloy:24,gemS:4},rate:60,foundationRate:5},
  {id:'elegiaHelmet',gold:300000,materials:{parts:30,alloy:24,gemS:4},rate:60,foundationRate:5},
  {id:'arcanaRing',gold:75000,materials:{parts:15,alloy:10},rate:100,foundationRate:5},
]);
export const MATERIAL_NAMES = Object.freeze({parts:'Ключевые части',alloy:'Сплав',gemS:'Gemstone S',varnish:'Лак Маммона',essence1:'Эссенция Династии I',essence2:'Эссенция Династии II',...Object.fromEntries(['freya','beleth','zaken','queenAnt','core','orfen','baium','antharas','valakas','frintezza'].map(id=>[`soul_${id}`,`Бутыль души · ${FORGE_CATALOG[id].boss}`]))});
export const ARMOR_SETS = Object.freeze({dynasty:{name:'Династия',grade:'S80',slots:['body','helmet','gloves','boots']},elegia:{name:'Элегия',grade:'S84',slots:['body','helmet','gloves','boots']}});
export const SA_OPTIONS = Object.freeze({
  acumen:{name:'Acumen · Проницательность',color:'red',effect:'Скорость магии +15%',bonus:{castingSpeedMul:.15}},
  mana:{name:'Mana Up · Мана',color:'blue',effect:'Максимум MP +30%',bonus:{maxMpMul:.30}},
  regen:{name:'MP Regeneration · Восстановление',color:'green',effect:'Восстановление MP +1',bonus:{mpRegen:1}},
});
export const DYNASTY_PROFILES = Object.freeze({
  enchanter:{name:'Чародей',family:'mage',bonus:{mAtkMul:.08,castingSpeedMul:.05},text:'М. атака +8%, скорость магии +5%'},
  healer:{name:'Целитель',family:'priest',bonus:{maxMpMul:.08,healPowerMul:.05},text:'MP +8%, сила лечения +5%'},
});
export const CATACOMBS = Object.freeze([
  {id:'apostate',name:'Катакомбы Отступников',level:50,blue:180,green:90,red:30,energy:1,damage:80},
  {id:'witch',name:'Катакомбы Ведьм',level:65,blue:300,green:140,red:60,energy:2,damage:140},
  {id:'forbidden',name:'Катакомбы Запретного Пути',level:78,blue:450,green:220,red:100,energy:3,damage:220},
]);
export function makeForgeItem(templateId,uid,overrides={}) {
  return {uid,templateId,enchant:0,quality:'ordinary',sealed:true,equipped:false,sa:null,shoulder:null,...overrides};
}
export function createForgeState() {
  return {gold:9000000,aa:60000000,level:84,family:'mage',energy:12,hp:49773,
    seals:{blue:25000,green:10000,red:5000},materials:{parts:250,alloy:250,gemS:120,varnish:40,essence1:3,essence2:2,...Object.fromEntries(Object.entries(FORGE_CATALOG).filter(([,info])=>info.epic).map(([id])=>[`soul_${id}`,2]))},
    soulCrystals:{'blue:13':3,'green:13':2,'red:13':2},nextUid:7,
    gear:[makeForgeItem('arcana','forge-0',{sealed:false,enchant:6,equipped:true}),
      makeForgeItem('dynastyGloves','forge-1',{quality:'foundation'}),
      makeForgeItem('dynasty','forge-2'),makeForgeItem('arcanaRing','forge-3'),makeForgeItem('elegiaBoots','forge-4'),
      makeForgeItem('dynastyHelmet','forge-5',{sealed:false,equipped:true}),makeForgeItem('dynastyBoots','forge-6',{sealed:false,equipped:true})],
    baseCombat:{pAtk:150,mAtk:420,pDef:500,mDef:380,attackSpeed:340,castingSpeed:650,accuracy:160,evasion:140,physicalCrit:12,magicalCrit:5,moveSpeed:120,maxHp:49773,maxMp:16211,maxCp:10589,mpRegen:3,healPower:100},
  };
}
export function forgeItemInfo(item) {const info=item?FORGE_CATALOG[item.templateId]:null;return item?.epicTier==='blessed'&&info?.blessed?.grade?{...info,grade:info.blessed.grade}:info;}
export function forgeGear(state,uid) {return state.gear.find(item=>item.uid===uid);}
function costReason(state,cost) {
  if((cost.gold||0)>state.gold)return 'Недостаточно обычной адены.';
  if((cost.aa||0)>state.aa)return 'Недостаточно древней адены (AA).';
  for(const [key,count] of Object.entries(cost.materials||{}))if((state.materials[key]||0)<count)return `Не хватает: ${MATERIAL_NAMES[key]}.`;
  for(const [key,count] of Object.entries(cost.soulCrystals||{}))if((state.soulCrystals[key]||0)<count)return 'Не хватает кристалла души нужного цвета и ступени.';
  return '';
}
function spendForgeCost(state,cost) {
  state.gold-=cost.gold||0;state.aa-=cost.aa||0;
  for(const [key,count] of Object.entries(cost.materials||{}))state.materials[key]-=count;
  for(const [key,count] of Object.entries(cost.soulCrystals||{}))state.soulCrystals[key]-=count;
}
function ready(cost,reason='') {return {cost,reason,allowed:!reason};}
function processReason(item) {return !item?'Выберите предмет.':item.equipped?'Сначала снимите предмет.':'';}
export function craftPreview(state,recipeId) {
  const recipe=FORGE_RECIPES.find(recipe=>recipe.id===recipeId);
  if(!recipe)return ready({},'Рецепт недоступен.');
  const cost={gold:recipe.gold,materials:recipe.materials};return {...ready(cost,costReason(state,cost)),recipe};
}
export function craftForgeItem(state,recipeId,outcome='ordinary') {
  const preview=craftPreview(state,recipeId);
  if(!['ordinary','foundation','failure'].includes(outcome))return {ok:false,reason:'Неизвестный исход.'};
  if(!preview.allowed)return {ok:false,reason:preview.reason};
  // The UI chooses a demonstration outcome. Production must roll on the server.
  if(outcome==='failure'&&preview.recipe.rate===100)return {ok:false,reason:'Этот рецепт не может завершиться неудачей.'};
  spendForgeCost(state,preview.cost);
  if(outcome==='failure')return {ok:true,failed:true};
  const item=makeForgeItem(recipeId,`forge-${state.nextUid++}`,{quality:outcome});state.gear.push(item);
  return {ok:true,item};
}
export function masterworkPreview(state,uid) {
  const item=forgeGear(state,uid),info=forgeItemInfo(item);
  const cost={materials:{varnish:VARNISH_COUNTS[item?.templateId]||(info?.grade==='S84'?8:info?.grade==='S80'?7:4)}};
  return ready(cost,processReason(item)||(!info?.masterwork?'Для этого предмета Masterwork недоступен.':'')||(item.quality!=='foundation'?'Требуется заготовка Foundation.':'')||costReason(state,cost));
}
export function buyVarnish(state,count=1) {
  if(!Number.isSafeInteger(count)||count<1)return {ok:false,reason:'Неверное количество.'};
  const cost=count*VARNISH_PRICE_GOLD;if(state.gold<cost)return {ok:false,reason:'Недостаточно обычной адены.'};
  state.gold-=cost;state.materials.varnish=(state.materials.varnish||0)+count;return {ok:true,gold:cost};
}
export function refineMasterwork(state,uid) {
  const preview=masterworkPreview(state,uid);if(!preview.allowed)return {ok:false,reason:preview.reason};
  spendForgeCost(state,preview.cost);const item=forgeGear(state,uid);item.quality='masterwork';return {ok:true,item};
}
export function unsealPreview(state,uid) {
  const item=forgeGear(state,uid),info=forgeItemInfo(item);
  // Cloaks and epic jewellery are not sealed in High Five; the prototype keeps a plain adena fee for them.
  const cost=UNSEAL_COSTS[item?.templateId]||{gold:info?.grade==='S84'?200000:100000};
  return ready(cost,processReason(item)||(!item.sealed?'Предмет уже распечатан.':item.quality==='foundation'?'Сначала обработайте Foundation в Masterwork.':'')||costReason(state,cost));
}
export function unsealForgeItem(state,uid) {
  const preview=unsealPreview(state,uid);if(!preview.allowed)return {ok:false,reason:preview.reason};
  spendForgeCost(state,preview.cost);const item=forgeGear(state,uid);item.sealed=false;return {ok:true,item};
}
export function saPreview(state,uid,optionId) {
  const item=forgeGear(state,uid),info=forgeItemInfo(item),option=SA_OPTIONS[optionId];
  if(!info||!option||!info.sa?.includes(optionId))return ready({},'Этот SA несовместим с оружием.');
  const key=`${option.color}:${info.stage}`,cost={gold:90000,materials:{gemS:12},soulCrystals:{[key]:1}};
  return {...ready(cost,processReason(item)||(item.sealed?'Сначала распечатайте оружие.':item.quality==='foundation'?'Сначала обработайте Foundation.':item.sa?'Сначала снимите установленный SA.':'')||costReason(state,cost)),key,option};
}
export function installSa(state,uid,optionId) {
  const preview=saPreview(state,uid,optionId);if(!preview.allowed)return {ok:false,reason:preview.reason};
  spendForgeCost(state,preview.cost);forgeGear(state,uid).sa=optionId;return {ok:true};
}
export function removeSa(state,uid) {
  const item=forgeGear(state,uid),cost={gold:30000},reason=processReason(item)||(!item.sa?'SA не установлен.':'')||costReason(state,cost);
  if(reason)return {ok:false,reason};spendForgeCost(state,cost);item.sa=null;return {ok:true};
}
export function shoulderPreview(state,uid,profileId,tier=1) {
  const item=forgeGear(state,uid),info=forgeItemInfo(item),profile=DYNASTY_PROFILES[profileId];
  const cost={gold:tier===2?160000:80000,materials:{[tier===2?'essence2':'essence1']:1}};
  const reason=processReason(item)||(![1,2].includes(tier)?'Неизвестная ступень плеч.':'')
    ||(info.set!=='dynasty'||info.slot!=='body'?'Плечи устанавливаются на нагрудник Династии.':'')
    ||(item.sealed||item.quality==='foundation'?'Сначала обработайте и распечатайте нагрудник.':'')
    ||(!profile||profile.family!==state.family?'Специализация плеч не подходит классу.':'')
    ||(tier===1&&item.shoulder?'Плечи I уже установлены.':tier===2&&(!item.shoulder||item.shoulder.tier!==1||item.shoulder.profile!==profileId)?'Для улучшения нужны плечи I той же специализации.':'')
    ||costReason(state,cost);
  return ready(cost,reason);
}
export function installShoulder(state,uid,profileId,tier=1) {
  const preview=shoulderPreview(state,uid,profileId,tier);if(!preview.allowed)return {ok:false,reason:preview.reason};
  spendForgeCost(state,preview.cost);forgeGear(state,uid).shoulder={profile:profileId,tier};return {ok:true};
}
export function sealExchangePreview(state,counts) {
  let aa=0,total=0;
  for(const key of Object.keys(counts))if(!SEAL_STONES[key])return {allowed:false,reason:'Неизвестный камень.',aa:0};
  for(const [key,info] of Object.entries(SEAL_STONES)) {
    const count=counts[key]??0;
    if(!Number.isSafeInteger(count)||count<0||count>(state.seals[key]||0))return {allowed:false,reason:'Укажите целое количество в пределах запасов.',aa:0};
    aa+=count*info.rate;total+=count;
  }
  if(!total)return {allowed:false,reason:'Выберите камни для обмена.',aa:0};
  if(!Number.isSafeInteger(aa+state.aa))return {allowed:false,reason:'Слишком большая сумма обмена.',aa:0};
  return {allowed:true,reason:'',aa};
}
export function exchangeSealStones(state,counts) {
  const preview=sealExchangePreview(state,counts);if(!preview.allowed)return {ok:false,reason:preview.reason};
  for(const key of Object.keys(SEAL_STONES))state.seals[key]-=counts[key]||0;
  state.aa+=preview.aa;return {ok:true,aa:preview.aa};
}
export function farmCatacomb(state,id) {
  const zone=CATACOMBS.find(zone=>zone.id===id);
  const reason=!zone?'Катакомбы не найдены.':state.level<zone.level?'Недостаточный уровень.':state.energy<zone.energy?'Не хватает энергии похода.':state.hp<=zone.damage?'Недостаточно HP для следующего боя.':'';
  if(reason)return {ok:false,reason};state.energy-=zone.energy;state.hp-=zone.damage;
  for(const key of Object.keys(SEAL_STONES))state.seals[key]+=zone[key];return {ok:true,drops:{blue:zone.blue,green:zone.green,red:zone.red}};
}
export function fullHighGradeSet(state) {
  const items=state.gear.filter(item=>item.equipped&&!item.sealed&&item.quality!=='foundation');
  return Object.entries(ARMOR_SETS).find(([id,set])=>['S80','S84'].includes(set.grade)&&set.slots.every(slot=>items.some(item=>{const info=forgeItemInfo(item);return info?.set===id&&info.slot===slot&&['S80','S84'].includes(info.grade);})))?.[0]||null;
}
export function equipPreview(state,uid) {
  const item=forgeGear(state,uid),info=forgeItemInfo(item);
  const reason=!info?'Предмет не найден.':item.equipped?'':item.sealed||item.quality==='foundation'?'Нельзя надеть запечатанный предмет или Foundation.':info.type==='cloak'&&!fullHighGradeSet(state)?'Для плаща нужен полный надетый комплект S80 или выше.':'';
  return ready({},reason);
}
export function equipForgeItem(state,uid) {
  const preview=equipPreview(state,uid);if(!preview.allowed)return {ok:false,reason:preview.reason};
  const item=forgeGear(state,uid),info=forgeItemInfo(item);
  if(item.equipped){item.equipped=false;}else{
  for(const other of state.gear)if(forgeItemInfo(other)?.slot===info.slot)other.equipped=false;
  item.equipped=true;}
  const removedCloaks=[];
  if(!fullHighGradeSet(state))for(const other of state.gear)if(other.equipped&&forgeItemInfo(other)?.type==='cloak'){other.equipped=false;removedCloaks.push(other.uid);}
  return {ok:true,removedCloaks};
}
export function addRaidReward(state,templateId,variant='drop') {
  const info=FORGE_CATALOG[templateId];
  if(!info||(!info.epic&&info.type!=='cloak')||!['drop','soul'].includes(variant)||(variant==='soul'&&info.type!=='cloak'))return {ok:false,reason:'Награда недоступна.'};
  const item=makeForgeItem(templateId,`forge-${state.nextUid++}`,{sealed:info.type==='cloak'&&variant==='drop',bound:variant==='soul',variant,epicTier:'normal'});state.gear.push(item);return {ok:true,item};
}
export function blessedEpicPreview(state,uid) {
  const item=forgeGear(state,uid),info=forgeItemInfo(item),cost={gold:1000000,materials:{[`soul_${item?.templateId}`]:1}};
  return ready(cost,processReason(item)||(!info?.epic||!info.blessed?'Требуется эпическая бижутерия.':'')||(item.sealed||item.quality==='foundation'?'Предмет должен быть распечатан и обработан.':'')||(item.epicTier==='blessed'?'Эпик уже улучшен до Blessed.':'')||costReason(state,cost));
}
export function blessEpic(state,uid) {
  const preview=blessedEpicPreview(state,uid);if(!preview.allowed)return {ok:false,reason:preview.reason};
  spendForgeCost(state,preview.cost);const item=forgeGear(state,uid);item.epicTier='blessed';return {ok:true,item};
}
export function forgeItemStats(item) {
  const info=forgeItemInfo(item);if(!info)return {};
  const values={...(item.epicTier==='blessed'?info.blessed?.stats:info.stats)};
  if(info.type==='weapon'){values.pAtk+=(item.enchant||0)*6;values.mAtk+=(item.enchant||0)*4;}
  else if(info.type==='armor')values.pDef+=(item.enchant||0)*2;
  else if(info.type==='jewelry')values.mDef+=(item.enchant||0)*2;
  if(item.quality==='masterwork')for(const [key,value] of Object.entries(info.masterwork||{}))values[key]=(values[key]||0)+value;
  return values;
}
export function dynastySetActive(state) {
  const slots=new Set(state.gear.filter(item=>item.equipped&&!item.sealed&&item.quality!=='foundation'&&forgeItemInfo(item)?.set==='dynasty').map(item=>forgeItemInfo(item).slot));
  return ['body','gloves','helmet','boots'].every(slot=>slots.has(slot));
}
export function forgeCombatStats(state,baseStats=null) {
  const stats={...state.baseCombat},multipliers={};
  const addBonus=bonus=>{for(const [key,value] of Object.entries(bonus||{}))if(key.endsWith('Mul'))multipliers[key.slice(0,-3)]=(multipliers[key.slice(0,-3)]||0)+value;else stats[key]=(stats[key]||0)+value;};
  for(const item of state.gear.filter(item=>item.equipped&&!item.sealed&&item.quality!=='foundation'&&(forgeItemInfo(item)?.type!=='cloak'||fullHighGradeSet(state)))) {
    const info=forgeItemInfo(item);
    addBonus(forgeItemStats(item));addBonus(item.epicTier==='blessed'?info.blessed?.bonus:info.bonus);if(item.sa)addBonus(SA_OPTIONS[item.sa]?.bonus);
    if(item.shoulder&&dynastySetActive(state)){const profile=DYNASTY_PROFILES[item.shoulder.profile];if(profile?.family===state.family)for(const [key,value] of Object.entries(profile.bonus))addBonus({[key]:value*(item.shoulder.tier===2?1.5:1)});}
  }
  for(const [key,value] of Object.entries(multipliers))stats[key]*=1+value;
  if(baseStats&&state.base) {
    const scale=(key,stat,rate)=>{stats[key]*=rate**((baseStats[stat]-state.base[stat])*.5);};
    scale('pAtk','STR',1.036);scale('mAtk','INT',1.02);scale('mDef','MEN',1.01);scale('castingSpeed','WIT',1.05);scale('maxHp','CON',1.03);scale('maxMp','MEN',1.01);
    stats.accuracy+=(baseStats.DEX-state.base.DEX)*.3;stats.evasion+=(baseStats.DEX-state.base.DEX)*.3;
    stats.physicalCrit+=(baseStats.DEX-state.base.DEX)*.3;stats.magicalCrit+=(baseStats.WIT-state.base.WIT)*.4;
  }
  return Object.fromEntries(Object.entries(stats).map(([key,value])=>[key,Math.round(value*10)/10]));
}

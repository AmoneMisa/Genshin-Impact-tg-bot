import {L2_CLASS_META, classIdOf, raceOf} from '../../../template/l2ClassMeta.js';
import levels from '../../../template/levelsTemplate.js';
import changeClass from './changePlayerGameClass.js';
import updateStats from './updatePlayerStats.js';
import {activeL2Effects,isL2PetSkill} from './l2Effects.js';
import {playerRace} from './playerRace.js';
import {activeProfessionIndex, MAX_SUBCLASSES, SUBCLASS_START_LEVEL} from './classProgression.js';

// Reviewed High Five PlayerClass / VillageMaster rules; see docs/subclasses.md.
const SIMILAR_MAIN_GROUPS = [
  [5,6,20,33], [8,23,36], [9,24,37], [14,28,41], [12,27,40],
];
const CLASS_FIELDS = ['gameClass','classQuest','l2Passives','learnedSkills','skillEnchants','tattoos','hotbar','passives'];
const n = (v, fallback=0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const nameOf = slot => slot?.fields?.gameClass?.stats?.name;

export function secondProfessionId(name) {
  let id=classIdOf(name);
  while(L2_CLASS_META[id]?.level>2)id=L2_CLASS_META[id].parent;
  return L2_CLASS_META[id]?.level===2 ? id : null;
}

function capture(session) {
  const game=session.game;
  return {level:n(game.stats?.lvl,1),currentExp:n(game.stats?.currentExp),needExp:n(game.stats?.needExp),
    sp:n(game.inventory?.sp),fields:structuredClone(Object.fromEntries(CLASS_FIELDS.filter(key=>Object.hasOwn(game,key)).map(key=>[key,game[key]])))};
}

function slotsOf(session) {
  const live={level:n(session?.game?.stats?.lvl,1),fields:{gameClass:session?.game?.gameClass}};
  const state=session?.game?.professions;
  if(!state)return [live];
  return state.slots.map((slot,index)=>index===activeProfessionIndex(session)?live:slot);
}

export function mainProfessionName(session) {return nameOf(slotsOf(session)[0]);}

export function subclassChoiceReason(session, className, {excludeIndex=-1,mainName=mainProfessionName(session),race=playerRace(session)}={}) {
  const target=classIdOf(className),base=secondProfessionId(mainName);
  if(!L2_CLASS_META[target] || L2_CLASS_META[target].level!==2)return 'invalid_subclass';
  if(base==null)return 'main_profession_required';
  if([51,57].includes(target))return 'forbidden_subclass';
  const mainRace=race||raceOf(base),targetRace=raceOf(target);
  if((mainRace==='kamael')!==(targetRace==='kamael'))return 'kamael_subclass_only';
  if((mainRace==='elf'&&targetRace==='darkElf')||(mainRace==='darkElf'&&targetRace==='elf'))return 'opposing_elf_race';
  if(target===base || SIMILAR_MAIN_GROUPS.some(group=>group.includes(base)&&group.includes(target)))return 'similar_main_class';
  const slots=slotsOf(session);
  if(slots.some((slot,index)=>index>0&&index!==excludeIndex&&secondProfessionId(nameOf(slot))===target))return 'duplicate_subclass';
  if(mainRace==='kamael') {
    // H5 permits the other Kamael paths, retaining just one Soul Breaker variant.
    if((session.gender==='female'&&target===129)||(session.gender!=='female'&&target===128))return 'kamael_gender_variant';
    if(target===135&&(slots.length<3 || slots.slice(1).some(slot=>slot.level<75)))return 'inspector_locked';
  }
  return null;
}

export function professionReplacementReason(session,className) {
  const slots=slotsOf(session),index=activeProfessionIndex(session);
  if(index===0&&['inspector','judicator'].includes(className))return 'invalid_main_class';
  if(slots.length===1)return null;
  if(index>0) {
    const id=secondProfessionId(className);
    return id==null?'invalid_subclass':subclassChoiceReason(session,L2_CLASS_META[id].key,{excludeIndex:index});
  }
  for(let i=1;i<slots.length;i++) {
    const id=secondProfessionId(nameOf(slots[i]));
    if(id==null || subclassChoiceReason(session,L2_CLASS_META[id].key,{excludeIndex:i,mainName:className,race:raceOf(classIdOf(className))}))return 'subclass_conflict';
  }
  return null;
}

export function professionPeaceReason(session,now=Date.now()) {
  const game=session?.game||{};
  if(n(game.respawnTime)>now || n(game.gameClass?.stats?.hp,1)<=0 || game.deathLedger?.active)return 'player_dead';
  if(n(game.stats?.inFightTimer)>now)return 'in_combat';
  if(game.hunt?.field || game.hunt?.mob || game.world?.mode==='location' || game.world?.instanceId)return 'not_peaceful';
  if(game.summon || game.pet || game.servitor || activeL2Effects(session,now).some(row=>isL2PetSkill(row.skill)))return 'summon_active';
  return null;
}

export function subclassAddReason(session,now=Date.now()) {
  const peace=professionPeaceReason(session,now);if(peace)return peace;
  const slots=slotsOf(session);
  if(slots.length>MAX_SUBCLASSES)return 'subclass_limit';
  if(slots[0].level<75 || n(session?.game?.stats?.lvl,1)<75)return 'subclass_level_required';
  if(secondProfessionId(nameOf(slots[0]))==null)return 'main_profession_required';
  if(slots.slice(1).some(slot=>slot.level<75))return 'previous_subclass_level_required';
  return null;
}

export function getSubclassState(session,now=Date.now()) {
  const activeIndex=activeProfessionIndex(session),slots=slotsOf(session);
  const addReason=subclassAddReason(session,now),switchReason=professionPeaceReason(session,now);
  return {activeIndex,maxSubclasses:MAX_SUBCLASSES,startLevel:SUBCLASS_START_LEVEL,
    slots:slots.map((slot,index)=>({index,className:nameOf(slot)||'noClass',classTitle:L2_CLASS_META[classIdOf(nameOf(slot))]?.ru||slot.fields.gameClass?.stats?.translateName||'Без класса',level:slot.level,active:index===activeIndex})),
    addReason,switchReason,
    choices:Object.values(L2_CLASS_META).filter(meta=>meta.level===2&&!subclassChoiceReason(session,meta.key)).map(meta=>({name:meta.key,title:meta.ru,race:raceOf(classIdOf(meta.key))}))};
}

function activate(session,index) {
  const game=session.game,state=game.professions;
  state.slots[state.activeIndex]=capture(session);
  const target=structuredClone(state.slots[index]);
  for(const key of CLASS_FIELDS){if(Object.hasOwn(target.fields,key))game[key]=target.fields[key];else delete game[key];}
  Object.assign(game.stats,{lvl:target.level,currentExp:target.currentExp,needExp:target.needExp});
  game.inventory.sp=target.sp;
  state.activeIndex=index;
  game.effects=[];delete game.lsBuff;game.cubics=[];
  // Preserve saved HP, skills, enchant routes and cooldowns. Do not recreate a learned kit.
  return {ok:true,index,className:game.gameClass.stats.name};
}

export function switchProfession(session,index,now=Date.now()) {
  if(!Number.isInteger(index)||!session?.game?.professions?.slots?.[index])return {ok:false,reason:'unknown_profession_slot'};
  if(index===activeProfessionIndex(session))return {ok:false,reason:'same_profession_slot'};
  const reason=professionPeaceReason(session,now);if(reason)return {ok:false,reason};
  return activate(session,index);
}

export function addSubclass(session,className,now=Date.now()) {
  const reason=subclassAddReason(session,now)||subclassChoiceReason(session,className);if(reason)return {ok:false,reason};
  const scratch={gender:session.gender,game:{stats:{lvl:SUBCLASS_START_LEVEL,currentExp:0,needExp:levels.find(row=>row.lvl===SUBCLASS_START_LEVEL).needExp},inventory:{sp:0},classQuest:{active:null,completed:[]},learnedSkills:{},skillEnchants:{},tattoos:[]}};
  changeClass(scratch,className);updateStats(scratch);
  const game=session.game;
  game.race ||= raceOf(classIdOf(mainProfessionName(session)));
  game.professions ||= {version:1,activeIndex:0,slots:[capture(session)]};
  const index=game.professions.slots.length;
  game.professions.slots.push(capture(scratch));
  return activate(session,index);
}

export function removeSubclass(session,index,now=Date.now()) {
  const state=session?.game?.professions;
  if(!Number.isInteger(index)||index<1||!state?.slots?.[index])return {ok:false,reason:'unknown_profession_slot'};
  const reason=professionPeaceReason(session,now);if(reason)return {ok:false,reason};
  // Leave the removed class first so the main class (and its saved fields) becomes live again.
  if(index===activeProfessionIndex(session))activate(session,0);
  state.slots.splice(index,1);
  if(state.activeIndex>index)state.activeIndex-=1;
  return {ok:true,index,removed:true,className:session.game.gameClass.stats.name};
}

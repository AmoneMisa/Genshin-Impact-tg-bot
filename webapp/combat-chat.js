import {escapeHtml} from './escape-html.js';
import {dialogHeading} from './dialog-heading.js';
import {installOverlayA11y} from './overlay-a11y.js';

export function combatEventText(event){
  const amount=new Intl.NumberFormat('ru-RU').format(Math.max(0,Math.round(Number(event.amount)||0)));
  const participants=`${event.actor||'Неизвестно'} → ${event.target||event.evader||event.actor||'Неизвестно'}`;
  if(event.kind==='heal')return `${participants}: восстанавливает ${amount} HP.`;
  if(event.kind==='evade')return `${participants}: уворот.`;
  if(event.kind==='miss')return `${participants}: промах.`;
  return `${participants}: наносит урон ${amount}.`;
}

export const SYSTEM_HISTORY=150;
export function lootEventTexts(loot){
  const number=value=>new Intl.NumberFormat('ru-RU').format(Number(value)||0);
  const rows=[];
  if(loot.gold>0)rows.push(`Получено ${number(loot.gold)} адены.`);
  for(const item of loot.items||[]){
    if(!(item.amount>0))continue;
    rows.push(['gold','ancientAdena','moonDew'].includes(item.item)?`Получено ${number(item.amount)} ${item.name}.`:`Вы получили ${item.name}${item.amount>1?' ×'+number(item.amount):''}.`);
  }
  return rows;
}

/** Two-line battle preview and one persistent shared modal, with no independent poll timer. */
export function createCombatChat({api}) {
  const element=document.createElement('section');element.className='combat-chat';
  element.innerHTML='<div class="combat-log" role="log" aria-label="Журнал боя" aria-live="polite" data-combat-log></div><button type="button" class="ui-button ui-chat-preview" data-chat-toggle aria-label="Открыть чат" aria-haspopup="dialog" aria-expanded="false" aria-controls="combat-chat-body"><span data-chat-preview></span></button>';
  const popup=document.createElement('section');popup.className='game-overlay combat-chat-overlay';
  popup.innerHTML=`<div class="overlay-backdrop"></div><div class="overlay-panel game-dialog-panel combat-chat-panel" role="dialog" aria-modal="true" aria-labelledby="combat-chat-title">${dialogHeading('Чат',{id:'combat-chat-title',compact:true})}<div id="combat-chat-body" hidden>
    <div class="ui-folder-tabs" role="tablist" aria-label="Каналы чата">${[['local','Локация'],['party','Группа'],['system','Система']].map(([id,label])=>`<button type="button" role="tab" data-chat-channel="${id}" aria-selected="${id==='local'}">${label}</button>`).join('')}</div>
    <div class="combat-chat-messages" data-chat-messages role="log" aria-label="Сообщения" aria-live="polite"></div>
    <form class="combat-chat-form"><input type="text" data-chat-text maxlength="200" aria-label="Сообщение в чат" placeholder="Сообщение…" autocomplete="off"><button type="submit" class="ui-button ui-compact" aria-label="Отправить сообщение">Отправить</button></form>
    <p data-chat-error class="combat-chat-error" role="status"></p></div></div>`;
  const body=popup.querySelector('#combat-chat-body'),messages=popup.querySelector('[data-chat-messages]'),input=popup.querySelector('[data-chat-text]'),error=popup.querySelector('[data-chat-error]'),preview=element.querySelector('[data-chat-preview]'),toggle=element.querySelector('button'),form=popup.querySelector('form');
  let channel='local',partyId=null,roomKey=null,request=0,disposed=false,sending=false,loading=false,controller=null,rowsKey='',systemRows=[],previewRows=[],lastPreviewKey='',combatRows=[];
  const combatLog=element.querySelector('[data-combat-log]');
  function renderCombatLog(){combatLog.innerHTML=combatRows.map(row=>`<p class="ui-combat-log-row" data-combat-kind="${row.kind}">${escapeHtml(row.text)}</p>`).join('');}
  const names={local:'Локация',party:'Группа',system:'Система'};
  function updatePreview(){
    const rows=previewRows.slice(-2);
    preview.innerHTML=rows.length?rows.map(row=>`<span>${row.name?`<strong>${escapeHtml(row.name)}:</strong> `:''}${escapeHtml(row.text)}</span>`).join(''):'<span>Чат локации и группы</span><span>Нажмите, чтобы открыть</span>';
  }
  function showMessages(data){
    const key=JSON.stringify([data.scope,data.messages]);if(key===rowsKey)return;rowsKey=key;
    const bottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<24;
    messages.innerHTML=(data.messages||[]).map(row=>`<p${row.kind?` class="ui-combat-log-row" data-combat-kind="${row.kind}"`:''}>${row.name?`<strong>${escapeHtml(row.name)}</strong>`:''}<span>${escapeHtml(row.text)}</span></p>`).join('')||'<p class="combat-chat-empty">Сообщений пока нет.</p>';
    if(bottom)messages.scrollTop=messages.scrollHeight;
  }
  const failure=e=>{error.textContent=({no_party:'Ты не состоишь в группе.',chat_unavailable:'Чат локации сейчас недоступен.',chat_text:'Введите сообщение до 200 символов.',chat_rate:'Подожди секунду перед следующим сообщением.'})[e.payload?.reason]||e.message||'Не удалось загрузить чат.';};
  async function refresh(){
    if(disposed||document.hidden||loading)return;
    if(channel==='system'){if(!body.hidden)showMessages({scope:'system',messages:systemRows});return;}
    loading=true;controller=new AbortController();const ticket=++request;
    try{
      const data=await api('/api/combat/chat?channel='+channel,{signal:controller.signal});
      if(ticket!==request||disposed||document.hidden)return;
      if(data.ok===false){if(!body.hidden)failure({payload:data});return;}
      const previewKey=JSON.stringify([data.scope,data.messages?.slice(-2)]);
      if(previewKey!==lastPreviewKey){lastPreviewKey=previewKey;if(data.messages?.length){previewRows=[...previewRows,...data.messages.slice(-2)].slice(-2);updatePreview();}}
      if(!body.hidden){error.textContent='';showMessages(data);}
    }catch(e){if(e.name!=='AbortError'&&ticket===request&&!disposed&&!body.hidden)failure(e);}finally{loading=false;controller=null;}
  }
  function setChannel(next){channel=next;request++;rowsKey='';messages.replaceChildren();error.textContent='';form.hidden=channel==='system';popup.querySelectorAll('[data-chat-channel]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.chatChannel===channel)));popup.querySelector('#combat-chat-title').textContent='Чат · '+names[channel];refresh();}
  let opener=toggle;
  function closeChat(){
    if(body.hidden)return false;
    body.hidden=true;request++;controller?.abort();popup.classList.remove('visible');popup.remove();toggle.setAttribute('aria-expanded','false');
    // The shared overlay observer restores the underlying window from inert first.
    requestAnimationFrame(()=>{if(!disposed&&body.hidden)(opener?.isConnected?opener:document.querySelector('[data-system-chat]')||toggle).focus({preventScroll:true});});
    return true;
  }
  function openChat(next,source=toggle){
    if(disposed)return;opener=source;installOverlayA11y();body.hidden=false;toggle.setAttribute('aria-expanded','true');document.body.append(popup);if(next)setChannel(next);requestAnimationFrame(()=>{if(body.hidden||disposed)return;popup.classList.add('visible');if(channel!=='system')input.focus({preventScroll:true});});refresh();
  }
  toggle.addEventListener('click',()=>openChat());
  popup.querySelector('[data-dismiss]').addEventListener('click',closeChat);
  popup.querySelector('.overlay-backdrop').addEventListener('click',closeChat);
  popup.addEventListener('overlay-escape',event=>{event.preventDefault();closeChat();});
  popup.querySelectorAll('[data-chat-channel]').forEach(button=>button.addEventListener('click',()=>setChannel(button.dataset.chatChannel)));
  form.addEventListener('submit',async event=>{
    event.preventDefault();const text=input.value.trim();if(!text||sending||channel==='system')return;
    sending=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;const sentChannel=channel;
    try{const result=await api('/api/combat/chat',{method:'POST',body:JSON.stringify({channel:sentChannel,text})});if(result.ok===false){failure({payload:result});return;}if(input.value.trim()===text)input.value='';if(channel===sentChannel)await refresh();}
    catch(err){failure(err);}finally{sending=false;submit.disabled=false;}
  });
  updatePreview();
  return {element,refresh,closeChat,openChat,combat(event){
    if(!['incoming','outgoing','heal','miss','evade'].includes(event?.kind))return;
    const text=combatEventText(event);combatRows=[...combatRows,{kind:event.kind,text,at:Number(event.at)||Date.now()}].slice(-4);renderCombatLog();
    systemRows=[...systemRows,{text,kind:event.kind,at:Number(event.at)||Date.now()}].slice(-SYSTEM_HISTORY);if(channel==='system'&&!body.hidden)refresh();
  },loot(loot){
    for(const text of lootEventTexts(loot)){
      const row={text,kind:'loot',at:Date.now()};systemRows=[...systemRows,row].slice(-SYSTEM_HISTORY);previewRows=[...previewRows,row].slice(-2);
    }
    updatePreview();if(channel==='system'&&!body.hidden)refresh();
  },tick(){const rows=combatRows.filter(row=>Date.now()-row.at<12000);if(rows.length!==combatRows.length){combatRows=rows;renderCombatLog();}},notice(text){
    if(!text||systemRows.at(-1)?.text===String(text))return;
    const row={text:String(text),at:Date.now()};systemRows=[...systemRows,row].slice(-SYSTEM_HISTORY);previewRows=[...previewRows,row].slice(-2);updatePreview();if(channel==='system'&&!body.hidden)refresh();
  },destroy(){disposed=true;request++;controller?.abort();popup.remove();element.remove();},update(state){
    const nextParty=state.party?.id||null,nextRoom=JSON.stringify([state.zone,state.field?.room?.id,state.world?.instanceId]);
    if(partyId!==nextParty||roomKey!==nextRoom){partyId=nextParty;roomKey=nextRoom;request++;rowsKey='';lastPreviewKey='';previewRows=systemRows.slice(-2);updatePreview();messages.replaceChildren();if(channel==='party'&&!state.party)setChannel('local');}
    popup.querySelector('[data-chat-channel=party]').disabled=!state.party;
  }};
}

let installed = false, nextId = 0;

/** One lightweight rules tooltip for all games. It never participates in panel layout. */
export function installGameRules() {
 if(installed)return;
 installed=true;
 let trigger=null,popup=null,pinned=false;
 function hide(){
  if(trigger){trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-describedby');}
  popup?.remove();trigger=null;popup=null;pinned=false;
 }
 function show(button,pin=false){
  if(trigger===button&&popup?.isConnected){pinned ||= pin;popup.textContent=button.dataset.gameRules;return;}
  hide();trigger=button;pinned=pin;
  popup=document.createElement('aside');popup.className='game-rules-tooltip';popup.id=`game-rules-${++nextId}`;
  popup.setAttribute('role','tooltip');popup.textContent=button.dataset.gameRules;
  (button.closest('.game-overlay,dialog')||document.body).append(popup);
  trigger.setAttribute('aria-expanded','true');trigger.setAttribute('aria-describedby',popup.id);
  const rect=button.getBoundingClientRect(),size=popup.getBoundingClientRect();
  const left=Math.max(12,Math.min(rect.right-size.width,innerWidth-size.width-12));
  const below=rect.bottom+8;
  const top=below+size.height<=innerHeight-12?below:Math.max(12,rect.top-size.height-8);
  popup.style.left=`${left}px`;popup.style.top=`${top}px`;
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-game-rules]');
  if(button){if(trigger===button&&pinned)hide();else show(button,true);}
 });
 document.addEventListener('pointerover',event=>{
  const button=event.target.closest('[data-game-rules]');
  if(button&&event.pointerType!=='touch')show(button);
 });
 document.addEventListener('pointerout',event=>{
  if(!pinned&&trigger&&(event.target===trigger||trigger.contains(event.target)||popup?.contains(event.target))&&!trigger.contains(event.relatedTarget)&&!popup?.contains(event.relatedTarget))hide();
 });
 document.addEventListener('pointerdown',event=>{if(trigger&&!trigger.contains(event.target)&&!popup?.contains(event.target))hide();},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&popup){hide();event.preventDefault();event.stopImmediatePropagation();}},true);
 document.addEventListener('scroll',event=>{if(popup&&!popup.contains(event.target))hide();},true);
 window.addEventListener('resize',hide);
 return ()=>{if(trigger&&(!trigger.isConnected||!popup?.isConnected||trigger.closest('.closing,[hidden]')))hide();};
}

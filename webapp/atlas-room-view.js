/** Adapted rooms keep their own coordinates; they never become invented world XYZ. */
export function createAtlasRoomView(root,options,{onOverview,onWorldChange,onBusy}={}){
 const host=document.createElement('div');host.className='atlas-room-host';host.setAttribute('role','region');host.setAttribute('aria-label','Локация');host.hidden=true;
 root.querySelector('.atlas-panel').insertBefore(host,root.querySelector('.atlas-footer'));
 let view=null,opening=null,space=null,wanted=true,revision=0,disposed=false;
 const display=()=>{const visible=Boolean(!disposed&&view&&space&&wanted);host.hidden=!visible;root.classList.toggle('atlas-has-room',visible);view?.setVisible(visible);};
 function clear(){revision++;onBusy?.(false);space=null;view?.close();view=null;host.replaceChildren();host.hidden=true;root.classList.remove('atlas-has-room');}
 return {
  async update(world,hunt,current=()=>true){
   if(disposed||!current())return;
   if(world.player.mode!=='location'||world.nativeField||!hunt?.field||hunt.field.native){clear();return;}
   const key=world.player.location+':'+(world.player.instanceId||'public');
   if(space!==key){clear();space=key;wanted=true;}
   if(view){view.update(hunt);display();return;}
   if(opening){await opening;return;}
   const version=revision;display();
   opening=(async()=>{
    const {openHuntGame}=await import('./hunt.js');
    if(disposed||version!==revision||!current())return;
    const next=await openHuntGame({...options,mount:host,initialState:hunt,onOpenAtlas:()=>{wanted=false;display();onOverview?.();},onWorldChange:()=>{if(!disposed&&version===revision)onWorldChange?.();},onBusy:value=>{if(!disposed&&version===revision)onBusy?.(value);}});
    if(disposed||version!==revision||!current()){next?.close();return;}
    view=next;display();
   })();
   try{await opening;}finally{opening=null;}
  },
  active:()=>!host.hidden,
  suppressedFor:world=>Boolean(space&&space===world.player.location+':'+(world.player.instanceId||'public')&&!wanted),
  show(){if(!space)return false;wanted=true;display();return true;},
  hide(){wanted=false;display();},
  destroy(){disposed=true;clear();host.remove();},
 };
}

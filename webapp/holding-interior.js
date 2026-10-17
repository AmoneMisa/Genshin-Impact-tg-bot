import {isoPoint,isoSceneBounds,clampRoomCamera} from './hunt-isometric.js';
import {sceneStudyUrl} from './scene-catalog.js';
import {drawPortraitMarker,displayedPosition} from './map-rendering.js';
import {classArtUrl} from './boss-stage.js';
import {hallSceneUrl} from './hall-location.js';

/** One lightweight canvas room for halls, owned strongholds and the existing siege encounter. */
export function drawHoldingInterior(ctx,{width,height,state,elapsed,pan,zoom,pic}){
 const holding=state.holdings.find(h=>h.id===state.player.holding),viewport={width,height},camera=clampRoomCamera({...pan,zoom},viewport);
 pan.x=camera.x;pan.y=camera.y;
 const point=p=>isoPoint(p,viewport,camera),bounds=isoSceneBounds(viewport),markers=[];
 ctx.fillStyle='#151619';ctx.fillRect(0,0,width,height);
 const room=state.player.mode==='siege'?'courtyard':state.hall?.room||'interior';
 const image=holding&&pic(holding.kind==='hall'?hallSceneUrl(holding,{level:state.hall?.level,room,compact:width<700}):sceneStudyUrl('interior-'+holding.kind,{compact:width<700}));
 if(image?.complete&&image.naturalWidth)ctx.drawImage(image,width/2+(bounds.x-width/2)*zoom+pan.x,height/2+(bounds.y-height/2)*zoom+pan.y,bounds.width*zoom,bounds.height*zoom);
 else {
  const corners=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}].map(point);ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle='#3b3730';ctx.fill();
 }
 for(const wall of image?.complete&&image.naturalWidth?[]:state.hall?.walls||[]){
  const corners=[{x:wall.x,y:wall.y},{x:wall.x+wall.w,y:wall.y},{x:wall.x+wall.w,y:wall.y+wall.h},{x:wall.x,y:wall.y+wall.h}].map(point);
  ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle='#65553d';ctx.fill();ctx.strokeStyle='#ab9670';ctx.stroke();
 }
 const siege=holding?.siege,nodes=state.player.mode==='hall'?state.hall?.npcs||[]:state.player.mode==='siege'?siege?.objectives||[]:[];
 const marker=(n,kind)=>{
  const p=point(n),portrait=kind==='hallnpc'||kind==='corpse';
  drawPortraitMarker(ctx,{...p,r:18,label:n.name,sub:n.role||'',image:portrait?pic(classArtUrl(n.id==='buffer'?'mage':'warrior')):null,fill:n.hp===0?'#363f38':'#846943',zoom:portrait?2:1,anchorY:portrait?.26:.5});
  markers.push({...p,r:29,kind,data:n});
 };
 nodes.slice(0,state.player.mode==='siege'?8:24).forEach(n=>marker(n,state.player.mode==='hall'?'hallnpc':'objective'));for(const c of state.corpses||[])marker(c,'corpse');
 for(const peer of siege?.players||[])if(peer.userId!==String(state.player.userId)&&state.player.mode==='siege')marker({...peer,name:'Игрок'},'siegepeer');
 const actor=state.player.mode==='siege'?siege?.player:state.player;
 if(actor){const p=point(displayedPosition(actor,elapsed,{speed:state.player.runSpeed}));ctx.fillStyle='#78e3d6';ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff0cf';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('Вы',p.x,p.y-14);}
 if(state.player.mode==='hall'&&holding?.conquerable){const passage={id:'hall-passage',name:room==='courtyard'?'Внутрь зала':'Во двор',x:.5,y:room==='courtyard'?.1:.9};const p=point(passage);ctx.fillStyle='#ead7a6';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('↗ '+passage.name,p.x,p.y);markers.push({...p,r:28,kind:'hallpassage',data:passage});}
 if(state.player.mode==='hall'&&holding?.conquerable&&room!=='courtyard')return {markers,status:`${holding.name} · зал ${state.hall?.level||1} ур.`};
 const door={id:'exit',name:'Выход',x:.5,y:state.player.mode==='hall'?.9:.95},p=point(door);
 ctx.fillStyle='#ead7a6';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('↘ Выход',p.x,p.y);markers.push({...p,r:28,kind:'holdingexit',data:door});
 return {markers,status:(holding?.name||'Владение')+(state.player.mode==='hall'?` · ${room==='courtyard'?'двор':'зал '+(state.hall?.level||1)+' ур.'}`:'')};
}

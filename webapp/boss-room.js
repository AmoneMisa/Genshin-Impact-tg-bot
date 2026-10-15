import {createHuntRenderer} from './hunt-phaser.js';
import {isoPoint,isoTerrain} from './hunt-isometric.js';
import {escapeHtml} from './escape-html.js';

const environments={antharas:'cavern',valakas:'volcanic',baium:'catacomb',frintezza:'necropolis',orfen:'marsh',queenAnt:'cavern',beleth:'desert',zaken:'ship',freya:'ice',freyaExtreme:'ice',core:'catacomb'};

/** Shares the room renderer with hunting. Raid rules and entry checks stay in the boss server. */
export function createBossRoomStage(host,{name,label=name,bossUrl,playerUrl,player,hpPercent=100}){
  const renderer=createHuntRenderer();
  let disposed=false,hp=hpPercent,viewport={width:320,height:360},animation=null;
  const environment=environments[name]||'catacomb',indoor=['catacomb','necropolis','ship','ice'].includes(environment);
  const walls=indoor?[[.22,.22],[.73,.22],[.22,.7],[.73,.7]].map(([x,y])=>({x,y,w:.06,h:.06,kind:'pillar'})):
    [[.12,.4],[.8,.65]].map(([x,y])=>({x,y,w:.09,h:.09,kind:'rock'}));
  const field={environment,sceneKey:name,walls,layoutSource:'adapted',exits:[]};
  host.classList.add('boss-room-stage');
  function marker(id,point,url,label,self=false){
    const p=isoPoint(point,viewport);
    return `<div class="hunt-iso-actor ${self?'hunt-hero-marker':'hunt-actor selected'}" ${self?'data-hunt-halt':'data-target="boss"'} style="left:${p.x}px;top:${p.y}px;z-index:${10+Math.round((point.x+point.y)*10)};transform:translate(-50%,-100%)"><span class="hunt-actor-label"><span class="hunt-mob-name">${escapeHtml(label)}</span>${!self?`<span class="hunt-mob-percent" data-room-boss-hp>${Math.round(hp)}%</span>`:''}</span><span class="hunt-iso-avatar">${url?`<img src="${escapeHtml(url)}" alt="">`:''}</span></div>`;
  }
  function render(){
    if(disposed)return;
    host.innerHTML=`<div class="hunt-ground hunt-isometric" aria-label="Арена босса"><div class="hunt-world">${isoTerrain(field,viewport)}${marker('boss',{x:.48,y:.35},bossUrl,label)}${marker('self',{x:.5,y:.78},playerUrl,player?.name||'Ты',true)}</div></div>`;
    renderer.mount(host.querySelector('.hunt-world'),field,viewport);
  }
  function effect(kind,crit=false,incoming=false){
    if(disposed||document.hidden)return;
    animation?.cancel();host.querySelector('[data-room-effect]')?.remove();
    const from=isoPoint(incoming?{x:.48,y:.35}:{x:.5,y:.78},viewport),to=isoPoint(incoming?{x:.5,y:.78}:{x:.48,y:.35},viewport);
    const supportive=['heal','shield','buff'].includes(kind);
    const effect=document.createElementNS('http://www.w3.org/2000/svg','svg');
    effect.setAttribute('viewBox',`0 0 ${viewport.width} ${viewport.height}`);effect.setAttribute('data-room-effect','');effect.setAttribute('aria-hidden','true');effect.classList.add('hunt-strike','hunt-skill-fx',supportive?'heal':'magic');
    effect.innerHTML=supportive?`<ellipse class="hunt-fx-area" cx="${from.x}" cy="${from.y-25}" rx="30" ry="36"/>`:`<path class="hunt-fx-trail" d="M${from.x},${from.y-25} Q${(from.x+to.x)/2},${to.y-80} ${to.x},${to.y-25}"/><circle class="hunt-fx-impact" cx="${to.x}" cy="${to.y-25}" r="${crit?34:25}"/>`;
    host.querySelector('.hunt-world').append(effect);
    if(!matchMedia('(prefers-reduced-motion:reduce)').matches){animation=effect.animate([{opacity:1},{opacity:0}],{duration:900,fill:'forwards'});animation.onfinish=()=>effect.remove();}
  }
  const observer=new ResizeObserver(entries=>{const r=entries[0]?.contentRect;if(r&&r.width>0&&r.height>0&&(Math.abs(r.width-viewport.width)+Math.abs(r.height-viewport.height)>2)){viewport={width:r.width,height:r.height};render();}});
  const visibility=()=>{if(document.hidden){animation?.cancel();host.querySelector('[data-room-effect]')?.remove();}else renderer.refresh();};
  render();observer.observe(host);document.addEventListener('visibilitychange',visibility);
  return {name,setHp(value){hp=value;const node=host.querySelector('[data-room-boss-hp]');if(node)node.textContent=Math.round(hp)+'%';},
    playSkill(kind,{crit=false}={}){effect(kind,crit);},hit(kind,options){this.playSkill(kind,options);},bossAttack(){effect('damage',false,true);},
    defeat(){const n=host.querySelector('[data-target="boss"]');if(n)n.hidden=true;renderer.mount(host.querySelector('.hunt-world'),field,viewport);},
    destroy(){if(disposed)return;disposed=true;observer.disconnect();animation?.cancel();document.removeEventListener('visibilitychange',visibility);renderer.destroy();host.replaceChildren();host.classList.remove('boss-room-stage');},
  };
}

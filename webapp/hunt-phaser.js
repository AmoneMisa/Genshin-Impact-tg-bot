import {paintRoom} from './room-paint.js';
import {combatTheme,colorHex} from './combat-environment.js';

let runtime;
const loadRuntime=()=>runtime??=import('/vendor/phaser/phaser.esm.min.js');

/** A room-scoped renderer. HTML keeps accessible hit areas, labels and shared controls.
 * No physics or game rules run here. One existing hunt clock drives on-demand frames.
 */
export function createHuntRenderer(){
  const host=document.createElement('div');
  host.className='hunt-phaser';host.setAttribute('aria-hidden','true');
  let game,scene,world,field,viewport,disposed=false,failed=false,starting=false,dirty=true;
  const actors=new Map(),textures=new Map();
  let terrainKey='',nextTexture=0;
  const terrain=[];let terrainTextures=[],terrainRevision=0,scenery=[];
  function release(){
    world?.classList.remove('hunt-phaser-ready');
    world?.querySelectorAll('.hunt-avatar-painted').forEach(n=>n.classList.remove('hunt-avatar-painted'));
    host.remove();
    if(game){game.destroy(true);if(game.isBooted)game.step(performance.now(),0);game=null;}
    actors.clear();textures.clear();terrain.length=0;terrainTextures=[];scenery=[];scene=null;
  }
  function fail(){failed=true;release();}
  function frame(){
    if(!game||!scene||disposed||failed||document.hidden||!dirty)return;
    dirty=false;game.step(performance.now(),0);
  }
  function drawTerrain(){
    const key=JSON.stringify([viewport,field.environment,field.sceneKey,field.walls,field.exits?.map(e=>e.side)]);
    if(key===terrainKey)return;terrainKey=key;
    terrain.splice(0).forEach(g=>g.destroy());scenery=[];
    for(const name of terrainTextures)scene.textures.remove(name);terrainTextures=[];
    const painting=paintRoom(field,viewport),bounds=painting.bounds;
    host.style.cssText=`left:${bounds.x}px;top:${bounds.y}px;right:auto;bottom:auto;width:${bounds.width}px;height:${bounds.height}px`;
    game.scale.resize(bounds.width,bounds.height);
    scene.cameras.main.setScroll(bounds.x,bounds.y);
    const revision=terrainRevision++;
    const add=(canvas,x,y,depth,index)=>{
      const name=`room-${revision}-${index}`;scene.textures.addCanvas(name,canvas);terrainTextures.push(name);
      const image=scene.add.image(x,y,name).setOrigin(0).setDepth(depth);terrain.push(image);return image;
    };
    add(painting.floor,bounds.x,bounds.y,-100,'floor');
    painting.props.forEach((prop,i)=>scenery.push({image:add(prop.canvas,prop.x,prop.y,prop.depth,i),...prop}));
  }
  function revealActors(){
    const important=[...actors.values()].filter(row=>row.sprite.visible);
    for(const prop of scenery){
      const b=prop.occlusion;
      const obscures=important.some(row=>prop.depth>Number(row.node.style.zIndex)&&row.sprite.x+16>b.left&&row.sprite.x-16<b.right&&row.sprite.y+16>b.top&&row.sprite.y-16<b.bottom);
      prop.image.setAlpha(obscures?.42:1);
    }
  }
  function paintActor(node,id){
    const image=node.querySelector('.hunt-iso-avatar img');
    const src=image?.currentSrc||image?.src;
    let key=textures.get(src);
    if(!key&&(!image?.complete||!image.naturalWidth)){
      const previous=actors.get(id);previous?.sprite.setVisible(false);previous?.ring.setVisible(false);
      image?.addEventListener('load',()=>{if(!disposed&&world?.contains(node)){sync();frame();}},{once:true});
      return;
    }
    if(!key){
      // Reuse the already-loaded original portrait; bound to 64px per unique image.
      key='portrait-'+nextTexture++;
      const c=document.createElement('canvas');c.width=c.height=64;
      const ctx=c.getContext('2d');ctx.beginPath();ctx.arc(32,32,31,0,Math.PI*2);ctx.clip();
      const side=Math.min(image.naturalWidth,image.naturalHeight);
      ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,64,64);
      scene.textures.addCanvas(key,c);textures.set(src,key);
    }
    let row=actors.get(id);
    if(!row){row={sprite:scene.add.image(0,0,key).setDisplaySize(44,44),ring:scene.add.graphics()};actors.set(id,row);}
    row.sprite.setVisible(true).setTexture(key).setDisplaySize(44,44);row.ring.setVisible(true);
    const x=parseFloat(node.style.left),y=parseFloat(node.style.top),depth=Number(node.style.zIndex)||20;
    row.sprite.setPosition(x,y-26).setDepth(depth+.2);
    row.ring.clear().setDepth(depth+.1).fillStyle(0x000000,.4).fillEllipse(x,y-1,44,15);
    if(node.classList.contains('selected'))row.ring.lineStyle(2,0xd8b36a,1).strokeEllipse(x,y-1,46,16);
    row.ring.lineStyle(1,0xb5a989,1).strokeCircle(x,y-26,22);
    node.classList.add('hunt-avatar-painted');row.node=node;
  }
  function sync(){
    if(!scene||!world||disposed||failed)return;
    drawTerrain();
    const live=new Set();
    for(const node of world.querySelectorAll('.hunt-iso-actor')){
      if(node.hidden)continue;
      const id=node.hasAttribute('data-hunt-halt')?'self':node.dataset.target||'player-'+node.dataset.pvpTarget;
      live.add(id);paintActor(node,id);
    }
    for(const [id,row] of actors)if(!live.has(id)){row.sprite.destroy();row.ring.destroy();actors.delete(id);}
    const used=new Set([...actors.values()].map(row=>row.sprite.texture.key));
    for(const [src,key] of textures)if(!used.has(key)){scene.textures.remove(key);textures.delete(src);}
    revealActors();world.classList.add('hunt-phaser-ready');dirty=true;
  }
  async function start(){
    if(starting||disposed||failed)return;starting=true;
    try{
      const Phaser=await loadRuntime();if(disposed)return;
      // This embedded scene shares hunt's clock and visibility lifecycle. The default
      // Game.start installs page-wide visibility/focus handlers and a second RAF loop.
      class HuntGame extends Phaser.Game {
        start(){this.isRunning=true;this.config.postBoot(this);this.step(performance.now(),0);}
      }
      game=new HuntGame({type:Phaser.AUTO,parent:host,width:Math.round(viewport.width),height:Math.round(viewport.height),
        transparent:true,banner:false,autoFocus:false,audio:{noAudio:true},input:{keyboard:false,mouse:false,touch:false,gamepad:false},
        render:{antialias:true,roundPixels:false,powerPreference:'low-power'},resolution:1,
        fps:{target:20},scene:{create(){
          scene=this;
          host.dataset.renderer=this.game.renderer.type===Phaser.CANVAS?'canvas':'webgl';
          this.game.canvas.addEventListener('webglcontextlost',fail,{once:true});
          sync();
        }}});
    }catch{fail();}
  }
  return {
    mount(nextWorld,nextField,nextViewport){
      world=nextWorld;field=nextField;viewport=nextViewport;
      if(disposed||failed||!world)return;
      const theme=combatTheme(field.environment);world.parentElement?.style.setProperty('--room-ambient',colorHex(theme.accent)+'12');
      world.prepend(host);if(scene){sync();frame();}else start();
    },
    moveSelf(){
      const row=actors.get('self');if(!row||!scene||disposed||failed)return;
      const x=parseFloat(row.node.style.left),y=parseFloat(row.node.style.top);
      if(row.sprite.x===x&&row.sprite.y===y-26)return;
      paintActor(row.node,'self');revealActors();dirty=true;frame();
    },
    refresh(){dirty=true;frame();},
    destroy(){disposed=true;release();},
  };
}

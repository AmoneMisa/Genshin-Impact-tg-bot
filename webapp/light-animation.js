import {escapeHtml} from './escape-html.js';

export function lightAnimationHtml(name,alt='') {
 return `<img class="light-game-art" data-light-animation="${escapeHtml(name)}" src="/art/minigames/${escapeHtml(name)}-idle.webp" width="320" height="${name==='forge'?280:320}" alt="${escapeHtml(alt)}" decoding="async">`;
}

/** A finite WebP, stopped on hide/close. Reduced motion uses the result frame immediately. */
export function playLightAnimation(img,{name,duration=1300,signal,resultSrc}={}) {
 if(!img||signal?.aborted)return Promise.resolve();
 const idle=img.src;
 if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){img.src=resultSrc||idle;return Promise.resolve();}
 return new Promise(resolve=>{
  let done=false;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);document.removeEventListener('visibilitychange',hidden);signal?.removeEventListener('abort',finish);img.src=resultSrc||idle;resolve();};
  const hidden=()=>{if(document.hidden)finish();};
  const timer=setTimeout(finish,duration);
  document.addEventListener('visibilitychange',hidden);signal?.addEventListener('abort',finish,{once:true});
  img.src=`/art/minigames/${name}.webp`;
 });
}

import {CLASS_EMBLEMS} from './art/l2-class-emblems.js';
import {escapeHtml as esc} from './escape-html.js';

export function classEmblemHtml(player={}){
 const key=CLASS_EMBLEMS[player.className],title=player.classTitle||player.className||'';
 return key?'<img class="character-portrait class-emblem" src="/art/l2-classes/'+key+'.webp" alt="'+esc(title)+'" title="'+esc(title)+'" width="32" height="32" decoding="async">'
  :'<span class="character-portrait class-emblem ui-icon-missing" role="img" aria-label="'+esc(title)+'" title="'+esc(title)+' · '+esc('Иконка класса отсутствует в подтверждённом наборе')+'">?</span>';
}

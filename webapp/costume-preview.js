import {avatarCostumeArtUrl, AVATAR_COSTUME_VARIANTS} from './art/avatar-costume-art.js';
import {avatarCostumeIconUrl} from './art/avatar-costume-icons.js';
import {avatarCostumeHtml,installAvatarCostumeMotion} from './avatar-costume-view.js';
import {escapeHtml} from './escape-html.js';
import {createGamePopup} from './game-popup.js';
import {installOverlayA11y} from './overlay-a11y.js';

export function costumeIconHtml(id,size=64) {
  const src=avatarCostumeIconUrl(id,size);
  return src ? `<img src="${src}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">` : '';
}
export function costumePreviewHtml(id,player={}) {
  const variant=AVATAR_COSTUME_VARIANTS.find(v=>v.costumeId===id);
  if(!variant)return '';
  const model={...player,gender:variant.gender};
  const src=avatarCostumeArtUrl(id,model,512);
  return src ? `<div class="costume-preview">${avatarCostumeHtml({id,src,name:variant.name})}</div>` : '';
}
export function openCostumePreview(id,player={}) {
  const name=AVATAR_COSTUME_VARIANTS.find(v=>v.costumeId===id)?.name||'Костюм';
  const popup=createGamePopup({title:name,panelClass:'game-dialog-panel costume-preview-panel',body:costumePreviewHtml(id,player)});
  installOverlayA11y();
  installAvatarCostumeMotion();popup.show();return popup;
}
export function costumeRewardHtml(prize,player={}) {
  const duration=prize.expiresAt ? `До ${new Date(prize.expiresAt).toLocaleString('ru-RU')}` : 'Постоянный';
  return `${costumePreviewHtml(prize.costumeId,player)}<p>${escapeHtml(prize.label||'Костюм')} · ${escapeHtml(duration)}${prize.expiresAt?' · Привязан к персонажу':''}</p>`;
}

import {escapeHtml} from './escape-html.js';
import {sceneStudy,sceneStudyUrl,GRACIA_STUDIES} from './scene-catalog.js';

/** A decorative scene preview; atlas geometry and travel actions remain authoritative. */
export function scenePreviewHtml(id){
 const scene=sceneStudy(id);if(!scene)return '';
 return scenePreviewFigure({title:scene.title,url:sceneStudyUrl(id),mobileUrl:sceneStudyUrl(id,{compact:true})});
}
export function scenePreviewFigure({title,url,mobileUrl=url}){return `<figure class="location-scene-preview"><picture><source media="(min-width: 700px)" srcset="${escapeHtml(url)}"><img src="${escapeHtml(mobileUrl)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" width="768" height="512"></picture><figcaption>${escapeHtml(title)}</figcaption></figure>`;}
export const graciaOverviewHtml=()=>`<p>Грация: база альянса Кецеруса и три Семени. Рейсовый воздушный корабль отправляется с пристани Глудио. Выберите точку на карте, чтобы посмотреть маршрут и условия входа.</p><div class="location-scene-gallery">${GRACIA_STUDIES.map(scene=>scenePreviewHtml(scene.id)).join('')}</div>`;
export function bindScenePreviews(root){
 root.querySelectorAll('.location-scene-preview img').forEach(image=>image.addEventListener('error',()=>image.closest('figure')?.remove(),{once:true}));
}

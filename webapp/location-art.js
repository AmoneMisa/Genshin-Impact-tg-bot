import {escapeHtml} from './escape-html.js';
import {sceneStudy,sceneStudyUrl,GRACIA_STUDIES} from './scene-catalog.js';

/** A decorative scene preview; atlas geometry and travel actions remain authoritative. */
export function scenePreviewHtml(id){
 const scene=sceneStudy(id);if(!scene)return '';
 return `<figure class="location-scene-preview"><picture><source media="(min-width: 700px)" srcset="${sceneStudyUrl(id)}"><img src="${sceneStudyUrl(id,{compact:true})}" alt="${escapeHtml(scene.title)}" loading="lazy" decoding="async" width="768" height="512"></picture><figcaption>${escapeHtml(scene.title)}</figcaption></figure>`;
}
export const graciaOverviewHtml=()=>`<p>Обзор Грации. Маршруты и точки входа пока не добавлены.</p><div class="location-scene-gallery">${GRACIA_STUDIES.map(scene=>scenePreviewHtml(scene.id)).join('')}</div>`;
export function bindScenePreviews(root){
 root.querySelectorAll('.location-scene-preview img').forEach(image=>image.addEventListener('error',()=>image.closest('figure')?.remove(),{once:true}));
}

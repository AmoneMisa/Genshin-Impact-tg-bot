import {scenePreviewFigure} from './location-art.js';
const scenes=Object.freeze({'hall:21':['hall-resistance','Крепость Сопротивления'],'hall:34':['hall-devastated','Разорённый замок'],'hall:35':['hall-bandit','Цитадель Бандитов'],'hall:62':['hall-rainbow','Дворец радужных источников'],'hall:63':['hall-beast','Заповедник Диких Зверей'],'hall:64':['hall-dead','Крепость Мёртвых']});
export const hallDevelopmentLevel=value=>Math.max(1,Math.min(5,Math.floor(Number(value)||1)));
export function hallSceneUrl(holding,{level=1,room='interior',compact=false}={}){
 const actual=hallDevelopmentLevel(level),asset=room==='courtyard'&&scenes[holding?.id]?scenes[holding.id][0]:actual===3?'interior-hall':'hall-level-'+actual;
 return `/art/world/scenes/${asset}${compact?'-mobile':''}-v1.webp`;
}
export function hallLocationPreviewHtml(holding,{level=1,room=holding?.conquerable?'courtyard':'interior'}={}){
 const title=room==='courtyard'?scenes[holding?.id]?.[1]||holding.name:`${holding?.name||'Зал клана'} · ${hallDevelopmentLevel(level)} ур.`;
 return scenePreviewFigure({title,url:hallSceneUrl(holding,{level,room}),mobileUrl:hallSceneUrl(holding,{level,room,compact:true})});
}

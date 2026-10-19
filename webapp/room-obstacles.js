// Presentation only. Collision rectangles stay on the server; never draw them as box walls.
const KINDS=new Set(['pillar','tree','rock','sarcophagus']);
export function roomObstacleProps(walls=[]){
 return walls.flatMap((wall,index)=>{
  if(KINDS.has(wall.kind))return [{...wall,index}];
  let cols=Math.max(1,Math.ceil(wall.w/.12)),rows=Math.max(1,Math.ceil(wall.h/.12));
  if(cols*rows>6){cols=Math.max(1,Math.min(6,Math.round(Math.sqrt(6*wall.w/Math.max(.001,wall.h)))));rows=Math.max(1,Math.floor(6/cols));}
  const width=wall.w/cols,height=wall.h/rows,props=[];
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const i=row*cols+col,offset=(i%2?1:-1)*.045;
   props.push({kind:'rock',rubble:true,index:index*7+i,x:wall.x+col*width+width*(.04+offset),y:wall.y+row*height+height*(.04-offset),w:width*.92,h:height*.92,
    heightScale:Math.max(.55,Math.min(1.5,(width+height)/.14))});
  }
  return props;
 });
}

/** An irregular stone silhouette is also visible if the painted atlas cannot load. */
export function obstacleStoneOutline(foot,width,height,index=0){
 return Array.from({length:11},(_,i)=>{
  const angle=i*Math.PI*2/11,roughness=.86+((i*7+index*3)%5)*.035;
  return {x:foot.x+Math.cos(angle)*width*.5*roughness,y:foot.y-height*.42+Math.sin(angle)*height*.48*roughness};
 });
}

/** SVG images have no HTML img fallback: hide the browser's broken-image rectangle explicitly. */
export function bindRoomObstacleFallback(root){
 root?.querySelectorAll('[data-room-prop-art]').forEach(image=>{
  if(image.dataset.fallbackBound)return;image.dataset.fallbackBound='true';
  const fallback=image.closest('.hunt-iso-prop')?.querySelector('[data-prop-fallback]');
  image.addEventListener('load',()=>{if(fallback)fallback.style.display='none';},{once:true});
  image.addEventListener('error',()=>{image.style.display='none';if(fallback)fallback.style.removeProperty('display');},{once:true});
 });
}

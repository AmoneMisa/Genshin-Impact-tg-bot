import {MAP_TILE_IDS} from './art/world/l2/tiles.js';
const sourceTiles=MAP_TILE_IDS.map(id=>{const [col,row]=id.split('_').map(Number);return {id,x:col-20,y:row-18};});
/** Original world geometry, with bounded-resolution tiles. Only visible tiles are requested. */
export function drawAtlasTiles(ctx,{width,height,project,unproject,pic}){
 const a=unproject({x:0,y:0}),b=unproject({x:width,y:height}),compact=width<700;
 if(![a.x,a.y,b.x,b.y,width,height].every(Number.isFinite)||width<=0||height<=0)return;
 const left=Math.floor(a.x/32768),right=Math.floor(b.x/32768),top=Math.floor(a.y/32768),bottom=Math.floor(b.y/32768);
 // Match the existing image-cache capacity. Requesting more visible tiles than
 // it can hold evicts tiles still on screen; each load then starts another draw.
 // The world overview remains underneath the lower-priority perimeter tiles.
 const cx=(a.x+b.x)/65536,cy=(a.y+b.y)/65536;
 const tiles=sourceTiles
  .filter(t=>t.x>=left&&t.x<=right&&t.y>=top&&t.y<=bottom)
  .sort((p,q)=>Math.hypot(p.x+.5-cx,p.y+.5-cy)-Math.hypot(q.x+.5-cx,q.y+.5-cy)||p.x-q.x||p.y-q.y)
  .slice(0,compact?12:24);
 for(const {id,x,y} of tiles){
  const image=pic(`/art/world/l2/${id}${compact?'-mobile':''}.webp`);if(!image?.complete||!image.naturalWidth)continue;
  const p=project({x:x*32768,y:y*32768}),q=project({x:(x+1)*32768,y:(y+1)*32768});ctx.drawImage(image,p.x,p.y,q.x-p.x,q.y-p.y);
 }
}

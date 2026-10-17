import {MAP_TILE_IDS} from './art/world/l2/tiles.js';
const available=new Set(MAP_TILE_IDS);
/** Original world geometry, with bounded-resolution tiles. Only visible tiles are requested. */
export function drawAtlasTiles(ctx,{width,height,project,unproject,pic}){
 const a=unproject({x:0,y:0}),b=unproject({x:width,y:height}),compact=width<700;
 const left=Math.floor(a.x/32768),right=Math.floor(b.x/32768),top=Math.floor(a.y/32768),bottom=Math.floor(b.y/32768);
 for(let x=left;x<=right;x++)for(let y=top;y<=bottom;y++){
  const id=`${x+20}_${y+18}`;if(!available.has(id))continue;
  const image=pic(`/art/world/l2/${id}${compact?'-mobile':''}.webp`);if(!image?.complete||!image.naturalWidth)continue;
  const p=project({x:x*32768,y:y*32768}),q=project({x:(x+1)*32768,y:(y+1)*32768});ctx.drawImage(image,p.x,p.y,q.x-p.x,q.y-p.y);
 }
}

/** Covered geodata footprint in the same world projection as actors and paths.
 * Static SVG only; no collision, animation, extra canvas, or image requirement.
 */
export function drawNativeInteriorMap(ctx,map,{width,height,project,pic}){
 if(!map?.bounds)return false;
 ctx.save();ctx.fillStyle='#101412';ctx.fillRect(0,0,width,height);
 const image=pic(map.asset),b=map.bounds;
 if(image?.complete&&image.naturalWidth){const a=project({x:b.x,y:b.y}),z=project({x:b.x+b.w,y:b.y+b.h});ctx.drawImage(image,a.x,a.y,z.x-a.x,z.y-a.y);}
 ctx.restore();return true;
}

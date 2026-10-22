/** Raster portrait marker shared by world, city, clan hall and siege maps. */
export function drawPortraitMarker(ctx,{x,y,r=24,image=null,label='',sub='',glyph='·',fill='#223630',edge='#dabd75',labelColor='#fff0cf',zoom=1,anchorY=.5,labelWidth=130}){
 ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
 if(image?.complete&&image.naturalWidth){
  ctx.save();ctx.clip();const size=Math.min(image.naturalWidth,image.naturalHeight)/zoom;
  const sx=(image.naturalWidth-size)/2,sy=Math.max(0,Math.min(image.naturalHeight-size,image.naturalHeight*anchorY-size/2));
  ctx.drawImage(image,sx,sy,size,size,x-r,y-r,r*2,r*2);ctx.restore();
 }else {ctx.textAlign='center';ctx.font='bold 25px Georgia';ctx.fillStyle=edge;ctx.fillText(glyph,x,y+8);}
 ctx.strokeStyle=edge;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
 ctx.textAlign='center';ctx.font='600 12px system-ui';ctx.lineWidth=4;ctx.strokeStyle='#13201a';ctx.strokeText(label,x,y+r+16,labelWidth);ctx.fillStyle=labelColor;ctx.fillText(label,x,y+r+16,labelWidth);
 if(sub){ctx.font='11px system-ui';ctx.strokeText(sub,x,y+r+30,labelWidth);ctx.fillStyle='#dec98c';ctx.fillText(sub,x,y+r+30,labelWidth);}
 ctx.restore();
}

/** Predict only along the authoritative path between server updates. */
export function displayedPosition(actor,elapsedMs,{speed=actor.runSpeed??100,size=2000}={}){
 if(actor.worldPoint&&actor.worldMotion?.length){
  const elapsed=Math.max(0,elapsedMs),frames=actor.worldMotion;let index=0;
  while(index+1<frames.length&&frames[index+1].afterMs<=elapsed)index++;
  const from=frames[index],next=frames[index+1];
  if(!next)return {worldPoint:{...from.point}};
  const ratio=Math.max(0,(elapsed-from.afterMs)/(next.afterMs-from.afterMs));
  return {worldPoint:Object.fromEntries(['x','y','z'].map(k=>[k,from.point[k]+(next.point[k]-from.point[k])*ratio]))};
 }
 const native=Boolean(actor.worldPoint),point=native?{...actor.worldPoint}:{x:actor.x,y:actor.y};let step=Math.max(0,elapsedMs)/1000*Math.max(0,speed)/(native?1:size);
 for(const node of (native?actor.worldPath:actor.path)||[]){const distance=Math.hypot(node.x-point.x,node.y-point.y);if(distance<=step){point.x=node.x;point.y=node.y;if(native)point.z=node.z;step-=distance;}else{if(distance>0){point.x+=(node.x-point.x)*step/distance;point.y+=(node.y-point.y)*step/distance;}break;}}
 return native?{worldPoint:point}:point;
}

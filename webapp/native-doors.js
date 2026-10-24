/** Four source door footprints; no physics, polling or animation on the client. */
export function drawNativeDoors(ctx,doors,project){
 ctx.save();
 for(const door of doors||[]){
  const points=door.polygon.map(([x,y])=>project({x,y}));if(!points.length)continue;
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
  ctx.strokeStyle=door.open?'#78c4aa':'#e88979';ctx.lineWidth=door.open?2:3;ctx.stroke();
 }
 ctx.restore();
}

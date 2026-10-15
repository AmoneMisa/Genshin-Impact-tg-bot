// Baked, non-blocking surface decoration. Solid objects still come from server walls.
export function paintLocationDetails(ctx,environment,p,quad,theme,seed=0){
 const hex=n=>'#'+n.toString(16).padStart(6,'0');
 const random=i=>{const n=Math.sin(i*127.1+seed*.013)*43758.5453;return n-Math.floor(n);};
 const line=(points,color,width=1)=>{ctx.beginPath();points.forEach((a,i)=>i?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
 const polygon=(points,color)=>{ctx.beginPath();points.forEach((a,i)=>i?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();};
 const ellipse=(a,rx,ry,color)=>{ctx.beginPath();ctx.ellipse(a.x,a.y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
 ctx.save();
 if(environment==='ship'){
  // Timber deck follows the room's perspective, with iron pins and coiled rope.
  for(let y=0;y<30;y++){
   polygon(quad(0,y/30,1,.029),y%3?'rgba(92,64,39,.28)':'rgba(153,111,63,.23)');
   line([p(0,y/30),p(1,y/30)],'rgba(12,12,12,.5)');
   for(const x of [.08,.33,.66,.92]){const a=p(x,y/30+.014);ellipse(a,1.3,.7,'#191c1d');}
  }
  for(const pos of [[.13,.18],[.83,.76]]){const a=p(...pos);ctx.strokeStyle='#ad9270';ctx.lineWidth=2;for(let r=5;r<20;r+=3){ctx.beginPath();ctx.ellipse(a.x,a.y,r,r*.47,0,0,Math.PI*2);ctx.stroke();}}
 }else if(environment==='ice'){
  for(let i=0;i<25;i++){
   const x=.04+random(i)*.9,y=.04+random(i+70)*.9,a=p(x,y),b=p(x+.035,y+.02),c=p(x+.01,y+.08);
   polygon([a,b,c],i%2?'rgba(175,224,239,.12)':'rgba(25,56,89,.22)');line([a,b,c],'rgba(187,233,249,.25)',.8);
  }
  for(const [x,y] of [[.14,.16],[.86,.17],[.15,.85],[.83,.86]]){const a=p(x,y);for(let i=0;i<6;i++){const angle=i*Math.PI/3;line([a,{x:a.x+Math.cos(angle)*20,y:a.y+Math.sin(angle)*10}],'rgba(176,224,244,.38)');}}
 }else if(environment==='volcanic'){
  for(let i=0;i<11;i++){
   const x=.08+random(i)*.8,y=.08+random(i+20)*.8,points=[p(x,y),p(x+.025,y+.045),p(x-.01,y+.08),p(x+.04,y+.13)];
   line(points,'rgba(223,75,24,.09)',10);line(points,'rgba(246,108,36,.45)',2);line(points,'rgba(255,187,77,.6)',.7);
  }
 }else if(environment==='desert'){
  for(let i=0;i<30;i++){
   const x=random(i)*.9,y=random(i+70)*.9;
   line([p(x,y),p(x+.045,y+.015),p(x+.09,y+.006),p(x+.13,y+.02)],'rgba(214,184,126,.2)',1);
  }
  for(let i=0;i<20;i++){const a=p(random(i+20),random(i+100));polygon([{x:a.x-3,y:a.y},{x:a.x,y:a.y-2},{x:a.x+5,y:a.y},{x:a.x,y:a.y+2}],'rgba(67,48,31,.4)');}
 }else if(environment==='springs'){
  const a=p(.77,.3);ctx.strokeStyle='rgba(222,218,175,.4)';ctx.lineWidth=3;
  for(const r of [1.1,1.18]){ctx.beginPath();ctx.ellipse(a.x,a.y,100*r,43*r,-.15,.1,5.2);ctx.stroke();}
  for(let i=0;i<22;i++){const angle=i*Math.PI*2/22;ellipse({x:a.x+Math.cos(angle)*118,y:a.y+Math.sin(angle)*53},3+random(i)*3,2,'rgba(151,151,121,.7)');}
  for(let i=0;i<4;i++){const b=p(.68+i*.05,.31-i*.02);line([{x:b.x,y:b.y-3},{x:b.x-6,y:b.y-14},{x:b.x+3,y:b.y-26}],'rgba(195,224,215,.13)',5);}
 }else if(environment==='marsh'){
  for(let i=0;i<30;i++){
   const x=.07+random(i)*.86,y=.07+random(i+90)*.86,a=p(x,y);
   ellipse(a,6+random(i+3)*8,2.5,'rgba(19,38,31,.3)');
   for(let j=0;j<3;j++)line([a,{x:a.x-4+j*4,y:a.y-9-random(i+j)*9}],'rgba(116,132,71,.6)',1);
  }
  const a=p(.77,.3);for(let i=0;i<7;i++)ellipse({x:a.x+(random(i)-.5)*120,y:a.y+(random(i+6)-.5)*35},5,2.5,'#526d44');
 }else if(environment==='woodland'){
  for(let i=0;i<65;i++){const a=p(.04+random(i)*.9,.04+random(i+80)*.9);polygon([{x:a.x-2,y:a.y},{x:a.x+1,y:a.y-2},{x:a.x+4,y:a.y},{x:a.x,y:a.y+1}],i%3?'rgba(161,123,60,.3)':'rgba(165,158,88,.3)');}
  for(let i=0;i<12;i++){const a=p(.05+random(i)*.9,.05+random(i+50)*.9);for(let j=-2;j<=2;j++)line([{x:a.x,y:a.y},{x:a.x+j*4,y:a.y-5-Math.abs(j)*2}],'rgba(106,143,76,.55)');}
 }else if(environment==='cavern'){
  for(let i=0;i<17;i++){const x=.04+random(i)*.85,y=.04+random(i+90)*.85;line([p(x,y),p(x+.025,y+.01),p(x+.02,y+.06),p(x+.06,y+.07)],'rgba(6,13,21,.42)',1);}
  for(const [x,y] of [[.12,.2],[.85,.78]]){const a=p(x,y);for(let i=0;i<5;i++)polygon([{x:a.x+i*4-7,y:a.y},{x:a.x+i*4-5,y:a.y-6-i%3*3},{x:a.x+i*4-2,y:a.y-1}],'rgba(122,155,172,.45)');}
 }else if(environment==='necropolis'){
  for(const [x,y] of [[.13,.24],[.85,.24],[.13,.7],[.85,.7]]){
   const a=p(x,y);ctx.strokeStyle='rgba(162,190,180,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(a.x,a.y,16,8,0,0,Math.PI*2);ctx.stroke();line([{x:a.x-8,y:a.y},{x:a.x+8,y:a.y}],'rgba(162,190,180,.35)');
  }
 }else{
  // Small corner mosaics keep the central combat aisle readable.
  for(const [x,y] of [[.13,.14],[.83,.14],[.13,.85],[.83,.85]]){polygon(quad(x,y,.04,.04),hex(theme.trim)+'50');polygon(quad(x+.01,y+.01,.02,.02),hex(theme.floor));}
 }
 ctx.restore();
}

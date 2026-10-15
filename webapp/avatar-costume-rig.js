// Canvas 2D deformation of the original painting. Coordinates belong to a reviewed
// painting, never inferred from race alone. No extra downloaded animation textures.
const TAU = Math.PI * 2;
const clamp = x => Math.max(0, Math.min(1, x));
const bell = (x, c, r) => Math.exp(-Math.pow((x - c) / r, 2) * 2);
const smooth = x => {const t=clamp(x);return t*t*(3-2*t);};

// A single attached wing rotates as a whole; it never uses the cloth wave.
export function wingWeight(x,y,wing) {
  if(!wing)return 0;
  let inside=false,distance=Infinity;
  const points=wing.outline;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,ay]=points[j],[bx,by]=points[i];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
    const vx=bx-ax,vy=(by-ay)*1.5,dx=x-ax,dy=(y-ay)*1.5;
    const t=clamp((dx*vx+dy*vy)/(vx*vx+vy*vy));
    distance=Math.min(distance,Math.hypot(dx-vx*t,dy-vy*t));
  }
  const edge=inside?1:1-smooth(distance/.025);
  const [px,py]=wing.pivot;
  return edge*smooth((Math.hypot(x-px,(y-py)*1.5)-.035)/.13);
}

function capsuleWeight(x,y,arm,attached) {
  const [px,py,hx,hy,radius]=arm;
  const vx=hx-px,vy=(hy-py)*1.5,dx=x-px,dy=(y-py)*1.5;
  const along=clamp((dx*vx+dy*vy)/(vx*vx+vy*vy));
  const distance=Math.hypot(dx-vx*along,dy-vy*along);
  return smooth((radius*1.35-distance)/(radius*.65))*(attached?smooth(along/.22):1);
}
export const rigidArmWeight=(x,y,arm)=>capsuleWeight(x,y,arm,true);
function visibleWingWeight(x,y,rig){
  let weight=wingWeight(x,y,rig.wing);
  // The painted wing is behind the character's arms. Keep foreground arms
  // out of its rotation field, including a sleeve overlapping white feathers.
  const pose=rig.poseReview;
  if(pose)for(let i=0;i<2;i++){
    const [px,py]=pose.shoulders[i],[hx,hy]=pose.hands[i];
    weight*=1-capsuleWeight(x,y,[px,py,hx,hy,pose.key.includes('dwarf-')||pose.key.includes('orc-')?.055:.035],false);
  }
  // Explicitly traced foreground props can overlap the painted feather wing.
  // Keep the swim ring/board rigid while the feathers behind it rotate.
  for(const [x0,y0,x1,y1,feather] of rig.wing?.foregroundAreas||[]){
    const distance=Math.hypot(Math.max(x0-x,0,x-x1),Math.max(y0-y,0,y-y1));
    weight*=smooth(distance/feather);
  }
  return weight;
}
function fixedWeight(x,y,rig){
  let weight=0;
  for(const [x0,y0,x1,y1,feather]of rig.fixedAreas||[]){
    const distance=Math.hypot(Math.max(x0-x,0,x-x1),Math.max(y0-y,0,y-y1));
    weight=Math.max(weight,1-smooth(distance/feather));
  }
  for(const path of rig.fixedPaths||[])weight=Math.max(weight,capsuleWeight(x,y,path,false));
  return weight;
}
function shoulderBreath(px,py,rig,seconds){
  const [cx,cy]=rig.face,b=Math.sin(seconds*TAU/6)*(rig.breathStrength??.7);
  const torso=bell(py,cy+.22,.19)*bell(px,cx,.25),head=bell(py,cy,.09)*bell(px,cx,.12);
  return [(px-cx)*.003*torso*b,(-.0008*torso-.0005*head)*b];
}

export function blinkAmount(seconds, phase = 0) {
  const t = ((seconds + phase) % 5.7 + 5.7) % 5.7;
  return t < .24 ? Math.sin(t / .24 * Math.PI) ** 2 : 0;
}

export function deformCostumePoint(x, y, rig, seconds) {
  const [cx, cy] = rig.face;
  const breath = Math.sin(seconds * TAU / 6);
  const breathStrength = rig.breathStrength ?? .7;
  const torso = bell(y, cy + .22, .19) * bell(x, cx, .25);
  let dx = (x - cx) * .003 * breath * torso * breathStrength;
  let dy = -.0008 * breath * torso * breathStrength;
  // Neck/head follow the chest without bending the face. Feet remain planted.
  const head = bell(y, cy, .09) * bell(x, cx, .12);
  dy -= .0005 * breath * head * breathStrength;
  for (const [hx, hy, rx, ry, strength] of rig.hair) {
    const weight = bell(x, hx, rx) * bell(y, hy, ry);
    dx += .0038 * strength * weight * Math.sin(seconds * TAU / 6.1 - y * 7);
    dy += .0006 * strength * weight * Math.sin(seconds * TAU / 6.1 - y * 7 + .6);
  }
  for (const [hx, hy, rx, ry, strength] of rig.cloth) {
    const gate = rig.clothStart === undefined ? 1 : smooth((y-rig.clothStart)/.10);
    const weight = bell(x, hx, rx) * bell(y, hy, ry) * gate;
    dx += .0045 * strength * weight * Math.sin(seconds * TAU / 7.3 - y * 8);
    dy += .0008 * strength * weight * Math.sin(seconds * TAU / 7.3 - y * 8 + 1);
  }
  // Blinking is composited within each reviewed eye region; eyebrows, glasses
  // and facial proportions are not compressed with the eye.
  const feet = clamp((.93 - y) / .07);
  const fixed=fixedWeight(x,y,rig);
  let target=[x+dx*feet*(1-fixed),y+dy*feet*(1-fixed)];
  for(const arm of rig.arms||[]){
    const [px,py,,, ,amplitude,phase]=arm,weight=rigidArmWeight(x,y,arm)*(1-fixed);
    const angle=amplitude*Math.sin(seconds*TAU/6+phase),s=Math.sin(angle),c=Math.cos(angle);
    const [bx,by]=shoulderBreath(px,py,rig,seconds);
    const rx=px+(x-px)*c-(y-py)*s*1.5+bx,ry=py+(x-px)*s/1.5+(y-py)*c+by;
    target=[target[0]*(1-weight)+rx*weight,target[1]*(1-weight)+ry*weight];
  }
  if(rig.wing){
    const wing=rig.wing,[px,py]=wing.pivot,weight=visibleWingWeight(x,y,rig);
    const angle=wing.amplitude*Math.sin(seconds*TAU/wing.period+wing.phase),s=Math.sin(angle),c=Math.cos(angle);
    const rx=px+(x-px)*c-(y-py)*s*1.5,ry=py+(x-px)*s/1.5+(y-py)*c;
    target=[target[0]*(1-weight)+rx*weight,target[1]*(1-weight)+ry*weight];
  }
  return target;
}

export function createCostumeRig(image, rig) {
  const doc=image.ownerDocument, win=doc.defaultView;
  const canvas=doc.createElement('canvas');canvas.className='avatar-costume-canvas';
  canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d');
  if (!ctx) return null;
  canvas.width=Math.max(64,Math.round(Math.min(384,image.naturalWidth,image.clientWidth*Math.min(win.devicePixelRatio||1,1.5))));canvas.height=Math.round(canvas.width*image.naturalHeight/image.naturalWidth);
  const width=canvas.width,height=canvas.height,count=width*height;
  const sourceCanvas=doc.createElement('canvas');sourceCanvas.width=width;sourceCanvas.height=height;
  const sourceContext=sourceCanvas.getContext('2d');sourceContext.drawImage(image,0,0,width,height);
  const pixels=sourceContext.getImageData(0,0,width,height).data;
  const source=new Float32Array(count*4);
  for(let i=0;i<count;i++){const p=i*4,a=pixels[p+3]/255;source[p]=pixels[p]*a;source[p+1]=pixels[p+1]*a;source[p+2]=pixels[p+2]*a;source[p+3]=pixels[p+3];}
  const closed=source.slice();
  for(const [ex,ey,rx,ry]of rig.eyes){
    const cx=ex*width,cy=ey*height,halfWidth=rx*width*1.4,halfHeight=ry*height*.7;
    for(let row=Math.max(0,Math.floor(cy-halfHeight*1.2));row<Math.min(height,cy+halfHeight*1.2);row++)for(let col=Math.max(0,Math.floor(cx-halfWidth*1.2));col<Math.min(width,cx+halfWidth*1.2);col++){
      const nx=(col-cx)/halfWidth,ny=(row-cy)/halfHeight,radius=Math.hypot(nx,ny);
      const edge=clamp((1.15-radius)/.35);if(!edge)continue;
      const weight=edge*edge*(3-2*edge),p=(row*width+col)*4;
      // Lid shading comes from the same face just below the eye, with a soft
      // elliptical transition. Lash colour comes from the painted eye itself.
      const skinRow=Math.min(height-1,Math.round(cy+halfHeight*1.3));
      const skin=(skinRow*width+col)*4;
      let lash=skin,darkest=Infinity;
      for(let y=Math.max(0,Math.round(cy-halfHeight*.55));y<=Math.min(height-1,Math.round(cy+halfHeight*.3));y++){
        const candidate=(y*width+col)*4,light=source[candidate]+source[candidate+1]+source[candidate+2];
        if(light<darkest){darkest=light;lash=candidate;}
      }
      const lineY=cy+halfHeight*.1*(1-nx*nx),line=clamp(.9-Math.abs(row-lineY))*clamp((1.05-Math.abs(nx))/.2);
      for(let channel=0;channel<4;channel++){
        const lid=source[skin+channel]*(1-line)+source[lash+channel]*line;
        closed[p+channel]=source[p+channel]*(1-weight)+lid*weight;
      }
    }
  }
  // Cache the smooth motion fields once. Each frame only combines sine/cosine
  // coefficients and samples the original pixels. This avoids triangle seams.
  const fields=Array.from({length:10},()=>new Float32Array(count));
  const arms=(rig.arms||[]).map(arm=>({arm,weights:new Float32Array(count)}));
  const wingWeights=rig.wing?new Float32Array(count):null;
  const [cx,cy]=rig.face;
  for(let row=0;row<height;row++)for(let col=0;col<width;col++){
    const x=col/width,y=row/height,i=row*width+col,feet=clamp((.93-y)/.07)*(1-fixedWeight(x,y,rig));
    for(const state of arms)state.weights[i]=rigidArmWeight(x,y,state.arm)*(1-fixedWeight(x,y,rig));
    if(wingWeights)wingWeights[i]=visibleWingWeight(x,y,rig);
    const torso=bell(y,cy+.22,.19)*bell(x,cx,.25),head=bell(y,cy,.09)*bell(x,cx,.12);
    const breathStrength=rig.breathStrength??.7;
    fields[0][i]=(x-cx)*.003*torso*feet*breathStrength;fields[1][i]=(-.0008*torso-.0005*head)*feet*breathStrength;
    for(const [hx,hy,rx,ry,strength]of rig.hair){
      const weight=bell(x,hx,rx)*bell(y,hy,ry)*strength*feet,phase=-y*7;
      fields[2][i]+=.0038*weight*Math.cos(phase);fields[3][i]+=.0038*weight*Math.sin(phase);
      fields[4][i]+=.0006*weight*Math.cos(phase+.6);fields[5][i]+=.0006*weight*Math.sin(phase+.6);
    }
    for(const [hx,hy,rx,ry,strength]of rig.cloth){
      const gate=rig.clothStart===undefined?1:smooth((y-rig.clothStart)/.10);
      const weight=bell(x,hx,rx)*bell(y,hy,ry)*strength*feet*gate,phase=-y*8;
      fields[6][i]+=.0045*weight*Math.cos(phase);fields[7][i]+=.0045*weight*Math.sin(phase);
      fields[8][i]+=.0008*weight*Math.cos(phase+1);fields[9][i]+=.0008*weight*Math.sin(phase+1);
    }
  }
  const output=ctx.createImageData(width,height),dest=output.data;
  ctx.drawImage(sourceCanvas,0,0);
  let stopped=false;
  function layout() {
    const scale=Math.min(image.clientWidth/image.naturalWidth,image.clientHeight/image.naturalHeight);
    const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
    const bottom=win.getComputedStyle(image).objectPosition.includes('bottom') || win.getComputedStyle(image).objectPosition.endsWith('100%');
    Object.assign(canvas.style,{left:`${image.offsetLeft+(image.clientWidth-width)/2}px`,top:`${image.offsetTop+(image.clientHeight-height)*(bottom?1:.5)}px`,width:`${width}px`,height:`${height}px`});
  }
  image.after(canvas);layout();
  const resize=typeof win.ResizeObserver==='function'?new win.ResizeObserver(layout):null;resize?.observe(image);
  function draw(seconds, blink) {
    if (stopped) return;
    const start=win.performance.now();
    const closure=blink??blinkAmount(seconds,rig.phase);
    const b=Math.sin(seconds*TAU/6),hs=Math.sin(seconds*TAU/6.1),hc=Math.cos(seconds*TAU/6.1),cs=Math.sin(seconds*TAU/7.3),cc=Math.cos(seconds*TAU/7.3);
    const wingAngle=rig.wing?rig.wing.amplitude*Math.sin(seconds*TAU/rig.wing.period+rig.wing.phase):0;
    const ws=Math.sin(wingAngle),wc=Math.cos(wingAngle);
    const transforms=arms.map(state=>{
      const [px,py,,,,amplitude,phase]=state.arm,angle=amplitude*Math.sin(seconds*TAU/6+phase);
      const [bx,by]=shoulderBreath(px,py,rig,seconds);
      return {weights:state.weights,px,py,bx,by,s:Math.sin(angle),c:Math.cos(angle)};
    });
    for(let row=0;row<height;row++)for(let col=0;col<width;col++){
      const i=row*width+col,p=i*4;
      let x=col/width-(fields[0][i]*b+fields[2][i]*hs+fields[3][i]*hc+fields[6][i]*cs+fields[7][i]*cc);
      let y=row/height-(fields[1][i]*b+fields[4][i]*hs+fields[5][i]*hc+fields[8][i]*cs+fields[9][i]*cc);
      for(const arm of transforms){
        const weight=arm.weights[i];if(weight<.001)continue;
        const dx=col/width-arm.px-arm.bx,dy=row/height-arm.py-arm.by;
        const rx=arm.px+dx*arm.c+dy*arm.s*1.5,ry=arm.py-dx*arm.s/1.5+dy*arm.c;
        x=x*(1-weight)+rx*weight;y=y*(1-weight)+ry*weight;
      }
      if(wingWeights&&wingWeights[i]>.001){
        const weight=wingWeights[i],[px,py]=rig.wing.pivot,dx=col/width-px,dy=row/height-py;
        x=x*(1-weight)+(px+dx*wc+dy*ws*1.5)*weight;
        y=y*(1-weight)+(py-dx*ws/1.5+dy*wc)*weight;
      }
      x*=width;y*=height;
      if(x<0||y<0||x>=width-1||y>=height-1){dest[p]=dest[p+1]=dest[p+2]=dest[p+3]=0;continue;}
      const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
      const a=(iy*width+ix)*4,c=a+width*4;
      const w0=(1-fx)*(1-fy),w1=fx*(1-fy),w2=(1-fx)*fy,w3=fx*fy;
      const blend=closure>.001?closure:0;
      const openAlpha=source[a+3]*w0+source[a+7]*w1+source[c+3]*w2+source[c+7]*w3;
      const alpha=blend?(openAlpha*(1-blend)+(closed[a+3]*w0+closed[a+7]*w1+closed[c+3]*w2+closed[c+7]*w3)*blend):openAlpha;
      dest[p+3]=alpha;
      if(alpha<.01){dest[p]=dest[p+1]=dest[p+2]=0;continue;}
      const unpremultiply=255/alpha;
      for(let channel=0;channel<3;channel++){
        const open=source[a+channel]*w0+source[a+4+channel]*w1+source[c+channel]*w2+source[c+4+channel]*w3;
        dest[p+channel]=(blend?(open*(1-blend)+(closed[a+channel]*w0+closed[a+4+channel]*w1+closed[c+channel]*w2+closed[c+4+channel]*w3)*blend):open)*unpremultiply;
      }
    }
    ctx.putImageData(output,0,0);
    canvas.dataset.blink=String(closure);
    return win.performance.now()-start;
  }
  return {canvas,draw,setActive(active){if(canvas.hidden===active)canvas.hidden=!active;image.toggleAttribute('data-avatar-rig-active',active);},destroy(){stopped=true;resize?.disconnect();canvas.remove();image.removeAttribute('data-avatar-rig-active');image.removeAttribute('data-avatar-rig-failed');}};
}

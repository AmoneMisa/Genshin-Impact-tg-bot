// Custom environment paintings; never used as original L2 item or skill art.
const URL='/art/world/room-props-v1.webp';
let atlas=null,stone=null,atlasPending=null,stonePending=null;
// Bounds and root anchors in the 1536×1024 source painting, including gutters.
const sprites=[
 {x:170,y:0,width:230,height:512,anchorX:117,anchorY:510},
 {x:455,y:0,width:593,height:512,anchorX:313,anchorY:504},
 {x:1050,y:120,width:480,height:387,anchorX:240,anchorY:369},
 {x:30,y:575,width:585,height:425,anchorX:300,anchorY:401},
 {x:702,y:518,width:214,height:487,anchorX:103,anchorY:477},
 {x:1136,y:512,width:258,height:508,anchorX:128,anchorY:495},
];
const load=url=>new Promise(resolve=>{
  const image=new Image();let done=false;
  const finish=value=>{if(done)return;done=true;clearTimeout(timer);image.onload=image.onerror=null;resolve(value);};
  const timer=setTimeout(()=>finish(null),5000);
  image.onload=()=>finish(image);image.onerror=()=>finish(null);image.src=url;
});
export function loadRoomPropArt({floor=true}={}){
 atlasPending??=load(URL).then(image=>{atlas=image;});
 if(floor)stonePending??=load('/art/world/crypt-floor-v1.webp').then(image=>{stone=image;});
 return Promise.all([atlasPending,stonePending]);
}
export const paintedStoneFloor=()=>stone;
export const roomPropHeight=(kind,index=0)=>(kind==='pillar'?125:kind==='tree'?145:kind==='rock'?65:55)*(1+(index%3-1)*.07);
export function roomPropSprite(kind,environment){
 const cell=kind==='pillar'?(environment==='ice'?5:environment==='ship'?4:0):kind==='tree'?1:kind==='rock'?2:kind==='sarcophagus'?3:null;
 if(cell===null)return null;
 return {url:URL,...sprites[cell]};
}
export function paintedProp(kind,environment){
 const sprite=roomPropSprite(kind,environment);
 return atlas&&sprite?{image:atlas,...sprite}:null;
}

// H5 PaganTeleporters.java and spawns/Others/{19_16,21_16}.xml.
// The church drop is authored traversal: client jump/geodata coordinates are unavailable.
export const PAGAN_CHURCH={id:'rune:pagan-church',name:'Церковь Руны',role:'Спуск к Храму Язычников',city:'rune',x:36640,y:-51218,z:718,service:'pagan-church',gateway:false,source:'PaganTeleporters.java#TRIOLS_MIRROR_2',adapted:true};
export function withPaganRoutes(base){
 const point={x:.5,y:.5},landing={room:'r0c0',point:{x:.5,y:.75}};
 const peaceful=(number,title,asset,source)=>({number,title,asset,environment:'catacomb',rooms:[{id:'r0c0',row:0,col:0,name:title,spawns:[],mobIds:[],cap:0}],cols:1,rows:1,startId:'r0c0',sourceBounds:null,npcs:[],boss:null,layoutSource:'authored-route',source,stairs:{}});
 const church=peaceful(3,'Церковь Руны','city-rune',{x:36640,y:-51218,z:718});
 const mirror=peaceful(4,'Под церковью Руны · Зеркало Триола','pagan-temple-area-1',{x:34842,y:-49756,z:-763});
 church.transports=[{floor:4,title:'Спрыгнуть под церковь Руны',mode:'jump',room:'r0c0',point,arrival:landing,sourcePosition:null,geometry:'authored-drop'}];
 mirror.npcs=[{id:'32039',name:"Triol's Mirror",type:'L2Npc',x:.5,y:.5,source:mirror.source}];
 mirror.transports=[{floor:1,mode:'teleport',npc:'32039',room:'r0c0',point,arrival:landing,source:{x:-12766,y:-35840,z:-10856}}];
 const first={...base.floors[0],transports:[{floor:2,mode:'walk',...base.floors[0].stairs.up},{floor:3,mode:'teleport',npc:'32040',room:base.floors[0].startId,point,arrival:landing,source:{x:36640,y:-51218,z:718}}]};
 return {...base,floors:[first,base.floors[1],church,mirror]};
}

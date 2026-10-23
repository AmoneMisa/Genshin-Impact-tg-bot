import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import engine from '../../art-source/geodata/engine/source.js';import manifest from '../../data/l2j-geodata/source.js';
import {L2jGeodata,geoWorld} from '../../functions/game/world/l2jGeodata.js';import {nativeStaticSight,nativeSightRay} from '../../functions/game/world/nativeVisibility.js';

const folder='art-source/geodata/engine',out=path.resolve('.tmp/geodata/visibility-oracle');fs.mkdirSync(out,{recursive:true});
for(const [name,entry]of Object.entries(engine.files))assert.equal(createHash('sha256').update(fs.readFileSync(folder+'/'+name)).digest('hex'),entry.sha256,name);
// Extract literal method text, without rewriting bodies. Surrounding adapters
// load the real original block classes; game/server dependencies are absent.
function method(file,signature){const text=fs.readFileSync(folder+'/'+file,'utf8'),start=text.indexOf(signature);assert.ok(start>=0,signature);let pos=text.indexOf('{',start),depth=1;for(pos++;depth;pos++){if(text[pos]==='{')depth++;if(text[pos]==='}')depth--;}return text.slice(start,pos);}
const methods=[method('GeoEngine.java','public boolean checkNearestNsweAntiCornerCut('),method('GeoEngine.java','private int getLosGeoZ('),method('GeoEngine.java','public boolean canSeeTarget(int x, int y, int z, int targetX, int targetY, int targetZ)')].join('\n');
fs.writeFileSync(path.join(out,'GeoUtils.java'),'import org.l2jmobius.gameserver.geoengine.geodata.Cell;\nclass GeoUtils{'+method('GeoUtils.java','public static int computeNswe(')+'}\n');
fs.writeFileSync(path.join(out,'VisibilityProbe.java'),`import java.nio.*;import java.nio.file.*;import java.util.*;import java.util.zip.*;import java.io.*;
import org.l2jmobius.gameserver.geoengine.geodata.*;import org.l2jmobius.gameserver.geoengine.geodata.blocks.*;import org.l2jmobius.gameserver.geoengine.util.GridLineIterator3D;
public class VisibilityProbe{
 static final int ELEVATED_SEE_OVER_DISTANCE=2,MAX_SEE_OVER_HEIGHT=48;static String root;static Map<String,IRegion> cache=new LinkedHashMap<>();
 static class IRegion{
  IBlock[] blocks=new IBlock[65536];IRegion(String file)throws Exception{byte[] b;try(var s=new GZIPInputStream(Files.newInputStream(Path.of(file)))){b=s.readAllBytes();}var data=ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN);for(int i=0;i<blocks.length;i++)blocks[i]=switch(data.get()){case 0->new FlatBlock(data);case 1->new ComplexBlock(data);case 2->new MultilayerBlock(data);default->throw new IllegalArgumentException();};}
  IBlock block(int x,int y){return blocks[((x>>3)&255)*256+((y>>3)&255)];}
  boolean checkNearestNswe(int x,int y,int z,int n){return block(x,y).checkNearestNswe(x,y,z,n);}
 }
 static int getGeoX(int x){return (x>>4)+40960;}static int getGeoY(int y){return (y>>4)+36864;}
 IRegion getRegion(int x,int y){String id=(x/2048)+"_"+(y/2048);if(!cache.containsKey(id)){try{if(cache.size()>=2)cache.remove(cache.keySet().iterator().next());cache.put(id,new IRegion(root+"/"+id+".l2j.gz"));}catch(Exception e){throw new RuntimeException(e);}}return cache.get(id);}
 boolean hasGeoPos(int x,int y){return true;}int getNearestZ(int x,int y,int z){return getRegion(x,y).block(x,y).getNearestZ(x,y,z);}int getNextHigherZ(int x,int y,int z){return getRegion(x,y).block(x,y).getNextHigherZ(x,y,z);}
 ${methods}
 public static void main(String[] args)throws Exception{root=args[0];var probe=new VisibilityProbe();for(String line:Files.readAllLines(Path.of(args[1]))){String[] p=line.split(",");int[] v=new int[6];for(int i=0;i<6;i++)v[i]=Integer.parseInt(p[i+1]);if(p[0].equals("R")){var ray=new GridLineIterator3D(v[0],v[1],v[2],v[3],v[4],v[5]);var s=new StringBuilder();while(ray.next())s.append(ray.x()+","+ray.y()+","+ray.z()+";");System.out.println(s);}else System.out.println(probe.canSeeTarget(v[0],v[1],v[2],v[3],v[4],v[5]));}}
}`);
execFileSync(process.env.JAVAC||'javac',['-d',out,...['Cell.java','IBlock.java','FlatBlock.java','ComplexBlock.java','MultilayerBlock.java','GridLineIterator3D.java'].map(n=>folder+'/'+n),path.join(out,'GeoUtils.java'),path.join(out,'VisibilityProbe.java')],{stdio:'pipe',timeout:60000});
let seed=42;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),geo=new L2jGeodata({capacity:2}),cases=[];
for(let i=0;i<512;i++){const from={x:Math.floor(rand()*40)-20,y:Math.floor(rand()*40)-20,z:Math.floor(rand()*80)-40},to={x:Math.floor(rand()*40)-20,y:Math.floor(rand()*40)-20,z:Math.floor(rand()*80)-40};cases.push({kind:'R',from,to,expected:[...nativeSightRay(from,to)].map(p=>[p.x,p.y,p.z].join(',')+';').join('')});}
for(const id of Object.keys(manifest.regions)){
 const region=geo.region(id);if(!region)continue;const [rx,ry]=id.split('_').map(Number);
 for(let i=0;i<128;i++){
  const gx=(rx-20)*2048+64+Math.floor(rand()*1920),gy=(ry-18)*2048+64+Math.floor(rand()*1920),z=Math.floor(rand()*16000)-8000;
  const from={x:geoWorld(gx),y:geoWorld(gy),z},to={x:geoWorld(gx+Math.floor(rand()*65)-32),y:geoWorld(gy+Math.floor(rand()*65)-32),z:z+Math.floor(rand()*1000)-500};
  cases.push({kind:'S',from,to,expected:String(nativeStaticSight(from,to,{geo}))});
 }
}
const file=path.join(out,'queries.csv');fs.writeFileSync(file,cases.map(c=>[c.kind,c.from.x,c.from.y,c.from.z,c.to.x,c.to.y,c.to.z].join(',')).join('\n'));
const result=execFileSync(process.env.JAVA||'java',['-Xmx384m','-cp',out,'VisibilityProbe',path.resolve('data/l2j-geodata'),file],{encoding:'utf8',timeout:120000,maxBuffer:32*1024*1024}).trim().split(/\r?\n/);
assert.equal(result.length,cases.length);cases.forEach((c,i)=>assert.equal(result[i],c.expected,JSON.stringify({i,...c})));
console.log('PASS '+cases.length+' original Java visibility/ray cases: literal GeoEngine/GeoUtils methods, unchanged GridLineIterator3D and blocks');

import {nativeFieldRooms} from '../../functions/game/world/nativeFieldRooms.js';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import policy from '../../template/nativeFieldPilot.js';
import {sampleNativeTerritory,nativeTerritorySource} from '../../functions/game/world/nativeSpawnTerritory.js';
const out=path.resolve('.tmp/geodata/java-spawn-oracle');fs.mkdirSync(out,{recursive:true});
const put=(file,body)=>{const p=path.join(out,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body);return p;};
const files=[];
for(const [name,folder]of [['ZoneNPoly.java','form'],['NpcSpawnTerritory.java','type']]){
 const bytes=fs.readFileSync('art-source/geodata/spawns/'+name);assert.equal(createHash('sha256').update(bytes).digest('hex'),policy.territorySampling.sources[name]);
 files.push(put('org/l2jmobius/gameserver/entity/zone/'+folder+'/'+name,bytes));
}
files.push(put('org/l2jmobius/gameserver/entity/Location.java',`package org.l2jmobius.gameserver.entity; public class Location {private final int x,y,z;public Location(int x,int y,int z){this.x=x;this.y=y;this.z=z;}public int getX(){return x;}public int getY(){return y;}public int getZ(){return z;}}`));
files.push(put('org/l2jmobius/gameserver/entity/itemcontainer/Inventory.java',`package org.l2jmobius.gameserver.entity.itemcontainer; public class Inventory {public static final int ADENA_ID=57;}`));
files.push(put('org/l2jmobius/gameserver/entity/zone/ZoneForm.java',`package org.l2jmobius.gameserver.entity.zone; import org.l2jmobius.gameserver.entity.Location; public abstract class ZoneForm {protected static final int STEP=10;protected void dropDebugItem(int id,int count,int x,int y,int z){}public abstract boolean isInsideZone(int x,int y,int z);public abstract boolean intersectsRectangle(int x1,int x2,int y1,int y2);public abstract double getDistanceToZone(int x,int y);public abstract int getLowZ();public abstract int getHighZ();public abstract void visualizeZone(int z);public abstract Location getRandomPoint();public abstract Location getCenterPoint();}`));
files.push(put('org/l2jmobius/commons/util/Rnd.java',`package org.l2jmobius.commons.util; public class Rnd {public static long seed;public static int get(int low,int high){seed=(seed*1664525L+1013904223L)&0xffffffffL;return low+(int)Math.floor(seed/4294967296.0*(high-low+1));}}`));
files.push(put('org/l2jmobius/gameserver/geoengine/GeoEngine.java',`package org.l2jmobius.gameserver.geoengine;public class GeoEngine {private static final GeoEngine INSTANCE=new GeoEngine();public static int height,calls,firstHint;public static GeoEngine getInstance(){return INSTANCE;}public int getHeight(int x,int y,int z){if(calls++==0)firstHint=z;return height;}}`));
files.push(put('SpawnTerritoryProbe.java',`import java.util.Scanner;import org.l2jmobius.commons.util.Rnd;import org.l2jmobius.gameserver.entity.Location;import org.l2jmobius.gameserver.entity.zone.form.ZoneNPoly;import org.l2jmobius.gameserver.entity.zone.type.NpcSpawnTerritory;import org.l2jmobius.gameserver.geoengine.GeoEngine;public class SpawnTerritoryProbe {static ZoneNPoly read(Scanner s){int n=s.nextInt(),low=s.nextInt(),high=s.nextInt();int[] x=new int[n],y=new int[n];for(int i=0;i<n;i++){x[i]=s.nextInt();y[i]=s.nextInt();}return new ZoneNPoly(x,y,low,high);}public static void main(String[] args){Scanner s=new Scanner(System.in);int count=s.nextInt();for(int i=0;i<count;i++){Rnd.seed=s.nextLong();GeoEngine.height=s.nextInt();GeoEngine.calls=0;NpcSpawnTerritory t=new NpcSpawnTerritory("fixture",read(s));int banned=s.nextInt();for(int j=0;j<banned;j++)t.addBannedTerritory(read(s));Location p=t.getRandomPoint();System.out.println(p.getX()+","+p.getY()+","+p.getZ()+","+GeoEngine.firstHint);}}}`));
execFileSync(process.env.JAVAC||'javac',['-d',out,...files],{stdio:'pipe',timeout:60000});
const fixtures=[];
for(const id of Object.keys(policy.fields))for(const t of nativeFieldRooms(id).flatMap(r=>r.spawns||[]).filter(s=>s.coordinateSource!=='point'))for(let seed=1;seed<=8;seed++)fixtures.push({t:nativeTerritorySource(id,t),seed,height:Math.trunc((t.minZ+t.maxZ)/2)});
for(let seed=1;seed<=80;seed++)fixtures.push({t:{polygon:[[-10,-20],[10,-20],[10,20],[-10,20]],minZ:-101,maxZ:100,bannedTerritories:seed%2?[{polygon:[[-10,-20],[0,-20],[0,20],[-10,20]],minZ:-101,maxZ:100}]:[]},seed,height:0});
// H5 uses the midpoint to choose a geodata layer, but only caps its upper Z.
for(let seed=1;seed<=40;seed++)fixtures.push({t:{polygon:[[-10,-20],[10,-20],[10,20],[-10,20]],minZ:-101,maxZ:100},seed,height:-104});
const encode=t=>[t.polygon.length,t.minZ,t.maxZ,...t.polygon.flat()].join(' ');
const input=[fixtures.length,...fixtures.map(({t,seed,height})=>[seed,height,encode(t),t.bannedTerritories?.length||0,...(t.bannedTerritories||[]).map(encode)].join(' '))].join('\n');
const result=execFileSync(process.env.JAVA||'java',['-Xmx128m','-cp',out,'SpawnTerritoryProbe'],{input,encoding:'utf8',timeout:60000}).trim().split(/\r?\n/);
assert.equal(result.length,fixtures.length);
for(const [i,{t,seed,height}]of fixtures.entries()){
 let state=seed,hint;
 const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const actual=sampleNativeTerritory(t,{random,geo:{point:p=>(hint=p.z,{...p,z:height,nswe:15})},allowed:()=>true});
 assert.ok(actual);assert.equal(result[i],[actual.x,actual.y,actual.z,hint].join(','),`fixture ${i} seed ${seed}`);
}
console.log(`PASS ${fixtures.length} spawn proposals against unmodified H5 ZoneNPoly/NpcSpawnTerritory, including excluded polygons, odd negative Z ranges and layers below minZ`);

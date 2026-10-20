import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import source from '../../../data/l2j-geodata/source.js';

export const GEO_CELL_SIZE=16;
export const geoCell=n=>Math.floor(n/GEO_CELL_SIZE);
export const geoWorld=n=>n*GEO_CELL_SIZE+8;
export const geoRegionId=(x,y)=>`${Math.floor(x/32768)+20}_${Math.floor(y/32768)+18}`;
export const GEO_NSWE={east:1,west:2,south:4,north:8};
const height=encoded=>(encoded<<16>>16&~15)>>1;

/** Original L2J layout: 256x256 blocks, 8x8 cells per block, x-major order. */
export class L2jRegion{
 constructor(bytes){
  this.bytes=bytes;this.offsets=new Uint32Array(65536);this.layerOffsets=new Map();this.uniformFlat=true;let flatHeight=null;
  let offset=0;
  for(let block=0;block<65536;block++){
   if(offset>=bytes.length)throw new Error('Truncated L2J region');
   this.offsets[block]=offset;const type=bytes[offset++];
   if(type===0){if(offset+2<=bytes.length){const z=bytes.readInt16LE(offset);if(flatHeight===null)flatHeight=z;else if(z!==flatHeight)this.uniformFlat=false;}offset+=2;}
   else if(type===1){this.uniformFlat=false;offset+=128;}
   else if(type===2)for(let cell=0;cell<64;cell++){
    this.uniformFlat=false;
    const layers=bytes[offset++];if(!(layers>=1&&layers<=125))throw new Error('Invalid L2J layer count');offset+=layers*2;
   }
   else throw new Error('Unknown L2J block type');
   if(offset>bytes.length)throw new Error('Truncated L2J block');
  }
  if(offset!==bytes.length)throw new Error('Trailing bytes in L2J region');
 }
 cell(x,y,z){
  if(![x,y,z].every(Number.isFinite)||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=2048||y>=2048)return null;
  const block=Math.floor(x/8)*256+Math.floor(y/8),offset=this.offsets[block],type=this.bytes[offset],index=(x%8)*8+y%8;
  if(type===0)return {z:this.bytes.readInt16LE(offset+1),nswe:15};
  if(type===1){const encoded=this.bytes.readUInt16LE(offset+1+index*2);return {z:height(encoded),nswe:encoded&15};}
  let offsets=this.layerOffsets.get(block);
  if(!offsets){
   offsets=new Uint32Array(64);let pos=offset+1;
   for(let i=0;i<64;i++){offsets[i]=pos;pos+=1+this.bytes[pos]*2;}
   if(this.layerOffsets.size>=512)this.layerOffsets.delete(this.layerOffsets.keys().next().value);
   this.layerOffsets.set(block,offsets);
  }
  const pos=offsets[index],count=this.bytes[pos];let result=null,distance=Infinity;
  for(let i=0;i<count;i++){
   const encoded=this.bytes.readUInt16LE(pos+1+i*2),layerZ=height(encoded),delta=Math.abs(layerZ-z);
   if(delta<distance){result={z:layerZ,nswe:encoded&15};distance=delta;if(delta===0)break;}
  }
  return result;
 }
}

/** Server-only, bounded region cache. Missing or corrupt data never means free passage. */
export class L2jGeodata{
 constructor({manifest=source,load=id=>fs.readFileSync(new URL('../../../data/l2j-geodata/'+manifest.regions[id].file,import.meta.url)),capacity=4}={}){
  this.manifest=manifest;this.load=load;this.capacity=capacity;this.cache=new Map();this.errors=new Map();
 }
 region(id){
  if(!this.manifest.regions[id])return null;
  if(this.cache.has(id)){const r=this.cache.get(id);this.cache.delete(id);this.cache.set(id,r);return r;}
  const packed=this.load(id),entry=this.manifest.regions[id];
  if(createHash('sha256').update(packed).digest('hex')!==entry.compressedSha256)throw new Error('L2J geodata checksum mismatch: '+id);
  const bytes=gunzipSync(packed);
  if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw new Error('L2J geodata source mismatch: '+id);
  // A whole region containing one repeated flat plane supplies no verified ground
  // detail (e.g. 21_13). Keep the original file, but do not offer walking across it.
  const decoded=new L2jRegion(bytes),region=decoded.uniformFlat?null:decoded;
  if(this.cache.size>=this.capacity)this.cache.delete(this.cache.keys().next().value);
  this.cache.set(id,region);return region;
 }
 cell(gx,gy,z){
  if(![gx,gy,z].every(Number.isFinite))return null;
  const id=geoRegionId(gx*16,gy*16);let region;
  try{region=this.region(id);this.errors.delete(id);}catch(error){this.errors.set(id,error.message);return null;}
  return region?.cell((gx%2048+2048)%2048,(gy%2048+2048)%2048,z)||null;
 }
 point({x,y,z}){if(![x,y,z].every(Number.isFinite))return null;const cell=this.cell(geoCell(x),geoCell(y),z);return cell?{x,y,...cell}:null;}
}
export const worldGeodata=new L2jGeodata();

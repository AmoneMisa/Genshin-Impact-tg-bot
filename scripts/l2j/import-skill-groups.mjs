/** Import High Five skillgrp icon_type. No effects/name-based classification.
 * Usage: node scripts/l2j/import-skill-groups.mjs <primary.dat> <comparison.dat>
 * Source hashes are pinned: changing a source requires a deliberate provenance update.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import L2 from '../../template/l2Classes.js';

export const sources=[
 {url:'https://raw.githubusercontent.com/fahmi959/Server_Game_Lineage2_HighFive-H5-/cdcf81f47e9cf10e87fdf726260b35ac9c12b78b/system%20(L2%20Fahmi,%20Hapus%20Dalam%20Kurung)/skillgrp.dat',sha256:'cd6c7618f4d5f1b7234e4b303b538aa5a7bf0f53b32243aee110748bb08109aa'},
 {url:'https://raw.githubusercontent.com/TerryGomes/System-High-Five-H5-/61977f9a6b607ce32087f59f59e8e84a133aac15/System/Skillgrp.dat',sha256:'27206b213f04f5e4a208ef424834be0320530d4192da4b42900f632019ec118c'},
];
// Public L2 RSA format constants; see the pinned decoding reference in the source manifest.
const modulus=BigInt('0x75b4d6de5c016544068a1acf125869f43d2e09fc55b8b1e289556daf9b8757635593446288b3653da1ce91c87bb1a5c18f16323495c55d7d72c0890a83f69bfd1fd9434eb1c02f3e4679edfa43309319070129c267c85604d87bb65bae205de3707af1d2108881abb567c3b3d069ae67c3a4c6a3aa93d26413d4c66094ae2039');
const validTypes=new Set([0,1,2,3,4,5,6,7,11,12,13,14,15,16]);
function modPow(base,exp){let result=1n;for(;exp;exp>>=1n,base=base*base%modulus)if(exp&1n)result=result*base%modulus;return result;}
export function decodeSkillGrp(input){
 if(input.subarray(0,28).toString('utf16le')!=='Lineage2Ver413')throw Error('Expected Lineage2Ver413');
 const encrypted=input.subarray(28,input.length-20);
 if(encrypted.length%128)throw Error('Invalid RSA block count');
 const chunks=[];
 for(let offset=0;offset<encrypted.length;offset+=128){
  const value=modPow(BigInt('0x'+encrypted.subarray(offset,offset+128).toString('hex')),29n);
  const block=Buffer.from(value.toString(16).padStart(256,'0'),'hex'),size=block[3];
  if(size>124)throw Error('Invalid RSA padding');
  const start=128-((size+3)&~3);chunks.push(block.subarray(start,start+size));
 }
 const packed=Buffer.concat(chunks),raw=inflateSync(packed.subarray(4),{maxOutputLength:32*1024*1024});
 if(raw.length!==packed.readUInt32LE(0))throw Error('Invalid decompressed size');
 return parseSkillGrp(raw);
}
export function parseSkillGrp(raw){
 let offset=0;
 const uint=()=>{const n=raw.readUInt32LE(offset);offset+=4;return n;};
 const unicode=()=>{const size=uint();if(size>1e6||size%2||offset+size>raw.length)throw Error('Invalid Unicode string');offset+=size;};
 const ascf=()=>{
  let byte=raw[offset++],length=byte&63;const negative=byte&128;
  if(byte&64)for(let i=1;i<5;i++){byte=raw[offset++];length|=(byte&(i===4?31:127))<<(6+(i-1)*7);if(!(byte&128)||i===4)break;}
  const size=negative?length*2:length;if(size<0||size>1e6||offset+size>raw.length)throw Error('Invalid ASCF string');offset+=size;
 };
 const count=uint(),rows=new Map();if(count>100000)throw Error('Invalid row count');
 for(let i=0;i<count;i++){
  const id=uint(),level=uint(),type=uint();if(!validTypes.has(type)||!id||!level)throw Error('Invalid skill category');
  for(let n=0;n<6;n++)uint(); // operate_type, MP, range, style, hit_time, is_magic
  for(let n=0;n<4;n++)unicode(); // animation, visual effect, icon, icon panel
  for(let n=0;n<3;n++)uint(); // debuff, enchanted, enchant level
  ascf();for(let n=0;n<4;n++)uint();ascf();
  const key=id+':'+level;if(rows.has(key))throw Error('Duplicate skill level '+key);rows.set(key,type);
 }
 if(raw.subarray(offset).toString('hex')!=='0c536166655061636b61676500')throw Error('Unexpected High Five footer');
 return {count,rows};
}
export function categoryRanges(rows,id){
 const levels=[...rows].filter(([key])=>key.startsWith(id+':')).map(([key,type])=>[Number(key.split(':')[1]),type]).sort((a,b)=>a[0]-b[0]);
 const ranges=[];for(const [level,type] of levels){const last=ranges.at(-1);if(last&&last[1]+1===level&&last[2]===type)last[1]=level;else ranges.push([level,level,type]);}return ranges;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const parsed=sources.map((source,index)=>{
  const input=readFileSync(process.argv[index+2]);if(createHash('sha256').update(input).digest('hex')!==source.sha256)throw Error('Source hash mismatch: '+source.url);
  return decodeSkillGrp(input);
 });
 const skills={};let verifiedRows=0;
 for(const id of Object.keys(L2.skills)){
  const ranges=categoryRanges(parsed[0].rows,id);if(!ranges.length)throw Error('Missing skill '+id);
  for(const [from,to,type] of ranges)for(let level=from;level<=to;level++){if(parsed[1].rows.get(id+':'+level)!==type)throw Error('Sources disagree: '+id+':'+level);verifiedRows++;}
  skills[id]=ranges;
 }
 const data={chronicle:'High Five',sources,schema:'https://github.com/MobiusDevelopment/L2ClientDat/blob/fa94655ad19fdecfc9611c52dc7c67ffd416a1a8/dist/data/structure/dats/skillgrp.xml',decodingReference:'https://github.com/ritsuwastaken/open-l2encdec/tree/870fc5be32e17abbb499e777c36dad0116e2e6e0',sourceRows:parsed.map(p=>p.count),verifiedRows,skills};
 writeFileSync(new URL('../../template/l2SkillGroups.js',import.meta.url),'// Imported High Five client icon_type ranges. Regenerate with scripts/l2j/import-skill-groups.mjs.\nexport default '+JSON.stringify(data)+';\n');
 console.log('Verified',Object.keys(skills).length,'skills,',verifiedRows,'skill levels against two client tables');
}

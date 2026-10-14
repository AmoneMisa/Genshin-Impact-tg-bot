// Input: decoded High Five hennagrp-e.dat. Symbol artwork differs from dye artwork.
import fs from 'node:fs';
import hennas from '../../template/hennaData.js';
const allowed=new Set(hennas.map(h=>h.dye));
const input=process.argv[2];if(!input)throw Error('Pass decoded hennagrp-e.dat');
const b=fs.readFileSync(input);let offset=0;
const u32=()=>{const n=b.readUInt32LE(offset);offset+=4;return n;};
function string(){let x=b[offset++],n=x&63,negative=x&128;if(x&64)for(let i=1;i<5;i++){x=b[offset++];n|=(x&(i===4?31:127))<<(6+(i-1)*7);if(!(x&128)||i===4)break;}const size=negative?n*2:n;if(size>10000||offset+size>b.length)throw Error('Invalid string');const s=b.subarray(offset,offset+size).toString(negative?'utf16le':'latin1').replace(/\0$/,'');offset+=size;return s;}
const count=u32(),rows={};
for(let i=0;i<count;i++){const symbol=u32(),dye=u32(),name=string(),icon=string(),description=string(),label=string();if(!allowed.has(dye))continue;if(!/^icon\.etc_(str|dex|con|int|wit|men)_symbol_i0[01]$/.test(icon))throw Error('Unknown symbol icon '+icon);rows[dye]={symbol,name,icon:icon.toLowerCase().replaceAll('.','-'),description,label};}
if(b.length-offset>20)throw Error('Unexpected records after symbols');
if(Object.keys(rows).length!==allowed.size)throw Error('Missing High Five symbols');
fs.writeFileSync('template/hennaSymbols.js','// Client hennagrp symbol identities, separate from dye item icons.\nexport default '+JSON.stringify(rows)+';\n');
console.log('Imported',Object.keys(rows).length,'High Five symbols');

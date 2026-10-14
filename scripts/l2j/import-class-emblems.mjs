// Named L2 profession emblems, never portraits, skill icons or inferred family art.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {L2_CLASS_META} from '../../template/l2ClassMeta.js';
const html=fs.readFileSync('.tmp/class-icons/classes.html','utf8');
const available=new Set([...html.matchAll(/\/icons\/\/([^" ]+)\.webp/g)].map(m=>m[1]));
const aliases={humanFighter:'fighter',warriorProf:'warrior',humanKnight:'knight',rogueProf:'rogue',humanMystic:'mage',humanWizard:'wizard',elvenMystic:'elven_mage',elvenOracle:'oracle',elvenElder:'elder',swordSinger:'swordsinger',plainsWalker:'plain_walker',assassin:'assasin',darkMystic:'dark_mage',monk:'orc_monk',orcMystic:'orc_mage',grandKhavatari:'grand_khavatari',doomCryer:'doomcryer'};
const mapping={},missing=[];fs.mkdirSync('webapp/art/l2-classes',{recursive:true});
for(const meta of Object.values(L2_CLASS_META)){const slug=aliases[meta.key]||meta.key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());if(available.has(slug))mapping[meta.key]=slug;else missing.push(meta.key);}
const records=[];
for(const slug of new Set(Object.values(mapping))){
 const url='https://l2bandit.camp/icons/'+slug+'.webp',path='webapp/art/l2-classes/'+slug+'.webp';
 if(!fs.existsSync(path)){const res=await fetch(url);if(!res.ok)throw Error(url+' '+res.status);const bytes=Buffer.from(await res.arrayBuffer());if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Not WebP '+slug);fs.writeFileSync(path,bytes);}
 records.push({slug,url,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')});
}
fs.writeFileSync('webapp/art/l2-class-emblems.js','// Named profession emblems; provenance: docs/character-redesign/class-emblems.md.\nexport const CLASS_EMBLEMS=Object.freeze('+JSON.stringify(mapping)+');\n');
fs.writeFileSync('.tmp/class-icons/manifest.json',JSON.stringify({records,missing},null,2));
console.log('Mapped classes:',Object.keys(mapping).length,'Missing:',missing.join(', '));

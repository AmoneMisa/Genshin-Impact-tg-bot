import fs from 'node:fs';
import {extractCatalog} from './extract.mjs';
import {createTranslator} from '../../webapp/i18n/engine.js';
import dictionary from '../../webapp/i18n/uz.js';
const translate=createTranslator(dictionary);
const rules=Object.fromEntries(fs.readFileSync('scripts/i18n/world-location-phrases.tsv','utf8').trim().split(/\r?\n/).map(line=>line.split('\t')));
const phrases={},unhandled=[];
function part(text){
 if(rules[text])return rules[text];
 if(/^\d+$/.test(text))return text;
 const match=/^(\d+) (этаж|уровень|ярус|палуба)$/.exec(text);
 if(match)return match[1]+'-'+({этаж:'qavat',уровень:'sath',ярус:'qatlam',палуба:'paluba'}[match[2]]);
 if(/^Каюта \d+$/.test(text))return text.replace('Каюта','Kayuta');
 if(/^Комната \d+$/.test(text))return text.replace('Комната','Xona');
 if(text.startsWith('Окрестности '))return part(text.slice(12))+' atrofi';
 const known=translate(text);return /[А-Яа-яЁё]/.test(known)?null:known;
}
for(const row of extractCatalog()){
 if(!row.files.some(f=>/^(?:template\/(?:location-levels|world-extension|raidLocations|graciaTravel|seedInstances|huntingExploration)|webapp\/(?:hunt\.js|world-map\.js|location-art\.js|world-extension-scenes\.js)|functions\/game\/world\/)/.test(f))&&!rules[row.text])continue;
 let value=rules[row.text]||part(row.text);
 if(!value&&row.text.includes(' · ')){
  const pieces=row.text.split(' · ').map(part);if(pieces.every(p=>p!==null))value=pieces.join(' · ');
 }
 if(value)phrases[row.text]=value;else if(!dictionary[row.text])unhandled.push(row.text);
}
fs.writeFileSync('webapp/i18n/uz-world-locations.js','// Generated from reviewed Uzbek phrases and numbered source room titles.\nexport default '+JSON.stringify(phrases,null,1)+';\n');
console.log('Location phrases:',Object.keys(phrases).length,'unhandled:',unhandled);

import fs from 'node:fs';
import {createHash} from 'node:crypto';
const commit='9fb01cb20513e55190cdde8d91e41be2c0914f84',repository='https://gitlab.com/MobiusDevelopment/L2J_Mobius';
const prefix='L2J_Mobius_CT_2.6_HighFive/java/org/l2jmobius/gameserver/geoengine/';
const paths=['geodata/Cell.java','geodata/IBlock.java','geodata/blocks/FlatBlock.java','geodata/blocks/ComplexBlock.java','geodata/blocks/MultilayerBlock.java','GeoEngine.java'];
const folder='art-source/geodata/engine';fs.mkdirSync(folder,{recursive:true});
const files={};
for(const suffix of paths){
 const file=prefix+suffix,url=`https://gitlab.com/api/v4/projects/MobiusDevelopment%2FL2J_Mobius/repository/files/${encodeURIComponent(file)}/raw?ref=${commit}`;
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('Reference source: '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer()),name=suffix.split('/').at(-1);fs.writeFileSync(folder+'/'+name,bytes);
 files[name]={file,sha256:createHash('sha256').update(bytes).digest('hex'),url:`${repository}/-/blob/${commit}/${file}`};
}
const engine=fs.readFileSync(folder+'/GeoEngine.java','utf8'),license=engine.slice(engine.indexOf('Copyright'),engine.indexOf('*/')).replace(/^\s*\* ?/gm,'').trim();
fs.writeFileSync('data/l2j-geodata/ENGINE-LICENSE',license+'\n');
fs.writeFileSync(folder+'/source.js','export default '+JSON.stringify({repository,commit,license:'MIT',files},null,2)+';\n');
console.log('Pinned original GeoEngine and block implementations: '+paths.length);

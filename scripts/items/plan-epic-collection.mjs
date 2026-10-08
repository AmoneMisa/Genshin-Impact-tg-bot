import fs from 'node:fs';
import path from 'node:path';
if(fs.existsSync('art-source/epic-collection/jobs.json'))throw new Error('The collection plan already exists. Edit it in place to preserve generation progress.');
const root='C:/Users/kubai/Desktop/images';
const files=fs.readdirSync(root);
const ref=prefix=>path.join(root,files.find(n=>n.startsWith('codex-clipboard-'+prefix)));
const weapons=[
 ['shadow-scythe','Коса ночного затмения','twoHandedSword','e90ca1ab','a dark crescent scythe, violet crystal crescent core and long obsidian shaft'],
 ['solar-scythe','Коса солнечного рассвета','twoHandedSword','e90ca1ab','a gold crescent scythe, sunlit ivory blade, long ivory shaft and hanging amber crystals'],
 ['prism-sword','Меч радужного света','oneHandedSword','8be2cb4f','an iridescent straight sword, antique gold floral guard, pearl ribbon spirals and prismatic blade'],
 ['lifeblade','Клинок алой жизни','dagger','62ffcfbe','a compact blood-red dagger emerging from an ornate silver goblet-shaped hilt, thorn filigree, clearly a dagger with cutting blade'],
 ['rainbow-scythe','Коса семи стихий','twoHandedSword','66b7e8dd','a huge curved scythe with multicoloured crystal blade, seven small jewels along the black and gold shaft'],
 ['astral-sword','Меч звёздной бездны','oneHandedSword','855f6abe','a slim navy galaxy blade, violet and cyan gemstone guard, obsidian handle'],
 ['eclipse-greatsword','Двуручный меч затмения','twoHandedSword','855f6abe','a broad violet crystalline greatsword, silver filigree guard and long two-handed grip'],
 ['solar-bow','Лук солнечного венца','bow','85cedc07','an ornate golden bow with clearly visible bowstring and one radiant crystal arrow, sunburst central gem'],
 ['tide-trident','Посох приливов','mace','df73d934','a tall cyan magical trident staff, three luminous crystal prongs and sculpted wave frame'],
 ['wind-staff','Посох небесного вихря','mace','df73d934','a spiral wind staff with lavender vortex head and long dark shaft'],
 ['nature-axe','Секира древнего леса','blunt','df73d934','a short heavy axe with a broad silver cutting head, living root haft and emerald leaf ornament, compact melee weapon'],
 ['song-staff','Посох звёздной песни','mace','85cedc07','a long violet flute-shaped magical staff with a luminous crystal tip, elegant silver spiral ornament, no written musical symbols'],
 ['crystal-crossbow','Арбалет кристального шторма','crossbow','df73d934','a crossbow with clearly visible stock, trigger, transverse bow limbs and taut string, cyan crystal wave motifs'],
 ['dragon-claws','Когти огненного дракона','fists','85cedc07','a pair of knuckle claw weapons with open finger holes, three exposed dragon-flame blades per guard, gold and obsidian, no gloves or hands'],
];
const potions=[
 ['hp-little','pink heart-shaped flask with red liquid and heart-shaped stopper','319c761a'],
 ['hp-small','green leaf-shaped healing flask with gold vine ornament','319c761a'],
 ['hp-medium','ruby round flask with rose-shaped stopper and antique gold ornament','77014998'],
 ['hp-elixir','pink faceted crystal elixir bottle with flower stopper and pearl ornament','77014998'],
 ['mp-little','blue mana flask with small cyan crystal stopper and glowing blue liquid','319c761a'],
 ['mp-small','teal pearl glass flask with shell stopper and cyan liquid','77014998'],
 ['shield','rose heart flask with gentle gold wings and pink liquid','319c761a'],
 ['wind-walk','clear spiral flask with transparent pearlescent liquid and diamond stopper','319c761a'],
 ['might','amber flask with sculpted muscular arm handles and red-orange liquid','319c761a'],
 ['haste','slim wing-shaped blue flask with silver wing stopper','319c761a'],
 ['guidance','blue cylindrical flask with sculpted eye ornament, clear cyan liquid','319c761a'],
 ['death-whisper','iridescent flask with softly swirling rainbow liquid, lizard-shaped stopper','319c761a'],
 ['focus','amber rounded flask with sculpted four-leaf clover stopper and gold liquid','319c761a'],
];
const style='Use case: stylized-concept. Premium 2D painted dark-fantasy RPG inventory artwork, refined semi-realistic anime-leaning forms, painterly shading, crisp silhouette. Midnight navy, antique gold, cyan crystal light, violet and amber. Transparent background with true alpha. One isolated complete subject, entire silhouette inside 8% margins, centered three-quarter view, no pedestal, no wearer, no hands. No text, letters, logos, watermarks, signatures, border or UI. Readable at 48 and 96 pixels. Reference supplies shape, material and motif only; create an original design, omit all embedded labels. Square canvas.';
fs.mkdirSync('art-source/epic-collection/references',{recursive:true});
fs.mkdirSync('art-source/items/epic-collection',{recursive:true});
const jobs=[...weapons.map(([id,name,kind,r,subject])=>({key:'epic-weapon-'+id,id,name,kind,subject,reference:r,group:'weapon'})),...potions.map(([id,subject,r])=>({key:'potion-'+id,id,subject,reference:r,group:'potion'}))].map(j=>{
 const original=ref(j.reference), relative='art-source/epic-collection/references/'+path.basename(original);
 fs.copyFileSync(original,relative);
 return {...j,referenceFile:original,referenceWorkspaceFile:relative,prompt:style+'\nSubject: '+j.subject+'. '+(j.group==='weapon'?'One epic '+j.kind+' weapon'+(j.kind==='fists'?' pair':'')+', refined sculpted ornament and one controlled focal magical glow.':'One sealed consumable potion bottle, richly sculpted glass, clearly visible liquid, no table or background scene.')};
});
fs.writeFileSync('art-source/epic-collection/jobs.json',JSON.stringify(jobs,null,2)+'\n');
console.log(jobs.length+' exact jobs saved');

// Import only matched Witcher 3 assets. Never substitute a different card's artwork.
import fs from 'node:fs/promises';
import { GWENT_DECKS, NEUTRAL, TOKENS } from '../../webapp/gwent-decks.js';
const source = 'https://raw.githubusercontent.com/asundr/gwent-classic/';
const revision = '08592d847f2573440a34deb9f32bc855b2544cdd';
const tree = await (await fetch(`https://api.github.com/repos/asundr/gwent-classic/git/trees/${revision}?recursive=1`)).json();
if (!tree.sha) throw new Error('Cannot resolve artwork source');
const paths = new Set(tree.tree.map(entry => entry.path));
const aliases = {
  avallach:'mysterious_elf', cirilla:'ciri', villentretemerth:'villen', gaunter:'gaunter_odimm', 'gaunter-darkness':'gaunter_odimm_darkness', 'cow-army':'chort',
  'commanders-horn':'horn', 'biting-frost':'frost', 'impenetrable-fog':'fog', 'torrential-rain':'rain', 'clear-weather':'clear', 'storm-skellige':'storm',
  drummond:'shield_maiden', craite:'craite_warrior', blacksmith:'tordarroch', 'heymaey-skald':'heymaey', 'lugos-mad':'madmad_lugos', 'lugos-blue':'blueboy',
  'holger-blackhand':'holger', 'draig-bon-dhu':'draig', 'brokvar-archer':'brokva_archer', myshovur:'ermion', keris:'cerys', pirate:'dimun_pirate', crach:'crach_an_craite', heimdall:'hemdall',
  'foltest-temeria':'foltest_silver', 'foltest-lord':'foltest_gold', 'foltest-siegemaster':'foltest_copper', 'foltest-steel':'foltest_bronze', 'foltest-medell':'foltest_son_of_medell',
  'redanian-foot':'redania', 'john-natalis':'natalis', sile:'sheala', 'kaedweni-expert':'kaedwen_siege', 'dun-banner-medic':'banner_nurse', catapult:'catapult_1',
  morvran:'moorvran', 'heavy-scorpion':'heavy_zerri', 'zerrikanian-scorpion':'zerri', 'combat-engineer':'siege_engineer', 'siege-support':'siege_support',
  'rotten-mangonel':'rotten', nausicaa:'nauzicaa_2', impera:'imperal_brigade', stefan:'stefan',
  'emhyr-rain':'emhyr_silver', 'emhyr-emperor':'emhyr_copper', 'emhyr-flame':'emhyr_bronze', 'emhyr-relentless':'emhyr_gold', 'emhyr-conqueror':'emhyr_invader_of_the_north',
  foglet:'fogling', botchling:'poroniec', ekimmara:'ekkima', griffin:'gryffin', 'plague-maiden':'mighty_maiden', 'ice-giant':'frost_giant', 'grave-hag':'gravehag',
  'crone-brewess':'witch_velen', 'crone-weavess':'witch_velen_1', 'crone-whispess':'witch_velen_2',
  'eredin-commander':'eredin_silver', 'eredin-king':'eredin_copper', 'eredin-bringer':'eredin_bronze', 'eredin-destroyer':'eredin_gold',
  'havekar-healer':'havekar_nurse', 'elven-skirmisher':'elf_skirmisher', 'dwarf-skirmisher':'dwarf', ciaran:'ciaran', 'hav-support':'havekar_support', mahakaman:'mahakam',
  'dol-scout':'dol_infantry', saesenthessis:'saskia',
  'francesca-frost':'francesca_copper', 'francesca-daisy':'francesca_bronze', 'francesca-beautiful':'francesca_gold', 'francesca-queen':'francesca_silver', 'francesca-aen-seidhe':'francesca_hope_of_the_aen_seidhe',
};
const faction = id => id === 'northern-realms' ? 'realms' : id;
const neutral = new Set(NEUTRAL.map(([card]) => card.id));
const manifest = {}, downloads = new Map();
function add(key, path) {
  if (!paths.has(path)) throw new Error(`Missing exact artwork: ${key}: ${path}`);
  manifest[key] = '/art/gwent/' + path.replace(/^img\//, ''); downloads.set(path, manifest[key]);
}
for (const deck of Object.values(GWENT_DECKS)) {
  const f = faction(deck.id);
  add('faction:' + deck.id, `img/lg/faction_${f}.jpg`);
  add('shield:' + deck.id, `img/icons/deck_shield_${f}.png`);
  add('back:' + deck.id, `img/icons/deck_back_${f}.jpg`);
  for (const card of [...deck.cards.map(([card]) => card), ...deck.leaders]) {
    const prefix = neutral.has(card.id) ? 'neutral' : card.type === 'special' ? card.special === 'weather' ? 'weather' : 'special' : f;
    add(card.id, `img/sm/${prefix}_${aliases[card.id] || card.id.replaceAll('-', '_')}.jpg`);
  }
}
for (const card of Object.values(TOKENS)) add(card.id, `img/sm/${card.id === 'cow-army' ? 'neutral' : 'skellige'}_${aliases[card.id] || card.id.replaceAll('-', '_')}.jpg`);
for (const icon of ['card_row_close', 'card_row_ranged', 'card_row_siege', 'card_ability_horn', 'icon_gem_on', 'icon_gem_off']) add('icon:' + icon, `img/icons/${icon}.png`);
await fs.mkdir('webapp/art/gwent', { recursive: true });
const jobs = [...downloads];
async function download() {
  for (;;) {
    const entry = jobs.pop(); if (!entry) return;
    const [path, destination] = entry;
    const response = await fetch(source + tree.sha + '/' + path);
    if (!response.ok) throw new Error(`${response.status} ${path}`);
    const file = 'webapp' + destination;
    await fs.mkdir(file.slice(0, file.lastIndexOf('/')), { recursive: true });
    await fs.writeFile(file, Buffer.from(await response.arrayBuffer()));
  }
}
await Promise.all(Array.from({length: 6}, download));
await fs.writeFile('webapp/gwent-art.js', '// Base client symbols plus complete labelled cards supplied by the user.\n'
  + "import { LOCAL_GWENT_ART } from './gwent-local-art.js';\nexport { GWENT_PRINTED_CARDS, GWENT_CARD_VARIANTS } from './gwent-local-art.js';\n"
  + 'const BASE_GWENT_ART = Object.freeze(' + JSON.stringify(manifest, null, 2) + ');\n'
  + `export const GWENT_ART = Object.freeze({ ...BASE_GWENT_ART, ...LOCAL_GWENT_ART,
  'icon:discard': '/art/gwent/icons/discard.svg',
  'banner:northern-realms': BASE_GWENT_ART.vernon, 'banner:nilfgaard': BASE_GWENT_ART.letho,
  'banner:scoiatael': BASE_GWENT_ART.iorveth, 'banner:monsters': BASE_GWENT_ART.imlerith, 'banner:skellige': BASE_GWENT_ART.hjalmar,
});\n`);
await fs.writeFile('webapp/art/gwent/source.json', JSON.stringify({ source: 'https://github.com/asundr/gwent-classic', revision: tree.sha,
  note: 'Witcher 3 card artwork, faction illustrations and client symbols. Copyright CD PROJEKT RED and respective artists. Imported without adopting source gameplay rules.', assets: Object.fromEntries(downloads) }, null, 2));
console.log(`Imported ${downloads.size} exact matched assets.`);

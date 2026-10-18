import {buildDeck} from '../shared/build-deck.mjs';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const folder=fileURLToPath(new URL('.',import.meta.url));
await buildDeck(folder,JSON.parse(fs.readFileSync(new URL('package.json',import.meta.url))));

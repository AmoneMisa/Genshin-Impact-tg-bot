import {buildDeck} from '../shared/build-deck.mjs';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
await buildDeck(fileURLToPath(new URL('.',import.meta.url)),JSON.parse(fs.readFileSync(new URL('package.json',import.meta.url))));

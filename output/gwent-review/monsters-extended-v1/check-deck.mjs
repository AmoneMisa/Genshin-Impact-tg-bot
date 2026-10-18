import {checkDeck} from '../shared/check-deck.mjs';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
await checkDeck(fileURLToPath(new URL('.',import.meta.url)),JSON.parse(fs.readFileSync(new URL('package.json',import.meta.url))));

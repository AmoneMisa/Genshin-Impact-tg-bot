import {buildDeck} from '../shared/build-deck.mjs';
import {fileURLToPath} from 'node:url';
await buildDeck(fileURLToPath(new URL('.',import.meta.url)),{faction:'wild-hunt',prefix:'wh-'});

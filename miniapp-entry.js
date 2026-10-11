// Connects to Mongo and applies the stored game templates before any game module is evaluated. Modules that read
// a template while they load (catalogs, lookup tables) must see the stored data, so the app is imported only after.
import {connectMongo} from './db/db.js';

await connectMongo();
await import('./miniapp-app.js');

// Legacy entry: the bot without the Mini App server. Connects to Mongo before the bot module is evaluated.
import {connectMongo} from './db/db.js';

await connectMongo();
await import('./index.js');

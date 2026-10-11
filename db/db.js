import mongoose from 'mongoose';
import process from 'node:process'
import main from "./scripts/import.js";
import {loadGameTemplates} from "./templates.js";
import {requireTransactions} from './requireTransactions.js';

process.loadEnvFile('.env');
const MONGO_URI = process.env.MONGO_URL;

export async function connectMongo(uri = MONGO_URI) {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {appName: 'genshin-bot'});
    try {
        await requireTransactions(mongoose.connection.db);
    } catch (error) {
        await mongoose.disconnect();
        throw error;
    }
    await main();
    await loadGameTemplates();

    return mongoose;
}

import mongoose from 'mongoose';
import process from 'node:process'
import main from "./scripts/import.js";

process.loadEnvFile('.env');
const MONGO_URI = process.env.MONGO_URL;

export async function connectMongo(uri = MONGO_URI) {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {appName: 'genshin-bot'});
    await main();

    return mongoose;
}
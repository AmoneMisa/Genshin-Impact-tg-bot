import mongoose from 'mongoose';

export async function connectMongo(uri = process.env.MONGO_URL) {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, { appName: 'genshin-bot' });
    return mongoose;
}
import mongoose from 'mongoose';
// Public world spawn slots. No TTL: opening, rather than viewing, starts the source respawn timer.
const schema=new mongoose.Schema({_id:String,cycle:{type:Number,default:0},openedAt:{type:Number,default:0},respawnAt:{type:Number,default:0}},{versionKey:false});
export default mongoose.model('TreasureChest',schema);

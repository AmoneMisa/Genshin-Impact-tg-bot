import mongoose from 'mongoose';

// Bounded in-game history, shared by all application processes. Never sent to Telegram.
const schema=new mongoose.Schema({
  _id:String,
  messages:{type:[{_id:false,id:String,userId:String,name:String,text:String,at:Number}],default:[]},
  expiresAt:Date,
},{versionKey:false});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export default mongoose.model('CombatChat',schema);

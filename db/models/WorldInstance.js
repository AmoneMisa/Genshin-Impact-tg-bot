import mongoose from 'mongoose';
const schema=new mongoose.Schema({_id:String,data:{type:Object,required:true},expiresAt:{type:Date,required:true}},{optimisticConcurrency:true});
schema.index({expiresAt:1},{expireAfterSeconds:3600});
schema.pre('save',function(){this.markModified('data');});
export default mongoose.model('WorldInstance',schema);

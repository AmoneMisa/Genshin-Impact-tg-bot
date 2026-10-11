import mongoose from 'mongoose';
// One global record per original L2 castle, fort, or conquerable clan hall.
const schema=new mongoose.Schema({_id:String,owner:{type:Object,default:null},siege:{type:Object,default:null},rewards:{type:Array,default:[]},revision:{type:Number,default:0}},{timestamps:true,optimisticConcurrency:true});
schema.pre('save',function(){this.markModified('owner');this.markModified('siege');});
export default mongoose.model('WorldHolding',schema);

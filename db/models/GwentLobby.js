import mongoose from 'mongoose';

// The shared Gwent lobby (miniapp/gwentLobby.js): one record holding the search queue and the matches
// found across game chats, plus the public profiles (name and home chat) of the players in it.
// It is read and written under the in-process lock 'gwent-global'.
const GwentLobbySchema = new mongoose.Schema({
    key: {type: String, required: true, unique: true},
    data: {type: Object, default: {}},
}, {minimize: false, versionKey: false});

export default mongoose.models.GwentLobby || mongoose.model('GwentLobby', GwentLobbySchema, 'gwent_lobby');

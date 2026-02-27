const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

visitorSchema.index({ userId: 1, createdAt: -1 });

const favoriteSongSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true },
}, { timestamps: true });

favoriteSongSchema.index({ userId: 1, songId: 1 }, { unique: true });

const Visitor = mongoose.model('Visitor', visitorSchema);
const FavoriteSong = mongoose.model('FavoriteSong', favoriteSongSchema);

module.exports = { Visitor, FavoriteSong };

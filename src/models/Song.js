const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    songTitle: { type: String, required: true },
    songImage: { type: String, default: '' },
    songLink: { type: String, required: true },
    singerName: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    usageCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Song', songSchema);

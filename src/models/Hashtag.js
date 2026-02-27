const mongoose = require('mongoose');

const hashtagSchema = new mongoose.Schema({
    hashTag: { type: String, required: true, unique: true },
    usageCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

hashtagSchema.index({ usageCount: -1 });

module.exports = mongoose.model('Hashtag', hashtagSchema);

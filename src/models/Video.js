const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songId: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
    caption: { type: String, default: '' },
    videoTime: { type: Number, default: 0 },
    videoImage: { type: String, default: '' },
    videoUrl: { type: String, required: true },
    shareCount: { type: Number, default: 0 },
    isFake: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    hashTagId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hashtag' }],
    hashTag: [{ type: String }],
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
}, { timestamps: true });

videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ songId: 1 });

module.exports = mongoose.model('Video', videoSchema);

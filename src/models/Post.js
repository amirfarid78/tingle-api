const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    caption: { type: String, default: '' },
    postImage: [{
        url: { type: String, required: true },
        isBanned: { type: Boolean, default: false },
    }],
    shareCount: { type: Number, default: 0 },
    isFake: { type: Boolean, default: false },
    hashTagId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hashtag' }],
    hashTag: [{ type: String }],
    mentionedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
}, { timestamps: true });

postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ hashTagId: 1 });

module.exports = mongoose.model('Post', postSchema);

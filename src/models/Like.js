const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
    type: { type: String, enum: ['post', 'video'], required: true },
}, { timestamps: true });

likeSchema.index({ userId: 1, postId: 1 }, { unique: true, sparse: true });
likeSchema.index({ userId: 1, videoId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Like', likeSchema);

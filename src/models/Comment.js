const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
    commentText: { type: String, required: true },
    type: { type: String, enum: ['post', 'video'], required: true },
}, { timestamps: true });

commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ videoId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);

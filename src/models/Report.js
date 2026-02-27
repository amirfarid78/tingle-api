const mongoose = require('mongoose');

const reportReasonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const reportSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportedPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    reportedVideoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
    reportReason: { type: String, required: true },
    type: { type: String, enum: ['user', 'post', 'video'], default: 'user' },
    status: { type: Number, default: 0 }, // 0=pending, 1=reviewed, 2=resolved
    adminNote: { type: String, default: '' },
}, { timestamps: true });

const ReportReason = mongoose.model('ReportReason', reportReasonSchema);
const Report = mongoose.model('Report', reportSchema);

module.exports = { ReportReason, Report };

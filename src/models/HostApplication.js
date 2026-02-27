const mongoose = require('mongoose');

const hostApplicationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    realName: { type: String, required: true },
    idDocument: { type: String, required: true },
    videoSelfie: { type: String, default: '' },
    socialLink: { type: String, default: '' },
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: Number, default: 0 }, // 0=Pending, 1=Approved, 2=Rejected
    adminNote: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('HostApplication', hostApplicationSchema);

const mongoose = require('mongoose');

const helpSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    complaint: { type: String, required: true },
    contact: { type: String, required: true },
    image: { type: String, default: '' },
    status: { type: Number, default: 0 }, // 0=submitted, 1=in-progress, 2=resolved, 3=closed
    adminResponse: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Help', helpSchema);

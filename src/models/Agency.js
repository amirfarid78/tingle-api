const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema({
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    code: { type: String, required: true, unique: true }, // unique invite code for hosts
    commissionRate: { type: Number, default: 10 },                  // % admin takes
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    rejectionReason: { type: String, default: '' },

    // Extended fields to match Flutter UI
    contactEmail: { type: String, default: '' },
    mobile: { type: String, default: '' },
    country: { type: String, default: '' },
    description: { type: String, default: '' },

    // Running totals (updated by API as hosts earn coins)
    totalHostEarnings: { type: Number, default: 0 },  // sum of coins earned by all hosts
    totalAgencyEarnings: { type: Number, default: 0 }, // agency commission pot
}, {
    timestamps: true
});

module.exports = mongoose.model('Agency', agencySchema);

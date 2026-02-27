const mongoose = require('mongoose');

const vipPlanSchema = new mongoose.Schema({
    name: { type: String, required: true },
    validityType: { type: String, enum: ['days', 'months'], default: 'days' },
    validity: { type: Number, required: true },
    coinPrice: { type: Number, required: true, default: 0 },
    amount: { type: Number, required: true, default: 0 },
    benefits: { type: [String], default: [] },
    icon: { type: String, default: 'vip_icon.png' },
    isPopular: { type: Boolean, default: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('VipPlan', vipPlanSchema);

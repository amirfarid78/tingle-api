const mongoose = require('mongoose');

const coinPlanSchema = new mongoose.Schema({
    coin: { type: Number, required: true },
    amount: { type: Number, required: true },
    productKey: { type: String, default: '' },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const coinHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coin: { type: Number, required: true },
    reason: { type: String, default: '' },
    type: { type: Number, default: 0 }, // 0=purchase, 1=gift_sent, 2=gift_received, 3=login_bonus, 4=withdrawal
    payoutStatus: { type: Number, default: 0 }, // 0=pending, 1=completed, 2=failed
    uniqueId: { type: String, default: '' },
    senderName: { type: String, default: '' },
    receiverName: { type: String, default: '' },
    isIncome: { type: Boolean, default: true },
    paymentGateway: { type: String, default: '' },
    coinPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'CoinPlan' },
}, { timestamps: true });

coinHistorySchema.index({ userId: 1, createdAt: -1 });

const CoinPlan = mongoose.model('CoinPlan', coinPlanSchema);
const CoinHistory = mongoose.model('CoinHistory', coinHistorySchema);

module.exports = { CoinPlan, CoinHistory };

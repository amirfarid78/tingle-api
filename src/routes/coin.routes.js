const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { CoinPlan, CoinHistory } = require('../models/CoinPlan');
const User = require('../models/User');

// GET /api/coins/plans
router.get('/plans', auth, async (req, res, next) => {
    try {
        const plans = await CoinPlan.find({ isActive: true }).sort({ amount: 1 }).lean();
        res.json({
            status: true, message: 'Coin plans fetched', data: plans.map(p => ({
                _id: p._id, id: p._id, coin: p.coin, amount: p.amount, productKey: p.productKey,
                isPopular: p.isPopular, isActive: p.isActive, createdAt: p.createdAt, updatedAt: p.updatedAt,
            }))
        });
    } catch (error) { next(error); }
});

// POST /api/coins/purchase
router.post('/purchase', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { coinPlanId, paymentGateway } = req.body;
        if (!coinPlanId) return res.status(400).json({ status: false, message: 'coinPlanId required' });

        const plan = await CoinPlan.findById(coinPlanId);
        if (!plan) return res.status(404).json({ status: false, message: 'Coin plan not found' });

        // TODO: Verify payment with Stripe/Razorpay in production
        // For now, directly add coins
        loginUser.coin += plan.coin;
        loginUser.topUpCoins += plan.coin;
        await loginUser.save();

        await CoinHistory.create({
            userId: loginUser._id, coin: plan.coin, reason: `Purchased ${plan.coin} coins via ${paymentGateway}`,
            type: 0, payoutStatus: 1, isIncome: true, paymentGateway: paymentGateway || 'direct',
            coinPlanId: plan._id, uniqueId: `PUR_${Date.now()}`,
        });

        res.json({ status: true, message: `Coins added successfully via ${paymentGateway}`, totalCoins: loginUser.coin });
    } catch (error) { next(error); }
});

// GET /api/coins/history?startDate=&endDate=
router.get('/history', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { startDate, endDate } = req.query;

        let query = { userId: loginUser._id };
        if (startDate && endDate) {
            query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59Z') };
        }

        const history = await CoinHistory.find(query).sort({ createdAt: -1 }).limit(100).lean();

        res.json({
            status: true, message: 'Coin history fetched',
            data: history.map(h => ({
                _id: h._id, id: h._id, coin: h.coin, createdAt: h.createdAt,
                payoutStatus: h.payoutStatus, reason: h.reason, type: h.type,
                uniqueId: h.uniqueId, senderName: h.senderName, receiverName: h.receiverName,
                isIncome: h.isIncome,
            })),
        });
    } catch (error) { next(error); }
});

// GET /api/coins/balance
router.get('/balance', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        res.json({ status: true, message: 'Coin balance fetched', coin: loginUser.coin });
    } catch (error) { next(error); }
});

module.exports = router;

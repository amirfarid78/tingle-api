const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const { CoinHistory } = require('../models/CoinPlan');

// GET /api/rankings/rich — Rich user ranking
router.get('/rich', auth, async (req, res, next) => {
    try {
        const period = req.query.date || 'daily';
        let dateFilter = {};
        const now = new Date();

        if (period === 'daily') {
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            dateFilter = { createdAt: { $gte: startOfDay } };
        } else if (period === 'weekly') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            startOfWeek.setHours(0, 0, 0, 0);
            dateFilter = { createdAt: { $gte: startOfWeek } };
        } else if (period === 'monthly') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateFilter = { createdAt: { $gte: startOfMonth } };
        }

        // Rich = users who spent/topped-up the most
        const users = await User.find({ isBlock: false }).sort({ topUpCoins: -1 }).limit(50)
            .select('name userName image isProfilePicBanned isVerified coin topUpCoins wealthLevel country countryFlagImage uniqueId age').lean();

        const data = users.map((u, i) => ({
            _id: u._id, rank: i + 1, name: u.name, userName: u.userName,
            image: u.image, isProfilePicBanned: u.isProfilePicBanned || false,
            isVerified: u.isVerified || false, coin: u.topUpCoins || 0,
            wealthLevelImage: u.wealthLevel || '', country: u.country || '',
            countryFlagImage: u.countryFlagImage || '', uniqueId: u.uniqueId || '', age: u.age || 0,
        }));

        res.json({ status: true, message: 'Rich ranking fetched', data });
    } catch (error) { next(error); }
});

// GET /api/rankings/gift — Gift ranking
router.get('/gift', auth, async (req, res, next) => {
    try {
        const users = await User.find({ receivedGifts: { $gt: 0 }, isBlock: false })
            .sort({ receivedGifts: -1 }).limit(50)
            .select('name userName image isProfilePicBanned isVerified receivedGifts receivedCoins wealthLevel country countryFlagImage uniqueId age').lean();

        const data = users.map((u, i) => ({
            _id: u._id, rank: i + 1, name: u.name, userName: u.userName,
            image: u.image, isProfilePicBanned: u.isProfilePicBanned || false,
            isVerified: u.isVerified || false, coin: u.receivedCoins || 0,
            gifts: u.receivedGifts || 0, wealthLevelImage: u.wealthLevel || '',
            country: u.country || '', countryFlagImage: u.countryFlagImage || '',
            uniqueId: u.uniqueId || '', age: u.age || 0,
        }));

        res.json({ status: true, message: 'Gift ranking fetched', data });
    } catch (error) { next(error); }
});

// GET /api/rankings/fans — Fans ranking
router.get('/fans', auth, async (req, res, next) => {
    try {
        const users = await User.find({ totalFollowers: { $gt: 0 }, isBlock: false })
            .sort({ totalFollowers: -1 }).limit(50)
            .select('name userName image isProfilePicBanned isVerified totalFollowers wealthLevel country countryFlagImage uniqueId age').lean();

        const data = users.map((u, i) => ({
            _id: u._id, rank: i + 1, name: u.name, userName: u.userName,
            image: u.image, isProfilePicBanned: u.isProfilePicBanned || false,
            isVerified: u.isVerified || false, fans: u.totalFollowers || 0,
            wealthLevelImage: u.wealthLevel || '', country: u.country || '',
            countryFlagImage: u.countryFlagImage || '', uniqueId: u.uniqueId || '', age: u.age || 0,
        }));

        res.json({ status: true, message: 'Fans ranking fetched', data });
    } catch (error) { next(error); }
});

module.exports = router;

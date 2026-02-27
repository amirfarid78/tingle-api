const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Hashtag = require('../models/Hashtag');

// GET /api/hashtags
router.get('/', auth, async (req, res, next) => {
    try {
        const hashtags = await Hashtag.find({ isActive: true }).sort({ usageCount: -1 }).lean();
        res.json({ status: true, message: 'Hashtags fetched', data: hashtags });
    } catch (error) { next(error); }
});

// GET /api/hashtags/popular
router.get('/popular', auth, async (req, res, next) => {
    try {
        const hashtags = await Hashtag.find({ isActive: true }).sort({ usageCount: -1 }).limit(20).lean();
        res.json({ status: true, message: 'Popular hashtags fetched', data: hashtags });
    } catch (error) { next(error); }
});

module.exports = router;

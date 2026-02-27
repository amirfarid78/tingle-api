const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { GiftCategory, Gift, Emoji } = require('../models/Gift');

// GET /api/gifts/categories
router.get('/categories', auth, async (req, res, next) => {
    try {
        const categories = await GiftCategory.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
        res.json({ status: true, message: 'Gift categories fetched', data: categories });
    } catch (error) { next(error); }
});

// GET /api/gifts/category/:categoryId
router.get('/category/:categoryId', auth, async (req, res, next) => {
    try {
        const gifts = await Gift.find({ giftCategoryId: req.params.categoryId, isActive: true }).sort({ sortOrder: 1 }).lean();
        res.json({ status: true, message: 'Category gifts fetched', data: gifts });
    } catch (error) { next(error); }
});

// GET /api/gifts/gallery — All gifts grouped by category
router.get('/gallery', auth, async (req, res, next) => {
    try {
        const categories = await GiftCategory.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
        const gallery = await Promise.all(categories.map(async cat => {
            const gifts = await Gift.find({ giftCategoryId: cat._id, isActive: true }).sort({ sortOrder: 1 }).lean();
            return { ...cat, gifts };
        }));
        res.json({ status: true, message: 'Gift gallery fetched', data: gallery });
    } catch (error) { next(error); }
});

module.exports = router;

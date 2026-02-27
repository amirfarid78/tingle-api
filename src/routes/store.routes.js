const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { StoreItem, PurchasedItem } = require('../models/StoreItem');
const User = require('../models/User');

// GET /api/store/top-frames
router.get('/top-frames', auth, async (req, res, next) => {
    try {
        const frames = await StoreItem.find({ type: 'FRAME', isActive: true }).sort({ sortOrder: 1 }).limit(20).lean();
        res.json({ status: true, message: 'Top frames fetched', data: frames });
    } catch (error) { next(error); }
});

// GET /api/store/all-items?type=
router.get('/all-items', auth, async (req, res, next) => {
    try {
        const type = req.query.type; // THEME, FRAME, RIDE
        let query = { isActive: true };
        if (type) query.type = type;
        const items = await StoreItem.find(query).sort({ sortOrder: 1 }).lean();

        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const purchased = await PurchasedItem.find({ userId: loginUser._id, isActive: true }).select('itemId').lean();
        const purchasedIds = new Set(purchased.map(p => p.itemId.toString()));

        const data = items.map(item => ({ ...item, isPurchased: purchasedIds.has(item._id.toString()) }));
        res.json({ status: true, message: 'Store items fetched', data });
    } catch (error) { next(error); }
});

// POST /api/store/purchase
router.post('/purchase', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { itemId } = req.body;
        if (!itemId) return res.status(400).json({ status: false, message: 'itemId required' });

        const item = await StoreItem.findById(itemId);
        if (!item) return res.status(404).json({ status: false, message: 'Item not found' });

        // Check if already purchased
        const existing = await PurchasedItem.findOne({ userId: loginUser._id, itemId, isActive: true });
        if (existing) return res.status(400).json({ status: false, message: 'Already purchased' });

        // Check coins
        if (loginUser.coin < item.coin) return res.status(400).json({ status: false, message: 'Insufficient coins' });

        // Deduct coins
        loginUser.coin -= item.coin;
        loginUser.spentCoins += item.coin;

        // Set as active
        if (item.type === 'FRAME') {
            loginUser.activeAvtarFrame = { _id: item._id, type: item.frameType, image: item.image };
        } else if (item.type === 'THEME') {
            loginUser.activeTheme = { _id: item._id, image: item.image };
        } else if (item.type === 'RIDE') {
            loginUser.activeRide = { _id: item._id, type: item.frameType, image: item.image };
        }
        await loginUser.save();

        // Create purchase record
        const expiresAt = item.validity > 0 ? new Date(Date.now() + item.validity * 24 * 60 * 60 * 1000) : null;
        await PurchasedItem.create({
            userId: loginUser._id, itemId: item._id, itemType: item.type,
            expiresAt, isActive: true,
        });

        res.json({ status: true, message: `${item.type} purchased successfully`, remainingCoins: loginUser.coin });
    } catch (error) { next(error); }
});

module.exports = router;

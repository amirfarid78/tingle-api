const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { PurchasedItem } = require('../models/StoreItem');
const User = require('../models/User');

// GET /api/backpack/purchased?type=
router.get('/purchased', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const type = req.query.type; // THEME, FRAME, RIDE

        let query = { userId: loginUser._id, isActive: true };
        if (type) query.itemType = type;

        // Clean up expired items
        await PurchasedItem.updateMany(
            { userId: loginUser._id, expiresAt: { $lt: new Date() }, isActive: true },
            { isActive: false }
        );

        const items = await PurchasedItem.find(query).populate('itemId').sort({ purchasedAt: -1 }).lean();
        const data = items.filter(i => i.itemId).map(i => ({
            _id: i._id, itemId: i.itemId._id, name: i.itemId.name, image: i.itemId.image,
            type: i.itemType, coin: i.itemId.coin, purchasedAt: i.purchasedAt,
            expiresAt: i.expiresAt, isActive: i.isActive,
        }));

        res.json({ status: true, message: 'Purchased items fetched', data });
    } catch (error) { next(error); }
});

module.exports = router;

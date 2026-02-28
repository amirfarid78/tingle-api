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

        let formattedData = {
            themes: { active: [], expired: [] },
            avatarFrames: { active: [], expired: [] },
            rides: { active: [], expired: [] }
        };

        for (let i of items) {
            if (!i.itemId) continue;
            const mappedItem = {
                itemId: i.itemId._id.toString(),
                name: i.itemId.name,
                image: i.itemId.image,
                svgaImage: i.itemId.svgaImage || null,
                type: 0, // 0 for frame/theme depending on usage
                coin: i.itemId.coin,
                purchaseDate: i.purchasedAt,
                expiryDate: i.expiresAt,
                isExpired: !i.isActive,
                isSelected: false // default false, handle selection logic separately if needed
            };

            let categoryKey = 'avatarFrames';
            if (i.itemType === 'THEME') categoryKey = 'themes';
            else if (i.itemType === 'RIDE') categoryKey = 'rides';
            else if (i.itemType === 'FRAME') categoryKey = 'avatarFrames';

            if (i.isActive) {
                formattedData[categoryKey].active.push(mappedItem);
            } else {
                formattedData[categoryKey].expired.push(mappedItem);
            }
        }

        res.json({ status: true, message: 'Purchased items fetched', data: formattedData });
    } catch (error) { next(error); }
});

module.exports = router;

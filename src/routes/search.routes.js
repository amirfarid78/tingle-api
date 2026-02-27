const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Follow = require('../models/Follow');

// GET /api/search/users?q=
router.get('/users', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const q = req.query.q || req.query.searchString || '';

        if (!q) return res.json({ status: true, message: 'No search query', data: [] });

        const users = await User.find({
            _id: { $ne: loginUser?._id },
            isBlock: false,
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { userName: { $regex: q, $options: 'i' } },
                { uniqueId: { $regex: q, $options: 'i' } },
            ]
        }).limit(30).select('name userName image isProfilePicBanned isVerified isFake isOnline age country countryFlagImage uniqueId').lean();

        const data = await Promise.all(users.map(async u => {
            const isFollow = loginUser ? !!(await Follow.findOne({ userId: loginUser._id, followingId: u._id })) : false;
            return { ...u, isFollow };
        }));

        res.json({ status: true, message: 'Users found', data });
    } catch (error) { next(error); }
});

module.exports = router;

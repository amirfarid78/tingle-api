const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Follow = require('../models/Follow');
const User = require('../models/User');

// GET /api/friends — Get friends (mutual follows)
router.get('/', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        if (!loginUser) return res.status(404).json({ status: false, message: 'User not found' });

        const page = parseInt(req.query.start) || 0;
        const limit = parseInt(req.query.limit) || 20;

        // Friends = users I follow who also follow me back
        const myFollowing = await Follow.find({ userId: loginUser._id }).select('followingId').lean();
        const followingIds = myFollowing.map(f => f.followingId);

        const mutualFollows = await Follow.find({
            userId: { $in: followingIds },
            followingId: loginUser._id,
        }).select('userId').lean();

        const friendIds = mutualFollows.map(f => f.userId);
        const friends = await User.find({ _id: { $in: friendIds } })
            .skip(page * limit).limit(limit)
            .select('name userName image isProfilePicBanned age isVerified country countryFlagImage coin uniqueId isOnline wealthLevel createdAt').lean();

        const data = friends.map(u => ({
            _id: u._id, name: u.name, userName: u.userName, image: u.image,
            isProfilePicBanned: u.isProfilePicBanned || false, age: u.age || 0,
            isVerified: u.isVerified || false, country: u.country || '',
            countryFlagImage: u.countryFlagImage || '', coin: u.coin || 0,
            uniqueId: u.uniqueId || '', isOnline: u.isOnline || false,
            date: u.createdAt, wealthLevelImage: u.wealthLevel || '', isFollow: true,
        }));

        res.json({ status: true, message: 'Friends fetched', data });
    } catch (error) { next(error); }
});

module.exports = router;

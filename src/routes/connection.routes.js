const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Follow = require('../models/Follow');
const User = require('../models/User');
const { Visitor } = require('../models/Visitor');

// GET /api/connections/social-lists — Friends/Followers/Following
router.get('/social-lists', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        if (!loginUser) return res.status(404).json({ status: false, message: 'User not found' });

        // Followers: people who follow me
        const followerDocs = await Follow.find({ followingId: loginUser._id }).populate('userId', 'name userName image isProfilePicBanned age isVerified country countryFlagImage coin uniqueId isOnline wealthLevel createdAt');
        // Following: people I follow
        const followingDocs = await Follow.find({ userId: loginUser._id }).populate('followingId', 'name userName image isProfilePicBanned age isVerified country countryFlagImage coin uniqueId isOnline wealthLevel createdAt');

        // Friends: mutual follows
        const followingIds = new Set(followingDocs.map(f => f.followingId._id.toString()));
        const followerIds = new Set(followerDocs.map(f => f.userId._id.toString()));

        const formatUser = (u, isFollowVal = false) => ({
            _id: u._id, name: u.name, userName: u.userName, image: u.image,
            isProfilePicBanned: u.isProfilePicBanned || false, age: u.age || 0,
            isVerified: u.isVerified || false, country: u.country || '',
            countryFlagImage: u.countryFlagImage || '', coin: u.coin || 0,
            uniqueId: u.uniqueId || '', isOnline: u.isOnline || false,
            date: u.createdAt, wealthLevelImage: u.wealthLevel || '',
            isFollow: isFollowVal,
        });

        const friends = followerDocs
            .filter(f => followingIds.has(f.userId._id.toString()))
            .map(f => formatUser(f.userId, true));

        const followers = followerDocs.map(f => formatUser(f.userId, followingIds.has(f.userId._id.toString())));
        const following = followingDocs.map(f => formatUser(f.followingId, true));

        res.json({ status: true, message: 'Social lists fetched', friends, following, followers });
    } catch (error) { next(error); }
});

// GET /api/connections/visitors
router.get('/visitors', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const visitors = await Visitor.find({ userId: loginUser._id })
            .sort({ createdAt: -1 }).limit(50)
            .populate('visitorId', 'name userName image isProfilePicBanned age isVerified country countryFlagImage coin uniqueId isOnline').lean();

        const data = visitors.map(v => ({
            ...v.visitorId, _id: v.visitorId._id, date: v.createdAt,
        }));

        res.json({ status: true, message: 'Visitors fetched', data });
    } catch (error) { next(error); }
});

// GET /api/connections/search?q=
router.get('/search', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const q = req.query.q || req.query.searchString || '';
        const users = await User.find({
            _id: { $ne: loginUser._id },
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { userName: { $regex: q, $options: 'i' } },
                { uniqueId: { $regex: q, $options: 'i' } },
            ]
        }).limit(20).lean();

        const data = await Promise.all(users.map(async u => {
            const isFollow = !!(await Follow.findOne({ userId: loginUser._id, followingId: u._id }));
            return { _id: u._id, name: u.name, userName: u.userName, image: u.image, isVerified: u.isVerified, isOnline: u.isOnline, isFollow };
        }));

        res.json({ status: true, message: 'Search results', data });
    } catch (error) { next(error); }
});

// GET /api/connections/user/:userId — Other user's connections
router.get('/user/:userId', auth, async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const loginUser = await User.findOne({ firebaseUid: req.uid });

        const [followers, following] = await Promise.all([
            Follow.find({ followingId: userId }).populate('userId', 'name userName image isVerified age country countryFlagImage coin uniqueId isOnline'),
            Follow.find({ userId: userId }).populate('followingId', 'name userName image isVerified age country countryFlagImage coin uniqueId isOnline'),
        ]);

        const followingSet = new Set(following.map(f => f.followingId._id.toString()));
        const friends = followers.filter(f => followingSet.has(f.userId._id.toString()));

        res.json({
            status: true, message: 'User connections fetched',
            friends: friends.map(f => ({ ...f.userId.toObject(), isFollow: true })),
            followers: followers.map(f => f.userId),
            following: following.map(f => f.followingId),
        });
    } catch (error) { next(error); }
});

// POST /api/connections/follow
router.post('/follow', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { toUserId } = req.body;
        if (!toUserId) return res.status(400).json({ status: false, message: 'toUserId required' });

        await Follow.create({ userId: loginUser._id, followingId: toUserId });
        await User.findByIdAndUpdate(toUserId, { $inc: { totalFollowers: 1 } });
        await User.findByIdAndUpdate(loginUser._id, { $inc: { totalFollowing: 1 } });

        // Check if mutual follow → friends
        const mutual = await Follow.findOne({ userId: toUserId, followingId: loginUser._id });
        if (mutual) {
            await User.findByIdAndUpdate(toUserId, { $inc: { totalFriends: 1 } });
            await User.findByIdAndUpdate(loginUser._id, { $inc: { totalFriends: 1 } });
        }

        res.json({ status: true, message: 'User followed successfully' });
    } catch (error) {
        if (error.code === 11000) return res.json({ status: true, message: 'Already following' });
        next(error);
    }
});

// POST /api/connections/unfollow
router.post('/unfollow', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { toUserId } = req.body;

        const mutual = await Follow.findOne({ userId: toUserId, followingId: loginUser._id });
        await Follow.deleteOne({ userId: loginUser._id, followingId: toUserId });
        await User.findByIdAndUpdate(toUserId, { $inc: { totalFollowers: -1 } });
        await User.findByIdAndUpdate(loginUser._id, { $inc: { totalFollowing: -1 } });

        if (mutual) {
            await User.findByIdAndUpdate(toUserId, { $inc: { totalFriends: -1 } });
            await User.findByIdAndUpdate(loginUser._id, { $inc: { totalFriends: -1 } });
        }

        res.json({ status: true, message: 'User unfollowed successfully' });
    } catch (error) { next(error); }
});

module.exports = router;

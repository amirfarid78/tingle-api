const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { Visitor } = require('../models/Visitor');

// GET /api/user/profile — Fetch logged-in user's profile
router.get('/profile', auth, async (req, res, next) => {
    try {
        const user = await User.findOne({ firebaseUid: req.uid });
        if (!user) return res.status(404).json({ status: false, message: 'User not found' });

        const [followerCount, followingCount, friendCount, visitorCount] = await Promise.all([
            Follow.countDocuments({ followingId: user._id }),
            Follow.countDocuments({ userId: user._id }),
            // Friends = mutual follows
            Follow.aggregate([
                { $match: { userId: user._id } },
                { $lookup: { from: 'follows', localField: 'followingId', foreignField: 'userId', as: 'mutual' } },
                { $match: { 'mutual.followingId': user._id } },
                { $count: 'count' }
            ]).then(r => r[0]?.count || 0),
            Visitor.countDocuments({ userId: user._id }),
        ]);

        // Update counts
        user.totalFollowers = followerCount;
        user.totalFollowing = followingCount;
        user.totalFriends = friendCount;
        user.totalVisitors = visitorCount;
        await user.save();

        res.json({
            status: true,
            message: 'Profile fetched successfully',
            user: formatUserProfile(user),
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/user/profile/:userId — Fetch other user's profile
router.get('/profile/:userId', auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ status: false, message: 'User not found' });

        // Record visit
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        if (loginUser && loginUser._id.toString() !== user._id.toString()) {
            await Visitor.create({ userId: user._id, visitorId: loginUser._id }).catch(() => { });
            user.totalVisitors = await Visitor.countDocuments({ userId: user._id });
            await user.save();
        }

        // Check follow status
        let isFollow = false;
        if (loginUser) {
            isFollow = !!(await Follow.findOne({ userId: loginUser._id, followingId: user._id }));
        }

        const [followerCount, followingCount] = await Promise.all([
            Follow.countDocuments({ followingId: user._id }),
            Follow.countDocuments({ userId: user._id }),
        ]);

        res.json({
            status: true,
            message: 'Profile fetched successfully',
            user: {
                ...formatUserProfile(user),
                totalFollowers: followerCount,
                totalFollowing: followingCount,
                isFollow,
            },
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/user/profile/edit — Edit profile
router.put('/profile/edit', auth, (req, res, next) => {
    // Use upload middleware but don't fail if no file
    upload.single('image')(req, res, async (uploadErr) => {
        try {
            if (uploadErr) {
                console.error('Upload middleware error:', uploadErr.message);
                // Continue anyway — the user might just be updating text fields
            }

            const user = await User.findOne({ firebaseUid: req.uid });
            if (!user) return res.status(404).json({ status: false, message: 'User not found' });

            const { name, userName, bio, age, gender, country, countryFlagImage } = req.body;

            if (name !== undefined && name.trim()) user.name = name.trim();
            if (userName !== undefined && userName.trim()) {
                const existing = await User.findOne({ userName: userName.trim(), _id: { $ne: user._id } });
                if (existing) return res.status(400).json({ status: false, message: 'Username already taken' });
                user.userName = userName.trim();
            }
            if (bio !== undefined) user.bio = bio;
            if (age !== undefined) {
                const parsedAge = parseInt(age);
                if (!isNaN(parsedAge)) user.age = parsedAge;
            }
            if (gender !== undefined) user.gender = gender;
            if (country !== undefined) user.country = country;
            if (countryFlagImage !== undefined) user.countryFlagImage = countryFlagImage;

            // Upload image only if one was provided and no upload error
            if (req.file && !uploadErr) {
                try {
                    const imageUrl = await uploadToCloudinary(req.file.path, 'tingle/profiles');
                    user.image = imageUrl;
                } catch (imgErr) {
                    console.warn('Image upload failed (non-fatal):', imgErr.message);
                    // Keep existing image — don't fail the whole request
                }
            }

            await user.save();

            res.json({
                status: true,
                message: 'Profile updated successfully',
                user: formatUserProfile(user),
            });
        } catch (error) {
            console.error('Profile edit error:', error);
            next(error);
        }
    });
});


// POST /api/user/fill-profile — Fill profile (onboarding)
router.post('/fill-profile', auth, upload.single('image'), async (req, res, next) => {
    try {
        const user = await User.findOne({ firebaseUid: req.uid });
        if (!user) return res.status(404).json({ status: false, message: 'User not found' });

        const { name, userName, age, gender, country, countryFlagImage, bio } = req.body;

        user.name = name || user.name;
        user.userName = userName || user.userName;
        user.age = parseInt(age) || user.age;
        user.gender = gender || user.gender;
        user.country = country || user.country;
        user.countryFlagImage = countryFlagImage || user.countryFlagImage;
        user.bio = bio || user.bio;

        if (req.file) {
            user.image = await uploadToCloudinary(req.file.path, 'tingle/profiles');
        }

        await user.save();

        res.json({
            status: true,
            message: 'Profile filled successfully',
            user: formatUserProfile(user),
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/user/visit — Record profile visit
router.post('/visit', auth, async (req, res, next) => {
    try {
        const { profileOwnerId } = req.body;
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        if (!loginUser) return res.status(404).json({ status: false, message: 'User not found' });

        await Visitor.create({ userId: profileOwnerId, visitorId: loginUser._id });
        res.json({ status: true, message: 'Visit recorded' });
    } catch (error) {
        next(error);
    }
});

function formatUserProfile(user) {
    return {
        _id: user._id,
        name: user.name,
        userName: user.userName,
        gender: user.gender,
        bio: user.bio,
        age: user.age,
        image: user.image,
        isProfilePicBanned: user.isProfilePicBanned,
        email: user.email,
        mobileNumber: user.mobileNumber,
        countryFlagImage: user.countryFlagImage,
        country: user.country,
        ipAddress: user.ipAddress,
        identity: user.identity,
        fcmToken: user.fcmToken,
        uniqueId: user.uniqueId,
        firebaseUid: user.firebaseUid,
        provider: user.provider,
        coin: user.coin,
        topUpCoins: user.topUpCoins,
        spentCoins: user.spentCoins,
        receivedCoins: user.receivedCoins,
        receivedGifts: user.receivedGifts,
        withdrawnCoins: user.withdrawnCoins,
        withdrawnAmount: user.withdrawnAmount,
        wealthLevel: user.wealthLevel,
        activeAvtarFrame: user.activeAvtarFrame,
        activeTheme: user.activeTheme,
        activeRide: user.activeRide,
        isBlock: user.isBlock,
        isFake: user.isFake,
        isVerified: user.isVerified,
        isOnline: user.isOnline,
        isBusy: user.isBusy,
        isVIP: user.isVIP,
        role: user.role,
        agencyId: user.agencyId,
        agencyOwnerId: user.agencyOwnerId,
        isLive: user.isLive,
        liveHistoryId: user.liveHistoryId,
        callId: user.callId,
        lastlogin: user.lastlogin,
        date: user.createdAt,
        referralCode: user.referralCode,
        loginType: user.loginType,
        totalFollowers: user.totalFollowers,
        totalFollowing: user.totalFollowing,
        totalFriends: user.totalFriends,
        totalVisitors: user.totalVisitors,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

module.exports = router;

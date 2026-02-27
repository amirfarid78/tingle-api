const router = require('express').Router();
const User = require('../models/User');
const Setting = require('../models/Setting');

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, identity, fcmToken, uid, loginType, name, userName, image, mobileNumber } = req.body;

        if (!identity && !uid) {
            return res.status(400).json({ status: false, message: 'identity or uid is required' });
        }

        // Find existing user by firebaseUid or identity
        let user = await User.findOne({
            $or: [
                { firebaseUid: uid },
                { identity: identity },
                { email: email }
            ].filter(q => Object.values(q)[0])
        });

        let isSignUp = false;

        if (!user) {
            // Create new user
            isSignUp = true;
            user = new User({
                name: name || '',
                userName: userName || `user_${Date.now()}`,
                email: email || '',
                identity: identity || '',
                firebaseUid: uid || '',
                fcmToken: fcmToken || '',
                loginType: loginType || 0,
                image: image || '',
                mobileNumber: mobileNumber || '',
                provider: loginType === 3 ? 'google' : loginType === 1 ? 'phone' : 'anonymous',
                lastlogin: new Date(),
                isOnline: true,
            });

            // Apply login bonus from settings
            const settings = await Setting.findOne({});
            if (settings && settings.loginBonus) {
                user.coin = settings.loginBonus;
                user.topUpCoins = settings.loginBonus;
            }

            await user.save();
        } else {
            // Update existing user
            user.fcmToken = fcmToken || user.fcmToken;
            user.lastlogin = new Date();
            user.isOnline = true;
            if (uid) user.firebaseUid = uid;
            if (image && !user.image) user.image = image;
            if (name && !user.name) user.name = name;
            await user.save();
        }

        // Format response to match Flutter LoginModel.fromJson()
        res.json({
            status: true,
            message: isSignUp ? 'Account created successfully' : 'Login successful',
            signUp: isSignUp,
            user: {
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
                ipAddress: user.ipAddress || req.ip,
                identity: user.identity,
                fcmToken: user.fcmToken,
                uniqueId: user.uniqueId,
                uid: user.firebaseUid,
                provider: user.provider,
                coin: user.coin,
                consumedCoins: user.spentCoins,
                purchasedCoin: user.topUpCoins,
                receivedCoin: user.receivedCoins,
                receivedGift: user.receivedGifts,
                totalWithdrawalCoin: user.withdrawnCoins,
                totalWithdrawalAmount: user.withdrawnAmount,
                isLive: user.isLive,
                liveHistoryId: user.liveHistoryId,
                isBlock: user.isBlock,
                isOnline: user.isOnline,
                isFake: user.isFake,
                isVerified: user.isVerified,
                lastlogin: user.lastlogin,
                date: user.createdAt,
                _id: user._id,
                loginType: user.loginType,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

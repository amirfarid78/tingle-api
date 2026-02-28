const router = require('express').Router();
const User = require('../models/User');
const Setting = require('../models/Setting');
const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');

const formatUserResponse = (user, req) => ({
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
    ipAddress: user.ipAddress || (req ? req.ip : ''),
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
});

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

        res.json({
            status: true,
            message: isSignUp ? 'Account created successfully' : 'Login successful',
            signUp: isSignUp,
            user: formatUserResponse(user, req),
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/register-mobile
router.post('/register-mobile', async (req, res, next) => {
    try {
        const { uid, mobileNumber, password, name, userName, identity, fcmToken } = req.body;

        if (!uid || !mobileNumber || !password) {
            return res.status(400).json({ status: false, message: 'uid, mobileNumber, and password are required' });
        }

        let user = await User.findOne({
            $or: [{ firebaseUid: uid }, { mobileNumber }]
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        if (user) {
            // User exists — update their password and tokens (re-registration / password update)
            user.password = hashedPassword;
            user.firebaseUid = uid;
            user.fcmToken = fcmToken || user.fcmToken;
            user.lastlogin = new Date();
            user.isOnline = true;
            if (name && !user.name) user.name = name;
            await user.save();

            return res.json({
                status: true,
                message: 'Account updated successfully',
                signUp: false,
                user: formatUserResponse(user, req)
            });
        }

        user = new User({
            name: name || '',
            userName: userName || `user_${Date.now()}`,
            mobileNumber,
            password: hashedPassword,
            identity: identity || mobileNumber,
            firebaseUid: uid,
            fcmToken: fcmToken || '',
            loginType: 1, // Phone
            provider: 'phone',
            lastlogin: new Date(),
            isOnline: true,
        });

        const settings = await Setting.findOne({});
        if (settings && settings.loginBonus) {
            user.coin = settings.loginBonus;
            user.topUpCoins = settings.loginBonus;
        }

        await user.save();

        res.json({
            status: true,
            message: 'Account created successfully',
            signUp: true,
            user: formatUserResponse(user, req)
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/login-password
router.post('/login-password', async (req, res, next) => {
    try {
        const { mobileNumber, password, fcmToken, identity } = req.body;

        if (!mobileNumber || !password) {
            return res.status(400).json({ status: false, message: 'mobileNumber and password are required' });
        }

        const user = await User.findOne({ mobileNumber }).select('+password');

        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found with this mobile number' });
        }

        if (!user.password) {
            return res.status(400).json({ status: false, message: 'This account was not set up with a password. Please use Quick or Google Login.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: false, message: 'Invalid password' });
        }

        user.fcmToken = fcmToken || user.fcmToken;
        user.lastlogin = new Date();
        user.isOnline = true;
        if (identity) user.identity = identity;
        await user.save();

        let customToken = '';
        if (admin.apps.length > 0 && user.firebaseUid) {
            try {
                customToken = await admin.auth().createCustomToken(user.firebaseUid);
            } catch (fbErr) {
                console.warn('Firebase Custom Token generation failed:', fbErr.message);
            }
        }

        res.json({
            status: true,
            message: 'Login successful',
            signUp: false,
            customToken: customToken, // Flutter uses this to sign in via Firebase natively
            user: formatUserResponse(user, req)
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;

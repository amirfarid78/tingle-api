const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Setting = require('../models/Setting');

// GET /api/settings — Fetch admin settings
router.get('/', auth, async (req, res, next) => {
    try {
        let settings = await Setting.findOne({});

        // Create default settings if none exist
        if (!settings) {
            settings = await Setting.create({
                currency: { name: 'Indian Rupee', symbol: '₹', countryCode: 'IN', currencyCode: 'INR', isDefault: true },
                isGooglePlayEnabled: true,
                loginBonus: 100,
                privateCallRate: 20,
                durationOfShorts: 30,
                minCoinsToCashOut: 500,
                minCoinsForPayout: 1000,
                pkEndTime: 60,
                privacyPolicyLink: 'https://example.com/privacy',
                termsOfUsePolicyLink: 'https://example.com/terms',
            });
        }

        res.json({
            status: true,
            message: 'Settings fetched successfully',
            data: {
                currency: settings.currency,
                _id: settings._id,
                isGooglePlayEnabled: settings.isGooglePlayEnabled,
                isStripeEnabled: settings.isStripeEnabled,
                stripePublishableKey: settings.stripePublishableKey,
                stripeSecretKey: settings.stripeSecretKey,
                isRazorpayEnabled: settings.isRazorpayEnabled,
                razorPayId: settings.razorPayId,
                razorSecretKey: settings.razorSecretKey,
                isFlutterwaveEnabled: settings.isFlutterwaveEnabled,
                flutterWaveId: settings.flutterWaveId,
                privacyPolicyLink: settings.privacyPolicyLink,
                termsOfUsePolicyLink: settings.termsOfUsePolicyLink,
                isDummyData: settings.isDummyData,
                loginBonus: settings.loginBonus,
                privateCallRate: settings.privateCallRate,
                durationOfShorts: settings.durationOfShorts,
                minCoinsToCashOut: settings.minCoinsToCashOut,
                minCoinsForPayout: settings.minCoinsForPayout,
                pkEndTime: settings.pkEndTime,
                videoBanned: settings.videoBanned,
                postBanned: settings.postBanned,
                sightengineUser: settings.sightengineUser,
                sightengineApiSecret: settings.sightengineApiSecret,
                shortsEffectEnabled: settings.shortsEffectEnabled,
                androidEffectLicenseKey: settings.androidEffectLicenseKey,
                iosEffectLicenseKey: settings.iosEffectLicenseKey,
                watermarkEnabled: settings.watermarkEnabled,
                watermarkIcon: settings.watermarkIcon,
                privateKey: settings.privateKey,
                createdAt: settings.createdAt,
                updatedAt: settings.updatedAt,
                profilePhotoList: settings.profilePhotoList,
            },
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

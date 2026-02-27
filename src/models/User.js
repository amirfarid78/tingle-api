const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    userName: { type: String, unique: true, sparse: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    bio: { type: String, default: '' },
    age: { type: Number, default: 0 },
    image: { type: String, default: '' },
    isProfilePicBanned: { type: Boolean, default: false },
    email: { type: String, default: '' },
    mobileNumber: { type: String, default: '' },
    countryFlagImage: { type: String, default: '' },
    country: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    identity: { type: String, default: '' },
    fcmToken: { type: String, default: '' },
    uniqueId: { type: String, unique: true },
    firebaseUid: { type: String, unique: true, sparse: true },
    provider: { type: String, default: '' },
    coin: { type: Number, default: 0 },
    topUpCoins: { type: Number, default: 0 },
    spentCoins: { type: Number, default: 0 },
    receivedCoins: { type: Number, default: 0 },
    receivedGifts: { type: Number, default: 0 },
    withdrawnCoins: { type: Number, default: 0 },
    withdrawnAmount: { type: Number, default: 0 },
    wealthLevel: { type: String, default: '' },
    activeAvtarFrame: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreItem' },
        type: { type: Number, default: 0 },
        image: { type: String, default: '' }
    },
    activeTheme: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreItem' },
        image: { type: String, default: '' }
    },
    activeRide: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreItem' },
        type: { type: Number, default: 0 },
        image: { type: String, default: '' }
    },
    isBlock: { type: Boolean, default: false },
    isFake: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    isBusy: { type: Boolean, default: false },
    // VIP System
    isVIP: { type: Boolean, default: false },
    vipPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'VipPlan' },
    vipStartDate: { type: Date },
    vipExpirationDate: { type: Date },

    // Roles & Hosting
    role: { type: Number, default: 0 }, // 0=user, 1=admin, 2=agency
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency' },
    isHost: { type: Boolean, default: false },
    agencyOwnerId: { type: String, default: '' },
    isLive: { type: Boolean, default: false },
    liveHistoryId: { type: String, default: '' },
    callId: { type: String, default: '' },
    lastlogin: { type: Date, default: Date.now },
    referralCode: { type: String, default: '' },
    loginType: { type: Number, default: 0 }, // 0=anonymous, 1=phone, 2=apple, 3=google
    totalFollowers: { type: Number, default: 0 },
    totalFollowing: { type: Number, default: 0 },
    totalFriends: { type: Number, default: 0 },
    totalVisitors: { type: Number, default: 0 },
}, { timestamps: true });

// Generate unique ID before save
userSchema.pre('save', async function (next) {
    if (!this.uniqueId) {
        this.uniqueId = 'TG' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    if (!this.referralCode) {
        this.referralCode = 'REF_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    next();
});

module.exports = mongoose.model('User', userSchema);

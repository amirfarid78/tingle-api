const mongoose = require('mongoose');

const liveHistorySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    channel: { type: String, required: true },
    token: { type: String, default: '' },
    liveType: { type: Number, default: 1 }, // 1=normal, 2=audio, 3=pk
    agoraUid: { type: Number, default: 0 },
    view: { type: Number, default: 0 },
    hostIsMuted: { type: Number, default: 0 },
    isPkMode: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    roomName: { type: String, default: '' },
    roomWelcome: { type: String, default: '' },
    roomImage: { type: String, default: '' },
    privateCode: { type: Number, default: 0 },
    audioLiveType: { type: Number, default: 0 },
    videoUrl: { type: String, default: '' },
    streamSource: { type: String, default: '' },
    themeId: { type: String, default: '' },
    theme: { type: String, default: '' },
    seat: [{
        position: { type: Number },
        lock: { type: Boolean, default: false },
        name: { type: String, default: '' },
        agoraUid: { type: Number, default: 0 },
        userId: { type: String, default: '' },
        image: { type: String, default: '' },
        isOnline: { type: Boolean, default: false },
        mute: { type: Boolean, default: false },
        hostIsMuted: { type: Boolean, default: false },
        speaking: { type: Boolean, default: false },
    }],
    requested: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    host2Id: { type: String, default: '' },
    host2Channel: { type: String, default: '' },
    host2Token: { type: String, default: '' },
    host2Coin: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    totalGiftsReceived: { type: Number, default: 0 },
    totalCoinsEarned: { type: Number, default: 0 },
}, { timestamps: true });

liveHistorySchema.index({ userId: 1, isActive: 1 });
liveHistorySchema.index({ isActive: 1, liveType: 1 });

module.exports = mongoose.model('LiveHistory', liveHistorySchema);

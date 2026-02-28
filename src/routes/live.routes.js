const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// Helper: simple in-memory live session store (replace with DB model if needed)
const liveSessions = new Map();

// POST /api/live/start — Host starts a live stream
router.post('/start', auth, async (req, res, next) => {
    try {
        const user = await User.findOne({ firebaseUid: req.uid });
        if (!user) return res.status(404).json({ status: false, message: 'User not found' });

        const { liveType, channel, agoraUID, roomName, roomWelcome, isPrivate, privateCode } = req.body;

        const liveHistoryId = `live_${user._id}_${Date.now()}`;

        // Store in memory (or DB)
        liveSessions.set(liveHistoryId, {
            _id: liveHistoryId,
            hostId: user._id.toString(),
            hostName: user.name,
            hostImage: user.image,
            channel: channel || '',
            agoraUID: agoraUID || '',
            liveType: liveType || 1,
            roomName: roomName || `${user.name}'s Live`,
            roomWelcome: roomWelcome || 'Welcome to join the live.',
            isPrivate: isPrivate || false,
            privateCode: privateCode || '',
            viewerCount: 0,
            startedAt: new Date(),
        });

        // Mark user as live
        user.isLive = true;
        user.liveHistoryId = liveHistoryId;
        await user.save();

        res.json({
            status: true,
            message: 'Live session started',
            data: liveSessions.get(liveHistoryId),
            liveHistoryId,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/live/stop — Host stops the live stream
router.post('/stop', auth, async (req, res, next) => {
    try {
        const user = await User.findOne({ firebaseUid: req.uid });
        if (!user) return res.status(404).json({ status: false, message: 'User not found' });

        const { liveHistoryId } = req.body;

        if (liveHistoryId) {
            liveSessions.delete(liveHistoryId);
        }

        user.isLive = false;
        user.liveHistoryId = null;
        await user.save();

        res.json({ status: true, message: 'Live session stopped' });
    } catch (error) {
        next(error);
    }
});

// GET /api/live/users — Get all currently live users
router.get('/users', async (req, res, next) => {
    try {
        const liveUsers = await User.find({ isLive: true }).select(
            'name userName image uniqueId isVerified isVIP coin wealthLevel liveHistoryId'
        );
        res.json({ status: true, data: liveUsers });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

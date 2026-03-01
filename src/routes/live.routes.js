const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const { RtcRole, RtcTokenBuilder } = require('../utils/agoraToken');
const User = require('../models/User');

// Helper: simple in-memory live session store (replace with DB model if needed)
const liveSessions = new Map();

// POST /api/live/start — Host starts a live stream
router.post('/start', auth, async (req, res, next) => {
    try {
        const user = await User.findOne({ firebaseUid: req.uid });
        if (!user) return res.status(404).json({ status: false, message: 'User not found' });

        const { liveType, channel, agoraUID, roomName, roomWelcome, isPrivate, privateCode } = req.body;

        // Generate Agora token for the video live stream
        let agoraToken = '';
        try {
            const appId = process.env.AGORA_APP_ID;
            const appCertificate = process.env.AGORA_APP_CERTIFICATE;
            if (appId && appCertificate && appId !== 'your_agora_app_id') {
                const expirationTimeInSeconds = 3600;
                const currentTimestamp = Math.floor(Date.now() / 1000);
                const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
                agoraToken = RtcTokenBuilder.buildTokenWithUid(
                    appId, appCertificate, channel || `live_${Date.now()}`,
                    parseInt(agoraUID) || 0, RtcRole.PUBLISHER, privilegeExpiredTs
                );
            }
        } catch (e) {
            console.warn('Agora token generation failed in live/start:', e.message);
        }

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
            token: agoraToken,
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
            token: agoraToken,
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

        let result = [];
        for (let user of liveUsers) {
            let session = liveSessions.get(user.liveHistoryId) || {};
            result.push({
                _id: session._id || user._id,
                userId: user._id,
                name: user.name,
                userName: user.userName,
                image: user.image,
                uniqueId: user.uniqueId,
                isVerified: user.isVerified,
                isVIP: user.isVIP,
                coin: user.coin,
                wealthLevelImage: user.wealthLevel,
                liveHistoryId: user.liveHistoryId,
                isFake: false, // explicitly set so Flutter doesn't use dummy data
                view: session.viewerCount || 0,
                channel: session.channel || '',
                token: session.token || '', // host might not have token, but users might need it
                liveType: session.liveType || 1, // 1 for video, 2 for audio
                audioLiveType: session.audioLiveType || 0,
                agoraUid: session.agoraUID || 0,
                roomName: session.roomName || '',
                roomWelcome: session.roomWelcome || '',
                roomImage: session.roomImage || user.image,
                privateCode: session.privateCode || 0,
                bgTheme: session.bgTheme || ''
            });
        }

        res.json({ status: true, data: result });
    } catch (error) {
        next(error);
    }
});

// POST /api/live/audio/create — Create an audio party room
router.post('/audio/create', auth, upload.single('roomImage'), async (req, res, next) => {
    try {
        const user = await User.findOne({ firebaseUid: req.uid });
        if (!user) return res.status(404).json({ status: false, message: 'User not found' });

        const { channel, liveType, agoraUID, audioLiveType, privateCode, roomName, roomWelcome, bgTheme } = req.body;

        // Upload roomImage if present
        let finalRoomImage = user.image || '';
        if (req.file) {
            finalRoomImage = await uploadToCloudinary(req.file.buffer, 'tingle/rooms', 'image');
        } else if (req.body.roomImage) {
            finalRoomImage = req.body.roomImage;
        }

        // Generate an Agora token for this channel
        const { RtcRole, RtcTokenBuilder } = require('../utils/agoraToken');
        const appID = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;
        let agoraToken = '';
        try {
            const expirationTimeInSeconds = 3600;
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
            agoraToken = RtcTokenBuilder.buildTokenWithUid(
                appID, appCertificate, channel || `audio_${Date.now()}`,
                parseInt(agoraUID) || 0, RtcRole.PUBLISHER, privilegeExpiredTs
            );
        } catch (e) {
            console.warn('Agora token generation failed, using fallback:', e.message);
        }

        const liveHistoryId = `audio_${user._id}_${Date.now()}`;
        const roomData = {
            _id: liveHistoryId,
            hostId: user._id.toString(),
            hostName: user.name,
            hostImage: user.image,
            hostUniqueId: user.uniqueId,
            channel: channel || liveHistoryId,
            agoraUID: parseInt(agoraUID) || 0,
            liveType: liveType || 2,
            audioLiveType: audioLiveType || 2,
            privateCode: privateCode || 0,
            roomName: roomName || `${user.name}'s Room`,
            roomWelcome: roomWelcome || 'Welcome!',
            roomImage: finalRoomImage,
            bgTheme: bgTheme || '',
            token: agoraToken,
            viewerCount: 0,
            startedAt: new Date(),
        };

        liveSessions.set(liveHistoryId, roomData);

        // Mark user as live
        user.isLive = true;
        user.liveHistoryId = liveHistoryId;
        await user.save();

        res.json({
            status: true,
            message: 'Audio room created successfully',
            room: roomData,
            liveHistoryId,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;


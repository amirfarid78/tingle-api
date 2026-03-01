const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { RtcRole, RtcTokenBuilder } = require('../utils/agoraToken');

// POST /api/agora/token — Generate Agora RTC token
router.post('/token', auth, async (req, res, next) => {
    try {
        const { channelName, uid, role } = req.body;
        const appId = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;

        if (!appId || !appCertificate || appId === 'your_agora_app_id') {
            // Return a dummy token for development (no cert configured)
            return res.json({
                status: true, message: 'Agora token generated (dev mode - no cert)',
                token: '',
                appId: appId || 'dev_app_id',
                channel: channelName,
                uid: uid || 0,
            });
        }

        const expirationInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationInSeconds;

        const agoraRole = (role === 2) ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            parseInt(uid) || 0,
            agoraRole,
            privilegeExpiredTs
        );

        res.json({
            status: true,
            message: 'Agora token generated',
            token,
            appId,
            channel: channelName,
            uid: uid || 0,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

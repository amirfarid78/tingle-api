const router = require('express').Router();
const { auth } = require('../middleware/auth');
const crypto = require('crypto');

// POST /api/agora/token — Generate Agora RTC token
router.post('/token', auth, async (req, res, next) => {
    try {
        const { channelName, uid, role } = req.body;
        const appId = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;

        if (!appId || !appCertificate || appId === 'your_agora_app_id') {
            // Return a dummy token for development
            return res.json({
                status: true, message: 'Agora token generated (dev mode)',
                token: 'dev_token_' + Date.now(),
                appId: appId || 'dev_app_id',
                channel: channelName,
                uid: uid || 0,
            });
        }

        // Generate Agora RTC token
        const expirationInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationInSeconds;

        // Simple token generation (for production, use agora-access-token npm package)
        const token = generateAgoraToken(appId, appCertificate, channelName, uid || 0, role || 1, privilegeExpiredTs);

        res.json({
            status: true, message: 'Agora token generated',
            token, appId, channel: channelName, uid: uid || 0,
        });
    } catch (error) { next(error); }
});

function generateAgoraToken(appId, appCertificate, channelName, uid, role, privilegeExpiredTs) {
    // Simplified token - for production use: npm install agora-access-token
    const message = `${appId}${channelName}${uid}${privilegeExpiredTs}`;
    const hmac = crypto.createHmac('sha256', appCertificate).update(message).digest('hex');
    return Buffer.from(`${appId}:${hmac}:${privilegeExpiredTs}`).toString('base64');
}

module.exports = router;

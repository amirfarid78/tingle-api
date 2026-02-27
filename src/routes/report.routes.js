const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { ReportReason, Report } = require('../models/Report');
const User = require('../models/User');

// GET /api/report/reasons
router.get('/reasons', auth, async (req, res, next) => {
    try {
        const reasons = await ReportReason.find({ isActive: true }).lean();
        res.json({ status: true, message: 'Report reasons fetched', data: reasons });
    } catch (error) { next(error); }
});

// POST /api/report/submit
router.post('/submit', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { reportedUserId, reportedPostId, reportedVideoId, reportReason, type } = req.body;

        if (!reportReason) return res.status(400).json({ status: false, message: 'Report reason required' });

        await Report.create({
            userId: loginUser._id, reportedUserId, reportedPostId, reportedVideoId,
            reportReason, type: type || 'user',
        });

        res.json({ status: true, message: 'Report submitted successfully' });
    } catch (error) { next(error); }
});

module.exports = router;

const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const Help = require('../models/Help');
const User = require('../models/User');

// POST /api/help/submit
router.post('/submit', auth, upload.single('image'), async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { complaint, contact } = req.body;
        if (!complaint || !contact) return res.status(400).json({ status: false, message: 'Complaint and contact required' });

        let imageUrl = '';
        if (req.file) imageUrl = await uploadToCloudinary(req.file.path, 'tingle/help');

        await Help.create({ userId: loginUser._id, complaint, contact, image: imageUrl });

        res.json({ status: true, message: 'Help request submitted successfully', complaint, contact });
    } catch (error) { next(error); }
});

// GET /api/help/my-tickets
router.get('/my-tickets', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const tickets = await Help.find({ userId: loginUser._id }).sort({ createdAt: -1 }).lean();
        res.json({ status: true, message: 'Help tickets fetched', data: tickets });
    } catch (error) { next(error); }
});

module.exports = router;

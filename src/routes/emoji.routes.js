const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { Emoji } = require('../models/Gift');

// GET /api/emojis
router.get('/', auth, async (req, res, next) => {
    try {
        const emojis = await Emoji.find({ isActive: true }).lean();
        res.json({ status: true, message: 'Emojis fetched', data: emojis });
    } catch (error) { next(error); }
});

module.exports = router;

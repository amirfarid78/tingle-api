const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Song = require('../models/Song');
const { FavoriteSong } = require('../models/Visitor');
const User = require('../models/User');

// GET /api/songs
router.get('/', auth, async (req, res, next) => {
    try {
        const page = parseInt(req.query.start) || 0;
        const limit = parseInt(req.query.limit) || 20;
        const songs = await Song.find({ isActive: true }).sort({ usageCount: -1 }).skip(page * limit).limit(limit).lean();
        res.json({ status: true, message: 'Songs fetched', data: songs });
    } catch (error) { next(error); }
});

// GET /api/songs/favorites
router.get('/favorites', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const favs = await FavoriteSong.find({ userId: loginUser._id }).populate('songId').lean();
        const songs = favs.map(f => f.songId).filter(Boolean);
        res.json({ status: true, message: 'Favorite songs fetched', data: songs });
    } catch (error) { next(error); }
});

// POST /api/songs/favorite — Toggle favorite
router.post('/favorite', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { songId } = req.body;
        const existing = await FavoriteSong.findOne({ userId: loginUser._id, songId });
        if (existing) {
            await FavoriteSong.deleteOne({ _id: existing._id });
            res.json({ status: true, message: 'Removed from favorites', isFavorite: false });
        } else {
            await FavoriteSong.create({ userId: loginUser._id, songId });
            res.json({ status: true, message: 'Added to favorites', isFavorite: true });
        }
    } catch (error) { next(error); }
});

// GET /api/songs/search?q=
router.get('/search', auth, async (req, res, next) => {
    try {
        const q = req.query.q || req.query.searchString || '';
        if (!q) return res.json({ status: true, message: 'No query', data: [] });
        const songs = await Song.find({
            $or: [
                { songTitle: { $regex: q, $options: 'i' } },
                { singerName: { $regex: q, $options: 'i' } },
            ]
        }).limit(20).lean();
        res.json({ status: true, message: 'Songs found', data: songs });
    } catch (error) { next(error); }
});

module.exports = router;

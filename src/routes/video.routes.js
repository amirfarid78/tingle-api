const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const Video = require('../models/Video');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const Hashtag = require('../models/Hashtag');
const Song = require('../models/Song');
const User = require('../models/User');

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

async function formatVideo(video, loginUserId) {
    const user = await User.findById(video.userId).lean();
    const song = video.songId ? await Song.findById(video.songId).lean() : null;
    const isLike = loginUserId ? !!(await Like.findOne({ userId: loginUserId, videoId: video._id, type: 'video' })) : false;
    const isFollow = loginUserId ? !!(await Follow.findOne({ userId: loginUserId, followingId: video.userId })) : false;

    return {
        _id: video._id, id: video._id,
        songId: video.songId, caption: video.caption, videoTime: video.videoTime,
        videoImage: video.videoImage, videoUrl: video.videoUrl,
        shareCount: video.shareCount, isFake: video.isFake, isBanned: video.isBanned,
        createdAt: video.createdAt, hashTagId: video.hashTagId, hashTag: video.hashTag,
        songTitle: song?.songTitle || '', songImage: song?.songImage || '',
        songLink: song?.songLink || '', singerName: song?.singerName || '',
        userId: video.userId, name: user?.name || '', userName: user?.userName || '',
        gender: user?.gender || '', age: user?.age || 0,
        country: user?.country || '', countryFlagImage: user?.countryFlagImage || '',
        userImage: user?.image || '', isProfilePicBanned: user?.isProfilePicBanned || false,
        isVerified: user?.isVerified || false, userIsFake: user?.isFake || false,
        isLike, isFollow, totalLikes: video.totalLikes, totalComments: video.totalComments,
        time: getTimeAgo(video.createdAt),
    };
}

// GET /api/videos
router.get('/', auth, async (req, res, next) => {
    try {
        const page = parseInt(req.query.start) || 0;
        const limit = parseInt(req.query.limit) || 20;
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const videos = await Video.find({ isBanned: false }).sort({ createdAt: -1 }).skip(page * limit).limit(limit).lean();
        const formatted = await Promise.all(videos.map(v => formatVideo(v, loginUser?._id)));
        res.json({ status: true, message: 'Videos fetched', data: formatted });
    } catch (error) { next(error); }
});

// POST /api/videos/upload
router.post('/upload', auth, upload.fields([{ name: 'videoUrl', maxCount: 1 }, { name: 'videoImage', maxCount: 1 }]), async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { caption, songId, videoTime, hashTag } = req.body;

        let videoUrl = '', videoImage = '';
        if (req.files?.videoUrl?.[0]) videoUrl = await uploadToCloudinary(req.files.videoUrl[0].path, 'tingle/videos', 'video');
        if (req.files?.videoImage?.[0]) videoImage = await uploadToCloudinary(req.files.videoImage[0].path, 'tingle/thumbnails');

        const hashTags = hashTag ? (Array.isArray(hashTag) ? hashTag : JSON.parse(hashTag)) : [];
        const hashTagIds = [];
        for (const tag of hashTags) {
            let ht = await Hashtag.findOne({ hashTag: tag });
            if (!ht) ht = await Hashtag.create({ hashTag: tag, usageCount: 1 });
            else { ht.usageCount += 1; await ht.save(); }
            hashTagIds.push(ht._id);
        }

        if (songId) { await Song.findByIdAndUpdate(songId, { $inc: { usageCount: 1 } }); }

        const video = await Video.create({
            userId: loginUser._id, songId, caption, videoTime: parseInt(videoTime) || 0,
            videoImage, videoUrl, hashTag: hashTags, hashTagId: hashTagIds,
        });

        res.json({ status: true, message: 'Video uploaded', data: await formatVideo(video.toObject(), loginUser._id) });
    } catch (error) { next(error); }
});

// GET /api/videos/user/:userId
router.get('/user/:userId', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const videos = await Video.find({ userId: req.params.userId }).sort({ createdAt: -1 }).lean();
        const formatted = await Promise.all(videos.map(v => formatVideo(v, loginUser?._id)));
        res.json({ status: true, message: 'User videos fetched', data: formatted });
    } catch (error) { next(error); }
});

// GET /api/videos/audio/:songId
router.get('/audio/:songId', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const videos = await Video.find({ songId: req.params.songId }).sort({ createdAt: -1 }).lean();
        const formatted = await Promise.all(videos.map(v => formatVideo(v, loginUser?._id)));
        res.json({ status: true, message: 'Audio-wise videos fetched', data: formatted });
    } catch (error) { next(error); }
});

// POST /api/videos/:videoId/like
router.post('/:videoId/like', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const existing = await Like.findOne({ userId: loginUser._id, videoId: req.params.videoId, type: 'video' });
        if (existing) {
            await Like.deleteOne({ _id: existing._id });
            await Video.findByIdAndUpdate(req.params.videoId, { $inc: { totalLikes: -1 } });
            res.json({ status: true, message: 'Video unliked', isLike: false });
        } else {
            await Like.create({ userId: loginUser._id, videoId: req.params.videoId, type: 'video' });
            await Video.findByIdAndUpdate(req.params.videoId, { $inc: { totalLikes: 1 } });
            res.json({ status: true, message: 'Video liked', isLike: true });
        }
    } catch (error) { next(error); }
});
// POST /api/videos/:videoId/comment
router.post('/:videoId/comment', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { commentText } = req.body;
        if (!commentText) return res.status(400).json({ status: false, message: 'Comment text required' });

        const comment = await Comment.create({
            userId: loginUser._id, videoId: req.params.videoId, commentText, type: 'video',
        });
        await Video.findByIdAndUpdate(req.params.videoId, { $inc: { totalComments: 1 } });

        res.json({
            status: true, message: 'Comment added',
            comment: {
                _id: comment._id, commentText: comment.commentText,
                userId: loginUser._id, name: loginUser.name, userName: loginUser.userName,
                image: loginUser.image, isVerified: loginUser.isVerified,
                createdAt: comment.createdAt,
            },
        });
    } catch (error) { next(error); }
});

// GET /api/videos/:videoId/comments
router.get('/:videoId/comments', auth, async (req, res, next) => {
    try {
        const page = parseInt(req.query.start) || 0;
        const limit = parseInt(req.query.limit) || 20;

        const comments = await Comment.find({ videoId: req.params.videoId, type: 'video' })
            .sort({ createdAt: -1 }).skip(page * limit).limit(limit).populate('userId', 'name userName image isVerified isProfilePicBanned').lean();

        const formatted = comments.map(c => ({
            _id: c._id, commentText: c.commentText,
            userId: c.userId?._id, name: c.userId?.name, userName: c.userId?.userName,
            image: c.userId?.image, isVerified: c.userId?.isVerified,
            isProfilePicBanned: c.userId?.isProfilePicBanned,
            createdAt: c.createdAt, time: getTimeAgo(c.createdAt),
        }));

        res.json({ status: true, message: 'Comments fetched', data: formatted });
    } catch (error) { next(error); }
});

// DELETE /api/videos/:videoId
router.delete('/:videoId', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const video = await Video.findById(req.params.videoId);
        if (!video) return res.status(404).json({ status: false, message: 'Video not found' });
        if (video.userId.toString() !== loginUser._id.toString()) return res.status(403).json({ status: false, message: 'Not authorized' });
        await Video.deleteOne({ _id: video._id });
        await Like.deleteMany({ videoId: video._id });
        await Comment.deleteMany({ videoId: video._id });
        res.json({ status: true, message: 'Video deleted' });
    } catch (error) { next(error); }
});

module.exports = router;

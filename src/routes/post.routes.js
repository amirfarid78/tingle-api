const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { upload, uploadMultipleToCloudinary } = require('../middleware/upload');
const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const Hashtag = require('../models/Hashtag');
const User = require('../models/User');

// Helper: format post for Flutter
async function formatPost(post, loginUserId) {
    const user = await User.findById(post.userId).lean();
    const isLike = loginUserId ? !!(await Like.findOne({ userId: loginUserId, postId: post._id, type: 'post' })) : false;
    const isFollow = loginUserId ? !!(await Follow.findOne({ userId: loginUserId, followingId: post.userId })) : false;

    return {
        _id: post._id,
        id: post._id,
        caption: post.caption,
        postImage: post.postImage.map(img => ({ url: img.url, isBanned: img.isBanned, _id: img._id })),
        shareCount: post.shareCount,
        isFake: post.isFake,
        createdAt: post.createdAt,
        postId: post._id,
        hashTagId: post.hashTagId,
        hashTag: post.hashTag,
        userId: post.userId,
        name: user?.name || '',
        userName: user?.userName || '',
        gender: user?.gender || '',
        age: user?.age || 0,
        country: user?.country || '',
        countryFlagImage: user?.countryFlagImage || '',
        userImage: user?.image || '',
        isProfilePicBanned: user?.isProfilePicBanned || false,
        isVerified: user?.isVerified || false,
        userIsFake: user?.isFake || false,
        isLike,
        isFollow,
        totalLikes: post.totalLikes || 0,
        totalComments: post.totalComments || 0,
        time: getTimeAgo(post.createdAt),
    };
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

// GET /api/posts — Fetch all posts (paginated)
router.get('/', auth, async (req, res, next) => {
    try {
        const page = parseInt(req.query.start) || 0;
        const limit = parseInt(req.query.limit) || 20;
        const loginUser = await User.findOne({ firebaseUid: req.uid });

        const posts = await Post.find({}).sort({ createdAt: -1 }).skip(page * limit).limit(limit).lean();
        const formattedPosts = await Promise.all(posts.map(p => formatPost(p, loginUser?._id)));

        res.json({ status: true, message: 'Posts fetched successfully', post: formattedPosts });
    } catch (error) { next(error); }
});

// POST /api/posts/create — Create a post
router.post('/create', auth, upload.array('postImage', 10), async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        if (!loginUser) return res.status(404).json({ status: false, message: 'User not found' });

        const { caption, mentionedUserIds, hashTag } = req.body;
        let postImages = [];

        if (req.files && req.files.length > 0) {
            const urls = await uploadMultipleToCloudinary(req.files, 'tingle/posts');
            postImages = urls.map(url => ({ url, isBanned: false }));
        }

        // Process hashtags
        const hashTags = hashTag ? (Array.isArray(hashTag) ? hashTag : JSON.parse(hashTag)) : [];
        const hashTagIds = [];
        for (const tag of hashTags) {
            let ht = await Hashtag.findOne({ hashTag: tag });
            if (!ht) { ht = await Hashtag.create({ hashTag: tag, usageCount: 1 }); }
            else { ht.usageCount += 1; await ht.save(); }
            hashTagIds.push(ht._id);
        }

        const post = await Post.create({
            userId: loginUser._id,
            caption: caption || '',
            postImage: postImages,
            hashTag: hashTags,
            hashTagId: hashTagIds,
            mentionedUserIds: mentionedUserIds ? JSON.parse(mentionedUserIds) : [],
        });

        res.json({ status: true, message: 'Post created successfully', post: await formatPost(post.toObject(), loginUser._id) });
    } catch (error) { next(error); }
});

// PUT /api/posts/:postId/edit — Edit a post
router.put('/:postId/edit', auth, async (req, res, next) => {
    try {
        const { caption } = req.body;
        const post = await Post.findByIdAndUpdate(req.params.postId, { caption }, { new: true });
        if (!post) return res.status(404).json({ status: false, message: 'Post not found' });
        res.json({ status: true, message: 'Post updated successfully' });
    } catch (error) { next(error); }
});

// POST /api/posts/:postId/like — Like/Unlike
router.post('/:postId/like', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const existing = await Like.findOne({ userId: loginUser._id, postId: req.params.postId, type: 'post' });

        if (existing) {
            await Like.deleteOne({ _id: existing._id });
            await Post.findByIdAndUpdate(req.params.postId, { $inc: { totalLikes: -1 } });
            res.json({ status: true, message: 'Post unliked', isLike: false });
        } else {
            await Like.create({ userId: loginUser._id, postId: req.params.postId, type: 'post' });
            await Post.findByIdAndUpdate(req.params.postId, { $inc: { totalLikes: 1 } });
            res.json({ status: true, message: 'Post liked', isLike: true });
        }
    } catch (error) { next(error); }
});

// POST /api/posts/:postId/comment — Add comment
router.post('/:postId/comment', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { commentText } = req.body;
        if (!commentText) return res.status(400).json({ status: false, message: 'Comment text required' });

        const comment = await Comment.create({
            userId: loginUser._id, postId: req.params.postId, commentText, type: 'post',
        });
        await Post.findByIdAndUpdate(req.params.postId, { $inc: { totalComments: 1 } });

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

// GET /api/posts/:postId/comments — Fetch comments
router.get('/:postId/comments', auth, async (req, res, next) => {
    try {
        const page = parseInt(req.query.start) || 0;
        const limit = parseInt(req.query.limit) || 20;

        const comments = await Comment.find({ postId: req.params.postId, type: 'post' })
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

// GET /api/posts/follow — Fetch followed user posts
router.get('/follow', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const following = await Follow.find({ userId: loginUser._id }).select('followingId');
        const followingIds = following.map(f => f.followingId);

        const posts = await Post.find({ userId: { $in: followingIds } })
            .sort({ createdAt: -1 }).limit(50).lean();

        const formatted = await Promise.all(posts.map(p => formatPost(p, loginUser._id)));
        res.json({ status: true, message: 'Follow posts fetched', post: formatted });
    } catch (error) { next(error); }
});

// GET /api/posts/user/:userId — User-wise posts
router.get('/user/:userId', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const posts = await Post.find({ userId: req.params.userId }).sort({ createdAt: -1 }).lean();
        const formatted = await Promise.all(posts.map(p => formatPost(p, loginUser?._id)));
        res.json({ status: true, message: 'User posts fetched', post: formatted });
    } catch (error) { next(error); }
});

// GET /api/posts/hashtag/:hashTagId — Hashtag-wise posts
router.get('/hashtag/:hashTagId', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const posts = await Post.find({ hashTagId: req.params.hashTagId }).sort({ createdAt: -1 }).lean();
        const formatted = await Promise.all(posts.map(p => formatPost(p, loginUser?._id)));
        res.json({ status: true, message: 'Hashtag posts fetched', post: formatted });
    } catch (error) { next(error); }
});

// DELETE /api/posts/:postId — Delete post
router.delete('/:postId', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ status: false, message: 'Post not found' });
        if (post.userId.toString() !== loginUser._id.toString()) {
            return res.status(403).json({ status: false, message: 'Not authorized' });
        }
        await Post.deleteOne({ _id: post._id });
        await Like.deleteMany({ postId: post._id });
        await Comment.deleteMany({ postId: post._id });
        res.json({ status: true, message: 'Post deleted' });
    } catch (error) { next(error); }
});

module.exports = router;

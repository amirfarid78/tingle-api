const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const { Message, ChatTopic } = require('../models/Message');
const User = require('../models/User');

// GET /api/messages/users?type= — Message user list
router.get('/users', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        if (!loginUser) return res.status(404).json({ status: false, message: 'User not found' });

        const type = req.query.type || 'all';
        const page = parseInt(req.query.start) || 0;
        const limit = parseInt(req.query.limit) || 20;

        let query = { $or: [{ user1Id: loginUser._id }, { user2Id: loginUser._id }] };
        const topics = await ChatTopic.find(query).sort({ lastMessageTime: -1 }).skip(page * limit).limit(limit).lean();

        const data = await Promise.all(topics.map(async (topic) => {
            const otherUserId = topic.user1Id.toString() === loginUser._id.toString() ? topic.user2Id : topic.user1Id;
            const otherUser = await User.findById(otherUserId).lean();
            if (!otherUser) return null;

            // Filter by type
            if (type === 'online' && !otherUser.isOnline) return null;

            const unreadCount = topic.user1Id.toString() === loginUser._id.toString() ? topic.user1Unread : topic.user2Unread;
            if (type === 'unread' && unreadCount === 0) return null;

            return {
                _id: topic._id, chatTopicId: topic._id,
                senderId: topic.user1Id, message: topic.lastMessage,
                unreadCount,
                userId: otherUser._id, name: otherUser.name, userName: otherUser.userName,
                image: otherUser.image, isProfilePicBanned: otherUser.isProfilePicBanned,
                isVerified: otherUser.isVerified, isFake: otherUser.isFake,
                time: topic.lastMessageTime,
            };
        }));

        res.json({ status: true, message: 'Message users fetched', data: data.filter(Boolean) });
    } catch (error) { next(error); }
});

// GET /api/messages/search?q= — Search message users
router.get('/search', auth, async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const searchString = req.query.q || req.query.searchString || '';

        if (!searchString) return res.json({ status: true, message: 'No search query', data: [] });

        // Find users matching search that have conversations with login user
        const users = await User.find({
            $and: [
                { _id: { $ne: loginUser._id } },
                {
                    $or: [
                        { name: { $regex: searchString, $options: 'i' } },
                        { userName: { $regex: searchString, $options: 'i' } },
                        { uniqueId: { $regex: searchString, $options: 'i' } },
                    ]
                },
            ]
        }).limit(20).lean();

        const data = users.map(u => ({
            userId: u._id, name: u.name, userName: u.userName,
            image: u.image, isProfilePicBanned: u.isProfilePicBanned,
            isVerified: u.isVerified, isFake: u.isFake,
            uniqueId: u.uniqueId, isOnline: u.isOnline,
        }));

        res.json({ status: true, message: 'Search results', data });
    } catch (error) { next(error); }
});

// GET /api/messages/chat/:chatTopicId — Fetch chat messages
router.get('/chat/:chatTopicId', auth, async (req, res, next) => {
    try {
        const page = parseInt(req.query.start) || 0;
        const limit = parseInt(req.query.limit) || 50;

        const messages = await Message.find({ chatTopicId: req.params.chatTopicId })
            .sort({ createdAt: -1 }).skip(page * limit).limit(limit)
            .populate('senderId', 'name userName image').lean();

        // Mark as read
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const topic = await ChatTopic.findById(req.params.chatTopicId);
        if (topic) {
            if (topic.user1Id.toString() === loginUser._id.toString()) {
                topic.user1Unread = 0;
            } else {
                topic.user2Unread = 0;
            }
            await topic.save();
        }

        res.json({ status: true, message: 'Chat messages fetched', data: messages.reverse() });
    } catch (error) { next(error); }
});

// POST /api/messages/send — Send a message (REST fallback)
router.post('/send', auth, upload.single('image'), async (req, res, next) => {
    try {
        const loginUser = await User.findOne({ firebaseUid: req.uid });
        const { receiverId, message, messageType } = req.body;

        if (!receiverId) return res.status(400).json({ status: false, message: 'receiverId required' });

        // Find or create chat topic
        let topic = await ChatTopic.findOne({
            $or: [
                { user1Id: loginUser._id, user2Id: receiverId },
                { user1Id: receiverId, user2Id: loginUser._id },
            ]
        });

        if (!topic) {
            topic = await ChatTopic.create({ user1Id: loginUser._id, user2Id: receiverId });
        }

        let imageUrl = '';
        if (req.file) imageUrl = await uploadToCloudinary(req.file.path, 'tingle/chat');

        const msg = await Message.create({
            chatTopicId: topic._id, senderId: loginUser._id, receiverId,
            message: message || '', messageType: messageType || 'text', image: imageUrl,
        });

        // Update topic
        topic.lastMessage = message || (imageUrl ? '📷 Image' : '');
        topic.lastMessageType = messageType || 'text';
        topic.lastMessageTime = new Date();
        if (topic.user1Id.toString() === receiverId.toString()) {
            topic.user1Unread += 1;
        } else {
            topic.user2Unread += 1;
        }
        await topic.save();

        res.json({ status: true, message: 'Message sent', data: msg });
    } catch (error) { next(error); }
});

module.exports = router;

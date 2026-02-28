const { Server } = require('socket.io');
const User = require('../models/User');
const { Message, ChatTopic } = require('../models/Message');
const LiveHistory = require('../models/LiveHistory');

let io;
const onlineUsers = new Map(); // userId -> socketId

function initSocket(server) {
    io = new Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
        pingTimeout: 60000,
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // ─── User Online/Offline ────────────────────────────
        socket.on('userOnline', async ({ userId }) => {
            if (userId) {
                onlineUsers.set(userId, socket.id);
                socket.userId = userId;
                await User.findByIdAndUpdate(userId, { isOnline: true });
                io.emit('userStatusChanged', { userId, isOnline: true });
            }
        });

        socket.on('disconnect', async () => {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                await User.findByIdAndUpdate(socket.userId, { isOnline: false });
                io.emit('userStatusChanged', { userId: socket.userId, isOnline: false });
            }
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });

        // ─── Chat Messages ──────────────────────────────────
        socket.on('sendMessage', async (data) => {
            try {
                const { senderId, receiverId, message, messageType, image } = data;

                // Find or create chat topic
                let topic = await ChatTopic.findOne({
                    $or: [
                        { user1Id: senderId, user2Id: receiverId },
                        { user1Id: receiverId, user2Id: senderId },
                    ]
                });

                if (!topic) {
                    topic = await ChatTopic.create({ user1Id: senderId, user2Id: receiverId });
                }

                const msg = await Message.create({
                    chatTopicId: topic._id, senderId, receiverId,
                    message: message || '', messageType: messageType || 'text', image: image || '',
                });

                // Update topic
                topic.lastMessage = message || (image ? '📷 Image' : '');
                topic.lastMessageType = messageType || 'text';
                topic.lastMessageTime = new Date();
                if (topic.user1Id.toString() === receiverId) topic.user1Unread += 1;
                else topic.user2Unread += 1;
                await topic.save();

                const sender = await User.findById(senderId).select('name userName image').lean();

                // Send to receiver
                const receiverSocketId = onlineUsers.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit('receiveMessage', {
                        _id: msg._id, chatTopicId: topic._id, senderId, receiverId,
                        message, messageType, image, date: msg.createdAt,
                        senderName: sender?.name, senderImage: sender?.image,
                    });
                }

                // Confirm to sender
                socket.emit('messageSent', { _id: msg._id, chatTopicId: topic._id, status: 'sent' });
            } catch (error) {
                socket.emit('error', { message: 'Failed to send message', error: error.message });
            }
        });

        socket.on('messageRead', async ({ chatTopicId, userId }) => {
            const topic = await ChatTopic.findById(chatTopicId);
            if (topic) {
                if (topic.user1Id.toString() === userId) topic.user1Unread = 0;
                else topic.user2Unread = 0;
                await topic.save();
            }
        });

        socket.on('typing', ({ senderId, receiverId, isTyping }) => {
            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('typing', { senderId, isTyping });
            }
        });

        // ─── Video Calls ────────────────────────────────────
        socket.on('callUser', async (data) => {
            const { callerId, receiverId, callerName, callerImage, channel, token, callId } = data;
            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('incomingCall', {
                    callId, callerId, callerName, callerImage, channel, token,
                });
            } else {
                socket.emit('callFailed', { message: 'User is offline' });
            }
        });

        socket.on('acceptCall', (data) => {
            const { callId, callerId, receiverId, isAccept } = data;
            const callerSocketId = onlineUsers.get(callerId);
            if (callerSocketId) {
                io.to(callerSocketId).emit('callAccepted', { callId, receiverId, isAccept });
            }
        });

        socket.on('rejectCall', (data) => {
            const { callId, callerId, receiverId } = data;
            const callerSocketId = onlineUsers.get(callerId);
            if (callerSocketId) {
                io.to(callerSocketId).emit('callRejected', { callId, receiverId });
            }
        });

        socket.on('endCall', (data) => {
            const { callId, userId, otherUserId } = data;
            const otherSocketId = onlineUsers.get(otherUserId);
            if (otherSocketId) {
                io.to(otherSocketId).emit('callEnded', { callId, userId });
            }
        });

        // ─── Live Streaming ─────────────────────────────────
        socket.on('joinLive', async ({ liveHistoryId, userId }) => {
            socket.join(`live_${liveHistoryId}`);
            // liveHistoryId may be a string (audio rooms) — skip DB safely
            try {
                const mongoose = require('mongoose');
                if (mongoose.Types.ObjectId.isValid(liveHistoryId)) {
                    await LiveHistory.findByIdAndUpdate(liveHistoryId, {
                        $inc: { view: 1 },
                        $addToSet: { viewers: userId },
                    });
                }
            } catch (e) { /* Non-fatal: audio room IDs are not ObjectIds */ }
            io.to(`live_${liveHistoryId}`).emit('viewerJoined', { userId, liveHistoryId });
        });

        socket.on('leaveLive', async ({ liveHistoryId, userId }) => {
            socket.leave(`live_${liveHistoryId}`);
            try {
                const mongoose = require('mongoose');
                if (mongoose.Types.ObjectId.isValid(liveHistoryId)) {
                    await LiveHistory.findByIdAndUpdate(liveHistoryId, {
                        $inc: { view: -1 },
                        $pull: { viewers: userId },
                    });
                }
            } catch (e) { /* Non-fatal */ }
            io.to(`live_${liveHistoryId}`).emit('viewerLeft', { userId, liveHistoryId });
        });

        socket.on('sendComment', (data) => {
            const { liveHistoryId, commentText, userId, senderName, senderImage } = data;
            io.to(`live_${liveHistoryId}`).emit('receiveComment', {
                commentText, userId, senderName, senderImage, date: new Date(),
            });
        });

        socket.on('sendGift', async (data) => {
            const { liveHistoryId, giftId, giftCount, giftUrl, giftType, giftName, giftCoin,
                senderUserId, receiverUserId, senderName, senderImage } = data;

            // Transfer coins
            if (senderUserId && receiverUserId && giftCoin) {
                const totalCost = giftCoin * (giftCount || 1);
                await User.findByIdAndUpdate(senderUserId, {
                    $inc: { coin: -totalCost, spentCoins: totalCost },
                });
                await User.findByIdAndUpdate(receiverUserId, {
                    $inc: { coin: totalCost, receivedCoins: totalCost, receivedGifts: giftCount || 1 },
                });
                await LiveHistory.findByIdAndUpdate(liveHistoryId, {
                    $inc: { totalGiftsReceived: giftCount || 1, totalCoinsEarned: totalCost },
                });
            }

            io.to(`live_${liveHistoryId}`).emit('receiveGift', {
                giftId, giftCount, giftUrl, giftType, giftName, giftCoin,
                senderName, senderImage, senderUserId, date: new Date(),
            });
        });

        // ─── Audio Room Seats ───────────────────────────────
        socket.on('seatUpdate', (data) => {
            const { liveHistoryId, position, lock, mute, name, agoraUid, userId, image, isOnline, hostIsMuted, speaking } = data;
            io.to(`live_${liveHistoryId}`).emit('seatUpdate', data);
        });

        socket.on('seatRequest', async (data) => {
            const { liveHistoryId, userId } = data;
            await LiveHistory.findByIdAndUpdate(liveHistoryId, { $addToSet: { requested: userId } });
            io.to(`live_${liveHistoryId}`).emit('seatRequest', { userId, liveHistoryId });
        });

        // ─── PK Battle ──────────────────────────────────────
        socket.on('startPK', (data) => {
            const { host1Id, host2Id, host1Channel, host2Channel, liveHistoryId } = data;
            const host2SocketId = onlineUsers.get(host2Id);
            if (host2SocketId) {
                io.to(host2SocketId).emit('pkInvite', { host1Id, host1Channel, liveHistoryId });
            }
        });

        socket.on('acceptPK', (data) => {
            const { liveHistoryId, host1Id, host2Id, host2Channel, host2Token } = data;
            io.to(`live_${liveHistoryId}`).emit('pkStarted', { host2Id, host2Channel, host2Token });
        });

        socket.on('endPK', async (data) => {
            const { liveHistoryId, pkEndUserId } = data;
            await LiveHistory.findByIdAndUpdate(liveHistoryId, { isPkMode: false });
            io.to(`live_${liveHistoryId}`).emit('pkEnded', { pkEndUserId });
        });

        // ─── User Block in Live ─────────────────────────────
        socket.on('userBlock', async ({ liveHistoryId, blockedUserId }) => {
            await LiveHistory.findByIdAndUpdate(liveHistoryId, { $addToSet: { blockedUsers: blockedUserId } });
            const blockedSocketId = onlineUsers.get(blockedUserId);
            if (blockedSocketId) {
                io.to(blockedSocketId).emit('youAreBlocked', { liveHistoryId });
            }
        });

        socket.on('userUnblock', async ({ liveHistoryId, unblockedUserId }) => {
            await LiveHistory.findByIdAndUpdate(liveHistoryId, { $pull: { blockedUsers: unblockedUserId } });
        });
    });

    return io;
}

function getIO() { return io; }
function getOnlineUsers() { return onlineUsers; }

module.exports = { initSocket, getIO, getOnlineUsers };

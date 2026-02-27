const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chatTopicId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatTopic', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: '' },
    messageType: { type: String, enum: ['text', 'image', 'audio', 'gift'], default: 'text' },
    image: { type: String, default: '' },
    audio: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    isMediaBanned: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ chatTopicId: 1, createdAt: -1 });

const chatTopicSchema = new mongoose.Schema({
    user1Id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user2Id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessage: { type: String, default: '' },
    lastMessageType: { type: String, default: 'text' },
    lastMessageTime: { type: Date, default: Date.now },
    user1Unread: { type: Number, default: 0 },
    user2Unread: { type: Number, default: 0 },
}, { timestamps: true });

chatTopicSchema.index({ user1Id: 1, user2Id: 1 }, { unique: true });

const Message = mongoose.model('Message', messageSchema);
const ChatTopic = mongoose.model('ChatTopic', chatTopicSchema);

module.exports = { Message, ChatTopic };

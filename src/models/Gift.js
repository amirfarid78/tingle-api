const mongoose = require('mongoose');

const giftCategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const giftSchema = new mongoose.Schema({
    giftCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'GiftCategory', required: true },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    coin: { type: Number, required: true },
    giftType: { type: String, enum: ['static', 'animated', 'svga'], default: 'static' },
    giftUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

giftSchema.index({ giftCategoryId: 1 });

const emojiSchema = new mongoose.Schema({
    image: { type: String, required: true },
    name: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const GiftCategory = mongoose.model('GiftCategory', giftCategorySchema);
const Gift = mongoose.model('Gift', giftSchema);
const Emoji = mongoose.model('Emoji', emojiSchema);

module.exports = { GiftCategory, Gift, Emoji };

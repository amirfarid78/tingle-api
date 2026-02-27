const mongoose = require('mongoose');

const storeItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, default: '' },
    type: { type: String, enum: ['THEME', 'FRAME', 'RIDE'], required: true },
    coin: { type: Number, required: true },
    validity: { type: Number, default: 0 }, // days, 0 = permanent
    isActive: { type: Boolean, default: true },
    frameType: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const purchasedItemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreItem', required: true },
    itemType: { type: String, enum: ['THEME', 'FRAME', 'RIDE'], required: true },
    purchasedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

purchasedItemSchema.index({ userId: 1, itemType: 1 });

const StoreItem = mongoose.model('StoreItem', storeItemSchema);
const PurchasedItem = mongoose.model('PurchasedItem', purchasedItemSchema);

module.exports = { StoreItem, PurchasedItem };

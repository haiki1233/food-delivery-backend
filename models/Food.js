const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: String,
    imageUrl: String,

    // Quan trọng : liên kết bảng (Relationship)
    // Món này thuộc về nhà hàng nào? (Which restaurant dose this food belong to?)
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',  // Trỏ tới model Restaurant
        required: true
    },

    // Món này có đang bán không? (Is available?)
    isSoldOut: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Food', foodSchema);
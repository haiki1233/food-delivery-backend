const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
    // Khách hàng (customer)
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Đơn hàng phải có người đặt / Order must belong to a user']
    },

    // Quán ăn (Restaurant) - quan trọng để shipper biết đường đến lấy
    restaurant: {
        type: mongoose.Schema.ObjectId,
        ref: 'Restaurant',
        required: [true, 'Đơn hàng phải thuộc 1 quán ăn / Order must belong to a restaurant']
    },

    // Danh sách món (List of items)
    items: [
        {
            food: {
                type: mongoose.Schema.ObjectId,
                ref: 'Food',
                required: true
            },
            quantity: { type: Number, default: 1 },

            // Lưu lại giá tại thời điểm đặt (Price at order time)
            // Để sau này quán tăng giá thì lịch sử đơn hàng không bị sai
            price: { type: Number, required: true }
        }
    ],

    // Tổng tiền (Total price)
    totalPrice: { type: Number, required: true },


    // Địa chỉ giao hàng (Delivery Address)
    address: { type: String, required: true},

    // Trạng thái (Status)
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cooking', 'Delivering', 'Completed', 'Cancelled'],
        default: 'Pending'
    },

    createdAt: { type: Date, default: Date.now }
});


// // Middleware: Tự động populate (Điền thôn tin) khi query
// orderSchema.pre(/^find/, function(next) {
//     this.populate({
//         path: 'user',
//         select: 'username email'
//     }).populate({
//         path: 'restaurant',
//         select: 'name address'  // chỉ lấy tên và địa chỉ quán
//     });

//     next();
// });

module.exports = mongoose.model('Order', orderSchema);
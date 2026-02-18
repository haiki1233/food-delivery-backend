const mongoose = require('mongoose');


const restaurantSchema = new mongoose.Schema({
    // Tên nhà hàng (Restaurant name)
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên nhà hàng / Please enter restaurant name'],
        trim: true,     // Tự động cắt khoảng trắng thừa 2 đầu (Auto must be unique)
        unique: true    // Tên không được trùng nhau (Name must be unique)
    },

    // Địa chỉ (Address)
    location: {
        // Kiểu dữ liệu phải là 'Point' (Type must be 'Point')
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },

        // Tọa độ: [Kinh độ, vĩ độ] (Coordinates: [Longitude, latitude])
        // LƯU Ý: MongoDB ngược lại với Google Maps. Google là (lat, long), Mongo là (Long, lat)
        coordinates: [Number],
        address: String,
        description: String
    },


    // Loại hình: Cơm, phở, Tra sữa,... (cuisine Type)
    cuisine: {
        type: String,
        required: true,
        enum: ['Rice', 'Noodles', 'Drinks', 'FastFood', 'Other']    // chỉ cho phép các loại này
    },


    // Đánh giá trung bình (Average Rating) - Tính toán tự động sau này
    ratingAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Thấp nhất là 1 sao/ Min rating is 1'],
        max: [5, 'Cao nhất là 5 sao / Max rating is 5']
    },


    // Trạng thái mở cửa (Is open?)
    isOpen: {
        type: Boolean,
        default: true
    },


    // Link ảnh bìa (Cover image)
    imageUrl: String
}, {
    timestamps: true,   //  Tự động tạo createdAt, updateAt
    toJSON: { virtuals: true },     // cho phép hiện trường ảo (Virtual fields)
    toObject: { virtuals: true }
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
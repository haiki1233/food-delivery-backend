const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Kiểm tra đăng nhập
exports.verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) return res.status(401).json({ message: "Vui lòng đăng nhập!" });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'bi-mat-shop');
        req.user = verified;    // Lưu thông tin user vào biến req để dùng sau
        next();
    } catch (error) {
        res.status(401).json({ message: "Token không hợp lệ!" });
    }
};


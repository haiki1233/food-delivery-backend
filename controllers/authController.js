const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const EmailService = require('../utils/email');

// Đăng ký
exports.register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Kiểm tra email trùng
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email đã tồn tại!" });

        // Mã hóa mật khẩu
        const handlePassword = await bcrypt.hash(password, 10);

        // Tạo user mới
        const newUser = new User ({
            username,
            email,
            password: handlePassword,
            role: role || 'customer'
        });

        await newUser.save();

        // GỬI EMAIL CHÀO MỪNG (SEND WELCOME EMAIL)
        // Lưu ý: Không dùng await ở đây để user không phải chờ gửi mail xong mới nhận phản hồi
        // (Fire and Forget strategy)
        const url = 'http://localhost:5173';    //Link trang chủ
        new EmailService(newUser, url).sendWelcome();

        
        res.status(201).json({ message: "Đăng ký thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Đăng nhập
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ message: "Email không tồn tại!"});

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Mật khẩu sai!" });

        // Tạo token (Create Token)
        const token = jwt.sign(
            {userId: user._id, role: user.role},
            process.env.JWT_SECRET || 'bi-mat-shop',
            { expiresIn: '1h' }
        );

        res.json({
            message: "Đăng nhập thành công!",
            token,
            user: {username: user.username, role: user.role, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
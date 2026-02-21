const express = require('express');
const mongoose = require('mongoose');
const http = require('http');       // Import module HTTP chuẩn của Node
const { Server } = require('socket.io');
require('dotenv').config();
const cors = require('cors');

const swaggerDocs = require('./config/swagger');

// BẢO MẬT API
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const restaurantRouter = require('./routes/restaurantRoutes');
const foodRouter = require('./routes/foodRoutes');
const authRouter = require('./routes/authRoutes');
const orderRouter = require('./routes/orderRoutes');



const app = express();

// LỚP GIÁP 1: HELMET (MŨ BẢO HIỂM)
// Tự động thêm các HTTP Headers bảo mật đặc biệt
// (Set security HTTP Headers)
app.use(helmet());

// cho phép frontend gọi vào
app.use(cors());

// LỚP GIÁP 2: RATE LIMITING (giới hạn tốc độ)
// Chống tấn công DDoS hoặc Brute Force (Thử pass liên tục)
// (Limit requests from same API)
const limiter = rateLimit({
    max: 100,   // chỉ cho phép 100 request
    windowMs: 60 * 60 * 1000,   // Trong vòng 1h
    message: '⛔ Qúa nhiều request từ IP này, vui lòng thử lại sau 1 giờ! (Too many request, please try again in an hour!)'
});
// Aps dụng cho tất cả API bantws đầu bằng /api
app.use('/api', limiter);

// Body Parser (Đọc dữ liệu JSON)
app.use(express.json({ limit: '10kb' }));   // Chặn hacker gửi liên tục dữ liệu quá lớn làm tràn bộ nhớ

// LỚP GIÁP 3: MONGO SANITIZE (Lọc dữ liệu NoSQL)
// Chống tấn công NoSQL Injection (Ví dụ: gửi {"$gt": ""} để lừa đăng nhập)
// (Data sanitization against NoSQL query injection)
app.use(mongoSanitize());

// LỚP GIÁP 4: XSS CLEAN (Chống mã độc HTML)
// Chống hacker gửi code HTML/JS vào input (Ví dụ: <script>alert('hack')</script>)
// Data sanitization against XSS
app.use(xss());

// LỚP GIÁP 5: HPP (Chống ô nhiễm tham số)
// Chống lỗi khi gửi 2 tham số trùng tên (Ví dụ: ?sort=price&sort=name)
// (Prevent parameter pollution)
app.use(hpp({
    whitelist: [ // cho phép trùng tên ở các trường hợp này (tùy chọn)
        'duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price'
    ]
}));

// CẤU HÌNH SOCKET.IO (SOCKET SETUP)
// Tạo server HTTP từ Express app (Create HTTP server from Express)
const server = http.createServer(app);

// KHởi tạo Socket.io với cấu hình CROS (Init Socket.io with CROS)
const io = new Server(server, {
    cors: {
        origin: "*",    // cho phép mọi Frontend kết nối (Allow all origins)
        methods: ["GET", "POST"]
    }
});

// Biến toàn cục để dùng io ở các file Controller khác (Global IO instance)
global.io = io;

// Lắng nghe sự kiện kết nối (Listen for connection)
io.on('connection', (socket) => {
    console.log(`⚡User connection: ${socket.id}`);


    // KỸ THUẬT ROOMS (PHÒNG CHAT)
    // Khi chủ Quán đăng nhập, họ sẽ tham gia vào "phòng" riêng của quán họ
    // (Restaurant Owner join their own 'Room')
    socket.on('join_restaurant_room', (restaurantId) => {
        socket.join(restaurantId);
        console.log(`User ${socket.id} joined room: ${restaurantId}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});


app.use('/api/auth', authRouter);
app.use('/api/restaurants', restaurantRouter);
app.use('/api/restaurants/:restaurantId/foods', foodRouter);
app.use('/api/foods', foodRouter);  // Dùng cho trường hợp muốn lấy món ăn mà không quan tâm quán
app.use('/api/orders', orderRouter);

// kết nối database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Đã kết nối MongoDB"))
    .catch((err) => console.error(err));


// Chạy server
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`🚀 Server Shop đang chạy tại http://localhost:${port}`);

    // KÍCH HOẠT SWAGGER
    swaggerDocs(app, port);
});
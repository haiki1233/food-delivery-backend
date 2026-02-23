const Order = require('../models/Order');
const Food = require('../models/Food');
const Restaurant = require('../models/Restaurant');
const Stripe = require('stripe');
const EmailService = require('../utils/email');
const User = require('../models/User');



// Khởi tạo Stripe với Secret key (Initialize Stripe)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

console.log(process.env.STRIPE_SECRET_KEY);

// API: Tạo đơn hàng (Create Order)
exports.createOrder = async (req, res) => {
    try {
        const { restaurantId, items, address } = req.body;  // items = [{ foodId, quantity }]

        // Kiểm tra quán có tồn tại không? (Check if restaurant exists)
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ status: 'fail', message: 'Không tìm thấy quán ăn (Restarant not found' });
        }

        let totalPrice = 0;
        const orderItems = [];

        // xử lý từng món ăn (Process each food item)
        // Lưu ý: Dùng vòng lặp for...of để chạy async/await (Avoid map/forEach with async)
        for (const item of items) {
            // Tìm món ăn trong DB để lấy giá trị thật (Fetch real food data from DB)
            const foodDB = await Food.findById(item.foodId);

            if (!foodDB) {
                return res.status(404).json({ status: 'fail', message: `Món ăn ID ${item.foodId} không tồn tại` });
            }


            // KỸ NĂNG SENIOR: Kiểm tra tính toàn vẹn dữ liệu (Data Integrity Check)
            // Đảm bảo món ăn thuộc đúng quán đang đặt (Ensure food belong to the restaurant)
            if (foodDB.restaurantId.toString() !== restaurantId) {
                return res.status(400).json({
                    status: 'fail',
                    message: `Món ${foodDB.name} không thuộc quán này! (Food does not belong to this restaurant)`
                });
            }


            // Tính tiền: Gía DB * số lượng (Calculate: DB Price * Quantity)
            // lưu ý không lấy duex liệu từ req.body gửi lên!
            totalPrice += foodDB.price * item.quantity;

            // Đẩy vào mảng để lưu (Phush to array)
            orderItems.push({
                food: foodDB._id,
                quantity: item.quantity,
                price: foodDB.price     // lưu giá trị tại thời điểm này (Snapshot price)
            });
        }


        // Tạo đơn hàng mới (Create new Order)
        const newOrder = await Order.create({
            user: req.user.userId,
            restaurant: restaurantId,
            items: orderItems,
            totalPrice: totalPrice,
            address: address
        });

        // SOCKET.IO: BẮN THÔNG BÁO (EMIT EVENT)
        // Gửi tới phòng có ID là restaurantId
        // Send to the specific restaurant room
        global.io.to(newOrder.restaurant.toString()).emit('new_order', {
            message: '🔔 Có đơn hàng mới! (New Order Received)',
            orderId: newOrder._id,
            totalPrice: newOrder.totalPrice,
            items: newOrder.items
        });

        // GỬI EMAIL XÁC NHẬN (SEND ORDER EMAIL)
        // Lấy thông tin user để gửi email
        const user = await User.findById(req.user.userId);
        // Nếu req.user chỉ có ID, em phải query lại user: await User.findById(req.user.userId)
        console.log(user);

        // Guiwr mail
        const emailUrl = `http://localhost:5173/my-order`;
        // Cần đảm bảo object user có trường 'email' và 'username'
        new EmailService(user, emailUrl).sendOrderConfirmation(newOrder._id, newOrder.totalPrice);

        res.status(201).json({
            status: 'success',
            data: { order: newOrder }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};


// API: Lấy đơn hàng của tôi (Get my orders)
exports.getMyOrders = async (req, res) => {
    try {
        // Tìm đơn hàng của user đang đăng nhập (Find orders by current user)
        const orders = await Order.find({ user: req.user.userId })
            .populate({
                path: 'items.food',
                select: 'name price image'
            });

        res.status(200).json({
            status: 'success',
            results: orders.length,
            data: { orders }
        });

        const user = await User.findById(req.user.userId);  // đã có sẳn trong req.user nhờ middleware
        // Nếu req.user chỉ có ID, em phải query lại user: await User.findById(req.user.userId)
        console.log(user);
    } catch (error) {
        res.status(500).json({ status: 'fail', message: error.message });
    }
};


// API: Cập nhật trạng thái đơn hàng (Update order Status)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Tìm đơn hàng (Find the order)
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ status: 'fail', message: 'Không tìm thấy đơn hàng (Order not found)' });
        }


        // LOGIC KIỂM TRA TRẠNG THÁI (STATE VALIDATION LOGIC)
        // Định nghĩa các bước hợp lệ (Define valid transitions)
        const valdStatuses = ['Pending', 'Confirmed', 'Cooking', 'Delivering', 'Completed', 'Cancelled'];

        // Kiểm tra trạng thái gửi lên có nằm trong danh sách không?
        if (!valdStatuses.includes(status)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Trạng thái không hợp lệ (Invalid status)'
            });
        }

        // Logic chặn nhảy cóc (Prevent invalid transition)
        // Ví dụ: không thể hủy đơn khi đang giao hàng
        if (order.status === 'Delvering' && status === 'Cancelled') {
            return res.status(400).json({
                status: 'fail',
                message: 'Không thể hủy khi đang giao hàng! (Cannot cancel while delivering)'
            });
        }

        // Nếu đơn đã xong thì không được sửa gì hết (if completed, strictly no update)
        if (order.status === 'Completed') {
            return res.status(400).json({ status: 'fail', message: 'Đơn hàng đã hoàn thành, không thể thay đổi! (Order is already completed)' });
        }

        // Cập nhật
        order.status = status;
        await order.save();     // Dùng .save() để kích hoạt middleware nếu có (Use .save() to trigger middleware)

        res.status(200).json({
            status: 'success',
            data: { order }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};


// API: Thống kê doanh thu theo quán (Order Stats by restaurant)
exports.getOrderStats = async (req, res) => {
    try {
        const stats = await Order.aggregate([
            // BƯỚC 1: LỌC (MATCH)
            // Chỉ lấy những đơn hàng đã hoàn thành (Only get completed orders)
            {
                $match: { status: 'Completed'}
            },

            // BƯỚC 2: NHÓM (GROUP)
            // Gom lại theo ID quán ăn. Tính tổng tiền.
            // Group by restaurant ID. Calculate total revenue
            {
                $group: {
                    _id: '$restuarant',     // Nhóm theo trường 'restaurant'
                    numOrders: { $sum: 1 },     // Điếm số đơn (Cộng 1 cho mỗi đơn)
                    totalRevenue: { $sum: '$totalPrice' },      // Cộng dồn trường totalPrice
                    avgPrice: { $avg: '$totalPrice' }   // Tính giá trị trung bình mỗi đơn
                }
            },


            // BƯỚC 3: SẮP XẾP (SORT)
            // Doanh thu cao nhất lên đầu (Highest revenue first)
            {
                $sort: { totalRevenue: -1 }
            }
        ]);

        res.status(200).json({
            status: 'success',
            data: { stats }
        });
    } catch (error) {
        res.status(500).json({ status: 'fail', message: error.message });
    }
};


// API: Tạo phiên thanh toán (Get checkout Session)
exports.getCheckoutSession = async (req, res) => {
    try {
        // Lấy đơn hàng đang chờ thanh toán (Get the pending order)
        const order = await Order.findById(req.params.orderId).populate('user');

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        // Tạo phiên bản giao dịch với Stripe (Create Stripe Checkout Session)
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],     // chấp nhận thẻ (Accept cards)

            // Thông tin hiển thị trên trang thanh toán (line items)
            line_items: [
                {
                    price_data: {
                        currency: 'vnd',    // tiền việt
                        unit_amount: order.totalPrice, // 👈 BẮT BUỘC
                        product_data: {
                            name: `Đơn hàng Food Delivery #${order._id}`,
                            description: `Thanh toán cho quán: ${order.restaurant.name}`,
                            // Có thể thêm ảnh món ăn vào đây nếu muốn (images: [...])
                        }
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',    // chế độ thanh toán 1 lần (One-time payment)

            // Đường dẫn khi thanh toán thành công (Redirect here on success)
            success_url: `${req.protocol}://${req.get('host')}/api/orders/payment-success?session_id={CHECKOUT_SESSION_ID}`,

            // Email khách hàng (để Stripe tự điền form cho khách đỡ mỏi tay)
            customer_email: order.user.email,

            // Kỹ thuật Reference: Gắn ID đơn hàng vào sesson để sau này đối soát
            client_reference_id: req.params.orderId,
        });

        // Trả về Session URL cho frontend (Return URL to client)
        res.status(200).json({
            status: 'success',
            sessionUrl: session.url
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};


exports.paymentSuccess = async (req, res) => {
    try {
        const { session_id } = req.query;

        if (!session_id) {
            return res.status(400).json('Không có Session ID (No Session ID)');
        }

        // Hỏi Stripe: "Session này sao rồi?" (Verify with stripe)
        const session = await stripe.checkout.sessions.retrieve(session_id);

        // Kiểm tra trạng thái thanh toán (Checkout payment status)
        if (session.payment_status === 'paid') {

            // Lấy ID đơn hàng từ client_reference_id mình đã gắn lúc tạo link
            const orderId = session.client_reference_id;

            // Cập nhật Database (Update Order in DB)
            await Order.findByIdAndUpdate(orderId, {
                status: 'Confirmed',       // đổi từ Pending -> Confirmed
                // Em có thể thêm isPaid: true vào model nếu muốn
            });

            // Trả về giao diện thông báo (return simple HTML)
            // Vì đây là chuyển hướng trình duyệt, tả trả về html đẹp đẹp tí thay vì JSON
            res.send(`
                <html>
                    <head><title>Thanh toán thành công!</title></head>
                    <body style="text-align:center; padding:50px; font-family: Arial;">
                        <h1 style="color: green;">✅ Thanh toán thành công!</h1>
                        <p>Cảm ơn bạn đã đặt món. Đơn hàng <b>#${orderId}</b> đã được xác nhận</p>
                        <p>Mã giao dịch Stripe: ${session.payment_intent}</p>
                        <a href="http://locallhost:5173/my-orders" style="padding: 10px 20px; background: blue; color: white; text-decoration: none; boder-radius: 5px;">Quay lại</a>
                    </body>
                </html>
            `);
        } else {
            res.send(`<h1 style="color: red;">❌ Thanh toán chưa hoàn tất!</h1>`);
        }
    } catch (error) {
        res.status(500).send(`lỗi server: ${error.message}`);
    }
};


// API: Xử lý khi hủy thanh toán (handle payment cancel)
exports.paymentCancel = async (req, res) => {
    res.send(`
        <html>
            <body style="text-align:center; padding: 50px; font-family: Arial;">
                <h1 style="color: orange;">⚠️ Bạn đã hủy thanh toán</h1>
                <p>Đơn hàng vẫn ở trạng thái chờ.</p>
            </body>
        </html>
    `);
};
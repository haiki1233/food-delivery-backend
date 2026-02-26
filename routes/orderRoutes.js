const express = require('express');
const orderController = require('../controllers/orderController');
const { verifyToken, checkAdmin } = require('../middleware/auth');


const router = express.Router();

router.get('/payment-success', orderController.paymentSuccess);
router.get('/payment-cancel', orderController.paymentCancel);

// Tất cả các route dưới đây đều cần đăng nhập (All routes below require login)
router.use(verifyToken);

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Quản lý đơn hàng (Order Management)
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Tạo đơn hàng mới (Create new order)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - items
 *               - address
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 description: ID của nhà hàng
 *                 example: 65d4a123456789abc
 *               address:
 *                 type: string
 *                 description: Địa chỉ giao hàng
 *                 example: "123 Đường Lê Lợi, Quận 1, TP.HCM"
 *               items:
 *                 type: array
 *                 description: Danh sách món ăn
 *                 items:
 *                   type: object
 *                   properties:
 *                     foodId:
 *                       type: string
 *                       description: ID món ăn
 *                       example: 65d4b987654321xyz
 *                     quantity:
 *                       type: integer
 *                       description: Số lượng
 *                       example: 2
 *     responses:
 *       201:
 *         description: Đặt hàng thành công (Order created successfully)
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc món ăn không thuộc quán
 *       401:
 *         description: Chưa đăng nhập (Unauthorized)
 */

/**
 * @swagger
 * /orders/my-orders:
 *   get:
 *     summary: Lấy lịch sử đơn hàng của tôi (Get my order history)
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 65f123abc456
 *                           totalPrice:
 *                             type: number
 *                             example: 50000
 *                           status:
 *                             type: string
 *                             example: Pending
 *                           items:
 *                             type: array
 */


router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getMyOrders);
router.get('/admin', checkAdmin, orderController.getAllOrders);
router.get('/stats', orderController.getOrderStats);
router.patch('/:id/status', orderController.updateOrderStatus);
router.post('/checkout-session/:orderId', orderController.getCheckoutSession);


module.exports = router;
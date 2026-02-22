const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const foodRouter = require('./foodRoutes');


// KỸ THUẬT MOUNT ROUTER (GẮN ROUTER)
// Nếu gặp đường dẫn dạng này, hãy chuyển hướng sang foodRouter xử lý
// Redirect to foodRouter if path matches
router.use('/:restaurantId/foods', foodRouter);

// Route: Tìm quán đây
// Ví dụ: /restaurants-within/5/center/10.823,106.629/unti/km
router
    .route('/restaurants-within/:distance/center/:latlng/unit/:unit')
    .get(restaurantController.getRestaurantsWithin);

/**
 * @swagger
 * tags:
 *   name: Restaurants
 *   description: Quản lý nhà hàng
 */



/**
 * @swagger
 * /restaurants:
 *   get:
 *     summary: Lấy danh sách nhà hàng
 *     tags:
 *       - Restaurants
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang (Phân trang)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng quán mỗi trang
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: "Sắp xếp (ví dụ: price hoặc -price)"
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
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: Cơm tấm Sài Gòn
 *                       cuisine:
 *                         type: string
 *                         example: Rice
 */


// Các router bình thường của nhà hàng
router.route('/')
    .get(restaurantController.getAllRestaurants)
    .post(restaurantController.createRestaurant);

router.route('/:id').get(restaurantController.getRestaurantById);

module.exports = router;
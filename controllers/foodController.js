const Food = require('../models/Food');

// API: lấy danh sách món ăn (Get all foods)
exports.getAllFood = async (req, res) => {
    try {
        let filter = {};

        // LOGIC NESTED ROUTE
        // Nếu trên URL có restaurantId (vid dụ: /restaurant/123/foods)
        // If restaurantId exists in URL params
        if (req.params.restaurantId) {
            filter = { restaurantId: req.params.restaurantId };
        }

        // Ngược lại: lấy toàn bộ món của tất cả quán (Otherwise: Get all foods everywhere)

        const foods = await Food.find(filter)
            .populate({
                path: 'restaurantId',
                select: 'name cuisine ratingAverage imageUrl'
            });

        res.status(200).json({
            status: 'success',
            results: foods.length,
            data: { foods }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// API: Tạo món ăn mới (create new food)
exports.createFood = async (req, res) => {
    try {
        // TỰ ĐỘNG GẮN ID NHÀ HÀNG (AUTO ASSIGN RESTAURANT ID)
        // Nếu người dùng không gửi restaurantId trong body, thì lấy từ URL
        // Iff restaurantId is not in BODY, take it from URL params
        if (!req.body.restaurantId) {
            req.body.restaurantId = req.params.restaurantId;
        }
        console.log(req.body.restaurantId);
        console.log(req.params)
        console.log(req.body);

        const newFood = await Food.create(req.body);

        res.status(201).json({
            status: 'success',
            data: { food: newFood }
        });
    } catch (error) {
        res.status(400).json({ status: 'fail', message: error.message });
    }
};
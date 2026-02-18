const Restaurant = require('../models/Restaurant');
const redis = require('../utils/redis');

// API: lấy danh sách quán ăn (có lọc và sắp xếp)
// Get all restaurants (With filtering & Sorting)
exports.getAllRestaurants = async (req, res) => {
    try {
        // Lọc cơ bản (Basic filtering)
        // lấy các tham số từ URL: ?cuisine=Rice&isOpen=true
        // Destructuring req.query to get filter params
        const queryObj = { ...req.query};
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);  // xóa các từ khóa đặt biệt, chỉ giữ lại tiêu chi lọc


        // TẠO KEY CHO CACHE (GENERATE CACHE KEY)
        // Key phải là duy nhất cho mỗi truy vấn. Ví dụ: "restaurants?page=1&sort=price"
        // Nếu không có key riêng, user lọc theo giá rẻ lại ra kết quả giá đắt nhất của user trước
        const cacheKey = `restaurant:${JSON.stringify(req.query)}`;

        // KIỂM TRA REDIS (CHECK CACHE)
        const cacheData = await redis.get(cacheKey);
        
        if (cacheData) {
            // CACHE HIT (Trúng phóc): trả về dữ liệu từ RAM
            console.log('⚡ Serving from Redis Cache');
            return res.status(200).json({
                status: 'success',
                source: 'cache',    // Đánh dấu để biết là lấy từ cache
                results: JSON.parse(cacheData).length,
                data: {
                    restaurants: JSON.parse(cacheData)
                }
            });
        }

        // NẾU KHÔNG CÓ TRONG CACHE THÌ GỌI MONGODB (CACHE MISS)
        console.log('🐢 Querying MongoDB...');

        // Lọc nang cao (ADVANCED FILTERING - gte, gt, lte, lt)
        // Ví dụ: ?ratingAverage[gte]=4 (Tìm quán có sao >= 4)
        let queryStr = JSON.stringify(queryObj);
        // Thay thế gte thành $gte để MongoDB hiểu (Replace gte with $gte for MongoDB syntax)
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

        console.log("Bộ lọc MongoDB:", JSON.parse(queryStr));   // log ra xem là cái gì

        // Bắt đầu truy vấn (Start Query)
        let query = Restaurant.find(JSON.parse(queryStr));

        // SẮP XẾP
        // Ví dụ: ?sort=price (tăng dần) hoặc ?sort=-price (giảm dần)
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');     // xử lý nếu sort nhiều tiêu chí
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');   // Mặc định: Mới nhất lên đầu (default: Newest first)
        }

        // GIỚI HẠN TRƯỜNG HIỂN THỊ (FIELD LIMITING)
        // Ví dụ: ?fields=name,address (chỉ lấy tên và địa chỉ, không lấy cái khác cho nhẹ)
        if (req.query.fields) {
            const fields = req.query.fields.split(',').join(' ');
            query = query.select(fields);
        } else {
            query = query.select('-__v');   // Bỏ trường __v của MongoDB
        }


        // PHÂN TRANG (PAGINATION)
        // Ví dụ: ?page=2&limit=5 (trang 2, mỗi trang 5 quán)
        const page = req.query.page * 1 || 1;   // Mặc định là 1
        const limit = req.query.limit * 1 || 10;    // Mặc định là 10 quán
        const skip = (page - 1) * limit;    // Công thức bỏ qua số lượng bản ghi cữ

        query = query.skip(skip).limit(limit);

        // THỰC THI (EXECUTE)
        const restaurants = await query;

        // LƯU KẾT QUẢ VÀO REDIS (SET CACHE)
        // 'EX', 60 NGHĨA LÀ: CHỈ LƯU TRONG 60 GIÂY (EXPIRE IN 60S)
        // SAU 60s, Redis tự xóa để đảm bảo dữ liệu không bị quá cũ
        await redis.set(cacheKey, JSON.stringify(restaurants), 'EX', 60);

        // Trả về kết quả (Send response)
        res.status(200).json({
            status: 'success',
            results: restaurants.length,    // số lượng quán tìm thấy
            data: {
                restaurants
            }
        });
    } catch (error) {
        res.status(404).json({
            status: 'fail',
            message: error.message
        });
    }
};

// API: Tạo nhà hàng mới (create new restaurant)
exports.createRestaurant = async (req, res) => {
    try {
        const newRestaurant = await Restaurant.create(req.body);
        res.status(201).json({
            status: 'success',
            data: {
                restaurants: newRestaurant
            }
        });

        // Xóa cache
        try {
            // Tìm tất cả các key liên quan đến danh sách nhà hàng
            // Find all key starting with 'restaurant:'
            const keys = await redis.keys('restaurant:*');

            // Nếu tìm thấy thì xóa sạch (if keys exits, delete them)
            if (keys.length > 0) {
                await redis.del(keys);
                console.log('🧹 Đã dọn dẹp Cache cũ! (Cache cleared)');
            }
        } catch (err) {
            console.error('Lỗi xóa cache:', err);
        }
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message  // trả về lỗi nếu thiếu tên hoặc tên trùng (Return error if validation fails)
        });
    }
};


// API: Tìm quán trong bán kính (Get restaurant within radius)
// URL: /restaurant-within/5/center/10.762622,106.660172/unit/km
exports.getRestaurantsWithin = async (req, res) => {
    try {
        const { distance, latlng, unit } = req.params;
        const [lat, lng] = latlng.split(',');

        // Kiểm tra tham số (Validate params)
        if (!lat || !lng) {
            return res.status(400).json({
                status: 'fail',
                message: 'Vui lòng cung cấp vĩ độ và kinh độ (Please provide latitude and longitude)'
            });
        }


        // Tính toán bán kính trái đất (Calculate Earth Radius)
        // MongoDB cần đơn vị là Radians
        // Radius of Earth = 6378,1 km or 3963.2 miles
        const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

        console.log(`Searching within ${distance} ${unit} from [${lat}, ${lng}]...`);

        // Truy vấn địa lý (Geospatial Query)
        const restaurants = await Restaurant.find({
            location: {
                $geoWithin: {
                    $centerSphere: [[lng, lat], radius]     // nhớ kỹ: Longitude trước, latitude sau!
                }
            }
        });

        res.status(200).json({
            status: 'success',
            results: restaurants.length,
            data: { restaurants }
        });
    } catch (error) {
        res.status(500).json({ status: 'fail', message: error.message });
    }
};
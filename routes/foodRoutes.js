const express = require('express');
const foodController = require('../controllers/foodController');

// QUAN TRỌNG: mergeParams
// Giup foodRouter đọc được params từ restaurantRouter (đọc được :restaurantId)
// Enables access to params from parent router
const router = express.Router({ mergeParams: true });

router
    .route('/')
    .get(foodController.getAllFood)
    .post(foodController.createFood);


module.exports = router;
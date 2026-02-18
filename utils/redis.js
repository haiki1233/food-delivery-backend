const Redis = require('ioredis');
require('dotenv').config();

// Khởi tạo kết nối Redis (Initialize Redis connection)
const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => {
    console.log('✅ Redis connected!');
});

redis.on('error', (err) => {
    console.error('❌ Redis Error:', err);
});

module.exports = redis;
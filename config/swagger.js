const { version } = require('mongoose');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Cấu hình cơ bản
const options = {
    definition: {
        openapi: '3.0.0',   // chuẩn OpenAPI
        info: {
            title: 'Food Delivery API Docs',
            version: '1.0.0',
            description: 'Tài liệu API cho ứng dụng đặt món ăn (Node.js & MongoDB)',
            contact: {
                name: 'Admin',
                email: 'admin@foodapp.com'
            },
        },
        servers: [
            {
                url: '/api',    // Để nó tự hiểu là dùng domain hiện tại
                description: 'Server hiện tại',
            },
            {
                url: 'http://localhost:3000/api',   // Đường dẫn gốc của API
                description: 'Server Local',
            },
        ],
        // Cấu hình bảo mật (Để test được API cần đăng nhập)
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },

        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // Chỉ định nơi chứa code API để nó đọc comment
    apis: ['./routes/*.js', './models/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

// Hàm để kích hoạt Swagger trên App
const swaggerDocs = (app, port) => {
    // Tạo đường dẫn /api-dóc để xem tài liệu
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Tạo đường dẫn tải file JSON (Cho các tool khác dùng)
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-type', 'application/json');
        res.send(swaggerSpec);
    });

    console.log(`📄 Tài liệu API đã sẳn sàng tại: http://localhost:${port}/api-docs`);
};

module.exports = swaggerDocs;
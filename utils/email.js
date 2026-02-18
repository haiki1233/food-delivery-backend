const nodemailer = require('nodemailer');
require('dotenv').config();

// Class xử lý gửi Email (Email handle Class)
class EmailService {
    constructor(user, url) {
        this.to =  user.email;
        this.firstName = user.username;   // Lấy tên đầu (First name)
        this.url = url;     // Link hành động (Ví dụ: link reset pass, link đơn hàng)
        this.from = `Food Delivery App <admin@foodapp.com>`;
    }


    // Tạo transport (Khởi tạo kết nối SMTP)
    newTransport() {
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }


    // Hàm gửi cơ bản (Base send function)
    async send(subject, htmlContent) {
        // Cấu hình email
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject: subject,
            html: htmlContent,
            text: htmlContent.replace(/<[^>]*>?/gm, '')     // Bản dự phòng dạng chữ thường
        };

        // Gửi ngay lập tức
        await this.newTransport().sendMail(mailOptions);
        console.log(`📧 Email sent to ${this.to}`);
    }


    // Gửi Email chào mừng (Send Welcome Email)
    async sendWelcome() {
        const html = `
            <h1>Chào mừng ${this.firstName} đến với Food App! 🎉</h1>
            <p>Chúng tôi rất ui vì bạn đã tham gia.</p>
            <p>Hãy <a href="${this.url}">bấm vào đây</a> để khám phá các món ngon ngay.</p>
        `

        await this.send('Welcome to the Family!', html);
    }

    // Gửi Email xác nhận đơn hàng (Send order confirmation)
    async sendOrderConfirmation(orderId, total) {
        const html = `
            <h1>✅ Đặt hàng thành công!</h1>
            <p>Cảm ơn ${this.firstName}, đơn hàng <b>#${orderId}</b> của bạn đang được chuẩn bị.</p>
            <h3>Tổng tiền: ${total.toLocaleString('vi-VN')} đ</h3>
            <p>Shipper sẽ giao đến sớm thôi!</p>
        `;
        await this.send(`Order Confirmation #${orderId}`, html);
    }
}

module.exports = EmailService;
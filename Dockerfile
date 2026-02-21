# 1. Chọn hệ điều hành nền (Base Image)
# Dùng bản node.js nhẹ nhất (Alpine Linux) cho nhẹ máy
FROM node:18-alpine

# 2. Tạo thư mục làm việc trong container (Working Directory)
# giống như tạo folder 'C:\app'
WORKDIR /app

# 3. Copy file định nghĩa thư viện vào trước
# Tại sao copy cái này trước? Để tận dụng Cache của docker, giúp build nhanh hơn
COPY package*.json ./

# 4. Cài đặt thư viện (Install dependencies)
RUN npm install

# 5. Copy toàn bộ code còn lại vào Container
COPY . .

# 6. Mở cổng 3000 (Expose Port)
# Để bên ngoài có thể chui vào Container qua cổng này
EXPOSE 3000

# 7. Lệnh chạy Server (Start Commmand)
CMD ["npm", "start"]


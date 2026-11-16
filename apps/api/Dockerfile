FROM node:20-slim

# Cài openssl để Prisma Engine hoạt động ổn định trong container
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 3001

# Tự động đồng bộ migration vào DB Docker trước khi khởi chạy NestJS
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
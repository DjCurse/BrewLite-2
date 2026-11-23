# BrewLite — Hệ thống Đặt món & Thanh toán Quán Cà phê

Ứng dụng web full-stack hỗ trợ khách hàng đặt đồ uống tùy chỉnh (Size, Topping), áp dụng mã khuyến mãi thời gian thực, thanh toán đa phương thức (Ví MoMo QR, Tiền mặt tại quầy, Thẻ) và theo dõi tiến độ pha chế theo máy trạng thái đơn hàng.

---

## 1. Kiến trúc & Công nghệ sử dụng

Dự án được tổ chức theo cấu trúc Monorepo gồm 2 ứng dụng chính và cơ sở dữ liệu độc lập:

* **Frontend (`apps/web`):** Next.js (App Router), React, TypeScript, Tailwind CSS (cổng `3000`).
* **Backend (`apps/api`):** NestJS, Prisma ORM, `class-validator`, JWT Authentication (cổng `3001`).
* **Database:** PostgreSQL 16 (`postgres:16-alpine`), chạy qua Docker ở cổng `5433` (tránh xung đột với PostgreSQL cài sẵn trên Windows ở cổng `5432`).

```text
BrewLite_2/
├── apps/
│   ├── api/                 # Backend NestJS + Prisma Schema & Seed
│   └── web/                 # Frontend Next.js (Menu, Cart, Checkout, Mock MoMo, Orders)
├── docker-compose.yml       # Cấu hình container Postgres, API, Web
└── check-all.ps1            # Script kiểm thử tự động 6 bước (Build, Unit Test, E2E, Lint)
```

---

## 2. Các tính năng đã hoàn thiện

### 2.1. Thực đơn & Giỏ hàng tùy chỉnh (`/`, `/cart`)
* Chọn kích cỡ đồ uống (**Size S**: `+0đ`, **Size M**: `+5.000đ`, **Size L**: `+10.000đ`) và nhiều loại **Topping** (*Thạch*, *Trân châu*, *Pudding*, *Kem cheese*...).
* Tự động tính tạm tính từng dòng và đồng bộ trạng thái giỏ hàng qua `localStorage` (`brewlite_cart`, `brewlite_promo_code`).

### 2.2. Kiểm tra mã khuyến mãi thời gian thực (`POST /payments/validate-promo`)
* Kiểm tra trực tiếp điều kiện mã giảm giá dưới Database (`isActive`, `startDate`, `endDate`, `minOrderValue`, loại giảm `PERCENTAGE` hoặc `FIXED_AMOUNT`) ngay khi người dùng nhập mã ở trang `/cart` và `/checkout`.
* Cảnh báo ngay lập tức nếu mã hết hạn, không tồn tại hoặc đơn hàng chưa đạt giá trị tối thiểu trước khi bước sang thanh toán.

### 2.3. Thanh toán đa phương thức & Giao dịch nguyên tử (`/checkout`, `POST /payments`)
* **Chống thanh toán đúp (Idempotency):** Bắt buộc header `Idempotency-Key` cho mỗi phiên thanh toán để đảm bảo không tạo trùng đơn hàng hoặc trừ tiền hai lần.
* **Toàn vẹn dữ liệu (`prisma.$transaction`):** Tự động kiểm tra tồn kho (`stockQuantity`), tính tổng giá gốc kèm phụ thu Size + Topping trên server, áp dụng giảm giá, trừ tồn kho, tạo `Order` (`PAID`), tạo `Payment` (`SUCCESS`) và cộng điểm thưởng **Loyalty** (`10.000đ = 1 điểm`).
* **3 phương thức thanh toán:**
  1. **Ví MoMo (Quét mã QR):** Sinh mã QR động trỏ tới cổng giả lập `/mock-payment` kèm payload đơn hàng; hỗ trợ xác nhận trên tab mới hoặc thiết bị khác và tự động đồng bộ trạng thái về `/checkout` (polling `GET /orders/me` mỗi 3 giây + nút kiểm tra thủ công).
  2. **Tiền mặt tại quầy (`CASH`):** Hỗ trợ nhập số tiền khách đưa, gợi ý mệnh giá nhanh, tự động tính tiền còn thiếu hoặc tiền thối lại khách và hiển thị trên biên lai.
  3. **Thẻ tín dụng / Ghi nợ (`CREDIT_CARD`):** Thanh toán trực tiếp và xuất hóa đơn xác nhận.

### 2.4. Theo dõi đơn hàng & Máy trạng thái (`/orders`, `PATCH /orders/:id/status`)
* **Máy trạng thái đơn hàng (`OrderStatusMachine`):**
  * `PENDING` *(Đã đặt)* $\rightarrow$ `PAID` *(Đang pha chế)* $\rightarrow$ `COMPLETED` *(Sẵn sàng nhận)*.
  * Cho phép hủy (`CANCELLED`) khi đơn đang ở `PENDING` hoặc `PAID`; chặn nhảy cóc hoặc đi lùi trạng thái.
* **Phân quyền (`JwtAuthGuard`):**
  * Tài khoản `CUSTOMER` chỉ xem được đơn của mình (`GET /orders/me`) và chỉ được phép hủy đơn của chính mình.
  * Tài khoản `STAFF` / `ADMIN` có quyền cập nhật tiến độ đơn hàng sang `COMPLETED`.
* **API Sandbox tích hợp:** Bảng kiểm thử nhanh ngay trên giao diện giúp đăng nhập lấy JWT Token, truy vấn `GET /orders/me` và gọi `PATCH /orders/:id/status`.

---

## 3. Hướng dẫn kích hoạt & Chạy Local

### 3.1. Yêu cầu môi trường
* **Node.js** >= 20.x và **npm** >= 10.x
* **Docker Desktop** (đang mở và chạy ổn định)

### 3.2. Bước 1 — Khởi động Database PostgreSQL (cổng `5433`)
Mở PowerShell tại thư mục gốc dự án và bật riêng container database `brewlite2-postgres`:

```powershell
cd E:\Software_Technology\BrewLite_2
docker compose up -d postgres
docker ps
```

> **Lưu ý:** Nếu đã từng chạy `docker compose up` trước đó, chỉ dùng `docker start brewlite2-postgres` để tránh các container `api`/`web` cũ chiếm mất cổng `3001` và `3000`. Đảm bảo cột `PORTS` hiển thị `0.0.0.0:5433->5432/tcp`.

### 3.3. Bước 2 — Cấu hình biến môi trường & Khởi tạo dữ liệu
1. **Backend (`apps/api/.env`):**
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/brewlite?schema=public"
   JWT_SECRET="brewlite-super-secret-jwt-key-2026"
   PORT=3001
   ```
2. **Frontend (`apps/web/.env.local`):**
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:3001"
   ```
3. **Đồng bộ Prisma Schema & Nạp dữ liệu mẫu (`seed`):**
   ```powershell
   cd E:\Software_Technology\BrewLite_2\apps\api
   npm install
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

### 3.4. Bước 3 — Khởi động Backend & Frontend
Mở 2 cửa sổ PowerShell riêng biệt:

* **Terminal 1 — Chạy Backend API (cổng `3001`):**
  ```powershell
  cd E:\Software_Technology\BrewLite_2\apps\api
  npm run start:dev
  ```

* **Terminal 2 — Chạy Frontend Web (cổng `3000`):**
  ```powershell
  cd E:\Software_Technology\BrewLite_2\apps\web
  npm install
  npm run dev
  ```

Truy cập ứng dụng tại: **http://localhost:3000**

### 3.5. Chạy toàn bộ bằng Docker hoặc Script kiểm thử 6 bước
* **Chạy cả 3 service qua Docker (nhớ kèm `--build` khi có sửa code):**
  ```powershell
  docker compose up -d --build
  ```
* **Chạy kiểm tra tự động toàn bộ dự án (Build, Unit Test, E2E Test, Lint):**
  ```powershell
  cd E:\Software_Technology\BrewLite_2
  powershell -ExecutionPolicy Bypass -File .\check-all.ps1
  ```

### 3.6. Dữ liệu dùng thử mặc định
* **Tài khoản khách hàng:** `customer@brewlite.vn` *(mật khẩu xem trong `apps/api/prisma/seed.ts`)*
* **Mã khuyến mãi mẫu:** `SGU2026` (giảm 20%), `BREWLITE10` (giảm 10.000đ), `FREESHIP` (giảm 15.000đ).

---

## 4. Hướng dẫn Deploy lên Production (Supabase + Render + Vercel)

Quy trình triển khai chuẩn theo thứ tự: **Database (Supabase) $\rightarrow$ Backend (Render) $\rightarrow$ Frontend (Vercel)**.

### Bước 1: Tạo Database trên Supabase
1. Đăng nhập [Supabase](https://supabase.com/), bấm **New Project**, đặt tên `brewlite-db` và lưu lại **Database Password**.
2. Vào **Project Settings $\rightarrow$ Database $\rightarrow$ Connection string** (chọn tab **URI**) và lấy 2 chuỗi kết nối:
   * **Transaction pooler (cổng `6543` — dùng cho ứng dụng chạy runtime):**
     ```text
     postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true](https://aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true)
     ```
   * **Session pooler / Direct connection (cổng `5432` — dùng để đẩy bảng Prisma):**
     ```text
     postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres](https://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres)
     ```
3. Đẩy cấu trúc bảng và dữ liệu mẫu từ máy local lên Supabase:
   ```powershell
   cd E:\Software_Technology\BrewLite_2\apps\api
   $env:DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres](https://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres)"
   npx prisma db push
   npx prisma db seed
   ```
   *(Kiểm tra trên Supabase $\rightarrow$ **Table Editor** thấy đầy đủ các bảng `User`, `Product`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction` là thành công.)*

---

### Bước 2: Deploy Backend NestJS lên Render
1. Đẩy toàn bộ mã nguồn dự án lên **GitHub**.
2. Kiểm tra file `apps/api/src/main.ts` đã bật CORS cho phép domain frontend gọi tới:
   ```ts
   app.enableCors({
     origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : true,
     credentials: true,
   });
   ```
3. Đăng nhập [Render](https://render.com/) $\rightarrow$ **New + $\rightarrow$ Web Service** $\rightarrow$ kết nối repository GitHub của dự án.
4. Điền thông tin cấu hình:
   * **Name:** `brewlite-api`
   * **Root Directory:** `apps/api`
   * **Runtime:** `Node`
   * **Build Command:** `npm install && npx prisma generate && npm run build`
   * **Start Command:** `npm run start:prod`
5. Tại mục **Environment Variables**, thêm các biến sau:
   * `DATABASE_URL` = *(Chuỗi Transaction pooler cổng `6543` có `?pgbouncer=true` của Supabase)*
   * `JWT_SECRET` = *(Chuỗi bí mật ngẫu nhiên dài tối thiểu 32 ký tự)*
   * `PORT` = `3001`
   * `FRONTEND_URL` = `http://localhost:3000` *(sẽ cập nhật thêm domain Vercel ở Bước 3)*
6. Bấm **Deploy Web Service** và chờ trạng thái chuyển sang **Live**. Copy URL backend được cấp (ví dụ: `https://brewlite-api.onrender.com`).

---

### Bước 3: Deploy Frontend Next.js lên Vercel
1. Đăng nhập [Vercel](https://vercel.com/) $\rightarrow$ **Add New... $\rightarrow$ Project** $\rightarrow$ Import repository GitHub của dự án.
2. Cấu hình dự án:
   * **Framework Preset:** `Next.js`
   * **Root Directory:** bấm **Edit** và chọn `apps/web`
3. Mở mục **Environment Variables**, thêm biến:
   * `NEXT_PUBLIC_API_URL` = `https://brewlite-api.onrender.com` *(URL Render từ Bước 2, không có dấu `/` ở cuối)*
4. Bấm **Deploy**. Sau khi hoàn tất, copy domain frontend Vercel cấp (ví dụ: `https://brewlite.vercel.app`).

---

### Bước 4: Hoàn tất đồng bộ CORS & Kiểm tra sau Deploy
1. Quay lại **Render $\rightarrow$ `brewlite-api` $\rightarrow$ Environment**, cập nhật biến:
   * `FRONTEND_URL` = `https://brewlite.vercel.app,http://localhost:3000`
   Sau đó bấm **Save Changes** để Render tự khởi động lại dịch vụ.
2. Mở `https://brewlite.vercel.app` và kiểm thử 3 luồng chính:
   * Tải danh sách sản phẩm từ Supabase qua Render API.
   * Thêm món có Size + Topping, nhập mã `SGU2026` để kiểm tra validate mã khuyến mãi.
   * Tạo mã **QR MoMo** trên máy tính, dùng điện thoại quét trực tiếp mã QR (lúc này link QR đã mang domain thật `https://brewlite.vercel.app/mock-payment?...`) và xác nhận đơn hàng tự động cập nhật trạng thái `PAID`.
# BrewLite — Hệ thống Đặt Đồ Uống & Quản Lý Vận Hành Cửa Hàng

Ứng dụng web đặt đồ uống theo định hướng **Mobile-first / PWA**, xây dựng theo kiến trúc **Monorepo** với **Next.js**, **NestJS**, **Prisma ORM** và **PostgreSQL**. Hệ thống chuẩn hóa toàn bộ quy trình từ duyệt thực đơn, tùy chọn Size/Topping, quản lý giỏ hàng, đặt đơn nguyên tử, thanh toán không tiền mặt (Ví MoMo QR / Thẻ) đến theo dõi trạng thái đơn hàng và tích điểm thưởng khách hàng thân thiết.

---

## 1. Liên kết triển khai trực tuyến (Production)

- **Ứng dụng Web Frontend (Vercel):** https://brew-lite-2.vercel.app
- **Dịch vụ REST API Backend (Render):** https://brewlite2-api.onrender.com
- **Endpoint kiểm tra sức khỏe (Health Check):** https://brewlite2-api.onrender.com/health

### Tài khoản mẫu (Database Seed)
Dữ liệu khởi tạo mẫu (`apps/api/prisma/seed.ts`) cung cấp sẵn **12 món đồ uống** thuộc 4 danh mục (*Trà sữa, Matcha, Cà phê, Trà trái cây*), **4 mã khuyến mãi** (`BREWLITE10`, `STAFF20`, `SGU2026`, `FREESHIP`) và **3 tài khoản theo vai trò**:

| Vai trò | Email đăng nhập | Mật khẩu | Ghi chú quyền hạn |
| :--- | :--- | :--- | :--- |
| **Khách hàng** (`CUSTOMER`) | `customer@brewlite.vn` | `Customer123` | Đặt đơn, áp mã `BREWLITE10`, thanh toán, tích điểm Loyalty |
| **Nhân viên quầy** (`STAFF`) | `staff@brewlite.vn` | `Staff123` | Áp dụng được mã ưu đãi nội bộ `STAFF20` (`staffOnly`) và cập nhật trạng thái đơn |
| **Quản trị viên** (`ADMIN`) | `admin@brewlite.vn` | `Admin123` | Toàn quyền quản trị hệ thống |

---

## 2. Công nghệ & Kiến trúc hệ thống

- **Frontend (`apps/web`):** Next.js (App Router), TypeScript, Tailwind CSS, Zustand (`useCartStore` đồng bộ `localStorage`), PWA (`manifest.ts`, Service Worker `sw.js`, `offline.html`).
- **Backend (`apps/api`):** NestJS (Modular Monolith: `ProductsModule`, `AuthModule`, `OrdersModule`, `PaymentsModule`, `PromotionsModule`, `HealthModule`), xác thực JWT (`JwtAuthGuard`), mã hóa mật khẩu `bcrypt`, xử lý giao dịch nguyên tử (`prisma.$transaction`) và chống thanh toán lặp qua header `Idempotency-Key`.
- **Database & ORM:** PostgreSQL 16 & Prisma ORM với 7 thực thể cốt lõi (`User`, `Product`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction`).
- **CI/CD & Cloud:** Docker Compose, GitHub Actions (`.github/workflows/ci.yml`), Supabase PostgreSQL (`ap-southeast-1`), Render Web Service và Vercel Edge Network.

---

## 3. Cấu trúc thư mục Monorepo

```text
BrewLite-2/
├── .github/
│   └── workflows/
│       └── ci.yml                          # Pipeline CI tự động (Install -> Lint -> Test -> Build)
├── apps/
│   ├── api/                                # Backend NestJS + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma               # Lược đồ 7 bảng & các Enum trạng thái
│   │   │   ├── seed.ts                     # Script nạp dữ liệu mẫu chạy lặp an toàn (Idempotent)
│   │   │   └── seed-data.ts
│   │   └── src/
│   │       ├── auth/                       # Đăng ký, đăng nhập JWT, JwtAuthGuard
│   │       ├── products/                   # Danh sách phân trang/lọc/tìm kiếm & chi tiết sản phẩm
│   │       ├── orders/                     # Tạo đơn Transaction, trừ tồn kho & cập nhật trạng thái
│   │       ├── payments/                   # Thanh toán Ví MoMo QR / Thẻ, Idempotency-Key & Loyalty
│   │       ├── promotions/                 # Kiểm tra điều kiện và tính giảm giá mã khuyến mãi
│   │       ├── prisma/                     # PrismaService dùng chung
│   │       └── health/                     # Endpoint GET /health
│   └── web/                                # Frontend Next.js (Mobile-first / PWA)
│       ├── app/                            # App Router (/, /products/[id], /cart, /login, /checkout, /orders)
│       ├── components/                     # Giao diện Menu, Chi tiết món, Giỏ hàng, Checkout, Order Stepper
│       ├── lib/                            # API Client, bảng phụ thu Size/Topping, useCartStore
│       ├── public/                         # PWA Service Worker (sw.js), offline.html, icons
│       └── __tests__/                      # Component Test (Vitest + Testing Library)
├── docs/
│   ├── requirements/
│   │   ├── context-and-scope.md            # Bối cảnh nghiệp vụ, Stakeholder, In/Out-of-scope, Rủi ro
│   │   ├── srs.md                          # Đặc tả 20 FR & 11 NFR theo chuẩn MoSCoW
│   │   └── use-case-checkout.md            # Đặc tả Use-case chi tiết Đặt đơn & Thanh toán
│   ├── diagrams/                           # Mã nguồn PlantUML (.puml) & sơ đồ kết xuất (.png/.svg)
│   ├── architecture/
│   │   ├── system-architecture.md          # Kiến trúc phân lớp & Modular Monolith
│   │   ├── deployment.md                   # Hướng dẫn triển khai Docker, Cloud & Rollback
│   │   └── adr/                            # Các quyết định kiến trúc (001, 002, 003)
│   ├── report/                             # Báo cáo LaTeX hoàn chỉnh (5 chương)
│   ├── sprint-review-retrospective.md      # Tổng kết Sprint 1 & Sprint 2
│   └── traceability-matrix.md              # Ma trận truy vết từ FR/NFR đến Sơ đồ, API và Test
├── tests/
│   └── orders-payments.int-spec.ts         # Integration Test & E2E Test
├── docker-compose.yml                      # Khởi chạy đồng bộ Web, API và PostgreSQL 16
└── README.md
```

---

## 4. Hướng dẫn cài đặt và chạy trên máy cục bộ (Local)

### Cách 1: Chạy nhanh bằng Docker Compose (Khuyến nghị)

1. **Clone kho mã nguồn và tạo tệp biến môi trường:**
```bash
git clone [https://github.com/DjCurse/BrewLite-2.git](https://github.com/DjCurse/BrewLite-2.git)
cd BrewLite-2
cp .env.example .env
```

2. **Khởi động toàn bộ hệ thống (Frontend, Backend, PostgreSQL 16):**
```bash
docker compose up -d --build
```

3. **Đồng bộ lược đồ cơ sở dữ liệu và nạp dữ liệu mẫu:**
```bash
docker compose exec api npx prisma db push
docker compose exec api npx prisma db seed
```

4. **Truy cập ứng dụng:**
- **Frontend Web:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **PostgreSQL:** `localhost:5433` (ánh xạ tới cổng `5432` trong container)

---

### Cách 2: Chạy thủ công từng ứng dụng (Yêu cầu Node.js >= 20 / 22 và PostgreSQL)

1. **Khởi chạy Backend (`apps/api`):**
```bash
cd apps/api
cp .env.example .env
# Cập nhật DATABASE_URL và DIRECT_URL trỏ tới PostgreSQL cục bộ trong file .env
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run start:dev
```

2. **Khởi chạy Frontend (`apps/web`):**
```bash
cd apps/web
cp .env.example .env.local
# Đảm bảo NEXT_PUBLIC_API_URL=http://localhost:3001 trong file .env.local
npm install
npm run dev
```

---

## 5. Cấu hình biến môi trường

Toàn bộ secret và chuỗi kết nối không được lưu cứng trong mã nguồn (`NFR-08`).

| Tên biến môi trường | Phạm vi sử dụng | Mô tả & Ví dụ cấu hình |
| :--- | :--- | :--- |
| `DATABASE_URL` | Backend (`apps/api`) | Chuỗi kết nối PostgreSQL chính (trên Production dùng Supabase Transaction Pooler cổng `6543` kèm `?pgbouncer=true`). |
| `DIRECT_URL` | Backend (`apps/api`) | Chuỗi kết nối trực tiếp (Session Pooler cổng `5432`) phục vụ `prisma db push` và `prisma migrate`. |
| `JWT_SECRET` | Backend (`apps/api`) | Khóa bí mật dùng để ký và xác thực JWT token. |
| `FRONTEND_URL` | Backend (`apps/api`) | URL của Frontend (`http://localhost:3000` hoặc `https://brew-lite-2.vercel.app`) để cấu hình CORS và QR thanh toán. |
| `NEXT_PUBLIC_API_URL` | Frontend (`apps/web`) | URL của Backend API (`http://localhost:3001` hoặc `https://brewlite2-api.onrender.com`). |

---

## 6. Kiểm thử tự động (Unit, Integration & E2E Test)

Hệ thống áp dụng kiểm thử tự động 3 tầng và tích hợp vào **GitHub Actions CI** để tự động chặn Pull Request nếu có bất kỳ bài kiểm thử hoặc bước build nào thất bại (`NFR-09`):

```bash
# 1. Chạy Unit Test, Lint và Build cho Backend (NestJS)
cd apps/api
npm run test
npm run lint
npm run build

# 2. Chạy Component Test, Lint và Build cho Frontend (Next.js)
cd apps/web
npm run test
npm run lint
npm run build

# 3. Chạy Integration Test (yêu cầu PostgreSQL đang hoạt động)
cd apps/api
npm run test:e2e
```

---

## 7. Triển khai Cloud & Quy trình Rollback

Chi tiết cấu hình hạ tầng đám mây (Supabase, Render, Vercel) được trình bày tại [`docs/architecture/deployment.md`](docs/architecture/deployment.md):

- **Auto-deploy CI/CD:** Mọi Pull Request được hợp nhất vào nhánh `main` sẽ tự động kích hoạt quy trình build và phát hành phiên bản mới đồng thời trên **Vercel** (`brewlite-2`) và **Render** (`brewlite2-api`).
- **Smoke Test sau triển khai:** Xác minh trạng thái dịch vụ và kết nối cơ sở dữ liệu qua `GET https://brewlite2-api.onrender.com/health` (kỳ vọng trả về HTTP `200 OK`).
- **Quy trình Rollback khi gặp sự cố:**
  - **Frontend (Vercel):** Mở tab **Deployments** của dự án `brewlite-2` $\rightarrow$ chọn bản triển khai ổn định gần nhất $\rightarrow$ nhấn **Instant Rollback**.
  - **Backend (Render):** Mở mục **Events / Deploys** của dịch vụ `brewlite2-api` $\rightarrow$ chọn bản build ổn định trước đó $\rightarrow$ nhấn **Rollback to this deploy**.

---

## 8. Thành viên thực hiện (Nhóm BrewLite)

| STT | Họ và tên | MSSV | Vai trò & Hạng mục phụ trách chính | Tỷ lệ đóng góp |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **Tô Phúc Khang** | `3124410146` | **Nhóm trưởng** — Kiến trúc phân lớp & ADR, Deployment Diagram, Monorepo/Docker, Module Payments & Promotions (`Idempotency-Key`, Loyalty), GitHub Actions CI/CD, triển khai Supabase/Render, Unit Test. | `16,67%` |
| 2 | **Phan Lê Ngọc Như Ý** | `3124720079` | Bối cảnh & Stakeholder (Task 1.1), Module Products & Seed DB, giao diện Menu & Chi tiết món (PWA, Loading/Empty/Error), 22 Unit Test API + 23 Component Test Web, minh chứng PR CI. | `16,67%` |
| 3 | **Nguyễn Thị Tuyết Trâm** | `3124560092` | Đặc tả SRS (20 FR & 11 NFR), Module Auth (`register`, `login`, `JwtAuthGuard`, `GET /users/me`), giao diện Đăng ký/Đăng nhập, Unit Test Auth. | `16,67%` |
| 4 | **Lương Thanh Tuấn** | `3124410391` | Sequence Diagram & Class Diagram, Prisma Schema 7 bảng & đồng bộ Supabase, Module Products/Orders (Transaction kiểm tra & trừ tồn kho), API `GET /health`, Integration Test. | `16,67%` |
| 5 | **Nguyễn Thị Huyền Trang** | `3124410364` | Activity Diagram End-to-End, Store Giỏ hàng (`useCartStore`), API `GET /orders/me`, giao diện Theo dõi trạng thái đơn hàng (*Order Stepper*), E2E Test. | `16,67%` |
| 6 | **Trần Thị Trúc Đào** | `3124720015` | Triển khai Frontend Next.js lên Vercel (`DJTEAM/brewlite-2`), cấu hình `NEXT_PUBLIC_API_URL` kết nối Render/Supabase, luồng thanh toán mã QR MoMo, Ma trận truy vết yêu cầu, hỗ trợ E2E Test. | `16,67%` |
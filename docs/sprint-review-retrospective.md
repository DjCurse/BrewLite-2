# Tổng kết Sprint Review & Sprint Retrospective (Sprint 1 & Sprint 2)

## 1. Sprint 1 Review (MVP Thực đơn & Nền tảng Monorepo)
- **Mục tiêu đạt được:**
  - Thiết lập cấu trúc Monorepo (`apps/web`, `apps/api`, `docs`, `tests`), Docker Compose và GitHub Actions CI (`Install -> Lint -> Test -> Build`).
  - Hoàn thiện API `GET /products` (tìm kiếm, lọc danh mục, phân trang), `GET /products/:id` và Database Seed 12 món / 4 danh mục.
  - Hoàn thiện giao diện Menu và Chi tiết sản phẩm (chọn Size/Topping, PWA, xử lý đủ 3 trạng thái Loading/Empty/Error) kèm 22 Unit Test API và 23 Component Test Web.

## 2. Sprint 2 Review (Luồng End-to-End, Kiểm thử 3 tầng & Triển khai Cloud)
- **Mục tiêu đạt được:**
  - Hoàn thiện xác thực JWT (`POST /auth/register`, `POST /auth/login`, `GET /users/me`) với mã hóa mật khẩu `bcrypt`.
  - Hoàn thiện Giỏ hàng (`useCartStore`), đặt đơn hàng nguyên tử (`POST /orders`) và theo dõi tiến trình đơn (`GET /orders/me`, `PATCH /orders/:id/status`).
  - Hoàn thiện thanh toán không tiền mặt (Ví MoMo QR / Thẻ) kèm `Idempotency-Key`, áp mã khuyến mãi (`BREWLITE10`, `STAFF20`, `SGU2026`, `FREESHIP`) và tích điểm thưởng Loyalty.
  - Hoàn thiện Integration Test (`tests/orders-payments.int-spec.ts`), E2E Test và triển khai thành công lên Supabase, Render và Vercel qua HTTPS.

## 3. Sprint Retrospective (Bài học kinh nghiệm)
- **Điểm làm tốt:** Chia công việc theo Vertical Slice giúp cả 6 thành viên đều có Pull Request độc lập, rõ ràng; thống nhất sớm Prisma Schema 7 bảng và API Contract giúp hạn chế xung đột khi ghép nhánh.
- **Điểm cần cải thiện:** Cần đồng bộ sớm tên biến môi trường (`DATABASE_URL` / `DIRECT_URL` cho PgBouncer) và cập nhật sơ đồ PlantUML ngay sau mỗi lần điều chỉnh thuộc tính thực thể.
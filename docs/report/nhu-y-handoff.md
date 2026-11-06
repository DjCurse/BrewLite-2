# Bàn giao phần Như Ý — BrewLite Assignment 2

## Tệp đã hoàn thiện trong source

| Đường dẫn | Nội dung |
|---|---|
| `docs/requirements/context-and-scope.md` | Task 1.1: bối cảnh, mục tiêu, stakeholder, In-scope/Out-of-scope, giả định, rủi ro |
| `apps/api/src/prisma/prisma.service.ts` | Prisma provider dùng chung, quản lý vòng đời kết nối |
| `apps/api/src/prisma/prisma.module.ts` | Module cung cấp PrismaService |
| `apps/api/src/products/products.controller.ts` | `GET /products` và `GET /products/:id` |
| `apps/api/src/products/products.service.ts` | Phân trang, lọc category, tìm kiếm q, metadata và truy vấn chi tiết |
| `apps/api/prisma/seed.ts` | Dữ liệu demo, chạy lặp không tạo trùng theo tên/danh mục |
| `apps/api/src/products/*.spec.ts` | Unit test cho service và controller |
| `apps/web/app/page.tsx` | Trang Menu |
| `apps/web/app/products/[id]/page.tsx` | Trang Chi tiết sản phẩm, chọn Size/Topping |
| `apps/web/components/menu.tsx` | Menu responsive với Loading/Empty/Error và pagination |
| `apps/web/components/menu-state-view.mjs` | Component trạng thái Menu có test riêng |
| `apps/web/lib/products.ts` | API client và kiểu dữ liệu Product |
| `apps/web/public/manifest.webmanifest`, `sw.js`, `offline.html`, `icons/` | Thành phần cài đặt PWA và trang dự phòng ngoại tuyến |
| `apps/web/__tests__/menu-state-view.test.mjs` | Component test trạng thái Loading/Empty/Error |
| `docs/report/nhu-y-chapter-1.tex` | Nội dung LaTeX Chương 1, mục 1.1 |
| `docs/report/nhu-y-mvp-sprint1.tex` | Nội dung LaTeX kết quả MVP Sprint 1 |

## Contract cần tích hợp với thành viên khác

1. **Thanh Tuấn — Product schema/migration:** snapshot source đã có model `Product` và migration tạo bảng. Phần Như Ý giữ nguyên các cột hiện có, không tự mở rộng schema để tránh xung đột. Tuấn cần xác nhận schema Product/migration trên nhánh tích hợp là phiên bản cuối của Sprint 1 trước khi nhóm migrate database.
2. **Huyền T — Giỏ hàng:** trang chi tiết phát `window` event tên `brewlite:product-selected` với payload `{ productId, productName, size, toppings, quantity }`. Huyền có thể lắng nghe event này trong `useCartStore` hoặc thay thế bằng callback/store contract thống nhất. Hiện tại source chưa có module Cart nên không khẳng định món đã được lưu vào giỏ.
3. **Tô Phúc Khang — CI:** `.github/workflows/ci.yml` trong ZIP ban đầu có kích thước 0 byte. Vì workflow CI thuộc Khang, cần Khang bổ sung Install/Lint/Unit Test/Build trước khi tạo minh chứng PR đỏ/xanh. Không thể tạo ảnh CI thực tế khi workflow chưa chạy.
4. **Repository GitHub:** GitHub integration trong phiên hiện tại trả về 404 khi đọc `DjCurse/BrewLite-2` và repository không xuất hiện trong danh sách repository được cấp quyền. Do đó, source đã được chỉnh trong bản ZIP làm việc; chưa thể đẩy branch, mở PR hoặc lấy trạng thái CI trực tiếp trên remote. Cần cấp quyền repository cho tài khoản GitHub đang kết nối hoặc nhóm tự push branch/PR.
5. **Overleaf:** đường dẫn project không đọc được trong phiên này. Hai file `.tex` được cung cấp làm nội dung chèn vào Overleaf; cần ghép vào `main.tex` theo cấu trúc template và biên dịch bằng compiler mà nhóm đang sử dụng.

## Lệnh để chạy trên máy nhóm

### API

```bash
cd apps/api
npm ci
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run test -- --runInBand
npm run build
npm run start:dev
```

Sao chép `apps/api/.env.example` thành `apps/api/.env`, sau đó sửa `DATABASE_URL` trỏ tới PostgreSQL đã tạo database `brewlite`. API tự nạp file `.env` khi khởi động bằng Node.js 22.12 trở lên. Với môi trường local chưa có migration được đồng bộ từ nhóm, Tuấn cần xác nhận và chạy quy trình migration phù hợp trước khi dùng `migrate deploy`.

### Web

```bash
cd apps/web
npm ci
npm run test
npm run build
npm run dev
```

Sao chép `apps/web/.env.example` thành `apps/web/.env.local` để frontend gọi API NestJS tại `http://localhost:3001`.

### API contract

- `GET http://localhost:3001/products?page=1&pageSize=9`
- `GET http://localhost:3001/products?category=Matcha&page=1&pageSize=9`
- `GET http://localhost:3001/products?q=latte&page=1&pageSize=9`
- `GET http://localhost:3001/products/1`

Danh sách trả về `{ data, categories, meta }`; chi tiết trả về một Product. `pageSize` được giới hạn từ 1 đến 50.

Tổng cộng source hiện có 18 trường hợp kiểm thử được định nghĩa: 11 cho ProductsService, 4 cho ProductsController và 3 cho các trạng thái Loading/Empty/Error của Menu. Các trường hợp này chưa được chạy xác nhận trong phiên hiện tại.

## Việc cần xác nhận trước khi nhóm tuyên bố Sprint 1 hoàn tất

- Chạy Prisma generate/migration/seed trên PostgreSQL của nhóm.
- Chạy Unit Test API, Component Test Menu và build Next.js; sửa các lỗi phát sinh từ phiên bản Node/dependency của máy nhóm.
- Thống nhất bảng phụ thu Size/Topping để Sprint 2 tính giá ở server; giao diện hiện không cộng phụ thu.
- Huyền tích hợp event lựa chọn sản phẩm vào Cart store.
- Khang hoàn thành CI workflow, tạo PR và lưu ảnh minh chứng một lần CI fail do lỗi cố ý rồi sau đó pass.
- Gộp nội dung `.tex` vào Overleaf và biên dịch với template chính thức.

## Ghi chú môi trường kiểm thử phiên này

Việc cài dependencies bằng `npm ci`/`npm install` không hoàn tất vì môi trường không phân giải được `registry.npmjs.org` (`EAI_AGAIN`). Log cũng báo Node hiện tại là `v22.16.0`, trong khi một số gói Nest/Angular Devkit trong lockfile yêu cầu Node `22.22.3` trở lên thuộc nhánh 22. Vì vậy không đánh dấu test/build là Pass trong báo cáo; hãy chạy lại bằng Node được package yêu cầu và mạng npm hoạt động.

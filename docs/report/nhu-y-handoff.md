# Bàn giao phần Như Ý — BrewLite Assignment 2

## Tệp đã hoàn thiện trong source

| Đường dẫn | Nội dung |
|---|---|
| `docs/requirements/context-and-scope.md` | Task 1.1: bối cảnh, mục tiêu, stakeholder, In-scope/Out-of-scope, giả định, rủi ro |
| `apps/api/src/prisma/prisma.service.ts`, `prisma.module.ts` | PrismaClient dùng chung (module Global), quản lý vòng đời kết nối |
| `apps/api/src/products/products.controller.ts` | `GET /products`, `GET /products/:id` |
| `apps/api/src/products/products.service.ts` | Phân trang, lọc `category`, tìm kiếm `q`, danh sách danh mục, 404 khi không có sản phẩm |
| `apps/api/src/products/dto/list-products-query.ts` | Chuẩn hóa query (`page` ≥ 1, `pageSize` 1–50, mặc định 9) |
| `apps/api/prisma/seed-data.ts`, `seed.ts` | 12 món / 4 danh mục; seed chạy lặp không tạo trùng (khóa `name` + `category`) |
| `apps/api/src/products/*.spec.ts`, `dto/*.spec.ts`, `prisma/seed.spec.ts` | Unit test ProductsService, ProductsController, chuẩn hóa query, seed |
| `apps/web/app/page.tsx`, `components/menu.tsx` | Trang Menu: tìm kiếm (debounce 300 ms), lọc danh mục, phân trang, Loading/Empty/Error |
| `apps/web/app/products/[id]/page.tsx`, `components/product-detail.tsx` | Chi tiết sản phẩm: chọn Size, Topping, số lượng; Loading/Not found/Error |
| `apps/web/lib/products.ts`, `lib/options.ts` | API client + bảng phụ thu Size/Topping (chỉ để tạm tính ở UI) |
| `apps/web/app/manifest.ts`, `public/sw.js`, `public/offline.html`, `public/icons/` | PWA: manifest, service worker, trang ngoại tuyến, icon 192/512/maskable |
| `apps/web/__tests__/*.test.ts(x)` | Component test (Vitest + Testing Library) cho Menu, Chi tiết, lib |
| `.github/workflows/ci.yml` | Nâng Node 18 → 22 (Nest 12 / Next 16 yêu cầu) và thêm bước test Frontend |
| `docs/report/nhu-y-chapter-1.tex`, `nhu-y-mvp-sprint1.tex` | Nội dung LaTeX Chương 1 mục 1.1 và kết quả MVP Sprint 1 |

## Kết quả kiểm tra (chạy thực tế, Node 22)

| Hạng mục | Kết quả |
|---|---|
| API `npm run test` | 5 suite, **22 test pass** |
| API `npm run lint` / `npm run build` | Pass / Pass |
| Web `npm run test` | 3 file, **23 test pass** |
| Web `npm run lint` / `npm run build` | Pass / Pass |
| Chạy thử bản build với API giả (dữ liệu seed) | Menu, Chi tiết, trạng thái Error hiển thị đúng ở 390 px và 1280 px |

**Chưa kiểm chứng được** (môi trường làm việc không có PostgreSQL và không tải được Prisma engine): `prisma migrate`, `prisma db seed` và các truy vấn thật tới DB. Logic truy vấn được kiểm bằng unit test có mock PrismaService; cần chạy lại trên máy nhóm theo lệnh bên dưới.

## Contract cần tích hợp với thành viên khác

1. **Thanh Tuấn — Product schema/migration:** giữ nguyên các cột hiện có của `Product` (`id, name, category, description, price, imageUrl, stock, isAvailable, createdAt`). Nếu Tuấn đổi tên/kiểu cột khi làm 7 bảng, cần báo để chỉnh `products.service.ts`, `seed-data.ts` và `lib/products.ts`.
2. **Huyền T — Giỏ hàng:** nút "Thêm vào giỏ hàng" phát `window` event `brewlite:product-selected` với payload `{ productId, productName, size, toppings, quantity }` (`size`: `S|M|L`, `toppings`: mảng id như `tran-chau`, `kem`, `thach`). Cart store lắng nghe event này hoặc thay bằng contract khác — báo lại để chỉnh `product-detail.tsx`. Header đang link tới `/cart` (trang do Huyền làm).
3. **Giá Size/Topping:** UI hiện chỉ tạm tính (S +0, M +5.000, L +10.000; Trân châu/Kem +10.000, Thạch +8.000đ). Giá chính thức tính ở server khi `POST /orders` (Tuấn/Khang) — cần thống nhất bảng phụ thu này; hiện schema chưa có bảng cho Size/Topping.
4. **Khang — CI:** `ci.yml` đã được sửa nhẹ (Node 22 + bước `npm run test` cho web). Khang xem lại khi merge.

## Lệnh chạy trên máy nhóm

```bash
# API
cd apps/api
cp .env.example .env              # sửa DATABASE_URL trỏ tới PostgreSQL của bạn
npm install
npx prisma generate
npx prisma migrate deploy         # hoặc migrate dev khi đang phát triển
npx prisma db seed                # an toàn khi chạy nhiều lần
npm run test && npm run lint && npm run build
npm run start:dev                 # http://localhost:3001

# Web
cd apps/web
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run test && npm run lint && npm run build
npm run dev                       # http://localhost:3000
```

### API contract

- `GET /products?page=1&pageSize=9` — danh sách món đang bán.
- `GET /products?category=Matcha&q=latte` — lọc danh mục / tìm theo tên, mô tả.
- `GET /products/1` — chi tiết; 404 nếu không có.

Danh sách trả về `{ data, categories, meta: { page, pageSize, total, totalPages } }`; `pageSize` bị giới hạn 1–50.

## Task 4.4 — Minh chứng PR chạy CI (cần làm trên GitHub)

Chưa thể tạo từ môi trường này vì cần đẩy nhánh và mở PR. Cách làm:

1. Đẩy nhánh `feat/nhu-y-products-menu`, mở PR vào `main` → chụp CI **xanh**.
2. Tạo commit cố ý lỗi, ví dụ sửa `expect(result.meta.pageSize).toBe(50)` thành `toBe(51)` trong `products.service.spec.ts` → đẩy lên, chụp CI **đỏ** (PR bị chặn merge).
3. Revert commit lỗi → CI xanh trở lại, chụp lại và đưa 3 ảnh vào báo cáo.

## Việc còn lại trước khi báo Sprint 1 hoàn tất

- Chạy migrate + seed trên PostgreSQL của nhóm, kiểm tra thủ công Menu với API thật (ảnh Unsplash tải từ internet).
- Tạo PR, chụp minh chứng CI như trên, review và merge.
- Gộp nội dung `.tex` vào Overleaf theo template chính thức.

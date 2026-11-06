# PR: Task 1.1 và MVP Sprint 1 – Phần việc Như Ý

**Branch đề xuất:** `feat/nhu-y-task1-products-menu`  
**Base branch:** `main`  
**Loại PR:** Draft – dùng để theo dõi tiến độ, chờ xác nhận tích hợp và CI

## 1. Mục tiêu

Tập hợp các đầu việc Như Ý phụ trách theo bảng phân công Assignment 2: Task 1.1 (bối cảnh nghiệp vụ và phạm vi dự án) và phần phối hợp MVP Sprint 1 (Products API, dữ liệu mẫu, giao diện Menu/Chi tiết sản phẩm và kiểm thử).

Các dấu `[x]` bên dưới thể hiện nội dung đã được chuẩn bị trong bản source bàn giao ở máy làm việc. Chúng chỉ được xem là hoàn tất trên repository sau khi commit được đẩy lên branch và PR được kiểm tra.

## 2. Checklist tiến độ công việc

### Task 1.1 – Requirements (Như Ý)

- [x] Soạn bối cảnh nghiệp vụ và vấn đề cần giải quyết.
- [x] Xác định mục tiêu sản phẩm.
- [x] Lập bảng Stakeholder và vai trò.
- [x] Xác định phạm vi In-scope và Out-of-scope.
- [x] Ghi nhận giả định, ràng buộc và rủi ro.
- [x] Chuẩn bị `docs/requirements/context-and-scope.md`.
- [x] Chuẩn bị nội dung Chương 1, Mục 1.1 cho báo cáo LaTeX.
- [ ] Đẩy commit lên branch và mở PR trên repository nhóm.
- [ ] Nhận review, chỉnh sửa (nếu có) và merge Task 1.1 vào `main`.

### MVP Sprint 1 – Products & Menu (Như Ý phối hợp Thanh Tuấn)

- [x] Bổ sung API `GET /products`.
- [x] Hỗ trợ phân trang, tìm kiếm và lọc danh mục cho danh sách sản phẩm.
- [x] Bổ sung API `GET /products/:id` để lấy chi tiết sản phẩm.
- [x] Chuẩn bị Prisma provider/service dùng chung cho module Products.
- [x] Chuẩn bị seed dữ liệu sản phẩm mẫu theo hướng chạy lặp an toàn.
- [x] Xây dựng giao diện Menu theo hướng mobile-first.
- [x] Bổ sung trạng thái Loading, Empty và Error cho Menu.
- [x] Xây dựng giao diện Chi tiết sản phẩm.
- [x] Bổ sung lựa chọn Size và Topping ở giao diện chi tiết.
- [x] Chuẩn bị Unit Test cho ProductsService.
- [x] Chuẩn bị Component Test cho trạng thái giao diện Menu.
- [x] Chuẩn bị nội dung báo cáo kết quả MVP Sprint 1.
- [ ] Đối chiếu Product schema/migration cuối cùng với Thanh Tuấn trước khi tích hợp.
- [ ] Chạy test, lint và build trong môi trường có đầy đủ dependencies.
- [ ] Kiểm tra API và giao diện sau khi ghép vào branch tích hợp.
- [ ] Xác nhận CI xanh trên Pull Request.
- [ ] Review và merge MVP Sprint 1 vào `main`.

## 3. Các phần phụ thuộc cần phối hợp

- **Thanh Tuấn:** xác nhận Prisma Product schema và migration cuối cùng; thống nhất cách tích hợp API/DB để tránh ghi đè thay đổi của nhau.
- **Tô Phúc Khang:** hoàn thiện GitHub Actions CI (Install, Lint, Unit Test, Build). PR này cần workflow hoạt động để xác nhận trạng thái CI.
- **Huyền T:** kết nối lựa chọn sản phẩm, Size, Topping và số lượng từ trang Chi tiết vào `useCartStore`. Phần giỏ hàng không được xem là hoàn tất trong PR này.

## 4. Kiểm thử và nghiệm thu

- [x] Đã chuẩn bị mã nguồn test cho ProductsService, ProductsController và trạng thái Menu.
- [ ] Chạy `npm ci` thành công.
- [ ] Chạy Unit Test thành công.
- [ ] Chạy Component Test thành công.
- [ ] Chạy Lint thành công.
- [ ] Chạy Build thành công.
- [ ] Xác nhận CI trên GitHub Actions báo Pass.
- [ ] Kiểm tra thủ công Menu: tìm kiếm, lọc danh mục, phân trang, xem chi tiết và các trạng thái Loading/Empty/Error.

**Ghi chú kiểm thử:** tại thời điểm chuẩn bị bản bàn giao, môi trường làm việc không truy cập được npm registry (`EAI_AGAIN`), nên các test/build chưa được xác nhận chạy Pass. Không đánh dấu các mục kiểm thử này hoàn tất cho đến khi chạy thành công trên môi trường có dependencies đầy đủ.

## 5. File chính trong phạm vi PR

- `docs/requirements/context-and-scope.md`
- `apps/api/src/products/` (module Products và các test liên quan, theo cấu trúc hiện có của dự án)
- `apps/api/prisma/seed.ts`
- `apps/web/app/`
- `apps/web/components/`
- `apps/web/lib/`
- `apps/web/__tests__/`
- `docs/report/nhu-y-chapter-1.tex`
- `docs/report/nhu-y-mvp-sprint1.tex`

## 6. Definition of Done

- [ ] Code và tài liệu của Như Ý đã được đẩy lên branch PR.
- [ ] Không ghi đè thay đổi của các thành viên phụ trách schema, CI hoặc Cart.
- [ ] Review hoàn tất và các góp ý đã được xử lý.
- [ ] Unit/Component Test, Lint và Build đều Pass.
- [ ] CI GitHub Actions Pass.
- [ ] PR được merge vào `main` sau khi nhóm nghiệm thu.

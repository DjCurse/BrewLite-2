# Bảng ma trận truy vết yêu cầu chức năng

| Mã FR | Tên yêu cầu chức năng | Use Case / User Story | Sơ đồ | Code / API | Mã Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-01** | Xem thực đơn | UC01 — Xem thực đơn | UseCase_TongQuat, class-diagram | GET /products | UNIT-T01 |
| **FR-02** | Xem chi tiết món | UC02 — Xem chi tiết món | UseCase_TongQuat, class-diagram | GET /products/:id | UNIT-T02 |
| **FR-03** | Chọn size, topping và tính đơn giá | UC03 — Chọn size & topping | UseCase_TongQuat, class-diagram | useCartStore.ts, POST /orders | E2E-T01 |
| **FR-04** | Thêm món vào giỏ | UC04 — Thêm món vào giỏ | UseCase_TongQuat, activity-checkout | useCartStore.ts | E2E-T01 |
| **FR-05** | Sửa số lượng, xóa món trong giỏ | UC05 — Sửa số lượng / xóa món | UseCase_TongQuat | useCartStore.ts | E2E-T01 |
| **FR-06** | Tính tổng tiền giỏ hàng | UC06 — Xem giỏ hàng & tổng tạm tính | UseCase_TongQuat, class-diagram | useCartStore.ts, POST /orders | E2E-T01, INT-T01 |
| **FR-07** | Lưu giỏ hàng của người dùng đã đăng nhập | UC06 — Xem giỏ hàng, UC08 — Đăng nhập | UseCase_TongQuat | useCartStore.ts | E2E-T01 |
| **FR-08** | Đăng ký tài khoản | UC07 — Đăng ký tài khoản | UseCase_TongQuat, activity-checkout, class-diagram | POST /auth/register | UNIT-T03 |
| **FR-09** | Đăng nhập | UC08 — Đăng nhập | UseCase_TongQuat, activity-checkout, class-diagram | POST /auth/login | UNIT-T03 |
| **FR-10** | Bảo vệ chức năng cần đăng nhập | UC08 — Đăng nhập | activity-checkout, sequence-checkout | JwtAuthGuard | UNIT-T03 |
| **FR-11** | Tạo đơn hàng | UC09 — Đặt đơn hàng | UseCase_DatDon_ThanhToan, activity-checkout, sequence-checkout, class-diagram | POST /orders | INT-T01 |
| **FR-12** | Kiểm tra và trừ tồn kho | UC09 — Đặt đơn hàng, UC11 — Thanh toán | activity-checkout, sequence-checkout, class-diagram | POST /orders, POST /payments | INT-T01 |
| **FR-13** | Áp mã khuyến mãi | UC10 — Áp mã khuyến mãi, UC10a — Kiểm tra mã hợp lệ | UseCase_DatDon_ThanhToan, class-diagram | POST /orders, POST /payments | UNIT-T04 |
| **FR-14** | Thanh toán đơn qua cổng thanh toán | UC11 — Thanh toán không tiền mặt (Ví/Thẻ), US-05 | UseCase_DatDon_ThanhToan, activity-checkout, sequence-checkout, class-diagram | POST /payments | INT-T02 |
| **FR-15** | Chống thanh toán trùng (Idempotency) | UC11 — Thanh toán không tiền mặt, US-05 | UseCase_DatDon_ThanhToan, sequence-checkout, class-diagram | POST /payments (Idempotency-Key) | INT-T02 |
| **FR-16** | Xử lý thanh toán thất bại | UC11a — Thanh toán lại đơn hàng, US-05 | UseCase_DatDon_ThanhToan, activity-checkout, sequence-checkout, class-diagram | POST /payments | INT-T02 |
| **FR-17** | Màn hình xác nhận đơn | UC13 — Xem xác nhận đơn | UseCase_DatDon_ThanhToan, activity-checkout, sequence-checkout | POST /payments, GET /orders/me | E2E-T01 |
| **FR-18** | Lịch sử đơn của tôi | UC16 — Xem danh sách đơn hàng | UseCase_TongQuat, class-diagram | GET /orders/me | E2E-T01 |
| **FR-19** | Tích điểm thưởng | UC12 — Tích điểm thưởng | UseCase_DatDon_ThanhToan, activity-checkout, sequence-checkout, class-diagram | POST /payments | UNIT-T04 |
| **FR-20** | Xem thông tin cá nhân | UC14, UC15, UC16, UC17 | UseCase_TongQuat, UseCase_DatDon_ThanhToan, class-diagram | GET /users/me, GET /orders/me, PATCH /orders/:id/status | UNIT-T03, E2E-T01 |
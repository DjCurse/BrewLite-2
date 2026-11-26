# ADR 002: Tính giá và kiểm tra tồn kho phía Server bằng Database Transaction

## Trạng thái
Đã chấp thuận

## Bối cảnh
Trong hệ thống đặt đồ uống **BrewLite**, mỗi sản phẩm cho phép khách hàng tùy chọn **Size** (`S`, `M`, `L`), nhiều loại **Topping** (*Trân châu*, *Kem*, *Thạch*) và áp dụng **mã khuyến mãi** (`BREWLITE10`, `STAFF20`, `SGU2026`, `FREESHIP`). 

Nếu hệ thống tin tưởng trực tiếp đơn giá hoặc tổng tiền được tính từ phía trình duyệt (`apps/web`), hoặc thực hiện kiểm tra tồn kho và trừ số lượng bằng các câu truy vấn tách rời nhau, hệ thống sẽ đối mặt với hai rủi ro nghiêm trọng:
1. **Sai lệch hoặc gian lận giá bán:** Người dùng có thể can thiệp vào payload yêu cầu ở phía client để thay đổi giá gốc, phụ thu hoặc mức giảm giá.
2. **Bán vượt tồn kho (Race Condition):** Khi nhiều khách hàng cùng đặt một sản phẩm có số lượng tồn kho thấp (`stockQuantity`) tại cùng thời điểm, việc đọc và cập nhật tồn kho không nguyên tử có thể khiến `stockQuantity` bị âm.

## Quyết định
Toàn bộ nghiệp vụ tính giá, xác thực ưu đãi và cập nhật tồn kho khi tạo đơn hàng (`POST /orders`) được xử lý tập trung ở Backend (`OrdersService` và `PromotionsService`) bên trong một khối giao dịch nguyên tử **`prisma.$transaction(...)`**:

1. **Chốt đơn giá và phụ thu tại Server:** Backend truy vấn giá gốc (`Product.price`) từ cơ sở dữ liệu, tự tính lại phụ thu Size (`S`: +0đ, `M`: +5.000đ, `L`: +10.000đ) và Topping (*Trân châu*: +10.000đ, *Kem*: +10.000đ, *Thạch*: +8.000đ) theo đơn vị số nguyên VND.
2. **Xác thực mã khuyến mãi tại Server:** Kiểm tra điều kiện hiệu lực, giá trị đơn tối thiểu (`minOrderValue`), giới hạn lượt dùng (`maxUses`, `perUserLimit`) và quyền nhân viên (`staffOnly` đối với mã `STAFF20`).
3. **Kiểm tra và trừ tồn kho nguyên tử:** Trong cùng transaction, hệ thống kiểm tra `stockQuantity >= quantity` cho từng món trong đơn. Nếu hợp lệ, hệ thống trừ tồn kho, tăng `usedCount` của mã khuyến mãi (nếu có) và khởi tạo bản ghi `Order` ở trạng thái `PENDING` kèm các `OrderItem`. Nếu bất kỳ món nào không đủ hàng, toàn bộ transaction tự động **rollback** và trả về lỗi rõ ràng.

## Hệ quả

### Ưu điểm
* **Đảm bảo tính toàn vẹn dữ liệu (ACID):** Không bao giờ xảy ra tình trạng bán vượt tồn kho (`stockQuantity < 0`) hoặc tạo đơn hàng dở dang khi lỗi giữa chừng.
* **Chống gian lận đơn giá từ Client:** Mọi con số lưu trong `Order` (`totalAmount`, `discountAmount`, `finalAmount`) và `OrderItem` (`unitPrice`, `totalPrice`) đều được tính toán và xác minh độc lập ở máy chủ.
* **Tách bạch trách nhiệm (Separation of Concerns):** Frontend chỉ đảm nhiệm hiển thị tạm tính phục vụ trải nghiệm người dùng, trong khi Backend giữ vai trò nguồn chân lý duy nhất (Single Source of Truth) về nghiệp vụ.

### Nhược điểm
* **Tăng thời gian giữ khóa dữ liệu (Row Lock):** Việc gom nhiều bước đọc/ghi vào một transaction làm tăng nhẹ độ trễ khi có lượng lớn yêu cầu đặt cùng một sản phẩm đồng thời.
* **Đòi hỏi đồng bộ quy tắc hiển thị:** Bảng phụ thu Size/Topping ở Frontend (`apps/web/lib/options.ts`) phải được duy trì nhất quán với Backend (`apps/api`) để tránh chênh lệch số tiền hiển thị trước và sau khi tạo đơn.
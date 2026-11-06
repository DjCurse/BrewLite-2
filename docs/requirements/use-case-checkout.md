# Đặc tả Use Case: Đặt đơn & Thanh toán

## 1. Thông tin chung

- **Actor chính:** Khách hàng.
- **Actor phụ:** Cổng thanh toán (System).
- **Liên kết yêu cầu:** FR-11 đến FR-17, FR-19.
- **Trigger:** Khách hàng nhấn nút "Thanh toán" tại màn hình giỏ hàng.

### Tiền điều kiện

- Giỏ hàng không rỗng (FR-11).
- Khách hàng đã đăng nhập và phiên đăng nhập còn hiệu lực (FR-10).

### Hậu điều kiện (thành công)

- Đơn hàng được tạo với mã đơn duy nhất và trạng thái `PAID`.
- Tồn kho được cập nhật tương ứng với số lượng món đã đặt.
- Có một giao dịch thanh toán thành công gắn với đơn hàng.
- Điểm thưởng được cộng vào tài khoản khách hàng.
- Giỏ hàng được xóa.
- Khách hàng xem được thông tin xác nhận đơn hàng (UC13).

### Hậu điều kiện (thất bại)

- Nếu đơn hàng chưa được tạo do giỏ hàng rỗng, chưa đăng nhập hoặc không đủ tồn kho: không phát sinh đơn hàng mới, tồn kho không thay đổi.
- Nếu đơn hàng đã được tạo nhưng thanh toán thất bại hoặc bị hủy: đơn hàng giữ trạng thái `PENDING`, giỏ hàng được giữ nguyên, không cộng điểm thưởng.
- Khách hàng có thể thực hiện thanh toán lại trên chính đơn hàng đang ở trạng thái `PENDING` (UC11a).

## 2. Luồng chính

1. Khách hàng nhấn "Thanh toán" tại màn hình giỏ hàng. Hệ thống kiểm tra giỏ hàng và hiển thị danh sách món cùng tổng tạm tính (UC09).
2. Hệ thống kiểm tra trạng thái đăng nhập. Nếu khách hàng chưa đăng nhập, yêu cầu đăng nhập trước khi tiếp tục (UC08).
3. Khách hàng có thể nhập mã khuyến mãi. Hệ thống kiểm tra tính hợp lệ của mã và cập nhật tổng tiền sau giảm giá (UC10, UC10a).
4. Khách hàng chọn phương thức thanh toán không tiền mặt (Ví/Thẻ) và xác nhận thanh toán (UC11).
5. Hệ thống tạo đơn hàng ở trạng thái `PENDING`, kiểm tra tồn kho, chốt giá và khoản giảm giá. Nếu đủ điều kiện, hệ thống cập nhật tồn kho và lưu thông tin đơn hàng.
6. Hệ thống tạo `Idempotency-Key` và gửi yêu cầu thanh toán đến Cổng thanh toán để xử lý giao dịch.
7. Cổng thanh toán trả kết quả thành công. Hệ thống cập nhật trạng thái đơn hàng từ `PENDING` sang `PAID`.
8. Hệ thống cộng điểm thưởng vào tài khoản khách hàng (UC12).
9. Hệ thống xóa giỏ hàng và hiển thị thông tin xác nhận đơn hàng cho khách hàng (UC13).
10. Khách hàng có thể theo dõi trạng thái xử lý đơn hàng sau khi đặt thành công (UC17).

## 3. Luồng thay thế

- **A1 – Không sử dụng mã khuyến mãi:** Khách hàng bỏ qua bước nhập mã tại bước 3. Hệ thống giữ nguyên tổng tiền và tiếp tục quy trình đặt hàng.
- **A2 – Thay đổi mã khuyến mãi:** Khách hàng nhập mã mới thay cho mã cũ hoặc xóa mã đã áp dụng. Hệ thống kiểm tra lại mã và cập nhật tổng tiền tương ứng (UC10).
- **A3 – Gửi yêu cầu thanh toán trùng:** Nếu yêu cầu thanh toán được gửi lại với cùng `Idempotency-Key`, hệ thống trả về kết quả của lần xử lý đầu tiên, không tạo giao dịch mới, không trừ tiền hai lần và không cộng điểm thưởng trùng lặp.
- **A4 – Thanh toán lại đơn hàng:** Nếu khách hàng đóng trang thanh toán hoặc giao dịch trước đó chưa hoàn tất, khách hàng có thể truy cập lại đơn hàng đang `PENDING` và thực hiện thanh toán lại (UC11a).

## 4. Luồng ngoại lệ

- **E1 – Chưa đăng nhập hoặc phiên hết hạn:** Hệ thống yêu cầu khách hàng đăng nhập (UC08). Sau khi đăng nhập thành công, hệ thống chuyển khách hàng trở lại trang thanh toán và giữ nguyên giỏ hàng.
- **E2 – Giỏ hàng rỗng:** Hệ thống không cho phép đặt đơn và hiển thị thông báo giỏ hàng trống.
- **E3 – Mã khuyến mãi không hợp lệ:** Hệ thống thông báo mã không hợp lệ, giữ nguyên tổng tiền và cho phép khách hàng tiếp tục thanh toán mà không sử dụng mã đó (UC10a).
- **E4 – Không đủ tồn kho:** Nếu số lượng món đặt vượt quá số lượng tồn kho, hệ thống thông báo món không đủ hàng và không tạo đơn hàng. Tồn kho không bị thay đổi. Trường hợp nhiều khách hàng cùng đặt số lượng hàng còn lại, hệ thống đảm bảo chỉ đơn hàng hợp lệ được xử lý thành công.
- **E5 – Thiếu `Idempotency-Key`:** Hệ thống từ chối yêu cầu thanh toán và trả về lỗi 400, không tạo giao dịch thanh toán.
- **E6 – Đơn hàng đã thanh toán:** Nếu đơn hàng đã ở trạng thái `PAID`, hệ thống không cho phép thanh toán lại và chuyển khách hàng đến màn hình xác nhận đơn hàng (UC13).
- **E7 – Thanh toán thất bại hoặc bị hủy:** Cổng thanh toán trả về kết quả `PAYMENT_FAILED` hoặc giao dịch bị hủy. Hệ thống giữ đơn hàng ở trạng thái `PENDING`, giữ nguyên giỏ hàng, không cộng điểm thưởng và thông báo kết quả cho khách hàng. Khách hàng có thể thực hiện thanh toán lại trên đơn hàng đó (UC11a).
- **E8 – Cổng thanh toán không phản hồi:** Hệ thống chưa xác định được kết quả giao dịch, giữ đơn hàng ở trạng thái `PENDING` và không tự động tạo giao dịch mới. Khách hàng có thể kiểm tra lại trạng thái hoặc thực hiện thanh toán lại sau khi hệ thống xác định được kết quả giao dịch trước đó.
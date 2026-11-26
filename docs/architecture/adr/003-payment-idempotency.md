# ADR 003: Chống thanh toán và cộng điểm trùng lặp bằng Idempotency-Key

## Trạng thái
Đã chấp thuận

## Bối cảnh
Khi khách hàng thanh toán qua mạng không ổn định hoặc nhấn nút xác nhận nhiều lần, yêu cầu `POST /payments` có thể bị gửi lặp lại, dẫn đến nguy cơ ghi nhận nhiều giao dịch thanh toán hoặc cộng trùng điểm thưởng `LoyaltyTransaction` cho cùng một đơn hàng.

## Quyết định
Bắt buộc client gửi kèm header `Idempotency-Key` (UUID duy nhất cho mỗi lượt thanh toán) khi gọi `POST /payments`. Backend lưu trữ khóa này gắn với đơn hàng và kiểm tra trước khi xử lý: nếu khóa đã tồn tại, hệ thống trả về ngay kết quả giao dịch trước đó mà không tạo bản ghi mới.

## Hệ quả
- **Ưu điểm:** Đảm bảo tính bất biến (Idempotency) cho nghiệp vụ thanh toán và tích điểm; an toàn khi thử lại (retry) lúc mạng chập chờn.
- **Nhược điểm:** Client phải sinh mới `Idempotency-Key` khi người dùng chủ động thử thanh toán lại một đơn hàng từng bị `PAYMENT_FAILED`.
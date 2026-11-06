**Tài liệu SRS rút gọn**

**1\. Yêu cầu chức năng**

|     |     |     |     |
| --- | --- | --- | --- |
| **ID** | **Yêu cầu** | **MoSCoW** | **Tiêu chí chấp nhận** |
| **NHÓM 1: MENU** |     |     |     |
| FR-01 | Xem thực đơn | Must | \- Mở trang thực đơn thì thấy danh sách đồ uống, mỗi món có tên, giá và tình trạng tồn kho (GET /products).<br><br>\- Trong lúc chờ dữ liệu thì hiện trạng thái Loading; danh sách rỗng thì hiện thông báo Empty; gọi dữ liệu lỗi thì hiện thông báo Error kèm nút thử lại.<br><br>\- Món hết hàng hiện nhãn “Hết hàng” và không thêm được vào giỏ. |
| FR-02 | Xem chi tiết món | Must | \- Chọn một món thì hiển thị đúng mô tả, giá gốc và các tùy chọn của món đó (GET /products/:id).<br><br>\- Mở món không tồn tại thì hiện thông báo “Không tìm thấy món” thay vì trang trống hoặc lỗi kỹ thuật. |
| FR-03 | Chọn size, topping và tính đơn giá | Must | \- Bắt buộc chọn đúng 1 size (S +0đ, M +5.000đ, L +10.000đ), chưa chọn size thì không thêm được vào giỏ.<br><br>\- Topping là tùy chọn, mỗi loại +10.000đ, được chọn nhiều loại.<br><br>\- Đơn giá = giá gốc + phụ thu size + 10.000đ × số topping; giá hiển thị cập nhật ngay khi đổi lựa chọn. |
| **NHÓM 2: GIỎ HÀNG** |     |     |     |
| FR-04 | Thêm món vào giỏ | Must | Thêm món với tùy chọn hợp lệ thì giỏ có thêm đúng một dòng. Cùng món và cùng tùy chọn thì cộng dồn số lượng. Khác tùy chọn thì tạo dòng mới. |
| FR-05 | Sửa số lượng, xóa món trong giỏ | Must | Tăng, giảm số lượng và xóa món được; giảm về 0 thì dòng bị xóa. Số lượng mỗi dòng trong khoảng 1 đến 20. |
| FR-06 | Tính tổng tiền giỏ hàng | Must | Thành tiền mỗi dòng = đơn giá × số lượng; tổng tạm tính = tổng các thành tiền, sai số 0đ và cập nhật ngay sau mỗi thay đổi. |
| FR-07 | Lưu giỏ hàng của người dùng đã đăng nhập | Should | Tải lại trang hoặc đóng mở lại trình duyệt thì giỏ vẫn còn nguyên. |
| **NHÓM 3: XÁC THỰC** |     |     |     |
| FR-08 | Đăng ký tài khoản | Must | \- Nhập email và mật khẩu hợp lệ thì tạo được tài khoản (POST /auth/register).<br><br>\- Email đã tồn tại thì báo lỗi và không tạo tài khoản.<br><br>\- Mật khẩu không đạt quy tắc (tối thiểu 6 ký tự, gồm chữ và số) thì bị từ chối kèm thông báo nêu rõ lý do.<br><br>\- Mật khẩu không bao giờ được lưu hay ghi log ở dạng đọc được. |
| FR-09 | Đăng nhập | Must | **\-** Nhập đúng thông tin thì đăng nhập thành công và vào được các chức năng cần đăng nhập (POST /auth/login).<br><br>**\-** Nhập sai thì báo chung “Email hoặc mật khẩu không đúng”, không tiết lộ trường nào sai.<br><br>\- Phiên đăng nhập hết hạn thì yêu cầu đăng nhập lại. |
| FR-10 | Bảo vệ chức năng cần đăng nhập | Must | **\-** Người chưa đăng nhập, hoặc phiên hết hạn, khi đặt đơn, thanh toán hay xem lịch sử đơn thì bị từ chối và được yêu cầu đăng nhập.<br><br>**\-** Giỏ hàng và thực đơn vẫn dùng được khi chưa đăng nhập.<br><br>\- Người dùng chỉ truy cập được dữ liệu của chính mình. |
| **NHÓM 4: ĐẶT ĐƠN** |     |     |     |
| FR-11 | Tạo đơn hàng | Must | **\-** Người dùng đã đăng nhập, giỏ không rỗng thì tạo được đơn có mã duy nhất, trạng thái PENDING (POST /orders).<br><br>\- Giỏ rỗng thì không tạo được đơn.<br><br>**\-** Giá và các khoản giảm được chốt vào đơn tại thời điểm tạo; đổi giá món sau đó không làm đổi đơn cũ. |
| FR-12 | Kiểm tra và trừ tồn kho | Must | **\-** Nếu có món vượt quá tồn kho thì đơn không được tạo, tồn kho không đổi và khách biết món nào không đủ.<br><br>**\-** Đặt thành công thì tồn kho mỗi món giảm đúng bằng số lượng đã đặt.<br><br>\- Hai khách cùng đặt món chỉ còn một phần thì chỉ một người đặt được, tồn kho không bao giờ âm. |
| FR-13 | Áp mã khuyến mãi | Should | **\-** Chấp nhận các mã SGU2026, BREWLITE10, FREESHIP; mã khác báo “Mã không hợp lệ”.<br><br>**\-** Mã hợp lệ thì hiển thị số tiền giảm và tổng mới; bỏ mã thì tổng về như cũ.<br><br>**\-** Mỗi đơn tối đa 1 mã; áp mã thứ hai sẽ thay mã thứ nhất.<br><br>**\-** Tiền giảm làm tròn xuống VND nguyên, tổng sau giảm không âm.<br><br>**\-** Mã và số tiền giảm được lưu vào đơn khi tạo đơn. |
| **NHÓM 5: THANH TOÁN** |     |     |     |
| FR-14 | Thanh toán đơn qua cổng thanh toán | Must | **\-** Từ đơn PENDING, khách thanh toán được qua cổng Ví/Thẻ (hoặc cổng mô phỏng) với đúng số tiền thực trả của đơn (POST /payments).<br><br>**\-** Thanh toán thành công thì đơn chuyển PENDING → PAID.<br><br>**\-** Đơn đã PAID thì không thanh toán lại được. |
| FR-15 | Chống thanh toán trùng (Idempotency) | Must | **\-** Yêu cầu thanh toán thiếu Idempotency-Key thì bị từ chối.<br><br>**\-** Gửi lại cùng Idempotency-Key thì trả kết quả của lần đầu, không tạo thêm giao dịch, không trừ tiền lần hai.<br><br>**\-** Gửi trùng như vậy không làm cộng điểm thưởng lần hai. |
| FR-16 | Xử lý thanh toán thất bại | Must | **\-** Thanh toán thất bại (PAYMENT_FAILED) hoặc bị hủy thì đơn vẫn PENDING, không chuyển PAID.<br><br>**\-** Giỏ hàng được giữ nguyên và khách thử thanh toán lại được.<br><br>**\-** Khách thấy thông báo thất bại dễ hiểu, không lộ thông tin kỹ thuật. |
| **NHÓM 6: XÁC NHẬN VÀ LỊCH SỬ ĐƠN** |     |     |     |
| FR-17 | Màn hình xác nhận đơn | Must | **\-** Sau khi đặt đơn và thanh toán thành công, màn hình xác nhận hiển thị mã đơn, danh sách món kèm tùy chọn, số lượng, tổng tiền và trạng thái.<br><br>**\-** Thanh toán thành công thì giỏ hàng được xóa.<br><br>**\-** Có nút chuyển hướng sang trang theo dõi trạng thái đơn hàng. |
| FR-18 | Lịch sử đơn của tôi | Must | **\-** Khách xem được danh sách đơn của mình ngay dưới phần xác nhận đơn vừa đặt thành công hoặc trong phần thông tin cá nhân, xếp theo mới nhất trước, gồm mã đơn, ngày, tổng tiền, trạng thái (GET /orders/me).<br><br>**\-** Không thấy đơn của người khác.
| **NHÓM 7: KHÁCH HÀNG THÂN THIẾT VÀ HỒ SƠ CÁ NHÂN** |     |     |     |
| FR-19 | Tích điểm thưởng | Should | **\-** Khi đơn chuyển PAID, khách được cộng điểm theo quy tắc 1 điểm mỗi 10.000đ số tiền thực trả, làm tròn xuống.<br><br>**\-** Mỗi đơn chỉ cộng điểm đúng một lần, kể cả khi bị gọi thanh toán trùng.<br><br>**\-** Đơn chưa PAID hoặc thanh toán thất bại thì không được cộng điểm. |
| FR-20 | Xem thông tin cá nhân | Should | Ở trang thông tin cá nhân, khách xem được: <br><br> **\-** Tên đăng nhập, email và số điểm thưởng tích lũy hiện tại.<br><br>**\-** Danh sách đơn hàng đã đặt thành công. <br><br>\- Theo dõi trạng thái đơn hàng vừa đặt. |

**2\. Yêu cầu phi chức năng**

|     |     |     |     |     |
| --- | --- | --- | --- | --- |
| **ID** | **Nhóm** | **Yêu cầu** | **MoSCoW** | **Tiêu chí chấp nhận (có thể đo/kiểm)** |
| NFR-01 | Hiệu năng | Thời gian phản hồi thao tác giỏ hàng và tạo đơn | Must | Các API giỏ hàng và tạo đơn ≤ 500 ms (không tính thời gian cổng thanh toán). |
| NFR-02 | Bảo mật | Bảo vệ mật khẩu | Must | Mật khẩu được băm bằng bcrypt. Kiểm tra DB không thấy mật khẩu dạng rõ. |
| NFR-03 | Bảo mật | Mã hóa đường truyền | Must | Mọi truy cập đều qua HTTPS (TLS ≥ 1.2). Truy cập HTTP bị chuyển hướng sang HTTPS. |
| NFR-04 | Bảo mật | Kiểm soát truy cập phía server | Must | Mọi API có xác thực đều kiểm tra quyền sở hữu và vai trò phía server. Thử truy cập đơn của người khác bằng cách đổi ID thì nhận 403. |
| NFR-05 | Tính khả dụng (usability) | Giao diện responsive | Must | Hiển thị và thao tác đầy đủ ở độ rộng từ 360 px đến 1920 px, không có thanh cuộn ngang. |
| NFR-06 | Tính khả dụng (usability) | Thông báo lỗi dễ hiểu | Should | Mọi lỗi nhập liệu hiển thị bằng tiếng Việt, chỉ rõ trường lỗi và cách sửa, không lộ thông tin kỹ thuật như stack trace. |
| NFR-07 | Triển khai | Triển khai và health check | Must | Từ máy sạch, chạy docker compose up thì ứng dụng, CSDL và dữ liệu mẫu khởi động được. Trên production, endpoint health check của API (ví dụ GET /health) trả 200 khi hệ thống hoạt động. |
| NFR-08 | Triển khai | Cấu hình qua biến môi trường | Must | Khóa cổng thanh toán, chuỗi kết nối DB, secret không nằm trong mã nguồn. Đổi môi trường chỉ cần đổi file .env. |
| NFR-09 | Triển khai | Pipeline CI | Should | Mỗi pull request tự động build và chạy test. Pipeline đỏ thì chặn merge. |
| NFR-10 | Triển khai | Tài liệu hướng dẫn triển khai | Must | README có hướng dẫn chạy local, test, build, deploy và rollback. Có release/tag phiên bản kèm release notes. Một người ngoài nhóm clone repo, làm theo README chạy được hệ thống và truy cập được production qua các URL đã cung cấp. |
| NFR-11 | Toàn vẹn dữ liệu | Tính nhất quán đơn hàng và thanh toán | Must | Giao dịch DB đảm bảo không có đơn “Đã thanh toán” mà thiếu bản ghi thanh toán, và ngược lại. Tổng tiền đơn lưu bằng số nguyên VND. |
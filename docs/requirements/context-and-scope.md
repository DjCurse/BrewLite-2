# Task 1.1 — Bối cảnh nghiệp vụ, Stakeholder và Phạm vi dự án

## 1. Bối cảnh nghiệp vụ

BrewLite là hệ thống đặt món và quản lý hoạt động của chuỗi cửa hàng đồ uống/thức ăn. Hệ thống hướng đến việc đưa quy trình từ xem thực đơn đến đặt món, thanh toán và theo dõi tình trạng đơn hàng lên một nền tảng web tối ưu cho điện thoại, đồng thời cung cấp các chức năng quản lý cần thiết cho nhân viên và người quản lý.

Trong cách vận hành rời rạc, khách hàng có thể phải xem thực đơn tại quầy hoặc qua các kênh riêng, thông tin về món, giá bán và tình trạng còn hàng chưa được đồng bộ trong một luồng thống nhất. Nhân viên tiếp nhận và chuyển yêu cầu đặt món thủ công dễ gặp nhầm lẫn giữa món, số lượng hoặc ghi chú. Khách hàng cũng khó biết đơn hàng đang được xác nhận, pha chế hay đã sẵn sàng. Khi thanh toán, áp dụng khuyến mãi và tích điểm được xử lý ở nhiều nơi, việc đối soát và bảo đảm không ghi nhận trùng giao dịch trở nên khó khăn.

BrewLite giải quyết các vấn đề trên bằng một luồng nghiệp vụ nhất quán: khách hàng duyệt thực đơn, xem chi tiết và lựa chọn Size/Topping, quản lý giỏ hàng, xác nhận đơn, thanh toán, sau đó theo dõi trạng thái xử lý. Ở phía cửa hàng, dữ liệu sản phẩm, tồn kho, đơn hàng, khuyến mãi và giao dịch điểm thưởng được quản lý tập trung. Backend là nơi chịu trách nhiệm kiểm tra dữ liệu và thực hiện các nghiệp vụ quan trọng; giao diện chỉ đảm nhiệm hiển thị và thu thập lựa chọn của người dùng.

### Mục tiêu nghiệp vụ

1. Cung cấp thực đơn tập trung, có thể tìm kiếm, lọc theo danh mục và xem thông tin chi tiết sản phẩm.
2. Giảm sai sót khi khách hàng lựa chọn món, Size, Topping và xác nhận số lượng.
3. Chuẩn hóa quy trình tạo đơn, kiểm tra/trừ tồn kho và tính tiền ở phía máy chủ.
4. Hỗ trợ thanh toán, áp dụng khuyến mãi và ghi nhận điểm thưởng có kiểm soát.
5. Minh bạch trạng thái đơn hàng để khách hàng và nhân viên theo dõi cùng một nguồn dữ liệu.
6. Tạo nền tảng có thể kiểm thử, triển khai và mở rộng theo kiến trúc đã thống nhất của nhóm.

## 2. Stakeholders

| Stakeholder | Vai trò / Mối quan tâm | Nhu cầu chính |
|---|---|---|
| Khách hàng | Người sử dụng trực tiếp hệ thống để đặt món | Xem thực đơn và giá; tìm kiếm/lọc món; xem chi tiết; chọn Size/Topping; đặt và thanh toán; theo dõi đơn; xem điểm thưởng |
| Nhân viên quầy | Tiếp nhận và hỗ trợ đơn hàng tại cửa hàng | Xem thông tin đơn; xác nhận và cập nhật trạng thái theo quyền được cấp; tra cứu sản phẩm |
| Nhân viên pha chế | Thực hiện món theo đơn đã xác nhận | Nhận danh sách món, số lượng, Size/Topping và ghi chú rõ ràng; biết thứ tự/trạng thái xử lý |
| Quản lý cửa hàng | Theo dõi hoạt động và nguồn lực cửa hàng | Quản lý sản phẩm, giá và tồn kho; theo dõi đơn; kiểm soát khuyến mãi và kết quả vận hành |
| Quản trị hệ thống | Quản trị người dùng, cấu hình và quyền truy cập | Quản lý tài khoản/vai trò; kiểm soát truy cập; theo dõi tình trạng hệ thống |
| Đơn vị cung cấp thanh toán | Hệ thống bên ngoài xác nhận giao dịch | Nhận yêu cầu thanh toán hợp lệ; trả kết quả giao dịch; hỗ trợ đối chiếu mã giao dịch/idempotency |
| Nhóm phát triển và giảng viên hướng dẫn | Xây dựng, đánh giá và nghiệm thu sản phẩm | Yêu cầu, sơ đồ, mã nguồn, kiểm thử và tài liệu phải truy vết được; quy trình Git/PR minh bạch |

## 3. Phạm vi dự án

### 3.1. Trong phạm vi (In-scope)

- **Thực đơn và sản phẩm:** hiển thị danh sách sản phẩm; tìm kiếm; lọc danh mục; phân trang; xem chi tiết; thể hiện giá, mô tả, hình ảnh và tình trạng còn hàng; lựa chọn Size/Topping trên giao diện.
- **Tài khoản:** đăng ký, đăng nhập, xác thực và xem hồ sơ người dùng theo quyền truy cập.
- **Giỏ hàng và đặt món:** thêm/chỉnh sửa/xóa món, số lượng và tùy chọn; xác nhận đơn; kiểm tra tồn kho; tính tổng tiền ở backend.
- **Thanh toán và ưu đãi:** tiếp nhận kết quả thanh toán; xử lý khóa chống ghi nhận trùng yêu cầu; áp dụng khuyến mãi và ghi nhận giao dịch điểm thưởng theo quy tắc hệ thống.
- **Theo dõi đơn hàng:** xem đơn của người dùng và trạng thái xử lý từ lúc đặt đến khi hoàn tất.
- **Dữ liệu quản lý:** lưu trữ sản phẩm, đơn hàng, chi tiết đơn, thanh toán, khuyến mãi và giao dịch điểm thưởng trong PostgreSQL thông qua Prisma theo mô hình dữ liệu của dự án.
- **Vận hành kỹ thuật:** kiểm tra sức khỏe API; kiểm thử Unit/Integration/E2E; CI/CD và triển khai theo nhiệm vụ chung của nhóm.

### 3.2. Ngoài phạm vi (Out-of-scope)

- Phát triển ứng dụng native riêng cho iOS/Android; phiên bản MVP triển khai giao diện web responsive theo định hướng PWA.
- Tích hợp thiết bị POS, máy in hóa đơn, máy quét mã vạch hoặc phần cứng chuyên dụng tại cửa hàng.
- Quản lý mua hàng, nhà cung cấp, công nợ, kế toán tổng hợp, nhân sự và tính lương.
- Đặt bàn, quản lý chỗ ngồi, giao hàng/chỉ đường và điều phối đội ngũ giao hàng bên thứ ba.
- Tích hợp trực tiếp với mọi ví điện tử/ngân hàng thực tế trong MVP; môi trường kiểm thử có thể sử dụng sandbox hoặc mô phỏng theo cấu hình nhóm thống nhất.
- Phân tích dự báo nhu cầu, gợi ý món bằng AI và chương trình khách hàng thân thiết nâng cao ngoài quy tắc điểm được đặc tả.

## 4. Giả định và ràng buộc

1. Dữ liệu giá sản phẩm được lưu dưới dạng số nguyên theo đơn vị đồng Việt Nam (VND); giao diện định dạng số tiền để người dùng dễ đọc.
2. Trong MVP Sprint 1, bảng `Product` là nguồn dữ liệu chuẩn cho tên, danh mục, mô tả, giá, hình ảnh, tồn kho và trạng thái kinh doanh của sản phẩm.
3. Lựa chọn Size/Topping ở giao diện Sprint 1 là dữ liệu lựa chọn của khách hàng. Phụ thu và quy tắc tính giá cuối cùng phải được nhóm thống nhất và kiểm tra lại ở backend trước khi hoàn thiện luồng đặt hàng/thanh toán Sprint 2.
4. Bản dữ liệu hiện tại chưa thể hiện tồn kho tách riêng theo chi nhánh; MVP sử dụng số lượng tồn kho chung của sản phẩm. Nếu cần tồn kho theo từng cửa hàng, nhóm phải bổ sung mô hình chi nhánh/kho trong phạm vi thiết kế dữ liệu sau khi thống nhất.
5. Người dùng có thiết bị hỗ trợ trình duyệt hiện đại và kết nối Internet; chức năng PWA yêu cầu chạy trên HTTPS hoặc localhost để cài đặt Service Worker.
6. Hệ thống sử dụng Next.js cho giao diện, NestJS cho API, PostgreSQL và Prisma cho truy cập dữ liệu. Các thành viên tích hợp thông qua nhánh Git và Pull Request.
7. Các dịch vụ bên ngoài như cổng thanh toán phải có tài khoản/cấu hình sandbox hoặc hợp đồng tích hợp trước khi chạy kiểm thử giao dịch thực tế.

## 5. Rủi ro và hướng giảm thiểu

| Rủi ro | Ảnh hưởng | Hướng giảm thiểu |
|---|---|---|
| Hai yêu cầu đặt cùng sản phẩm khi tồn kho thấp | Có thể bán vượt tồn kho | Kiểm tra và cập nhật tồn kho trong cùng transaction ở backend; kiểm thử tình huống đồng thời |
| Giá Size/Topping giữa UI và backend không đồng nhất | Sai tổng tiền hoặc tranh chấp giá | Chốt bảng giá/phụ thu; backend là nguồn tính tiền cuối cùng; UI không được tự quyết định giá đơn hàng |
| Cổng thanh toán gửi lại callback/yêu cầu | Có thể ghi nhận thanh toán hoặc điểm thưởng nhiều lần | Dùng Idempotency-Key/mã giao dịch duy nhất và transaction ở backend |
| Các nhánh thành viên thay đổi schema/API không đồng bộ | Lỗi tích hợp, trễ tiến độ | Thống nhất contract, cập nhật tài liệu API, tạo PR nhỏ và kiểm tra trên nhánh tích hợp |
| CI hoặc môi trường DB chưa sẵn sàng | Không có minh chứng kiểm thử/không thể nghiệm thu | Thiết lập workflow và biến môi trường sớm; lưu log và ảnh chụp CI thực tế |
| Lộ thông tin tài khoản hoặc dữ liệu cá nhân | Ảnh hưởng bảo mật người dùng | Không commit secret; dùng biến môi trường; mã hóa mật khẩu; giới hạn quyền và kiểm tra đầu vào |
| Mạng không ổn định khi khách hàng xem menu | Trải nghiệm gián đoạn | Hiển thị Loading/Empty/Error rõ ràng; cung cấp thông báo thử tải lại; bổ sung cache tĩnh PWA phù hợp |

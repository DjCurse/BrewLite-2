# Nội dung báo tiến độ cho nhóm trưởng

Tui đã hoàn thiện phần source Như Ý trên bản ZIP hiện tại: tài liệu Task 1.1, API Products (danh sách có phân trang/tìm kiếm/lọc danh mục, chi tiết sản phẩm), seed dữ liệu chạy lặp, giao diện Menu và Chi tiết có chọn Size/Topping, Loading/Empty/Error, PWA, các test cho ProductsService/ProductsController và component state Menu. Tui cũng chuẩn bị nội dung LaTeX cho mục 1.1 và kết quả MVP Sprint 1.

Có 4 điểm cần nhóm phối hợp trước khi có thể báo hoàn tất nghiệm thu:

1. **Khang:** file `.github/workflows/ci.yml` trong ZIP đang rỗng (0 byte), nên tui chưa thể tạo minh chứng PR CI fail/pass. Nhờ Khang hoàn thiện workflow Install → Lint → Unit Test → Build rồi báo tui nhánh/PR để chạy và chụp kết quả.
2. **Thanh Tuấn:** schema `Product` và migration đã có trong ZIP, tui giữ nguyên các cột để tránh xung đột. Nhờ Tuấn xác nhận schema/migration Product trên nhánh tích hợp đã chốt trước khi migrate database nhóm.
3. **Huyền T:** trang chi tiết hiện phát event `brewlite:product-selected` với `productId`, `productName`, `size`, `toppings`, `quantity`. Nhờ Huyền tích hợp event này vào `useCartStore` (hoặc gửi contract khác để tui chỉnh đồng bộ). Hiện tại chưa thể xác nhận lựa chọn đã được lưu vào giỏ vì module Cart chưa có trong ZIP.
4. **Repository/Overleaf:** GitHub integration hiện không đọc được `DjCurse/BrewLite-2` (404 và không có trong danh sách repo được cấp quyền), Overleaf project cũng không mở được trong phiên. Tui gửi bản ZIP source và các file `.tex`; cần cấp quyền GitHub/nhóm push branch PR, đồng thời ghép `.tex` vào Overleaf.

Lưu ý: môi trường hiện tại không cài được dependencies vì `registry.npmjs.org` lỗi DNS `EAI_AGAIN`; các test đã viết nhưng chưa xác nhận Pass. Cần chạy lại trên máy có npm hoạt động và Node đáp ứng yêu cầu version của lockfile.

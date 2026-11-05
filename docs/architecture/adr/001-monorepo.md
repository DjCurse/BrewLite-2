# ADR 001: Lựa chọn cấu trúc Monorepo

## Trạng thái
Đã chấp thuận

## Bối cảnh
Dự án BrewLite yêu cầu phát triển cả Frontend (Next.js) và Backend (NestJS) đồng thời bởi một nhóm gồm 5 thành viên. Việc quản lý mã nguồn, cấu hình CI/CD và tài liệu nếu tách thành nhiều kho chứa (multi-repo) sẽ gây khó khăn trong việc đồng bộ và theo dõi tiến độ.

## Quyết định
Chúng tôi quyết định sử dụng cấu trúc Monorepo để chứa toàn bộ mã nguồn của dự án trong một kho chứa duy nhất.

## Hệ quả
### Ưu điểm
* Quản lý tập trung: Dễ dàng theo dõi tiến độ, quản lý issue và PR.
* CI/CD thống nhất: Một pipeline duy nhất có thể chạy test và build cho cả hai ứng dụng.
* Chia sẻ code: Dễ dàng chia sẻ các interface/type chung giữa Frontend và Backend (nếu cần).
* Tài liệu tập trung: Tài liệu yêu cầu, thiết kế và kiến trúc được lưu cùng mã nguồn.

### Nhược điểm
* Kích thước repo tăng nhanh: Có thể làm chậm quá trình clone repository sau này.
* Xung đột code: Tăng khả năng xung đột (merge conflict) khi nhiều người cùng thao tác trên repo.

## Cấu trúc thư mục dự kiến
```text
brewlite_2/
├── apps/
│   ├── api/       # NestJS Backend
│   └── web/       # Next.js Frontend
├── docs/          # Tài liệu dự án (Yêu cầu, UML, ADR)
├── tests/         # Kịch bản kiểm thử E2E
├── .github/
│   └── workflows/ # CI/CD Pipeline
└── docker-compose.yml
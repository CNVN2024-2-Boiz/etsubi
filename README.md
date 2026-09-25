<div align="center">

<img src="assets/banner.png" alt="Etsubi Banner" width="100%" />

# Etsubi (越日) — Diễn đàn Giao lưu Văn hóa Việt - Nhật

*Nền tảng diễn đàn kết nối, chia sẻ kiến thức và giao lưu văn hóa Việt – Nhật.*

</div>

______________________________________________________________________

## Giới thiệu

Etsubi là diễn đàn trực tuyến tạo không gian mở cho cộng đồng người Việt và người Nhật
giao lưu văn hóa, học hỏi ngôn ngữ và chia sẻ trải nghiệm đời sống. Tên gọi do nhóm tự
ghép từ **Etsu** (越 - Việt) và **bi** (lấy từ 日 - Nhật).

Đây là đồ án kết thúc môn **Internet và Công nghệ web**. Frontend là trọng tâm của môn học,
đồng thời nhóm đầu tư thêm vào toàn bộ hệ thống:

- **Trải nghiệm người dùng:** tự động dịch bài viết / bình luận song ngữ Việt - Nhật,
  tích hợp Google Maps để xem địa điểm văn hóa.
- **Kiến trúc phân tầng:** tách bạch Presentation - Business Logic - Infrastructure,
  chi tiết ở mục [Kiến trúc hệ thống](#ki%E1%BA%BFn-tr%C3%BAc-h%E1%BB%87-th%E1%BB%91ng).
- **Backend viết bằng Rust:** tận dụng hệ thống kiểu và cơ chế ownership
  để xử lý phân quyền và dữ liệu an toàn.

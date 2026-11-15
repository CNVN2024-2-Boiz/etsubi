/** Cờ năng lực giúp giao diện giữ đủ bố cục mà không gọi API chưa tồn tại. */
// Khi backend làm xong từng hợp đồng trong HANDOFF.md, đổi cờ tương ứng thành true.
export const backendSupports = {
  featuredPosts: false,
  recommendations: false,
  postStats: false,
  // Backend đã phát hành GET /posts/popular ngày 2026-11-14 (chạy đúng).
  popularSort: true,
  // GET /my/following/posts đã chạy từ upstream 8fee464 (route đặt trước /my/following/{user_id}).
  followingFeed: true,
  bookmarkState: false,
  autoTranslateFeed: false,
  userHandle: false,
  // Trang đọc bài: bài liên quan, thông tin địa điểm và tác giả nhúng trong bình luận.
  relatedPosts: false,
  postPlace: false,
  commentAuthors: false,
  // Diễn đàn: đính kèm ảnh/tệp và thăm dò trong ô viết bài.
  postAttachments: false,
  postPolls: false,
  // Hỗ trợ: gửi yêu cầu hỗ trợ và báo cáo vi phạm từ trang Hỗ trợ.
  supportTickets: false,
  contentReports: false,
  // Mod/Admin: đọc bài ở mọi trạng thái (ẩn, đã xoá) để mở lại trang đọc bài.
  manageGetPost: false,
};

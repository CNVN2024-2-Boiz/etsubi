/** Cờ năng lực giúp giao diện giữ đủ bố cục mà không gọi API chưa tồn tại. */
// Khi backend làm xong từng hợp đồng trong HANDOFF.md, đổi cờ tương ứng thành true.
export const backendSupports = {
  // GET /posts/highlight trả top 12 cho khối Bài viết nổi bật ở Trang chủ.
  featuredPosts: true,
  // GET /posts/{id}/comments/count cho số bình luận thật trên thẻ bài.
  postStats: true,
  // Backend đã phát hành GET /posts/popular ngày 2026-11-14 (chạy đúng).
  popularSort: true,
  // GET /my/following/posts đã chạy từ upstream 8fee464 (route đặt trước /my/following/{user_id}).
  followingFeed: true,
  bookmarkState: false,
  autoTranslateFeed: false,
  // users đã tách displayname và username duy nhất từ upstream 65c7acd.
  userHandle: true,
  // Trang đọc bài: bài liên quan, thông tin địa điểm và tác giả nhúng trong bình luận.
  relatedPosts: false,
  postPlace: false,
  commentAuthors: false,
  // Thăm dò còn hoãn; ảnh HTTPS nằm trực tiếp trong content.
  postPolls: false,
  // Mod/Admin: đọc bài ở mọi trạng thái (ẩn, đã xoá) để mở lại trang đọc bài.
  manageGetPost: false,
};

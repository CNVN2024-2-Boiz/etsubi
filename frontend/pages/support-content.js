/**
 * Nội dung tĩnh của trang Hỗ trợ: tám chủ đề, câu hỏi thường gặp và quy tắc cộng đồng.
 * Nội dung do nhóm viết, mô tả đúng tính năng hiện có của Etsubi (không phải dữ liệu từ API).
 */

/* Tám chủ đề của lưới "Chọn chủ đề bạn cần hỗ trợ"; icon là tên một biểu tượng Lucide vẽ trong support.js. */
export const topics = [
  { id: 'account', icon: 'user', title: 'Tài khoản & Đăng ký', desc: 'Đăng ký, đăng nhập, quên mật khẩu và cập nhật hồ sơ cá nhân.' },
  { id: 'posting', icon: 'pen', title: 'Đăng bài & Bình luận', desc: 'Soạn bài, gắn chủ đề, bình luận, chỉnh sửa hoặc xoá nội dung của bạn.' },
  { id: 'translate', icon: 'languages', title: 'Dịch & Ngôn ngữ', desc: 'Dịch bài viết, bình luận và đổi ngôn ngữ giao diện Việt – Nhật – Anh.' },
  { id: 'follow', icon: 'users', title: 'Theo dõi & Kết nối', desc: 'Theo dõi thành viên, quản lý người theo dõi và các bài đã lưu.' },
  { id: 'search', icon: 'tag', title: 'Tìm kiếm & Tag', desc: 'Tìm bài theo từ khoá, lọc nhiều tag cùng lúc và dùng phím tắt.' },
  { id: 'places', icon: 'map-pin', title: 'Địa điểm văn hoá', desc: 'Xem địa điểm gắn với bài viết và mở bản đồ để tìm đường.' },
  { id: 'rules', icon: 'shield', title: 'Quy tắc & Báo cáo', desc: 'Quy tắc cộng đồng, báo cáo vi phạm và cách đội kiểm duyệt xử lý.' },
  { id: 'privacy', icon: 'lock', title: 'Quyền riêng tư & Bảo mật', desc: 'Phiên đăng nhập, đăng xuất khỏi mọi thiết bị và bảo vệ tài khoản.' },
];

/*
 * Câu hỏi thường gặp. popular là thứ tự hiện mặc định (6 câu như Figma), null thì chỉ hiện khi
 * chọn chủ đề hoặc tìm kiếm.
 */
export const faqs = [
  { topic: 'translate', popular: 1, q: 'Làm sao để dịch một bài viết?', a: 'Mở bài viết và bấm "Dịch bài viết". Bản dịch sang ngôn ngữ giao diện của bạn sẽ thay cho bản gốc; bấm "Xem bản gốc" để quay lại. Ở từng bình luận, bấm "Dịch" để xem bản dịch hoặc "Bản gốc" để quay lại. Bạn cần đăng nhập để dùng chức năng dịch.' },
  { topic: 'posting', popular: 2, q: 'Vì sao mình không bình luận được ở một bài viết?', a: 'Tác giả hoặc đội kiểm duyệt có thể đã khoá bình luận của bài đó; khi đó ô viết bình luận được thay bằng thông báo. Nếu tài khoản của bạn đang bị tạm khoá chức năng viết, bạn vẫn đọc được bài nhưng chưa bình luận được cho đến hết thời hạn.' },
  { topic: 'search', popular: 3, q: 'Làm sao để lọc bài viết theo nhiều tag cùng lúc?', a: 'Ở trang Tìm kiếm, bấm nút Tag và chọn nhiều tag; kết quả chỉ gồm những bài có đủ tất cả tag đã chọn. Bấm vào một tag ở bất kỳ bài viết nào cũng mở trang Tìm kiếm với tag đó.' },
  { topic: 'rules', popular: 4, q: 'Tài khoản bị tạm khoá chức năng viết thì còn làm được gì?', a: 'Bạn vẫn đọc bài viết và bình luận của mọi người. Các thao tác ghi như đăng bài, bình luận, thả cảm xúc, lưu bài hay theo dõi sẽ bị chặn đến hết thời hạn ghi trong thông báo màu hồng ở đầu trang.' },
  { topic: 'rules', popular: 5, q: 'Ai có quyền ẩn hoặc xoá bài viết của mình?', a: 'Bạn có thể xoá bài và bình luận của chính mình. Điều phối viên và quản trị viên có thể ẩn bài hoặc bình luận vi phạm quy tắc cộng đồng; nội dung bị ẩn không còn hiện với thành viên khác.' },
  { topic: 'translate', popular: 6, q: 'Làm sao để đổi ngôn ngữ giao diện sang tiếng Nhật?', a: 'Bấm huy hiệu ngôn ngữ (VI) trên thanh điều hướng để chuyển lần lượt VI → JA → EN. Lựa chọn được lưu trên trình duyệt của bạn; giao diện tiếng Nhật đầy đủ đang được nhóm hoàn thiện.' },
  { topic: 'account', popular: null, q: 'Làm sao để tạo tài khoản Etsubi?', a: 'Bấm "Đăng nhập" ở góc phải thanh điều hướng rồi chọn "Đăng ký". Nhập họ tên, email và mật khẩu từ 8 ký tự, sau đó hoàn tất hồ sơ: ảnh đại diện, trường học và ngôn ngữ mẹ đẻ.' },
  { topic: 'account', popular: null, q: 'Mình có thể đăng nhập bằng tên người dùng không?', a: 'Hiện tại Etsubi chỉ hỗ trợ đăng nhập bằng email và mật khẩu đã đăng ký.' },
  { topic: 'account', popular: null, q: 'Quên mật khẩu thì làm sao?', a: 'Chức năng đặt lại mật khẩu qua email đang được phát triển. Trong lúc chờ, hãy gửi email tới contact@etsubi.vn từ địa chỉ email bạn đã dùng để đăng ký.' },
  { topic: 'posting', popular: null, q: 'Làm sao để đăng bài mới?', a: 'Vào Diễn đàn và bấm vào ô "bạn đang nghĩ gì?". Nhập nội dung và tiêu đề, chọn chủ đề phù hợp rồi bấm "Đăng". Bài mới xuất hiện ở đầu tab "Mới nhất".' },
  { topic: 'posting', popular: null, q: 'Làm sao để xoá bình luận của mình?', a: 'Ở bình luận của bạn, bấm "Xoá" rồi bấm "Xác nhận xoá". Bình luận đã xoá không hiện với người khác nữa.' },
  { topic: 'translate', popular: null, q: 'Vì sao nút Dịch báo dịch vụ chưa sẵn sàng?', a: 'Máy chủ dịch đang tạm ngưng hoặc chưa được cấu hình. Bạn hãy thử lại sau ít phút; bản gốc của bài vẫn đọc được bình thường.' },
  { topic: 'follow', popular: null, q: 'Làm sao để theo dõi một thành viên?', a: 'Mở một bài viết của họ và bấm "Theo dõi" ở thẻ "Về tác giả" bên phải. Bấm lần nữa để bỏ theo dõi.' },
  { topic: 'follow', popular: null, q: 'Bài viết đã lưu nằm ở đâu?', a: 'Bấm biểu tượng dấu trang ở bài viết để lưu. Danh sách bài đã lưu sẽ nằm trong trang Hồ sơ của bạn.' },
  { topic: 'search', popular: null, q: 'Có phím tắt nào để tìm nhanh không?', a: 'Nhấn phím "/" ở bất kỳ trang nào để đưa con trỏ vào ô tìm kiếm. Kết quả chỉ hiện khi bạn nhấn Enter hoặc bấm "Tìm kiếm".' },
  { topic: 'places', popular: null, q: 'Thẻ "Địa điểm văn hoá" ở bài viết là gì?', a: 'Khi bài viết có gắn toạ độ, trang đọc bài hiện thẻ bản đồ ở cột bên phải. Bấm "Mở trong Maps" để xem vị trí và chỉ đường trên Google Maps.' },
  { topic: 'rules', popular: null, q: 'Làm sao để báo cáo nội dung vi phạm?', a: 'Bấm "Báo cáo vi phạm" trong thẻ "Vẫn cần trợ giúp?", dán đường dẫn bài viết hoặc bình luận và mô tả vấn đề. Đội kiểm duyệt sẽ xem xét theo quy tắc cộng đồng.' },
  { topic: 'privacy', popular: null, q: 'Làm sao để đăng xuất khỏi mọi thiết bị?', a: 'Khi bạn đăng xuất, mọi phiên đăng nhập của tài khoản trên các thiết bị khác cũng hết hiệu lực. Hãy đăng xuất nếu nghi ngờ người khác đang dùng tài khoản của bạn.' },
  { topic: 'privacy', popular: null, q: 'Phiên đăng nhập kéo dài bao lâu?', a: 'Nếu chọn "Ghi nhớ đăng nhập", phiên được giữ tối đa 24 giờ trên trình duyệt đó; nếu không chọn, phiên kết thúc khi bạn đóng thẻ trình duyệt.' },
];

/* Bốn quy tắc ngắn trong thẻ "Quy tắc cộng đồng" (theo Figma). */
export const rules = [
  'Tôn trọng mọi thành viên, không phân biệt quốc tịch hay trình độ ngôn ngữ.',
  'Không spam, quảng cáo hoặc đăng nội dung trùng lặp.',
  'Ghi rõ nguồn khi chia sẻ tài liệu và hình ảnh.',
  'Dùng nút Báo cáo thay vì tranh cãi trong bình luận.',
];

/* Từ khoá phổ biến dưới ô tìm kiếm; bấm vào sẽ điền và tìm ngay. */
export const popularQueries = ['Đăng ký tài khoản', 'Dịch bài viết', 'Báo cáo vi phạm', 'Lọc theo tag'];

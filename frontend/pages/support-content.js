/**
 * Nội dung tĩnh của trang Hỗ trợ: tám chủ đề, câu hỏi thường gặp và quy tắc cộng đồng.
 * Nội dung do nhóm viết, mô tả đúng tính năng hiện có của Etsubi (không phải dữ liệu từ API).
 */
import { t } from '/utils/i18n.js';

/* Tám chủ đề của lưới "Chọn chủ đề bạn cần hỗ trợ"; icon là tên một biểu tượng Lucide vẽ trong support.js. */
export const topics = [
  { id: 'account', icon: 'user', title: t('Tài khoản & Đăng ký'), desc: t('Đăng ký, đăng nhập, quên mật khẩu và cập nhật hồ sơ cá nhân.') },
  { id: 'posting', icon: 'pen', title: t('Đăng bài & Bình luận'), desc: t('Soạn bài, gắn chủ đề, bình luận, chỉnh sửa hoặc xoá nội dung của bạn.') },
  { id: 'translate', icon: 'languages', title: t('Dịch & Ngôn ngữ'), desc: t('Dịch bài viết, bình luận và đổi ngôn ngữ giao diện Việt – Nhật – Anh.') },
  { id: 'follow', icon: 'users', title: t('Theo dõi & Kết nối'), desc: t('Theo dõi thành viên, quản lý người theo dõi và các bài đã lưu.') },
  { id: 'search', icon: 'tag', title: t('Tìm kiếm & Tag'), desc: t('Tìm bài theo từ khoá, lọc nhiều tag cùng lúc và dùng phím tắt.') },
  { id: 'places', icon: 'map-pin', title: t('Địa điểm văn hoá'), desc: t('Xem địa điểm gắn với bài viết và mở bản đồ để tìm đường.') },
  { id: 'rules', icon: 'shield', title: t('Quy tắc cộng đồng'), desc: t('Quy tắc cộng đồng và cách đội kiểm duyệt xử lý nội dung.') },
];

/*
 * Câu hỏi thường gặp. popular là thứ tự hiện mặc định (6 câu như Figma), null thì chỉ hiện khi
 * chọn chủ đề hoặc tìm kiếm.
 */
export const faqs = [
  { topic: 'translate', popular: 1, q: t('Làm sao để dịch một bài viết?'), a: t('Mở bài viết và bấm "Dịch bài viết". Bản dịch sang ngôn ngữ mẹ đẻ trong hồ sơ của bạn sẽ thay cho bản gốc; bấm "Xem bản gốc" để quay lại. Ở từng bình luận, mở menu ⋮ và chọn "Dịch bình luận" hoặc "Xem bản gốc" để quay lại. Bạn cần đăng nhập để dùng chức năng dịch.') },
  { topic: 'posting', popular: 2, q: t('Vì sao mình không bình luận được ở một bài viết?'), a: t('Tác giả hoặc đội kiểm duyệt có thể đã khoá bình luận của bài đó; khi đó ô viết bình luận được thay bằng thông báo. Nếu tài khoản của bạn đang bị tạm khoá chức năng viết, bạn vẫn đọc được bài nhưng chưa bình luận được cho đến hết thời hạn.') },
  { topic: 'search', popular: 3, q: t('Làm sao để lọc bài viết theo nhiều tag cùng lúc?'), a: t('Ở trang Tìm kiếm, bấm nút Tag và chọn nhiều tag; kết quả chỉ gồm những bài có đủ tất cả tag đã chọn. Bấm vào một tag ở bất kỳ bài viết nào cũng mở trang Tìm kiếm với tag đó.') },
  { topic: 'rules', popular: 4, q: t('Tài khoản bị tạm khoá chức năng viết thì còn làm được gì?'), a: t('Bạn vẫn đọc bài viết và bình luận của mọi người. Các thao tác ghi như đăng bài, bình luận, thả cảm xúc, lưu bài hay theo dõi sẽ bị chặn đến hết thời hạn ghi trong thông báo màu hồng ở đầu trang.') },
  { topic: 'rules', popular: 5, q: t('Ai có quyền ẩn hoặc xoá bài viết của mình?'), a: t('Bạn có thể xoá bài và bình luận của chính mình. Điều phối viên và quản trị viên có thể ẩn bài hoặc bình luận vi phạm quy tắc cộng đồng; nội dung bị ẩn không còn hiện với thành viên khác.') },
  { topic: 'translate', popular: 6, q: t('Làm sao để đổi ngôn ngữ giao diện sang tiếng Nhật?'), a: t('Bấm nút ngôn ngữ trên thanh điều hướng rồi chọn 日本語, hoặc vào Cài đặt › Giao diện. Lựa chọn được lưu trên trình duyệt của bạn và không làm thay đổi ngôn ngữ mẹ đẻ trong hồ sơ.') },
  { topic: 'account', popular: null, q: t('Làm sao để tạo tài khoản Etsubi?'), a: t('Bấm "Đăng nhập" ở góc phải thanh điều hướng rồi chọn "Đăng ký". Nhập họ tên, email và mật khẩu từ 8 ký tự, sau đó hoàn tất hồ sơ: ảnh đại diện, trường học và ngôn ngữ mẹ đẻ.') },
  { topic: 'account', popular: null, q: t('Mình có thể đăng nhập bằng tên người dùng không?'), a: t('Hiện tại Etsubi chỉ hỗ trợ đăng nhập bằng email và mật khẩu đã đăng ký.') },
  { topic: 'account', popular: null, q: t('Quên mật khẩu thì làm sao?'), a: t('Bấm "Quên mật khẩu?" ở trang Đăng nhập rồi nhập email đã đăng ký. Etsubi gửi một link đặt lại mật khẩu, dùng được một lần trong 30 phút. Không thấy mail thì xem thư mục Spam, hoặc gửi email tới contact@etsubi.net.') },
  { topic: 'posting', popular: null, q: t('Làm sao để đăng bài mới?'), a: t('Vào Diễn đàn và bấm vào ô "bạn đang nghĩ gì?". Nhập nội dung và tiêu đề, chọn chủ đề phù hợp rồi bấm "Đăng". Bài mới xuất hiện ở đầu tab "Mới nhất".') },
  { topic: 'posting', popular: null, q: t('Làm sao để xoá bình luận của mình?'), a: t('Ở bình luận của bạn, mở menu ⋮, chọn "Xoá bình luận…", rồi mở lại menu và bấm "Xác nhận xoá". Bình luận đã xoá không hiện với người khác nữa.') },
  { topic: 'translate', popular: null, q: t('Vì sao nút Dịch báo dịch vụ chưa sẵn sàng?'), a: t('Máy chủ dịch đang tạm ngưng hoặc chưa được cấu hình. Bạn hãy thử lại sau ít phút; bản gốc của bài vẫn đọc được bình thường.') },
  { topic: 'follow', popular: null, q: t('Làm sao để theo dõi một thành viên?'), a: t('Mở một bài viết của họ và bấm "Theo dõi" ở thẻ "Về tác giả" bên phải. Bấm lần nữa để bỏ theo dõi.') },
  { topic: 'follow', popular: null, q: t('Bài viết đã lưu nằm ở đâu?'), a: t('Bấm biểu tượng dấu trang ở bài viết để lưu. Danh sách bài đã lưu sẽ nằm trong trang Hồ sơ của bạn.') },
  { topic: 'search', popular: null, q: t('Có phím tắt nào để tìm nhanh không?'), a: t('Nhấn phím "/" ở bất kỳ trang nào để đưa con trỏ vào ô tìm kiếm. Kết quả chỉ hiện khi bạn nhấn Enter hoặc bấm "Tìm kiếm".') },
  { topic: 'places', popular: null, q: t('Thẻ "Địa điểm văn hoá" ở bài viết là gì?'), a: t('Khi bài viết có gắn toạ độ, trang đọc bài hiện thẻ bản đồ ở cột bên phải. Bấm "Mở trong Maps" để xem vị trí và chỉ đường trên Google Maps.') },
  { topic: 'rules', popular: null, q: t('Gặp nội dung vi phạm thì làm sao?'), a: t('Đăng nhập rồi mở menu ⋯ của bài viết hoặc bình luận, hoặc nút ⋯ cạnh "Theo dõi" trên trang cá nhân, và chọn mục Báo cáo. Chọn lý do, viết thêm mô tả nếu cần rồi bấm "Gửi báo cáo". Báo cáo được gửi riêng tới đội kiểm duyệt; người bị báo cáo không biết ai đã gửi.') },
];

/* Bốn quy tắc ngắn trong thẻ "Quy tắc cộng đồng" (theo Figma). */
export const rules = [
  t('Tôn trọng mọi thành viên, không phân biệt quốc tịch hay trình độ ngôn ngữ.'),
  t('Không spam, quảng cáo hoặc đăng nội dung trùng lặp.'),
  t('Ghi rõ nguồn khi chia sẻ tài liệu và hình ảnh.'),
  t('Gặp nội dung vi phạm, bấm ⋯ rồi chọn mục Báo cáo để gửi cho đội kiểm duyệt.'),
];

/* Từ khoá phổ biến dưới ô tìm kiếm; bấm vào sẽ điền và tìm ngay. */
export const popularQueries = [t('Đăng ký tài khoản'), t('Dịch bài viết'), t('Lọc theo tag')];

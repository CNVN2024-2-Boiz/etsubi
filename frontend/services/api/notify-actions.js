/**
 * Backend yêu cầu hai request: lưu thao tác trước, gửi thông báo sau, không tự sinh thông báo.
 * Thao tác                         | Loại          | Người nhận và lý do
 * Theo dõi                        | follow        | Người vừa được theo dõi.
 * Thêm hoặc đổi cảm xúc            | reaction      | Tác giả bài biết cảm xúc mới; bỏ cảm xúc không gửi.
 * Bình luận gốc                    | comment       | Tác giả bài biết có thảo luận mới.
 * Trả lời bình luận                | reply         | Tác giả bình luận cha biết có phản hồi.
 * Đăng bài và gắn tag xong         | post_created  | Người theo dõi, qua notify-followers một lần khi tạo bài.
 * Staff cấm viết có thời hạn       | muted         | Thành viên biết thời hạn; gỡ cấm viết không gửi.
 * Staff cấm tài khoản              | banned        | Thành viên biết tài khoản bị cấm; gỡ cấm không gửi.
 * Staff khoá bình luận bài khác    | post_locked   | Tác giả biết bình luận bị khoá; mở khoá không gửi.
 * Staff ẩn hoặc xoá bài khác       | post_removed  | Tác giả biết bài nào bị gỡ; hiện lại không gửi.
 * Đăng hoặc sửa nội dung có @tên   | mention       | Người được nhắc, tối đa 10 tên mỗi lần.
 * Mọi loại đều bỏ qua chính mình; lỗi phụ được bắt kín để thao tác đã lưu vẫn thành công.
 */
import { request } from '/services/api/client.js';
import { createMentions, createNotification, notifyFollowers } from '/services/api/notifications.js';
import { getCachedUser, fetchCurrentUser } from '/utils/auth.js';
import { listMentions, MENTION_LIMIT } from '/utils/mention.js';

// Các thông báo quản trị chỉ được gửi khi hồ sơ hiện tại có vai trò staff.
const staffKinds = new Set(['muted', 'banned', 'post_locked', 'post_removed']);

/** Gửi thông báo sau thành công; hàm lấy dữ liệu cũng nằm trong try để lỗi bổ sung không lọt ra trang. */
export async function notifyAfter(kind, details) {
  try {
    const actor = getCachedUser() || await fetchCurrentUser();
    // Thiếu phiên hoặc không đủ vai trò thì không phát sinh yêu cầu thông báo.
    if (!actor || (staffKinds.has(kind) && !['moderator', 'admin'].includes(actor.role))) {
      return;
    }
    const notification = typeof details === 'function' ? await details(actor) : details;
    // Không gửi cho chính mình và không suy đoán người nhận khi dữ liệu bị thiếu.
    if (!notification?.targetUserId || notification.targetUserId === actor.id) {
      return;
    }
    await createNotification({ kind, ...notification });
  } catch {
    // Thông báo là tác dụng phụ: không báo lỗi, ghi console hay đảo ngược thao tác chính.
  }
}

/** Gửi thông báo cho các tên được nhắc sau khi lưu bài hoặc bình luận; lỗi không làm mất nội dung đã lưu. */
export async function notifyMentions(target, content) {
  try {
    const names = listMentions(content);
    if (!names.length) {
      return;
    }
    const actor = getCachedUser() || await fetchCurrentUser();
    const usernames = names.filter(name => name !== actor?.username).slice(0, MENTION_LIMIT);
    if (actor && usernames.length) {
      await createMentions({ ...target, usernames });
    }
  } catch {
    // Nội dung đã lưu thành công, thiếu thông báo không được báo lỗi cho người viết.
  }
}

/** Bổ sung tác giả một lần nếu nơi gọi chưa có; lấy cả tiêu đề trước khi xoá vì sau đó GET sẽ trả 404. */
export async function getNotificationPost(postId, { authorId, title } = {}, needsTitle = false) {
  try {
    // Dùng dữ liệu trang đang có để tránh yêu cầu thừa và tôn trọng giới hạn tốc độ.
    if (!authorId || (needsTitle && title === undefined)) {
      const post = await request('/posts/' + encodeURIComponent(postId));
      return { authorId: authorId ?? post.author_id, title: title ?? post.title };
    }
  } catch {
    // Không tải được bài thì giữ thông tin đã có; việc thiếu người nhận chỉ làm bỏ qua thông báo.
  }
  return { authorId, title };
}

/** Dùng chung liên kết và cách tìm tác giả cho cảm xúc, bình luận và quản trị bài viết. */
export function notifyPostAfter(kind, postId, { authorId, title, context } = {}) {
  // Trì hoãn đọc bài vào notifyAfter để kiểm tra staff trước và bắt kín mọi lỗi phụ.
  return notifyAfter(kind, async () => {
    const post = await getNotificationPost(postId, { authorId, title }, kind === 'post_removed');
    return {
      targetUserId: post.authorId,
      link: '/posts/' + encodeURIComponent(postId),
      context: kind === 'post_removed' ? { ...context, post_title: post.title } : context,
    };
  });
}

/** Gọi đúng một lần từ createPost sau vòng gắn tag; backend kiểm tra tác giả và chống trùng người nhận. */
export async function notifyPostFollowers(post) {
  try {
    const actor = getCachedUser() || await fetchCurrentUser();
    // Chỉ tác giả của bài vừa tạo được gửi thông báo hàng loạt cho người theo dõi.
    if (actor && post?.id && post.author_id === actor.id) {
      await notifyFollowers(post.id);
    }
  } catch {
    // Bài đã đăng thành công vẫn được trả về khi máy chủ thông báo gặp lỗi.
  }
}

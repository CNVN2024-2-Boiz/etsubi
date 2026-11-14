/** Kiểm tra service bằng request giả, không chạy máy chủ và không gửi dữ liệu ra mạng.
 * Chạy: node --experimental-vm-modules frontend/dev/tests/notification-actions.mjs
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Trạng thái giả được đặt lại từng ca để kiểm tra độc lập vai trò, lỗi và thứ tự request.
let actor;
let calls;
let failNotification;
let failAction;
let failRead;
let failedTag;
let oldEmoji;
let consoleCalls = 0;
let passed = 0;
const frontendRoot = new URL('../../', import.meta.url);

/** Khôi phục hồ sơ staff và dữ liệu mặc định trước mỗi ca kiểm tra. */
function reset() {
  actor = { id: 'me', role: 'moderator' };
  calls = [];
  failNotification = false;
  failAction = false;
  failRead = false;
  failedTag = null;
  oldEmoji = null;
}

/** Giả API theo dữ liệu hợp đồng, đồng thời giữ lại thứ tự và body để kiểm tra tác dụng phụ. */
async function request(path, options = {}) {
  const method = options.method || 'GET';
  calls.push({ path, method, ...options });
  const notification = path === '/notifications' || path.endsWith('/notify-followers');
  // Lỗi của request chính và request phụ được bật riêng để kiểm tra hai luồng thất bại.
  if ((notification && failNotification) || (!notification && method !== 'GET' && failAction)
    || (method === 'GET' && failRead) || path.endsWith('/tags/' + failedTag)) {
    throw new Error('Lỗi API giả');
  }
  // API cảm xúc có 404 khi chưa thả; các ca truyền previousEmoji không cần gọi nhánh này.
  if (path.endsWith('/reactions/me')) {
    if (oldEmoji === null) {
      throw Object.assign(new Error('Chưa thả cảm xúc'), { status: 404 });
    }
    return { emoji: oldEmoji };
  }
  if (path.endsWith('/reactions')) {
    return method === 'DELETE' ? null : { emoji: options.body.emoji };
  }
  if (path.endsWith('/comments') && method === 'GET') {
    return [{ id: 'parent', user_id: 'parent-author' }];
  }
  if (path === '/posts' && method === 'POST') {
    return { id: 'new-post', author_id: actor?.id, title: options.body.title };
  }
  if (method === 'DELETE' || path.includes('/tags/')) {
    return null;
  }
  if (method === 'GET' && ['/posts', '/posts/popular', '/posts/qa', '/my/following/posts'].includes(path)) {
    return [{ id: 'p', author_id: 'other' }];
  }
  return { id: 'p', author_id: 'other', title: 'Tiêu đề thật', ...options.body };
}

/** Đếm mọi lời gọi console của service để bảo đảm lỗi phụ được bắt kín. */
function recordConsole() {
  consoleCalls += 1;
}

// Nạp module thật qua VM, chỉ thay lớp request và phiên để tránh phụ thuộc trình duyệt hoặc mạng.
const context = vm.createContext({ console: { error: recordConsole, warn: recordConsole, log: recordConsole } });
const modules = new Map();
const client = new vm.SyntheticModule(['request'], function () {
  this.setExport('request', request);
}, { context });
const auth = new vm.SyntheticModule(['getCachedUser', 'fetchCurrentUser'], function () {
  // Hồ sơ trong bộ nhớ có thể rỗng để kiểm tra nhánh tải phiên dự phòng.
  this.setExport('getCachedUser', () => actor?.cached === false ? null : actor);
  this.setExport('fetchCurrentUser', async () => actor);
}, { context });
modules.set('/services/api/client.js', client);
modules.set('/utils/auth.js', auth);

/** Ánh xạ import tuyệt đối về frontend, dùng chung module để mô phỏng ES modules trên trình duyệt. */
async function link(specifier) {
  if (!modules.has(specifier)) {
    const source = await readFile(fileURLToPath(new URL(specifier.slice(1), frontendRoot)), 'utf8');
    modules.set(specifier, new vm.SourceTextModule(source, { context, identifier: specifier }));
  }
  return modules.get(specifier);
}

// Điểm vào chỉ gom các service cần kiểm tra; code nghiệp vụ vẫn là file thật trong services/api.
const entry = new vm.SourceTextModule(`
  import * as follows from '/services/api/follows.js';
  import * as reactions from '/services/api/reactions.js';
  import * as comments from '/services/api/comment.js';
  import * as manage from '/services/api/manage.js';
  import * as posts from '/services/api/posts.js';
  import { backendSupports } from '/services/api/capabilities.js';
  export { follows, reactions, comments, manage, posts, backendSupports };
`, { context });
await entry.link(link);
await entry.evaluate();
const { follows, reactions, comments, manage, posts, backendSupports } = entry.namespace;

/** Chạy từng ca có tên rõ ràng; lỗi assertion dừng script và cho biết hành vi nào chưa đạt. */
async function check(name, run) {
  reset();
  try {
    await run();
    passed += 1;
  } catch (error) {
    error.message = name + ': ' + error.message;
    throw error;
  }
}

/** Chọn request thông báo trực tiếp để so loại, người nhận, liên kết và context. */
function notifications() {
  return calls.filter(call => call.path === '/notifications');
}

// Mỗi ca mô tả một hành động, người nhận và dữ liệu bổ sung đúng theo hợp đồng backend.
const actions = [
  { name: 'follow', run: () => follows.followUser('other'), target: 'other', link: '/users/me' },
  { name: 'reaction', run: () => reactions.reactToPost('p', '❤️', { authorId: 'other', previousEmoji: null }),
    target: 'other', link: '/posts/p', context: { emoji: '❤️' } },
  { name: 'comment', run: () => comments.createComment('p', 'Nội dung', null, { postAuthorId: 'other' }),
    target: 'other', link: '/posts/p' },
  { name: 'reply', run: () => comments.createComment('p', 'Nội dung', 'parent', { parentAuthorId: 'parent-author' }),
    target: 'parent-author', link: '/posts/p' },
  { name: 'muted', run: () => manage.setUserMute('other', new Date('2030-01-01T00:00:00Z')),
    target: 'other', link: '/users/other', context: { muted_until: '2030-01-01T00:00:00.000Z' } },
  { name: 'banned', run: () => manage.setUserStatus('other', 'banned'), target: 'other', link: '/users/other' },
  { name: 'post_locked', run: () => comments.setCommentsLocked('p', true, { authorId: 'other' }),
    target: 'other', link: '/posts/p' },
  { name: 'post_removed', run: () => manage.setPostStatus('p', 'hidden', { authorId: 'other', title: 'Tiêu đề thật' }),
    target: 'other', link: '/posts/p', context: { post_title: 'Tiêu đề thật' } },
  { name: 'post_removed', run: () => posts.deletePost('p', { authorId: 'other', title: 'Tiêu đề thật' }),
    target: 'other', link: '/posts/p', context: { post_title: 'Tiêu đề thật' } },
];

// Kiểm tra request phụ luôn đứng sau thành công, không có GET thừa khi trang truyền đủ dữ liệu.
for (const action of actions) {
  await check(action.name + ' gửi đúng thông báo', async () => {
    await action.run();
    assert.equal(calls.length, 2);
    assert.equal(calls[1].path, '/notifications');
    assert.equal(calls[1].method, 'POST');
    const body = notifications()[0].body;
    assert.equal(body.kind, action.name);
    assert.equal(body.target_user_id, action.target);
    assert.equal(body.link, action.link);
    assert.deepEqual(JSON.parse(JSON.stringify(body.context ?? null)), action.context ?? null);
  });
  await check(action.name + ' không làm lỗi thao tác khi thông báo lỗi', async () => {
    failNotification = true;
    await action.run();
    assert.equal(notifications().length, 1);
  });
  await check(action.name + ' không gửi khi thao tác chính lỗi', async () => {
    failAction = true;
    await assert.rejects(action.run);
    assert.equal(notifications().length, 0);
  });
  await check(action.name + ' bỏ qua chính mình', async () => {
    actor.id = action.target;
    await action.run();
    assert.equal(notifications().length, 0);
  });
  // Chỉ các loại quản trị cần kiểm tra chặn thành viên thường và cho phép cả admin lẫn moderator.
  if (['muted', 'banned', 'post_locked', 'post_removed'].includes(action.name)) {
    await check(action.name + ' chặn người thường', async () => {
      actor.role = 'user';
      await action.run();
      assert.equal(notifications().length, 0);
    });
    await check(action.name + ' cho phép admin', async () => {
      actor.role = 'admin';
      await action.run();
      assert.equal(notifications().length, 1);
    });
  }
}

await check('gỡ bỏ không gửi thông báo', async () => {
  await follows.unfollowUser('other');
  await reactions.removeReaction('p');
  await manage.setUserMute('other', null);
  await manage.setUserStatus('other', 'active');
  await comments.setCommentsLocked('p', false, { authorId: 'other' });
  await manage.setPostStatus('p', 'published');
  assert.equal(notifications().length, 0);
});
await check('gửi lại cùng cảm xúc không báo trùng', async () => {
  await reactions.reactToPost('p', '❤️', { authorId: 'other', previousEmoji: '❤️' });
  assert.equal(notifications().length, 0);
});
await check('đổi cảm xúc có báo', async () => {
  await reactions.reactToPost('p', '❤️', { authorId: 'other', previousEmoji: '👍' });
  assert.equal(notifications().length, 1);
});
await check('thiếu cảm xúc cũ và tác giả chỉ đọc mỗi dữ liệu một lần', async () => {
  await reactions.reactToPost('p', '❤️');
  assert.equal(calls.filter(call => call.method === 'GET').length, 2);
  assert.equal(notifications()[0].body.target_user_id, 'other');
});
await check('thiếu tác giả bình luận cha chỉ tải danh sách một lần', async () => {
  await comments.createComment('p', 'Trả lời', 'parent');
  assert.equal(calls.filter(call => call.method === 'GET').length, 1);
  assert.equal(notifications()[0].body.target_user_id, 'parent-author');
});
await check('bình luận gốc thiếu tác giả tải bài một lần', async () => {
  await comments.createComment('p', 'Bình luận');
  assert.equal(calls.filter(call => call.method === 'GET').length, 1);
  assert.equal(notifications()[0].body.kind, 'comment');
});
await check('xoá lấy thông tin trước DELETE và không đọc sau đó', async () => {
  await posts.deletePost('p');
  assert.equal(calls.map(call => call.method).join(','), 'GET,DELETE,POST');
  assert.equal(notifications()[0].body.context.post_title, 'Tiêu đề thật');
});
await check('lỗi đọc dữ liệu phụ không làm lỗi bình luận hoặc xoá và không đọc xoá lần hai', async () => {
  failRead = true;
  await comments.createComment('p', 'Bình luận');
  calls = [];
  await posts.deletePost('p');
  assert.equal(calls.map(call => call.method).join(','), 'GET,DELETE');
  assert.equal(notifications().length, 0);
});
await check('lỗi đọc cảm xúc cũ không làm lỗi lưu cảm xúc', async () => {
  failRead = true;
  await reactions.reactToPost('p');
  assert.equal(calls.at(-1).method, 'POST');
  assert.equal(notifications().length, 0);
});
await check('tải phiên dự phòng vẫn gửi đúng người', async () => {
  actor.cached = false;
  await follows.followUser('other');
  assert.equal(notifications()[0].body.link, '/users/me');
});
await check('thiếu phiên không gửi thông báo', async () => {
  actor = null;
  await follows.followUser('other');
  assert.equal(notifications().length, 0);
});
await check('ẩn và khoá dùng phản hồi chính khi thiếu tác giả', async () => {
  await manage.setPostStatus('p', 'hidden');
  await comments.setCommentsLocked('p', true);
  assert.equal(calls.filter(call => call.method === 'GET').length, 0);
  assert.equal(notifications().length, 2);
});

// Kiểm tra xuất bản luôn gắn tag tuần tự trước một request fan-out, kể cả không chọn tag hay lỗi phụ.
for (const tagIds of [[], ['one', 'two']]) {
  await check('đăng bài rồi gắn tag trước fan-out', async () => {
    const post = await posts.createPost({ title: 'Bài mới', content: 'Nội dung' }, { tagIds });
    assert.equal(calls[0].path, '/posts');
    assert.equal(calls.at(-1).path, '/posts/new-post/notify-followers');
    assert.equal(calls.filter(call => call.path.endsWith('/notify-followers')).length, 1);
    assert.equal(calls.length, tagIds.length + 2);
    assert.equal(post.failedTagIds.length, 0);
  });
}
await check('lỗi tag và fan-out vẫn trả bài đã đăng cùng tag lỗi', async () => {
  failedTag = 'one';
  failNotification = true;
  const post = await posts.createPost({ title: 'Bài mới', content: 'Nội dung' }, { tagIds: ['one', 'two'] });
  assert.equal(post.id, 'new-post');
  assert.equal(post.failedTagIds.join(','), 'one');
  assert.equal(calls.at(-2).path, '/posts/new-post/tags/two');
  assert.equal(calls.at(-1).path, '/posts/new-post/notify-followers');
});
await check('đăng lỗi không gắn tag hoặc fan-out', async () => {
  failAction = true;
  await assert.rejects(() => posts.createPost({ title: 'Bài mới', content: 'Nội dung' }, { tagIds: ['one'] }));
  assert.equal(calls.length, 1);
});
await check('endpoint mới không gửi tham số phân trang và Search giữ hợp đồng cũ', async () => {
  await posts.listPosts({ sort: 'popular', limit: 5, offset: 10 });
  await posts.listFollowingFeed({ limit: 5, offset: 10 });
  await posts.listQuestionPosts();
  assert.equal(calls.map(call => call.path).join(','), '/posts/popular,/my/following/posts,/posts/qa');
  assert.ok(calls.every(call => call.query === undefined));
  await posts.searchPosts({ q: 'từ khoá', tagIds: ['tag'], limit: 10, offset: 20 });
  assert.equal(calls.at(-1).path, '/posts');
  assert.equal(calls.at(-1).query.q, 'từ khoá');
  assert.equal(calls.at(-1).query.tags, 'tag');
  assert.equal(calls.at(-1).query.offset, 20);
  assert.equal(calls.at(-1).query.sort, undefined);
  assert.equal(backendSupports.popularSort, true);
  assert.equal(backendSupports.followingFeed, true);
});

// Không có log lỗi trong bất kỳ ca nào; chỉ trình chạy kiểm tra in kết quả tổng hợp cuối cùng.
assert.equal(consoleCalls, 0);
console.log('Đã đạt ' + passed + ' ca kiểm tra notification và danh sách bài.');

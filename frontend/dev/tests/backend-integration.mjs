/** Kiểm tra phần nối backend đợt 11 bằng request giả, không cần máy chủ.
 * Chạy: node --experimental-vm-modules frontend/dev/tests/backend-integration.mjs
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Dữ liệu giả của từng ca: danh sách request đã gửi và phản hồi theo đường dẫn.
const frontendRoot = new URL('../../', import.meta.url);
let calls = [];
let responses = {};
let passed = 0;

/** Giả lớp mạng: ghi lại lời gọi, phản hồi là Error thì ném ra để mô phỏng lỗi API. */
async function request(path, options = {}) {
  calls.push({ path, method: options.method || 'GET', ...options });
  const response = responses[path];
  if (response instanceof Error) {
    throw response;
  }
  return response ?? { id: 'saved', ...options.body };
}

// Nạp service thật qua VM, chỉ thay lớp request và phiên đăng nhập.
const context = vm.createContext({ URL, URLSearchParams, console });
const modules = new Map();
modules.set('/services/api/client.js', new vm.SyntheticModule(['request'], function fakeClient() {
  this.setExport('request', request);
}, { context }));
modules.set('/utils/auth.js', new vm.SyntheticModule(['getCachedUser', 'fetchCurrentUser'], function fakeAuth() {
  this.setExport('getCachedUser', () => ({ id: 'me', username: 'chinh_toi', role: 'user' }));
  this.setExport('fetchCurrentUser', async () => ({ id: 'me', role: 'user' }));
}, { context }));

/** Ánh xạ import tuyệt đối về thư mục frontend, mỗi đường dẫn chỉ nạp một module. */
async function link(specifier) {
  if (!modules.has(specifier)) {
    const source = await readFile(fileURLToPath(new URL(specifier.slice(1), frontendRoot)), 'utf8');
    modules.set(specifier, new vm.SourceTextModule(source, { context, identifier: specifier }));
  }
  return modules.get(specifier);
}

const entry = new vm.SourceTextModule(`
  import * as posts from '/services/api/posts.js';
  import * as comments from '/services/api/comment.js';
  import * as notices from '/services/api/notifications.js';
  import * as mentions from '/utils/mention.js';
  import { makeExcerpt } from '/utils/text.js';
  import { backendSupports } from '/services/api/capabilities.js';
  export { posts, comments, notices, mentions, makeExcerpt, backendSupports };
`, { context });
await entry.link(link);
await entry.evaluate();
const { posts, comments, notices, mentions, makeExcerpt, backendSupports } = entry.namespace;

/** Chạy một ca có tên rõ ràng với dữ liệu giả sạch; lỗi assertion nói rõ hành vi chưa đạt. */
async function check(name, run) {
  calls = [];
  responses = {};
  try {
    await run();
    passed += 1;
  } catch (error) {
    error.message = name + ': ' + error.message;
    throw error;
  }
}

/** Tạo danh sách bài giả có mã p1, p2... theo khoảng hạng cho trước. */
function ranked(from, to) {
  return Array.from({ length: to - from + 1 }, (_, index) => ({ id: 'p' + (from + index) }));
}

/** Rút mã bài để so thứ tự danh sách dễ đọc. */
function ids(list) {
  return list.map(post => post.id).join(',');
}

const commentId = '0a1b2c3d-1111-4222-8333-abcdefabcdef';

await check('notificationHref nhận link bài và link hồ sơ', () => {
  assert.equal(notices.notificationHref('/posts/abc'), '/pages/post.html?id=abc');
  assert.equal(notices.notificationHref('/users/u1'), '/pages/profile/index.html?id=u1');
});
await check('notificationHref giữ #comment-{uuid} và chuẩn hoá chữ thường', () => {
  assert.equal(notices.notificationHref('/posts/abc#comment-' + commentId), '/pages/post.html?id=abc#comment-' + commentId);
  assert.equal(notices.notificationHref('/posts/abc#comment-' + commentId.toUpperCase()), '/pages/post.html?id=abc#comment-' + commentId);
});
await check('notificationHref từ chối mọi link sai định dạng', () => {
  const home = notices.notificationHref(null);
  for (const link of [
    '/posts/abc#comment-1', '/posts/abc#comment-' + commentId + 'x', '/posts/abc#other-' + commentId,
    '/posts/abc#comment-' + commentId + '#x', '/users/u1#comment-' + commentId, '/posts/abc?x=1', '/posts/a/b',
    'https://evil.example/posts/abc', '//evil.example/posts/abc', 'javascript:alert(1)', '/posts/', '', 42,
  ]) {
    assert.equal(notices.notificationHref(link), home, String(link));
  }
});

await check('thông báo đọc actor phẳng cho tên, chữ đầu và avatar', () => {
  const formatted = notices.formatNotification({
    kind: 'comment', message: 'minhanh commented on your post', actor_id: 'u1',
    actor_username: 'minhanh', actor_displayname: 'Minh Anh', actor_avatar_url: 'https://example.com/a.png',
  });
  assert.equal(formatted.actorName, 'Minh Anh');
  assert.equal(formatted.avatarUrl, 'https://example.com/a.png');
  assert.equal(notices.notificationText({ kind: 'comment', message: 'minhanh commented on your post', actor_username: 'minhanh' }),
    '@minhanh đã bình luận bài viết của bạn');
});
await check('thông báo cũ không có actor vẫn lấy tên trong message', () => {
  const formatted = notices.formatNotification({ kind: 'follow', message: 'legacy started following you' });
  assert.equal(formatted.actorName, 'legacy');
  assert.equal(formatted.avatarUrl, null);
});
await check('thông báo hệ thống không dùng avatar của người thực hiện', () => {
  const formatted = notices.formatNotification({ kind: 'banned', message: 'Your account has been banned', actor_avatar_url: 'https://example.com/a.png' });
  assert.equal(formatted.actorName, 'Quản trị viên');
  assert.equal(formatted.avatarUrl, null);
});
await check('kind mention có câu tiếng Việt', () => {
  assert.equal(notices.notificationText({ kind: 'mention', message: 'minhanh mentioned you', actor_displayname: 'Minh Anh' }), 'Minh Anh đã nhắc đến bạn');
  assert.equal(notices.notificationText({ kind: 'mention', message: 'minhanh mentioned you' }), 'minhanh đã nhắc đến bạn');
});

await check('ghép Phổ biến bỏ trùng, giữ thứ tự và tối đa 15 bài', () => {
  assert.equal(ids(posts.mergePopularPosts(ranked(1, 3), [{ id: 'p2' }, { id: 'p4' }])), 'p1,p2,p3,p4');
  assert.equal(posts.mergePopularPosts(ranked(1, 12), ranked(13, 20)).length, 15);
  assert.equal(ids(posts.mergePopularPosts(null, undefined)), '');
});
await check('Trang chủ lấy 3 bài cuối danh sách ghép', () => {
  assert.equal(ids(posts.homePopularPosts(ranked(1, 15))), 'p13,p14,p15');
  assert.equal(ids(posts.homePopularPosts(ranked(1, 12))), 'p10,p11,p12');
  assert.equal(ids(posts.homePopularPosts(ranked(1, 2))), 'p1,p2');
});
await check('nổi bật và tab Phổ biến dùng chung một lần tải highlight', async () => {
  responses = { '/posts/highlight': ranked(1, 12), '/posts/popular': ranked(13, 15) };
  assert.equal(backendSupports.featuredPosts, true);
  assert.equal((await posts.getFeaturedPosts()).length, 12);
  assert.equal(ids(await posts.listHomeFeed('popular', { limit: 3 })), 'p13,p14,p15');
  assert.equal((await posts.listPosts({ sort: 'popular' })).length, 15);
  assert.equal(calls.filter(call => call.path === '/posts/highlight').length, 1);
});

await check('số bình luận thật được nhớ ngắn, không gọi lặp cho cùng bài', async () => {
  responses = { '/posts/c1/comments/count': { count: 7 } };
  assert.equal(backendSupports.postStats, true);
  assert.equal((await posts.getPostStats('c1', { id: 'c1' })).comment_count, 7);
  assert.equal((await posts.getPostStats('c1', { id: 'c1' })).comment_count, 7);
  assert.equal(calls.length, 1);
});
await check('lỗi đếm bình luận giữ thẻ an toàn và lần sau được thử lại', async () => {
  responses = { '/posts/c2/comments/count': new Error('Lỗi API giả') };
  const stats = await posts.getPostStats('c2', { id: 'c2' });
  assert.equal(stats.comment_count, null);
  responses = { '/posts/c2/comments/count': { count: 2 } };
  assert.equal((await posts.getPostStats('c2', { id: 'c2' })).comment_count, 2);
});
await check('bài đã có comment_count thì không gọi thêm request', async () => {
  assert.equal((await posts.getPostStats('c3', { id: 'c3', comment_count: 4 })).comment_count, 4);
  assert.equal(calls.length, 0);
});

await check('sửa bài không đụng địa điểm vẫn gửi toạ độ hiện có', async () => {
  const post = { id: 'p', latitude: 35.5, longitude: 135.25 };
  await posts.updatePost('p', posts.buildPostEdit(post, { title: 'A', content: 'B' }));
  assert.equal(calls[0].body.latitude, 35.5);
  assert.equal(calls[0].body.longitude, 135.25);
});
await check('sửa bài đổi địa điểm gửi toạ độ mới', () => {
  const edit = posts.buildPostEdit({ latitude: 1, longitude: 2 }, { title: 'A', content: 'B', place: { latitude: 3, longitude: 4 } });
  assert.equal(edit.latitude, 3);
  assert.equal(edit.longitude, 4);
});
await check('chỉ khi chủ động gỡ mới bỏ toạ độ khỏi request', async () => {
  await posts.updatePost('p', posts.buildPostEdit({ latitude: 1, longitude: 2 }, { title: 'A', content: 'B', place: null }));
  assert.equal(Object.keys(calls[0].body).sort().join(','), 'content,title');
});

await check('đăng và sửa bình luận gửi kèm cặp toạ độ', async () => {
  await comments.createComment('p', 'Nội dung', null, { postAuthorId: 'me', latitude: 10.5, longitude: 106.5 });
  assert.equal(calls[0].body.latitude, 10.5);
  assert.equal(calls[0].body.longitude, 106.5);
  calls = [];
  await comments.updateComment('c', '<b>Sửa</b>', { latitude: 11, longitude: 107 });
  assert.equal(calls[0].body.latitude, 11);
  assert.equal(calls[0].body.longitude, 107);
});
await check('bình luận không có địa điểm không gửi trường toạ độ', async () => {
  await comments.updateComment('c', 'Sửa');
  assert.equal(Object.keys(calls[0].body).join(','), 'content');
});

/** Lấy các lần gọi API nhắc tên để so nội dung gửi đi. */
function mentionCalls() {
  return calls.filter(call => call.path === '/notifications/mention');
}
const names = html => mentions.listMentions(html).join(',');

await check('nhận @username đầu từ, kể cả có dấu câu hoặc chữ Nhật viết liền', () => {
  assert.equal(names('<p>Chào @minhanh, và @lan_huong.</p>'), 'minhanh,lan_huong');
  assert.equal(names('Hỏi (@minhanh) nhé @kenji_01! @yuki_ngさん'), 'minhanh,kenji_01,yuki_ng');
  assert.equal(names('@minhanh @minhanh'), 'minhanh');
});
await check('không nhận email, tên sai định dạng hoặc tên cũ có dấu chấm', () => {
  assert.equal(names('mail a@gmail.com, @ab, @MinhAnh, @minh-anh'.replace('@minh-anh', '')), '');
  assert.equal(names('@kenji.tanaka và @' + 'a'.repeat(31)), '');
  assert.equal(names('@minhanhé'), '');
});
await check('chữ trong liên kết không được coi là nhắc tên', () => {
  assert.equal(names('<a href="https://etsubi.vn/x">@minhanh</a> và @lan_huong'), 'lan_huong');
});
await check('dòng gợi ý chỉ cảnh báo khi quá 10 tên', () => {
  const list = count => Array.from({ length: count }, (_, index) => '@user_' + index).join(' ');
  assert.equal(mentions.mentionHint(list(10)).warning, false);
  assert.equal(mentions.mentionHint(list(10)).text, 'Gõ @username để nhắc đến ai đó');
  assert.equal(mentions.mentionHint(list(11)).warning, true);
  assert.match(mentions.mentionHint(list(11)).text, /đang có 11 tên/u);
});
await check('đoạn trích giữ nguyên dấu _ trong username', () => {
  assert.equal(makeExcerpt('Cảm ơn @lan_huong và _nghiêng_'), 'Cảm ơn @lan_huong và nghiêng');
});
await check('đăng bình luận gửi tên được nhắc, bỏ chính mình và giới hạn 10 tên', async () => {
  const many = Array.from({ length: 12 }, (_, index) => '@user_' + index).join(' ');
  responses['/posts/p/comments'] = { id: 'c9', content: '@chinh_toi ' + many };
  await comments.createComment('p', '@chinh_toi ' + many, null, { postAuthorId: 'me' });
  assert.equal(mentionCalls().length, 1);
  assert.equal(mentionCalls()[0].body.comment_id, 'c9');
  assert.equal(mentionCalls()[0].body.mentioned_usernames.length, 10);
  assert.equal(mentionCalls()[0].body.mentioned_usernames.includes('chinh_toi'), false);
});
await check('không có tên được nhắc thì không gọi API', async () => {
  await comments.createComment('p', 'Không nhắc ai', null, { postAuthorId: 'me' });
  await comments.updateComment('c', 'Vẫn không nhắc ai');
  assert.equal(mentionCalls().length, 0);
});
await check('sửa bình luận và đăng, sửa bài đều gửi tên được nhắc', async () => {
  await comments.updateComment('c1', 'Gọi @minhanh');
  assert.equal(mentionCalls().at(-1).body.comment_id, 'c1');
  responses['/posts'] = { id: 'p1', content: 'Gọi @lan_huong' };
  await posts.createPost({ title: 'Tiêu đề', content: 'Gọi @lan_huong' });
  assert.equal(mentionCalls().at(-1).body.post_id, 'p1');
  await posts.updatePost('p2', { title: 'Tiêu đề', content: 'Gọi @kenji_01' });
  assert.equal(mentionCalls().at(-1).body.post_id, 'p2');
  assert.equal(mentionCalls().at(-1).body.mentioned_usernames[0], 'kenji_01');
});
await check('lỗi gửi thông báo nhắc tên không làm hỏng bình luận đã lưu', async () => {
  responses['/notifications/mention'] = new Error('Máy chủ lỗi');
  const saved = await comments.updateComment('c1', 'Gọi @minhanh');
  assert.equal(saved.id, 'saved');
});

console.log('backend-integration: đạt ' + passed + ' ca.');

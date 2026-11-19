/** Kiểm tra hai loại tên và nhãn tác giả: node --experimental-vm-modules frontend/dev/tests/username.mjs */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Nạp service thật, chỉ giả lớp mạng và phiên để kiểm tra không gửi request hoặc cần trình duyệt.
const root = new URL('../../', import.meta.url);
const context = vm.createContext({ URL, URLSearchParams, console, Event });
const modules = new Map();
let requests = 0;
modules.set('/services/api/client.js', new vm.SyntheticModule(['request'], function fakeClient() {
  this.setExport('request', function recordUnexpectedRequest() {
    requests += 1;
    throw new Error('Định dạng tên không được gọi mạng.');
  });
}, { context }));
modules.set('/utils/auth.js', new vm.SyntheticModule(['getCachedUser', 'fetchCurrentUser'], function fakeSession() {
  this.setExport('getCachedUser', () => null);
  this.setExport('fetchCurrentUser', async () => null);
}, { context }));

/** Ánh xạ import tuyệt đối về frontend, dùng cùng một module cho mỗi đường dẫn. */
async function resolveModule(specifier) {
  if (!modules.has(specifier)) {
    const source = await readFile(new URL(specifier.slice(1), root), 'utf8');
    modules.set(specifier, new vm.SourceTextModule(source, { context, identifier: specifier }));
  }
  return modules.get(specifier);
}

/** Nạp module và liên kết một lần ở cấp ngoài cùng, để các import dùng chung không bị liên kết chồng. */
async function load(specifier) {
  const module = await resolveModule(specifier);
  if (module.status === 'unlinked') await module.link(resolveModule);
  return module;
}

const usernameModule = await load('/utils/username.js');
await usernameModule.evaluate();
const { normalizeUsername, isValidUsername, validateUsername, formatHandle, validateDisplayName,
  normalizeUsernameInput, bindUsernameInput } = usernameModule.namespace;

// Chuẩn hoá khi gõ hoặc dán, gồm khoảng trắng Unicode, @ và các ký tự không được tự phiên âm.
assert.equal(normalizeUsername('  @NGUYEN Van_A.1\t\n'), 'nguyenvan_a.1');
assert.equal(normalizeUsername('\u00a0@@Ab C\u3000'), 'abc');
assert.equal(normalizeUsername('@Đặng Nhật'), 'đặngnhật');
assert.equal(normalizeUsername('ab@c'), 'ab@c');
assert.equal(normalizeUsername(null), '');
assert.equal(normalizeUsername(normalizeUsername(' @ABC ')), 'abc');

// Biên độ dài và bảng ký tự được dùng giống nhau trong kiểm tra và thông báo lỗi.
for (const value of ['abc', 'a_b_9', 'a'.repeat(30), '123']) {
  assert.equal(isValidUsername(value), true);
  assert.equal(validateUsername(value), '');
}
for (const value of ['', 'ab', 'A_b', 'a.b', 'abc.', 'あいう', 'nguyễn', 'a-b', '@abc', 'abc def', 'abc\n', 'a'.repeat(31)]) {
  assert.equal(isValidUsername(value), false, value);
  assert.ok(validateUsername(value), value);
}
assert.match(validateUsername(''), /Vui lòng/u);
assert.match(validateUsername('ab'), /ít nhất 3/u);
assert.match(validateUsername('a-b'), /chỉ gồm/u);
assert.match(validateUsername('a'.repeat(31)), /30/u);
assert.equal(formatHandle('nguyenvana'), '@nguyenvana');
assert.equal(formatHandle('@nguyenvana'), '@nguyenvana');
assert.equal(formatHandle(''), '–');
assert.equal(formatHandle(null), '–');
assert.equal(validateDisplayName('  あ  '), '');
assert.equal(validateDisplayName(' Nguyễn Văn An '), '');
assert.equal(validateDisplayName('あ'.repeat(50)), '');
assert.ok(validateDisplayName('あ'.repeat(51)));
assert.equal(validateDisplayName(' ' + 'a'.repeat(50) + ' '), '');
assert.ok(validateDisplayName('   '));

/** Input giả ghi lại vùng chọn để kiểm tra con trỏ khi xoá ký tự trong chuỗi. */
function fakeInput(value, start, end = start) {
  const listeners = new Map();
  return {
    value, selectionStart: start, selectionEnd: end, selectionDirection: 'forward', listeners,
    /** Ghi vùng chọn như input thật mà không cần DOM. */
    setSelectionRange(nextStart, nextEnd, direction) {
      this.selectionStart = nextStart;
      this.selectionEnd = nextEnd;
      this.selectionDirection = direction;
    },
    /** Lưu callback để mô phỏng gõ và kết thúc bộ gõ IME. */
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    /** Phát lại input sau compositionend cho listener của form. */
    dispatchEvent(event) {
      listeners.get(event.type)?.(event);
      return true;
    },
  };
}
const middle = fakeInput('@Ab C_D', 4, 6);
normalizeUsernameInput(middle);
assert.equal(middle.value, 'abc_d');
assert.equal(middle.selectionStart, 2);
assert.equal(middle.selectionEnd, 4);
const ime = fakeInput('@ABC', 4);
bindUsernameInput(ime);
ime.listeners.get('input')({ isComposing: true });
assert.equal(ime.value, '@ABC');
ime.listeners.get('compositionend')();
assert.equal(ime.value, 'abc');
assert.equal(ime.selectionStart, 3);

// Service phải đọc displayname mới, độc lập cờ năng lực; tên cũ display_name không phải hợp đồng.
const postsModule = await load('/services/api/posts.js');
await postsModule.evaluate();
const { getAuthorDisplayName, getAuthorHandle, getAuthorLabel } = postsModule.namespace;
const author = { displayname: 'Nguyễn Văn An', username: 'nguyenvanan' };
assert.equal(getAuthorDisplayName(author), 'Nguyễn Văn An');
assert.equal(getAuthorHandle(author), '@nguyenvanan');
assert.equal(getAuthorLabel(author), 'Nguyễn Văn An');
assert.equal(getAuthorDisplayName({ username: 'an' }), 'an');
assert.equal(getAuthorLabel({ username: 'an' }), '@an');
assert.equal(getAuthorDisplayName({ displayname: '', username: 'an' }), 'an');
assert.equal(getAuthorDisplayName({ display_name: 'Tên cũ', username: 'an' }), 'an');
assert.equal(getAuthorDisplayName(null), undefined);
assert.equal(getAuthorHandle(null), '–');
assert.equal(getAuthorLabel(null), undefined);
const capabilities = (await load('/services/api/capabilities.js')).namespace;
assert.equal(capabilities.backendSupports.userHandle, true);
capabilities.backendSupports.userHandle = false;
assert.equal(getAuthorDisplayName(author), 'Nguyễn Văn An');

// Parser thông báo giữ message cũ; chỉ đổi tên khi server trả hồ sơ actor thật.
const notifications = (await load('/services/api/notifications.js')).namespace;
assert.equal(notifications.formatNotification({ kind: 'follow', message: 'legacy started following you' }).actorName, 'legacy');
assert.equal(notifications.formatNotification({ kind: 'follow', message: 'legacy started following you', actor: author }).actorName, 'Nguyễn Văn An');
// Lỗi gộp ở vùng chung, lỗi rõ email hoặc handle vẫn chỉ đúng trường.
const errorsModule = await load('/utils/errors.js');
await errorsModule.evaluate();
const { fieldForError, toVietnameseMessage } = errorsModule.namespace;
assert.equal(fieldForError({ status: 409, message: 'Email or username already exists' }), null);
assert.equal(toVietnameseMessage({ status: 409, message: 'Email already exists or username already taken' }), 'Email hoặc @tên người dùng đã được dùng.');
// 409 ở tính năng khác giữ thông điệp cũ; riêng form đăng ký chọn lời nhắc chung.
assert.equal(toVietnameseMessage({ status: 409, message: 'Conflict' }), 'Conflict');
assert.equal(fieldForError({ status: 409, message: 'Username already taken' }), 'username');
assert.equal(fieldForError({ status: 409, message: 'Email already exists' }), 'email');
// Hai lỗi 400 về tên hiển thị (đăng ký và PATCH hồ sơ) dịch sang tiếng Việt và gán vào ô displayname.
for (const message of ['Display name too long (max 50 characters)', 'Display name cannot be empty']) {
  assert.equal(fieldForError({ status: 400, message }), 'displayname');
}
assert.equal(toVietnameseMessage({ status: 400, message: 'Display name too long (max 50 characters)' }), 'Tên hiển thị không được vượt quá 50 ký tự.');
assert.equal(toVietnameseMessage({ status: 400, message: 'Display name cannot be empty' }), 'Vui lòng nhập tên hiển thị.');
assert.equal(notifications.formatNotification({ kind: 'follow', message: 'legacy started following you', actor: { username: 'an' } }).initials, 'A');
assert.equal(requests, 0);
console.log('username: passed');

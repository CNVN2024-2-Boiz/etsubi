/** Kiểm tra lưu từng mục với phản hồi thật dạng API, không cần trình duyệt hoặc request ra mạng. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// DOM giả chỉ giữ dữ liệu, lỗi, focus và trạng thái ẩn để kiểm tra hành vi lưu độc lập bố cục.
const nodes = new Map();
const controls = new Map();
let focused = null;

/** Tạo phần tử tối thiểu để chạy chính các hàm trang, không viết lại quy tắc lưu trong test. */
function node(key) {
  if (!nodes.has(key)) {
    const attributes = new Map();
    const classes = new Set();
    nodes.set(key, {
      value: '', textContent: '', hidden: true, dataset: {}, options: [], children: [], validity: { valid: true },
      style: { setProperty() {} },
      classList: {
        /** Theo dõi lớp lỗi và trạng thái chờ giống DOM. */
        toggle(name, active) { active ? classes.add(name) : classes.delete(name); },
        /** Xoá lớp sau khi huỷ hoặc sửa trường. */
        remove(name) { classes.delete(name); },
      },
      /** Ghi aria-invalid để kiểm tra lỗi gắn đúng ô. */
      setAttribute(name, value) { attributes.set(name, value); },
      /** Đọc trạng thái trợ năng đã được trang thiết lập. */
      getAttribute(name) { return attributes.get(name); },
      /** Xoá trạng thái khi huỷ hoặc chọn ảnh khác. */
      removeAttribute(name) { attributes.delete(name); },
      /** Theo dõi focus sau validate hoặc lỗi API. */
      focus() { focused = key; },
      /** Lưu cây avatar dùng chữ viết tắt. */
      replaceChildren(...values) { this.children = values; },
      /** Gắn option địa chỉ cũ nếu nằm ngoài danh sách. */
      append(value) { this.options.push(value); },
    });
  }
  return nodes.get(key);
}

/** Lấy điều khiển thật theo name giống form.elements.namedItem. */
function input(name) {
  if (!controls.has(name)) {
    controls.set(name, node('input:' + name));
  }
  return controls.get(name);
}

node('[data-profile-form]').elements = { namedItem: input };
const summary = ['displayname', 'username', 'email', 'institute', 'address', 'native'].map(key => {
  const result = node('summary:' + key);
  result.dataset.summary = key;
  return result;
});
// Radio cần cùng giao diện aria với input để kiểm tra lỗi nhóm.
const radios = ['vi', 'ja', 'en'].map(value => Object.assign(node('radio:' + value), { value, checked: false }));

/** Chỉ ảnh trong avatar mới trả null; những hook trang còn lại có phần tử riêng. */
function qs(selector) {
  return selector === 'img' ? null : node(selector);
}

/** Mô phỏng các nhóm cần đọc, bỏ qua nút và phần tử không liên quan dữ liệu. */
function qsa(selector) {
  if (selector === '[data-summary]') return summary;
  if (selector === '[name="native"]') return radios;
  return [];
}

const context = vm.createContext({ console, URL, URLSearchParams, setTimeout, clearTimeout,
  window: { matchMedia: () => ({ matches: false }) }, location: { hash: '' },
  document: { getElementById: id => node('#' + id) } });
const modules = new Map();
const requests = [];
let response;
let failure = null;

/** Các dependency có tác dụng phụ được thay bằng stub, hàm trang và helper tên vẫn chạy từ nguồn thật. */
function stub(url, exports) {
  modules.set(url, new vm.SyntheticModule(Object.keys(exports), function expose() {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
  }, { context }));
}

stub('/components/header/header.js', { mountHeader() {} });
stub('/components/footer/footer.js', { mountFooter() {} });
stub('/utils/dom.js', { qs, qsa, el: (tag, properties) => ({ tag, ...properties }) });
stub('/utils/places.js', { vietnamPlaces: [], japanPlaces: [] });
stub('/services/api/client.js', { getToken: () => 'fixture', clearToken() {}, readStorage: () => null, writeStorage() {} });
stub('/utils/auth.js', { requireAuth: async () => true, login() {}, logout() {}, fetchCurrentUser: async () => null });
stub('/utils/preferences.js', {
  getThemePreference: () => 'light', setThemePreference() {}, getInterfaceLanguage: () => 'vi',
  setInterfaceLanguage() {}, onInterfaceLanguageChange() {},
});
// Test chạy bằng tiếng Việt nên t() chỉ điền giá trị vào câu gốc.
stub('/utils/i18n.js', {
  t: (source, params = {}) => source.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match),
  currentLocale: () => 'vi-VN', currentLanguage: () => 'vi', changeInterfaceLanguage() {}, translatePage() {},
});
stub('/services/api/users.js', {
  getMe() {}, changeMyPassword() {}, deleteMyAccount() {}, getProfileUpdatedAt: () => null,
  /** Ghi PATCH và mô phỏng cả phản hồi bỏ qua displayname lẫn lỗi trùng username. */
  async updateMe(patch) {
    requests.push({ ...patch });
    if (failure) throw failure;
    return response;
  },
});

/** Bỏ lần tự khởi tạo để test tự điền phiên, còn toàn bộ xử lý lưu dùng chính mã production. */
async function load(url) {
  if (!modules.has(url)) {
    let source = await readFile(new URL('../..' + url, import.meta.url), 'utf8');
    if (url === '/pages/settings.js') {
      source = source.replace(/initialize\(\);\s*$/u, '') + `
        export const testing = {
          configure(user) {
            serverUser = { ...user };
            serverValues = normalizeProfile(user);
            ready = true;
            busy = false;
            for (const section of Object.keys(sections)) fillSection(section);
          },
          saveSection, changedFields, sectionIsDirty, resetSection,
          snapshot: () => ({ ...serverValues }),
        };
      `;
    }
    const module = new vm.SourceTextModule(source, { context, identifier: url });
    modules.set(url, module);
    await module.link(load);
  }
  return modules.get(url);
}

const module = await load('/pages/settings.js');
await module.evaluate();
const { testing } = module.namespace;
const base = { id: 'fixture', displayname: 'Nguyễn Văn An', username: 'nguyenvanan', email: 'fixture@example.invalid',
  institute: '', address: '', bio: '', avatar_url: '', native: 'vi' };
testing.configure(base);
input('native').value = 'vi';

// Tên hiển thị bắt buộc, handle không nhận tiếng Nhật; lỗi không gửi mạng và focus đúng trường.
input('displayname').value = '   ';
await testing.saveSection('account');
assert.equal(requests.length, 0);
assert.equal(focused, 'input:displayname');
input('displayname').value = base.displayname;
input('username').value = 'あいう';
await testing.saveSection('account');
assert.equal(requests.length, 0);
assert.equal(focused, 'input:username');

// Chỉ mục account gửi hai tên, không kéo native đang sửa vào PATCH.
input('displayname').value = 'Tên mới';
input('username').value = 'next_handle';
input('native').value = 'ja';
response = { ...base, username: 'next_handle' };
await testing.saveSection('account');
assert.deepEqual(requests[0], { displayname: 'Tên mới', username: 'next_handle' });
assert.equal(testing.snapshot().displayname, base.displayname);
assert.equal(input('displayname').value, base.displayname);
assert.equal(input('native').value, 'ja');
assert.equal(testing.sectionIsDirty('account'), false);
assert.equal(node('[data-section-save-bar="account"]').hidden, true);
assert.equal(testing.sectionIsDirty('native'), true);
assert.equal(node('[data-displayname-note]').hidden, false);
assert.equal(node('[data-displayname-note]').textContent, 'Máy chủ chưa lưu được tên hiển thị.');
assert.equal(node('summary:displayname').textContent, base.displayname);
assert.equal(node('summary:username').textContent, '@next_handle');

// Khi backend sửa xong thì tên thật được chấp nhận và ghi chú tự biến mất.
input('displayname').value = 'Tên đã lưu';
response = { ...response, displayname: 'Tên đã lưu' };
await testing.saveSection('account');
assert.deepEqual(requests[1], { displayname: 'Tên đã lưu' });
assert.equal(testing.snapshot().displayname, 'Tên đã lưu');
assert.equal(node('[data-displayname-note]').hidden, true);
assert.equal(testing.sectionIsDirty('native'), true);

// 409 giữ nguyên dữ liệu đang sửa, gắn vào username; huỷ chỉ phục hồi mục account.
input('username').value = 'taken_handle';
failure = { status: 409, message: 'Username already taken' };
await testing.saveSection('account');
assert.equal(input('username').getAttribute('aria-invalid'), 'true');
assert.equal(input('username').value, 'taken_handle');
assert.equal(testing.snapshot().username, 'next_handle');
testing.resetSection('account');
assert.equal(input('username').value, 'next_handle');
assert.equal(input('native').value, 'ja');
assert.equal(testing.sectionIsDirty('account'), false);
// Phản hồi thiếu hồ sơ cũng không được nhận patch.displayname như dữ liệu đã lưu.
failure = null;
response = null;
input('displayname').value = 'Tên không có trong phản hồi';
await testing.saveSection('account');
assert.equal(testing.snapshot().displayname, 'Tên đã lưu');
assert.equal(input('displayname').value, 'Tên đã lưu');
assert.equal(node('[data-displayname-note]').hidden, false);
console.log('profile-identity: passed');

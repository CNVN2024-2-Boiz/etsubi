// Kiểm tra nền tảng xác thực không cần cài gói: node --experimental-vm-modules frontend/dev/tests/auth-foundation.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Bộ nhớ giả giúp kiểm tra lựa chọn lưu token mà không cần trình duyệt.
function storage() {
  const values = new Map();
  return {
    /** Đọc dữ liệu giả giống giao diện localStorage. */
    getItem(key) {
      return values.get(key) ?? null;
    },
    /** Chuyển sang chuỗi giống cách trình duyệt lưu giá trị. */
    setItem(key, value) {
      values.set(key, String(value));
    },
    /** Xoá một khoá để kiểm tra đăng xuất và chuyển nơi lưu token. */
    removeItem(key) {
      values.delete(key);
    },
  };
}
/** Tạo môi trường trình duyệt giả và nạp ES module trực tiếp từ thư mục frontend. */
function environment(search = '', globalBase) {
  const redirects = [];
  const context = vm.createContext({
    URL,
    URLSearchParams,
    TextEncoder,
    AbortController,
    DOMException,
    Response,
    setTimeout,
    clearTimeout,
    console,
    localStorage: storage(),
    sessionStorage: storage(),
    location: {
      search,
      pathname: '/login/',
      hash: '',
      origin: 'http://localhost:12321',
      // Ghi nhận điều hướng thay vì mở trang thật trong kiểm tra không có trình duyệt.
      assign: target => redirects.push(target),
    },
    window: { ETSUBI_API_BASE: globalBase },
  });
  const modules = new Map();
  /** Tái sử dụng module theo URL để các service có chung trạng thái như trong trình duyệt. */
  async function load(url) {
    if (!modules.has(url)) {
      const module = new vm.SourceTextModule(await fs.readFile(path.join(root, url), 'utf8'), { context, identifier: url });
      modules.set(url, module);
      await module.link((specifier, parent) => {
        const target = specifier.startsWith('/')
          ? specifier
          : path.posix.join(path.posix.dirname(parent.identifier), specifier);
        return load(target);
      });
    }
    return modules.get(url);
  }
  /** Chỉ đánh giá module một lần rồi trả các hàm export cho kiểm tra. */
  async function use(url) {
    const module = await load(url);
    if (module.status !== 'evaluated') {
      await module.evaluate();
    }
    return module.namespace;
  }
  return { context, use, redirects };
}
// Kiểm tra bộ nhớ token, thứ tự ưu tiên cấu hình API và trường hợp trình duyệt chặn storage.
const env = environment();
const api = await env.use('/services/api/client.js');
assert.equal(api.API_BASE, 'http://localhost:11432/api/v1');
api.setToken('fixture-local', { remember: true });
assert.equal(env.context.localStorage.getItem('etsubi_token'), 'fixture-local');
api.setToken('fixture-session', { remember: false });
assert.equal(env.context.localStorage.getItem('etsubi_token'), null);
assert.equal(api.getToken(), 'fixture-session');
api.clearToken();
assert.equal(api.getToken(), null);
const override = environment('?api=http://localhost:21432/api/v1', 'http://example.invalid/api');
assert.equal((await override.use('/services/api/client.js')).API_BASE, 'http://localhost:21432/api/v1');
assert.equal(override.context.localStorage.getItem('etsubi_api_base'), 'http://localhost:21432/api/v1');
const reset = environment('?api=reset', 'http://example.invalid/api');
reset.context.localStorage.setItem('etsubi_api_base', 'http://saved.invalid');
assert.equal((await reset.use('/services/api/client.js')).API_BASE, 'http://example.invalid/api');
assert.equal(reset.context.localStorage.getItem('etsubi_api_base'), null);
const fallback = environment();
fallback.context.localStorage = { getItem() { throw Error('Unavailable'); }, removeItem() { throw Error('Unavailable'); }, setItem() { throw Error('Unavailable'); } };
assert.equal((await fallback.use('/services/api/client.js')).getToken(), null);

// Đo số yêu cầu đồng thời và khoảng cách gửi để xác nhận giới hạn hàng đợi.
let active = 0;
let peak = 0;
const starts = [];
env.context.fetch = async () => {
  starts.push(Date.now());
  active++;
  peak = Math.max(peak, active);
  await new Promise(resolve => setTimeout(resolve, 850));
  active--;
  return new Response('{"ok":true}', { status: 200 });
};
await Promise.all(Array.from({ length: 6 }, () => api.request('/queue')));
assert.equal(peak, 3);
assert.ok(starts.slice(1).every((time, i) => time - starts[i] >= 245), 'request starts must be spaced by at least 250ms, allowing clock jitter');
// Lỗi 429 chỉ được thử lại hai lần với thời gian chờ tăng dần.
let attempts = 0;
const retryStart = Date.now();
env.context.fetch = async () => new Response(attempts++ < 2 ? '{"error":"limited"}' : '{}', { status: attempts <= 2 ? 429 : 200 });
await api.request('/retry');
assert.equal(attempts, 3);
assert.ok(Date.now() - retryStart >= 1800);
// Sau lỗi 429 cả hàng đợi tạm dừng để lần thử lại không bị các yêu cầu khác tranh hạn mức.
const holdStarts = [];
let holdLimited = true;
env.context.fetch = async () => {
  holdStarts.push(Date.now());
  const status = holdLimited ? 429 : 200;
  holdLimited = false;
  return new Response('{}', { status });
};
await Promise.all([api.request('/hold-a'), api.request('/hold-b')]);
assert.equal(holdStarts.length, 3);
assert.ok(holdStarts[1] - holdStarts[0] >= 550, 'queued requests must wait while the rate limit recovers');
// 401 công khai không xoá phiên, còn 401 có token phải báo hết phiên.
let unauthorized = 0;
api.onUnauthorized(() => unauthorized++);
api.setToken('fixture-session');
env.context.fetch = async () => new Response('{"error":"Invalid credentials"}', { status: 401 });
await assert.rejects(api.request('/auth/login', { method: 'POST', auth: false }), error => error.status === 401);
assert.equal(unauthorized, 0);
assert.equal(api.getToken(), 'fixture-session');
await assert.rejects(api.request('/my'), error => error.status === 401);
assert.equal(unauthorized, 1);
assert.equal(api.getToken(), null);
// Mạng lỗi phải trở thành ApiError trạng thái 0 thay vì làm lộ lỗi thô.
env.context.fetch = async () => {
  throw Error('Offline');
};
await assert.rejects(api.request('/offline'), error => error.status === 0 && error.message.includes('Không kết nối'));
env.context.fetch = async () => new Response(null, { status: 204 });
assert.equal(await api.request('/empty'), null);
// Huỷ công việc duy nhất đang chờ không được làm hàng đợi ngừng hoạt động.
const controller = new AbortController();
const cancelled = api.request('/cancel', { signal: controller.signal });
controller.abort();
await assert.rejects(cancelled, error => error.name === 'AbortError');
assert.equal(await api.request('/after-cancel'), null);
let received;
api.setToken('fixture-header');
// Ghi nhận body và header để kiểm tra hợp đồng JSON cùng Bearer token.
env.context.fetch = async (url, options) => {
  received = { url, options };
  return new Response('{"error":"plain"}', { status: 409 });
};
await assert.rejects(api.request('/body', { method: 'PATCH', body: { language: 'ja' }, query: { tags: 'a,b', limit: 10 } }), error => error.status === 409 && error.data.error === 'plain');
assert.equal(received.options.headers.Authorization, 'Bearer fixture-header');
assert.equal(received.options.body, '{"language":"ja"}');
assert.equal(received.url.searchParams.get('tags'), 'a,b');

// Dịch vụ địa điểm bên ngoài không nhận Bearer token, cookie hoặc API_BASE của backend.
env.context.fetch = async (url, options) => {
  received = { url, options };
  return new Response('{"name":"Địa điểm"}', { status: 200 });
};
const external = await api.requestExternal('https://nominatim.openstreetmap.org/search?format=jsonv2&q=test');
assert.equal(external.name, 'Địa điểm');
assert.equal(String(received.url).startsWith('https://nominatim.openstreetmap.org/'), true);
assert.equal(received.options.method, 'GET');
assert.equal(received.options.headers.Authorization, undefined);
assert.equal(received.options.credentials, 'omit');
env.context.fetch = async () => new Response('{}', { status: 429 });
await assert.rejects(api.requestExternal('https://nominatim.openstreetmap.org/search'), error => error.status === 429);
env.context.fetch = async () => { throw Error('Offline'); };
await assert.rejects(api.requestExternal('https://nominatim.openstreetmap.org/search'), error => error.status === 0);
assert.equal(api.getToken(), 'fixture-header');

// Kiểm tra URL chia sẻ, tham số quay lại và chặn chuyển hướng ra ngoài ứng dụng.
const routes = await env.use('/utils/routes.js');
assert.equal(routes.searchUrl({ q: ' onsen ', tags: ['question','general'] }), '/search/?q=onsen&tag=question&tag=general');
assert.equal(routes.withRedirect(routes.routes.register, '/post/?id=1'), '/register/?redirect=%2Fpost%2F%3Fid%3D1');
const auth = await env.use('/utils/auth.js');
for (const unsafe of ['//evil.test', '/\\evil.test', 'https://evil.test', 'javascript:alert(1)', '/\nevil.test', '/\tevil.test']) assert.equal(auth.safeRedirect(unsafe), routes.routes.home);
assert.equal(auth.safeRedirect('/post/?id=1#comments'), '/post/?id=1#comments');
// Các liên kết đăng nhập được lưu từ bản trước giữ nguyên tham số và điều hướng tới URL mới.
assert.equal(auth.safeRedirect('/pages/post.html?id=1#comments'), '/post/?id=1#comments');
assert.equal(auth.safeRedirect('/pages/profile/edit.html?section=profile#avatar'), '/settings/?section=profile#avatar');
assert.equal(auth.safeRedirect('/pages/profile/?id=1#posts'), '/profile/?id=1#posts');
assert.equal(auth.safeRedirect('/folder/..//evil.test'), routes.routes.home);

// Mô phỏng đăng ký (tài khoản chờ xác nhận), bấm link trong mail rồi tải hồ sơ để kiểm tra đúng thứ tự API.
const calls = [];
env.context.fetch = async (url, options) => {
  calls.push({ pathname: url.pathname, body: options.body && JSON.parse(options.body) });
  if (url.pathname.endsWith('/auth/register')) {
    return new Response('{"user_id":"fixture","status":"pending"}', { status: 201 });
  }
  if (url.pathname.endsWith('/auth/verify-email')) {
    return new Response('{"user_id":"fixture","token":"fixture-login"}', { status: 200 });
  }
  return new Response(JSON.stringify({ id: 'fixture', username: 'nguyenvanan', displayname: 'Nguyễn Văn An', role: 'moderator', status: 'active', native: 'vi', language: 'ja', avatar_url: '/assets/avatars/preset.svg', muted_until: '2030-01-01T00:00:00Z' }));
};
const authApi = await env.use('/services/api/auth.js');
const created = await authApi.register({ username: 'nguyenvanan', displayname: 'Nguyễn Văn An', email: 'fixture@example.invalid', password: 'fixture-password', native: 'ja', acceptTerms: true, acceptPrivacy: true });
assert.equal(created.status, 'pending');
// Đăng ký gửi language bằng ngôn ngữ mẹ đẻ khi không chỉ định riêng, kèm hai ô đồng ý làm bằng chứng.
assert.equal(calls[0].body.native, 'ja');
assert.equal(calls[0].body.language, 'ja');
assert.equal(calls[0].body.accept_terms, true);
assert.equal(calls[0].body.accept_privacy, true);
const verified = await authApi.verifyEmail('fixture-mail-token');
assert.equal(calls[1].body.token, 'fixture-mail-token');
const user = await auth.startSession(verified.token, { remember: true });
assert.deepEqual(calls.map(call => call.pathname.split('/').at(-1)), ['register', 'verify-email', 'my']);
assert.equal(user.avatarUrl, '/assets/avatars/preset.svg');
assert.equal(user.isStaff, true);
assert.equal(user.isAdmin, false);
assert.equal(auth.getCachedUser().username, 'nguyenvanan');
assert.equal(auth.getCachedUser().displayname, 'Nguyễn Văn An');
assert.equal(calls[0].body.displayname, 'Nguyễn Văn An');
assert.equal(calls[0].body.username, 'nguyenvanan');
// Hồ sơ công khai chia sẻ yêu cầu đang chờ và bỏ kết quả lỗi để lần sau thử lại.
const users = await env.use('/services/api/users.js');
let userRequests = 0;
env.context.fetch = async () => {
  userRequests++;
  return new Response('{"id":"fixture-public"}');
};
await Promise.all([users.getUser('fixture-public'), users.getUser('fixture-public')]);
assert.equal(userRequests, 1);
// Đổi ngôn ngữ mẹ đẻ gửi kèm language; lưu mục khác không được đụng tới ngôn ngữ dịch.
const profilePatches = [];
env.context.fetch = async (url, options) => {
  profilePatches.push(JSON.parse(options.body));
  return new Response('{"id":"fixture"}');
};
await users.updateMe({ native: 'en' });
await users.updateMe({ bio: 'Giới thiệu' });
assert.deepEqual(profilePatches, [{ native: 'en', language: 'en' }, { bio: 'Giới thiệu' }]);
// Hết phiên phải xoá hồ sơ và giữ URL hiện tại để quay lại sau đăng nhập.
env.context.location.pathname = '/forum/';
env.context.location.search = '?page=2';
env.context.fetch = async () => new Response('{"error":"expired"}', { status: 401 });
await api.request('/my').catch(() => {});
assert.equal(env.redirects.at(-1), '/login/?redirect=%2Fforum%2F%3Fpage%3D2');
assert.equal(auth.getCachedUser(), null);
// Tên tự do nhận chữ Nhật; handle chỉ nhận chữ Latin thường, số và gạch dưới.
const validation = await env.use('/utils/validation.js');
const hint = validation.authFieldMessage;
assert.ok(hint('username', { value: '  ab  ' }));
assert.ok(hint('username', { value: '  あ  ' }));
assert.equal(hint('displayname', { value: '  あ  ' }), '');
assert.equal(hint('username', { value: 'nguyen_van_an' }), '');
assert.ok(hint('username', { value: 'nguyen.van_an' }));
assert.ok(hint('displayname', { value: '   ' }));
assert.ok(hint('displayname', { value: 'あ'.repeat(61) }));
assert.ok(hint('email', { value: 'wrong@' }));
assert.equal(hint('email', { value: ' fixture@example.invalid ' }), '');
assert.ok(hint('password', { value: '1234567', register: true }));
assert.equal(hint('password', { value: '1234567', register: false }), '');
assert.equal(hint('password', { value: '12345678', register: true }), '');
assert.ok(hint('confirm', { value: '12345678', password: '12345679' }));
assert.equal(hint('confirm', { value: '12345678', password: '12345678' }), '');
assert.ok(hint('terms', { checked: false }));
assert.equal(hint('terms', { checked: true }), '');
// Ô đồng ý xử lý dữ liệu cá nhân (đợt 15) báo lỗi riêng, không dùng chung câu với ô Điều khoản.
assert.ok(hint('privacy', { checked: false }));
assert.notEqual(hint('privacy', { checked: false }), hint('terms', { checked: false }));
assert.equal(hint('privacy', { checked: true }), '');
const errors = await env.use('/utils/errors.js');
assert.equal(errors.toVietnameseMessage({ message: 'Email already taken' }), 'Email này đã được sử dụng.');
assert.equal(errors.fieldForError({ message: 'Invalid credentials' }), null);
assert.equal(errors.fieldForError({ message: 'Username already taken' }), 'username');
assert.equal(errors.toVietnameseMessage({ status: 429 }), 'Bạn thao tác quá nhanh, thử lại sau giây lát.');
const format = await env.use('/utils/format.js');
assert.equal(format.initials('Nguyễn Văn An'), 'VA');
assert.equal(format.relativeTime(Date.now() - 5 * 60000), '5 phút trước');
assert.equal(format.relativeTime(Date.now() - 14 * 86400000), '2 tuần trước');

// Kiểm tra token, tài nguyên tĩnh và liên kết nhãn trong hai trang xác thực.
const cssFiles = ['/styles/main.css', '/styles/base.css', '/styles/tokens.css', '/styles/components.css', '/styles/pages/auth.css', '/components/header/header.css', '/components/footer/footer.css'];
const tokenSource = await fs.readFile(path.join(root, '/styles/tokens.css'), 'utf8');
const tokens = new Set([...tokenSource.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
tokens.add('--scene-scale');
for (const file of cssFiles) {
  const text = await fs.readFile(path.join(root, file), 'utf8');
  for (const [, token] of text.matchAll(/var\((--[\w-]+)/g)) {
    assert.ok(tokens.has(token), 'Undefined token ' + token + ' in ' + file);
  }
  if (!file.endsWith('tokens.css')) {
    assert.equal(/#[\da-f]{3,8}\b|rgba?\(/i.test(text), false, 'Hard-coded colour in ' + file);
  }
  for (const [, url] of text.matchAll(/url\(['"]?(\/[^'"\s)]+)/g)) {
    await fs.access(path.join(root, url));
  }
  // Không cho spinner, keyframes hoặc chuyển động khi tương tác quay lại sau chỉnh sửa.
  const declarations = text.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal(/@keyframes|\.is-loading::after|filter\s*:|transition\s*:[^;{}]*\b(?:transform|all)\b/i.test(declarations), false);
  assert.equal(/:(?:hover|active)[^{]*\{[^}]*\btransform\s*:/i.test(declarations), false);
}
for (const mode of ['login','register']) {
  const text = await fs.readFile(path.join(root, mode + '/index.html'), 'utf8');
  assert.equal(/<style\b|\sstyle=|\son\w+=|<script(?![^>]*\bsrc=)/i.test(text), false);
  const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of text.matchAll(/\bfor="([^"]+)"/g)) {
    assert.ok(ids.includes(id));
  }
  for (const [, id] of text.matchAll(/\baria-describedby="([^"]+)"/g)) {
    assert.ok(ids.includes(id));
  }
  for (const [, url] of text.matchAll(/(?:src|href)="(\/[^"?]+)"/g)) {
    await fs.access(path.join(root, url));
  }
  // Mỗi input có nhãn thật; placeholder và tên riêng trên aria không được lấn nhãn.
  for (const [input] of text.matchAll(/<input\b[^>]*>/g)) {
    const id = input.match(/\bid="([^"]+)"/)?.[1];
    assert.ok(id && text.includes('for="' + id + '"'));
    assert.equal(/\baria-label(?:ledby)?=/.test(input), false);
  }
  const expectedLabels = {
    email: 'Email',
    password: 'Mật khẩu',
    ...(mode === 'register' ? { displayname: 'Tên hiển thị', username: 'Tên người dùng', confirm: 'Xác nhận mật khẩu' } : {}),
  };
  for (const [id, label] of Object.entries(expectedLabels)) {
    assert.ok(text.includes('for="' + id + '">' + label + '</label>'));
  }
  assert.ok(text.includes('data-component="header"'));
  assert.ok(text.includes('data-component="footer"'));
  assert.ok(text.includes('data-component="auth-scene"'));
}

// DOM giả tối thiểu kiểm tra cảnh dùng text node an toàn và giữ đúng thứ tự các lớp.
class SceneNode {
  /** Lưu cấu trúc cây để kiểm tra component mà không cần trình duyệt hoặc gói ngoài. */
  constructor(tag, text = '') {
    this.tag = tag;
    this.text = text;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
  }

  /** Ghi thuộc tính để kiểm tra đường dẫn ảnh và trạng thái trang trí. */
  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  /** Gắn các nút con theo đúng thứ tự giống append của DOM. */
  append(...children) {
    this.children.push(...children);
  }

  /** Thay toàn bộ con để kiểm tra mount lặp không nhân đôi cảnh. */
  replaceChildren(...children) {
    this.children = children;
  }
}

const sceneEnvironment = environment();
sceneEnvironment.context.Node = SceneNode;
sceneEnvironment.context.document = {
  // Tạo nút và văn bản riêng để phát hiện việc chèn chuỗi như mã HTML.
  createElement: tag => new SceneNode(tag),
  createTextNode: text => new SceneNode('#text', text),
};
const { mountAuthScene } = await sceneEnvironment.use('/components/auth-scene/auth-scene.js');
const container = new SceneNode('div');
container.dataset.title = 'XIN CHÀO';
const unsafeCopy = '<img src=x onerror=alert(1)>';
mountAuthScene(container, { copyLines: [unsafeCopy, 'Dòng hai'] });
const [scene, hero] = container.children;
assert.equal(scene.attributes['aria-hidden'], 'true');
assert.equal(scene.children.length, 3);
assert.equal(scene.children[0].children.length, 4);
assert.equal(scene.children[1].children.length, 3);
assert.equal(scene.children[2].children.length, 21);
assert.equal(hero.children[1].children[0].text, 'XIN CHÀO');
const copyNodes = hero.children[3].children;
assert.equal(copyNodes[0].tag, '#text');
assert.equal(copyNodes[0].text, unsafeCopy);
assert.equal(copyNodes[1].tag, 'br');
mountAuthScene(container, { title: 'THAM GIA', copyLines: [] });
assert.equal(container.children.length, 2);
assert.equal(container.children[1].children[1].children[0].text, 'THAM GIA');
assert.equal(mountAuthScene(null), null);

console.log('PASS: API queue/retry/abort, token storage, auth flow, redirects, validation, CSS tokens, static loading, accessible labels, shared scene safety and auth resources.');

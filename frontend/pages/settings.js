/** Cài đặt tái dùng trang Chỉnh sửa hồ sơ với DOM an toàn và các service chung, chỉ gửi dữ liệu sau khi bấm lưu. */
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { getMe, updateMe, changeMyPassword, deleteMyAccount, getProfileUpdatedAt } from '/services/api/users.js';
import { getToken, clearToken, readStorage, writeStorage } from '/services/api/client.js';
import { requireAuth, login, logout, fetchCurrentUser } from '/utils/auth.js';
import { toVietnameseMessage, fieldForError } from '/utils/errors.js';
import { registerLeaveGuard, confirmLeave } from '/utils/leave-guard.js';
import { initials } from '/utils/format.js';
import { bindUsernameInput, normalizeUsername, isValidUsername, validateUsername, validateDisplayName, formatHandle } from '/utils/username.js';
import { routes, withRedirect } from '/utils/routes.js';
import { el, qs, qsa } from '/utils/dom.js';
import { vietnamPlaces, japanPlaces } from '/utils/places.js';
// Tuỳ chọn trên thiết bị dùng chung với header, tách khỏi dữ liệu tài khoản cần bấm lưu.
import {
  getThemePreference,
  setThemePreference,
  getInterfaceLanguage,
  setInterfaceLanguage,
  onInterfaceLanguageChange,
} from '/utils/preferences.js';

// Chỉ các trường cho phép được so sánh và gửi; mật khẩu luôn tách riêng, không ghi xuống storage.
const profileKeys = ['displayname', 'username', 'email', 'institute', 'address', 'bio', 'avatar_url', 'native'];
const passwordNames = ['current-password', 'new-password', 'confirm-password'];
const nativeLabels = { vi: 'Tiếng Việt', ja: '日本語', en: 'English' };
const presetLabels = ['Cổng torii', 'Hoa anh đào', 'Núi Phú Sĩ', 'Đèn lồng', 'Quạt giấy', 'Sóng biển'];
const savedKey = 'etsubi_profile_saved_at';
const form = qs('[data-profile-form]');
const fields = qs('[data-profile-fields]');
// Mỗi nhóm chỉ sở hữu các trường của mình; bản đã lưu dùng chung đối tượng nhưng cập nhật đúng nhóm.
const sections = {
  avatar: { label: 'Ảnh đại diện', keys: ['avatar_url'], hints: [] },
  account: { label: 'Thông tin tài khoản', keys: ['displayname', 'username', 'email', 'institute', 'address', 'bio'], hints: ['displayname', 'username', 'email', 'bio'] },
  native: { label: 'Ngôn ngữ mẹ đẻ', keys: ['native'], hints: ['native'] },
  password: { label: 'Đổi mật khẩu', keys: [], hints: passwordNames },
};
const savingSections = new Set();
const leaveDialog = qs('[data-leave-dialog]');
const mobileLayout = window.matchMedia('(max-width: 600px)');
let saveQueue = Promise.resolve();
let avatarProcessing = false;
let leaving = false;
let leaveChoice = null;
let leaveOrigin = null;
let pendingLeave = null;
const fileInput = qs('[data-avatar-file]');
const avatarPreview = qs('[data-avatar-preview]');
const presetsPanel = qs('[data-presets]');
const presetsToggle = qs('[data-presets-toggle]');
const alertBox = qs('[data-form-alert]');
const deleteDialog = qs('[data-delete-dialog]');
const deleteForm = qs('[data-delete-form]');
const deletePassword = qs('[name="delete-password"]', deleteForm);
const deleteSubmit = qs('[data-delete-submit]');
let serverUser = null;
let serverValues = null;
let avatarUrl = '';
let previewSource = null;
let ready = false;
let busy = true;
let deleting = false;
let localSavedAt = null;
// Giữ mục vừa mở bằng neo khi cuối trang không còn đủ khoảng trống để cuộn đề mục lên sát trên.
let navigationSection = location.hash.slice(1);

// Gợi ý mặc định được khôi phục khi huỷ hoặc khi người dùng sửa ô đang có lỗi.
const defaultHints = {
  displayname: 'Hiện trên bài viết và bình luận · đổi được bất cứ lúc nào',
  username: 'Duy nhất · chữ thường, số, dấu . và _ · tối thiểu 3 ký tự',
  email: 'Dùng để đăng nhập · đổi email áp dụng từ lần đăng nhập sau',
  bio: 'Hiển thị công khai trên trang hồ sơ của bạn',
  native: 'Hiển thị bằng lá cờ cạnh tên bạn trên bài viết và bình luận',
  'current-password': 'Bắt buộc khi đổi sang mật khẩu mới',
  'new-password': 'Tối thiểu 8 ký tự',
  'confirm-password': 'Nhập lại đúng mật khẩu mới',
};

/** Đọc nguyên giá trị đang sửa để gõ thêm rồi xoá về đúng bản cũ sẽ xoá trạng thái chưa lưu. */
function readValues() {
  return {
    displayname: input('displayname').value,
    username: input('username').value,
    email: input('email').value,
    institute: input('institute').value,
    address: input('address').value,
    bio: input('bio').value,
    avatar_url: avatarUrl,
    native: input('native').value,
  };
}

/** Đổi null thành chuỗi rỗng để việc so sánh không gửi lại các trường không thay đổi. */
function normalizeProfile(user) {
  const values = {};
  // Chỉ lấy các trường được phép cập nhật, không đưa vai trò hay trạng thái vào PATCH.
  for (const key of profileKeys) {
    values[key] = typeof user[key] === 'string' ? user[key] : '';
  }
  return values;
}

/** Chỉ tạo patch của mục được bấm; trường rỗng vẫn gửi khi người dùng chủ động xoá dữ liệu cũ. */
function changedFields(section) {
  const values = readValues();
  const patch = {};
  // Không lấy trường của mục khác dù người dùng đang sửa nhiều mục cùng lúc.
  for (const key of sections[section].keys) {
    if (values[key] !== serverValues[key]) {
      patch[key] = key === 'username' ? normalizeUsername(values[key])
        : section === 'account' ? values[key].trim() : values[key];
    }
  }
  return patch;
}

/** So sánh giá trị thô với ảnh chụp riêng của mục; mật khẩu chỉ cần có một ô không rỗng. */
function sectionIsDirty(section) {
  if (!ready || !serverValues) {
    return false;
  }
  if (section === 'password') {
    return hasPasswordChanges();
  }
  const values = readValues();
  return sections[section].keys.some(key => values[key] !== serverValues[key]);
}

/** Trả danh sách theo thứ tự trang để chấm điều hướng và câu hỏi rời trang dùng cùng một kết quả. */
function dirtySections() {
  return Object.keys(sections).filter(sectionIsDirty);
}

/** Bất kỳ ô mật khẩu có nội dung đều có nghĩa là người dùng muốn đổi mật khẩu. */
function hasPasswordChanges() {
  return passwordNames.some(name => Boolean(input(name).value));
}

/** Xoá dữ liệu nhạy cảm và đưa mọi nút mắt về trạng thái ẩn sau khi lưu hoặc huỷ. */
function clearPasswords() {
  // Các ô đều được xoá cùng lúc để không lưu lại một phần mật khẩu trong DOM.
  for (const name of passwordNames) {
    input(name).value = '';
    input(name).type = 'password';
    const toggle = qs('[data-password-toggle="' + name + '"]');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Hiện mật khẩu');
  }
}

/** Điền lại đúng một mục, không chạm các mục đang sửa khác; chỉ lúc tải mới gọi cho cả bốn mục. */
function fillSection(section) {
  if (section === 'password') {
    clearPasswords();
  } else if (section === 'avatar') {
    avatarUrl = serverValues.avatar_url;
    fileInput.value = '';
    fileInput.removeAttribute('aria-invalid');
    qs('[data-avatar-hint]').hidden = true;
  } else if (section === 'native') {
    // Không tự chọn ngôn ngữ giả nếu API trả về giá trị lạ.
    for (const radio of qsa('[name="native"]', form)) {
      radio.checked = radio.value === serverValues.native;
    }
  } else {
    // Địa chỉ dùng select có thể bổ sung giá trị cũ ngoài danh sách hiện tại.
    for (const key of sections.account.keys) {
      if (key === 'address') {
        selectAddress(serverValues[key]);
      } else {
        input(key).value = serverValues[key];
      }
    }
  }
  clearSectionErrors(section);
}

/** Gắn lỗi với ô thật và gợi ý tương ứng; 409 chỉ được xác định bởi phản hồi của máy chủ. */
function setFieldError(name, message = '') {
  const hint = qs('[data-' + name + '-hint]');
  const controls = name === 'native' ? qsa('[name="native"]', form) : [input(name)];
  // Radio có cùng một gợi ý, nên mọi lựa chọn được đánh dấu khi nhóm không hợp lệ.
  for (const control of controls) {
    control.setAttribute('aria-invalid', String(Boolean(message)));
  }
  if (name === 'native') {
    qs('[data-native-group]').setAttribute('aria-invalid', String(Boolean(message)));
  }
  hint.textContent = message || defaultHints[name];
  hint.classList.toggle('field__hint--error', Boolean(message));
  // Gợi ý hợp lệ dùng màu muted, chỉ xác nhận độ dài; giữ nguyên lỗi từ máy chủ.
  hint.classList.remove('field__hint--success');
}

/** Huỷ hoặc sửa một mục chỉ xoá lỗi của chính mục đó. */
function clearSectionErrors(section) {
  for (const name of sections[section].hints) {
    setFieldError(name);
  }
  qs('[data-section-error="' + section + '"]').hidden = true;
  if (section === 'avatar') {
    fileInput.removeAttribute('aria-invalid');
    qs('[data-avatar-hint]').hidden = true;
  }
}

/** Lỗi API của mục luôn nằm ngay trong mục; không dùng vùng lỗi chung của lần tải hồ sơ. */
function showSectionError(section, message) {
  const region = qs('[data-section-error="' + section + '"]');
  region.textContent = message;
  region.hidden = false;
}

/** Hiện thông báo trong trang, role status dành riêng cho lần lưu thành công. */
function showAlert(message, { success = false, retry = false } = {}) {
  qs('[data-alert-message]').textContent = message;
  qs('[data-retry]').hidden = !retry;
  alertBox.classList.toggle('alert--error', !success);
  alertBox.classList.toggle('alert--success', success);
  alertBox.setAttribute('role', success ? 'status' : 'alert');
  alertBox.hidden = false;
}

/** Lấy ngày hợp lệ, không biến chuỗi null hay ngày hỏng thành mốc thời gian giả. */
function validDate(value) {
  const timestamp = value ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

/** Chỉ khôi phục thời gian lưu thuộc đúng tài khoản trên trình duyệt này. */
function readSavedTime() {
  try {
    const saved = JSON.parse(readStorage(savedKey));
    localSavedAt = saved?.userId === serverUser.id ? validDate(saved.at) : null;
  } catch {
    // Storage hỏng không được làm mất khả năng tải hồ sơ từ máy chủ.
    localSavedAt = null;
  }
}

/** Pill ưu tiên ngày mới nhất trong API và lần lưu thật tại trình duyệt, thiếu thì dùng gạch ngang. */
function renderSavedTime() {
  const remote = validDate(getProfileUpdatedAt(serverUser));
  const timestamp = Math.max(remote || 0, localSavedAt || 0);
  const date = timestamp ? new Date(timestamp) : null;
  // Ghép ngày trước giờ để không phụ thuộc thứ tự giờ/ngày khác nhau giữa các trình duyệt.
  const label = date ? date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ', ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '–';
  qs('[data-saved-label]').textContent = 'Đã lưu lần cuối · ' + label;
}

/** Ghi thời gian chỉ khi có thao tác ghi đã thành công, kể cả lưu hồ sơ rồi đổi mật khẩu bị lỗi. */
function markSaved() {
  localSavedAt = Date.now();
  writeStorage(savedKey, JSON.stringify({ userId: serverUser.id, at: new Date(localSavedAt).toISOString() }));
  renderSavedTime();
}

/** Đồng bộ tóm tắt và bộ đếm theo dữ liệu hiện tại, giữ phản hồi khi nhập của trang cũ. */
function renderProfilePreview() {
  const values = readValues();
  const complete = [Boolean(avatarUrl), isValidUsername(values.username) && !validateDisplayName(values.displayname), Boolean(values.institute), Boolean(values.address), Boolean(values.bio), Object.hasOwn(nativeLabels, values.native)];
  const percent = Math.round(complete.filter(Boolean).length / 6 * 100);
  const meter = qs('[data-progress]');
  meter.style.setProperty('--progress', percent + '%');
  meter.setAttribute('aria-valuenow', String(percent));
  qs('[data-percent]').textContent = String(percent);
  const summary = { ...values, username: formatHandle(values.username), address: values.address.split(',')[0], native: nativeLabels[values.native] || '' };
  // Dữ liệu dài có title để đọc đầy đủ; textContent ngăn API text trở thành HTML.
  for (const node of qsa('[data-summary]')) {
    const value = summary[node.dataset.summary];
    node.textContent = value || '–';
    node.title = value || 'Chưa nhập';
    node.lang = node.dataset.summary === 'native' && values.native === 'ja' ? 'ja' : 'vi';
    node.classList.toggle('is-empty', !value);
  }
  qs('[data-bio-counter]').textContent = input('bio').value.length + ' / 300';
  qs('[data-bio-counter]').classList.toggle('is-limit', input('bio').value.length >= 300);
  renderAvatar();
}

/** Cập nhật từng thanh lưu và chấm đỏ; khoá riêng mục đang gửi, những mục khác vẫn hoạt động. */
function renderSectionStates() {
  for (const section of Object.keys(sections)) {
    const node = document.getElementById('section-' + section);
    const saving = savingSections.has(section);
    const dirty = sectionIsDirty(section);
    const locked = busy || !ready || saving || (section === 'avatar' && avatarProcessing);
    const bar = qs('[data-section-save-bar="' + section + '"]');
    bar.hidden = !dirty && !saving;
    bar.classList.toggle('is-saving', saving);
    node.setAttribute('aria-busy', String(saving));
    qs('[data-section-save-message]', bar).textContent = saving ? 'Đang lưu mục này…' : 'Mục này có thay đổi chưa lưu';
    qs('[data-section-unsaved="' + section + '"]').hidden = !dirty;
    // Đóng băng dữ liệu của đúng mục trong khi chờ để kết quả trả về không đè lên lần sửa tiếp theo.
    for (const control of qsa('input, select, textarea, button', node)) {
      control.disabled = locked;
    }
    qs('[data-section-save="' + section + '"]').textContent = saving ? 'Đang lưu…' : 'Lưu thay đổi';
    qs('[data-section-save="' + section + '"]').disabled = locked || !dirty;
    qs('[data-section-reset="' + section + '"]').disabled = locked || !dirty;
  }
  renderAvatar();
}

/** Khoá toàn bộ hồ sơ chỉ khi tải; lưu riêng không làm mờ hoặc khoá các mục khác. */
function setBusy(value) {
  busy = value;
  fields.disabled = value || !ready;
  form.setAttribute('aria-busy', String(value));
  renderSectionStates();
  qs('[data-delete-open]').disabled = value || !ready || savingSections.size > 0;
  if (serverValues) {
    renderProfilePreview();
  }
}

/** Tải hồ sơ thật trước guard để lỗi mạng có thể thử lại tại chỗ thay vì bị chuyển tới Login. */
async function loadProfile() {
  if (!getToken()) {
    await requireAuth();
    return;
  }
  ready = false;
  setBusy(true);
  alertBox.hidden = true;
  qs('[data-loading]').hidden = false;
  qs('[data-retry]').disabled = true;
  try {
    serverUser = await getMe();
    if (!await requireAuth()) {
      return;
    }
    serverValues = normalizeProfile(serverUser);
    for (const section of Object.keys(sections)) {
      fillSection(section);
    }
    readSavedTime();
    renderSavedTime();
    // Tất cả liên kết hồ sơ đều dùng id từ GET /my, không giả định một tài khoản mẫu.
    for (const link of qsa('[data-profile-link]')) {
      link.href = routes.userProfile(serverUser.id);
    }
    ready = true;
  } catch (error) {
    if (error.status !== 401) {
      showAlert(toVietnameseMessage(error), { retry: true });
    }
  } finally {
    qs('[data-loading]').hidden = true;
    qs('[data-retry]').disabled = false;
    setBusy(false);
  }
}

/** Validate đúng mục vừa bấm lưu, không để lỗi ở mục khác chặn một thay đổi hợp lệ. */
function validateSection(section) {
  clearSectionErrors(section);
  const values = readValues();
  const errors = {};
  if (section === 'account') {
    errors.displayname = validateDisplayName(values.displayname);
    errors.username = validateUsername(normalizeUsername(values.username));
    errors.email = values.email.trim() && input('email').validity.valid ? '' : 'Vui lòng nhập địa chỉ email hợp lệ.';
    errors.bio = values.bio.length <= 300 ? '' : 'Giới thiệu bản thân không được vượt quá 300 ký tự.';
  } else if (section === 'native') {
    errors.native = Object.hasOwn(nativeLabels, values.native) ? '' : 'Vui lòng chọn ngôn ngữ mẹ đẻ.';
  } else if (section === 'password') {
    const current = input('current-password').value;
    const next = input('new-password').value;
    const confirm = input('confirm-password').value;
    errors['current-password'] = current ? '' : 'Vui lòng nhập mật khẩu hiện tại.';
    errors['new-password'] = !next ? 'Vui lòng nhập mật khẩu mới.'
      : Array.from(next).length < 8 ? 'Mật khẩu mới cần ít nhất 8 ký tự.'
      : next === current ? 'Mật khẩu mới phải khác mật khẩu hiện tại.' : '';
    errors['confirm-password'] = !confirm ? 'Vui lòng xác nhận mật khẩu mới.'
      : confirm !== next ? 'Mật khẩu xác nhận không khớp.' : '';
  }
  let firstInvalid = null;
  // Đặt lỗi cạnh ô và chuyển focus đến lỗi đầu tiên, radio dùng lựa chọn thật đầu nhóm.
  for (const [name, message] of Object.entries(errors)) {
    setFieldError(name, message);
    if (message && !firstInvalid) {
      firstInvalid = name === 'native' ? qs('[name="native"]', form) : input(name);
    }
  }
  firstInvalid?.focus();
  return !firstInvalid;
}

/** Chỉ nhận các trường của mục vừa lưu, kể cả khi API trả toàn bộ hồ sơ có dữ liệu cũ của mục khác. */
function acceptSection(section, user, patch) {
  // Tên hiển thị luôn lấy từ phản hồi PATCH /my, không dùng patch để giả tên đã được máy chủ nhận.
  const values = normalizeProfile({ ...serverValues, ...patch, ...(user || {}),
    displayname: user && Object.hasOwn(user, 'displayname') ? user.displayname : serverValues.displayname });
  for (const key of sections[section].keys) {
    serverValues[key] = values[key];
    serverUser[key] = values[key];
  }
  if (user && Object.hasOwn(user, 'updated_at')) {
    serverUser.updated_at = user.updated_at;
  }
  fillSection(section);
  markSaved();
}

/** Lưu đúng mục đã chọn; xếp hàng các lần gửi để PATCH khác không dùng JWT cũ lúc đổi mật khẩu. */
async function saveSection(section) {
  if (!ready || busy || deleting || savingSections.has(section) || !sectionIsDirty(section) || !validateSection(section)) {
    return;
  }
  const patch = changedFields(section);
  const remember = Boolean(readStorage('etsubi_token'));
  savingSections.add(section);
  qs('[data-save-status]').textContent = '';
  renderSectionStates();
  qs('[data-delete-open]').disabled = true;
  // Đặt chỗ ngay khi bấm, nhưng chỉ khoá mục này; các mục khác vẫn nhận sửa và nhận nút lưu.
  const previous = saveQueue;
  let release;
  saveQueue = new Promise(function waitForSection(resolve) {
    release = resolve;
  });
  let passwordSaved = false;
  let displaynameUnsupported = false;
  try {
    await previous;
    if (leaving) {
      return;
    }
    if (section === 'password') {
      const newPassword = input('new-password').value;
      await changeMyPassword({ currentPassword: input('current-password').value, newPassword });
      passwordSaved = true;
      clearPasswords();
      markSaved();
      // Email lấy từ bản đã lưu, không dùng email đang sửa dở của mục Thông tin tài khoản.
      await login(serverValues.email, newPassword, { remember });
    } else {
      const savedUser = await updateMe(patch);
      displaynameUnsupported = section === 'account' && Object.hasOwn(patch, 'displayname')
        && savedUser?.displayname !== patch.displayname;
      acceptSection(section, savedUser, patch);
      // Phòng hờ: phản hồi trả tên khác bản gửi thì báo nhẹ trong mục, form đã nhận lại tên thật.
      if (section === 'account') {
        const note = qs('[data-displayname-note]');
        note.textContent = displaynameUnsupported ? 'Máy chủ chưa lưu được tên hiển thị.' : '';
        note.hidden = !displaynameUnsupported;
      }
      // Làm mới cache để header nhận đúng tên, cờ và ảnh đã được máy chủ chấp nhận.
      await fetchCurrentUser();
    }
    qs('[data-save-status]').textContent = displaynameUnsupported
      ? 'Máy chủ chưa lưu được tên hiển thị. Các trường khác đã được cập nhật theo phản hồi.'
      : 'Đã lưu mục “' + sections[section].label + '”.';
    mountHeader(qs('[data-component="header"]'), { active: null, searchForm: true });
  } catch (error) {
    if (passwordSaved) {
      // Mật khẩu đã đổi thật; phiên mới lỗi thì giữ luồng quay lại Login như trang cũ.
      clearToken();
      leaving = true;
      location.assign(withRedirect(routes.login, routes.settings));
      return;
    }
    const name = fieldForError(error);
    if (section === 'password' && error.status === 401) {
      setFieldError('current-password', 'Mật khẩu hiện tại không đúng.');
    } else if (section === 'account' && ['displayname', 'username', 'email'].includes(name)) {
      setFieldError(name, toVietnameseMessage(error));
    } else if (section === 'password' && name === 'password') {
      setFieldError('new-password', toVietnameseMessage(error));
    }
    showSectionError(section, toVietnameseMessage(error));
  } finally {
    savingSections.delete(section);
    renderProfilePreview();
    renderSectionStates();
    qs('[data-delete-open]').disabled = busy || !ready || savingSections.size > 0;
    release();
  }
}

/** Huỷ chỉ khôi phục ảnh chụp và xoá lỗi của mục được bấm, mật khẩu được xoá trắng cả ba ô. */
function resetSection(section) {
  if (!ready || busy || savingSections.has(section)) {
    return;
  }
  fillSection(section);
  if (section === 'avatar') {
    setPresetsOpen(false);
  }
  renderProfilePreview();
  renderSectionStates();
}

/** Nhập liệu chỉ cập nhật bản xem trước và dấu chưa lưu, không gửi API hoặc xoá lỗi mục khác. */
function profileChanged(event) {
  if (!ready || busy) {
    return;
  }
  const section = event?.target.closest('[data-save-section]')?.dataset.saveSection || 'avatar';
  const name = event?.target.name;
  if (Object.hasOwn(defaultHints, name)) {
    setFieldError(name);
  }
  qs('[data-section-error="' + section + '"]').hidden = true;
  renderProfilePreview();
  renderSectionStates();
}

/** Đặt trạng thái mục hiện tại rõ ràng bằng aria-current, không phụ thuộc lớp CSS để tìm phần tử. */
function activateSection(id) {
  // Chỉ một mục được đánh dấu tại một thời điểm, các mục còn lại bỏ hẳn aria-current.
  for (const link of qsa('[data-settings-link]')) {
    if (link.dataset.settingsLink === id) {
      link.setAttribute('aria-current', 'true');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

/** Mỗi lần cuộn chỉ đo sáu đề mục và chọn mục gần mép trên khả dụng nhất, không điều khiển chuyển động. */
function updateActiveSection() {
  const top = qs('[data-component="header"]').getBoundingClientRect().bottom;
  let closest = null;
  let distance = Infinity;
  // Khi header không sticky, không dùng đáy âm của header làm điểm tham chiếu.
  const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--space-6')) || 0;
  const threshold = Math.max(0, top) + gap;
  // Neo gần cuối trang vẫn là mục hiện tại khi đề mục còn nhìn thấy, tránh bị đổi về Giao diện sau click.
  const requestedLink = qsa('[data-settings-link]').find(link => link.dataset.settingsLink === navigationSection);
  if (requestedLink) {
    const heading = document.getElementById(navigationSection).querySelector('h2');
    const position = heading.getBoundingClientRect();
    if (position.top >= threshold && position.top < window.innerHeight) {
      activateSection(navigationSection);
      return;
    }
  }
  // Khi cuộn khỏi đề mục vừa chọn, tiếp tục theo dõi mục gần mép trên như trang chỉnh sửa cũ.
  navigationSection = '';
  for (const link of qsa('[data-settings-link]')) {
    const heading = document.getElementById(link.dataset.settingsLink).querySelector('h2');
    const current = Math.abs(heading.getBoundingClientRect().top - threshold);
    if (current < distance) {
      distance = current;
      closest = link.dataset.settingsLink;
    }
  }
  activateSection(closest);
}

/** Neo vẫn cuộn theo trình duyệt; đánh dấu ngay lúc click và focus section giúp Tab tiếp tục đúng nơi. */
function navigateSection(event) {
  const id = event.currentTarget.dataset.settingsLink;
  navigationSection = id;
  activateSection(id);
  document.getElementById(id).focus({ preventScroll: true });
}

/** Nút mắt dùng cùng input-group với trang Login, chỉ đổi kiểu ô và aria-pressed. */
function togglePassword(event) {
  const button = event.currentTarget;
  const control = document.getElementById(button.dataset.passwordToggle);
  const visible = control.type === 'password';
  control.type = visible ? 'text' : 'password';
  button.setAttribute('aria-pressed', String(visible));
  button.setAttribute('aria-label', visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
}

/** Xoá mật khẩu khi dialog đóng để dữ liệu nhạy cảm không nằm lại sau khi huỷ. */
function resetDeleteDialog() {
  deleteForm.reset();
  deletePassword.type = 'password';
  deletePassword.removeAttribute('aria-invalid');
  const toggle = qs('[data-password-toggle="delete-password"]');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.setAttribute('aria-label', 'Hiện mật khẩu');
  qs('[data-delete-error]').hidden = true;
  deleteSubmit.disabled = true;
}

/** Mở hộp xác nhận tĩnh chỉ khi hồ sơ đã tải, không yêu cầu xác nhận cho nút lưu thông thường. */
function openDeleteDialog() {
  if (!ready || busy) {
    return;
  }
  resetDeleteDialog();
  deleteDialog.showModal();
  deletePassword.focus();
}

/** Dialog không đóng trong lúc đang gửi để tránh gửi lặp hoặc không rõ kết quả xoá. */
function closeDeleteDialog(event) {
  if (deleting) {
    event?.preventDefault();
    return;
  }
  deleteDialog.close();
}

/** Chỉ bật nút xoá khi có mật khẩu, xoá thông báo cũ ngay lúc người dùng sửa. */
function deletePasswordChanged() {
  deleteSubmit.disabled = deleting || !deletePassword.value;
  deletePassword.removeAttribute('aria-invalid');
  qs('[data-delete-error]').hidden = true;
}

/** Xác nhận DELETE /my, giữ lỗi tại dialog và đăng xuất cục bộ khi tài khoản không còn tồn tại. */
async function submitDelete(event) {
  event.preventDefault();
  if (deleting || !deletePassword.value) {
    return;
  }
  deleting = true;
  deleteForm.setAttribute('aria-busy', 'true');
  deletePassword.disabled = true;
  deleteSubmit.disabled = true;
  qs('[data-delete-cancel]').disabled = true;
  qs('[data-password-toggle="delete-password"]').disabled = true;
  deleteSubmit.textContent = 'Đang xử lý…';
  try {
    await deleteMyAccount(deletePassword.value);
    leaving = true;
    clearToken();
    deletePassword.value = '';
    // logout không gọi API lần nữa vì token đã được xoá trước, đồng thời xoá cache và về Home.
    await logout();
  } catch (error) {
    const message = error.status === 401 ? 'Mật khẩu không đúng.'
      : error.status === 400 && /admin|administrator/i.test(error.message) ? 'Không thể xoá tài khoản quản trị viên.'
      : toVietnameseMessage(error);
    const region = qs('[data-delete-error]');
    region.textContent = message;
    region.hidden = false;
    deletePassword.setAttribute('aria-invalid', String(error.status === 401));
  } finally {
    deleting = false;
    deleteForm.setAttribute('aria-busy', 'false');
    deletePassword.disabled = false;
    qs('[data-delete-cancel]').disabled = false;
    qs('[data-password-toggle="delete-password"]').disabled = false;
    deleteSubmit.disabled = !deletePassword.value;
    deleteSubmit.textContent = 'Xoá vĩnh viễn';
    deletePassword.focus();
  }
}

/** Đổi thứ tự DOM ở mobile để nút Lưu và Ở lại đứng trước, thứ tự Tab khớp với hình ảnh. */
function arrangeSectionButtons() {
  for (const section of Object.keys(sections)) {
    const actions = qs('[data-section-save-actions]', document.getElementById('section-' + section));
    const save = qs('[data-section-save="' + section + '"]');
    const reset = qs('[data-section-reset="' + section + '"]');
    actions.append(...(mobileLayout.matches ? [save, reset] : [reset, save]));
  }
  const stay = qs('[data-leave-stay]');
  const discard = qs('[data-leave-discard]');
  qs('[data-leave-actions]').append(...(mobileLayout.matches ? [stay, discard] : [discard, stay]));
}

/** Form không có nút lưu chung; lần submit chỉ xét mục chứa focus hoặc nút phát sinh submit. */
function submitCurrentSection(event) {
  event.preventDefault();
  const source = event.submitter || document.activeElement;
  const section = source?.closest('[data-save-section]')?.dataset.saveSection;
  if (section) {
    void saveSection(section);
  }
}

/** Giữ Enter trong ô một dòng tiện dụng, không chặn xuống dòng textarea hoặc bàn phím nhập tiếng Nhật. */
function submitSectionOnEnter(event) {
  if (event.key !== 'Enter' || event.isComposing || event.target.tagName !== 'INPUT'
    || !['text', 'email', 'password'].includes(event.target.type)) {
    return;
  }
  const section = event.target.closest('[data-save-section]')?.dataset.saveSection;
  if (section) {
    event.preventDefault();
    void saveSection(section);
  }
}

/** Mở một câu hỏi cho danh sách mục thực sự đang sửa, mặc định giữ dữ liệu và focus nút Ở lại. */
function askToLeave() {
  const dirty = dirtySections();
  if (leaving || !dirty.length) {
    return Promise.resolve(true);
  }
  if (pendingLeave) {
    return pendingLeave;
  }
  const names = dirty.map(section => '“' + sections[section].label + '”').join(', ');
  qs('[data-leave-description]').textContent = (dirty.length === 1 ? 'Mục ' : 'Các mục ')
    + names + ' còn thay đổi chưa được lưu. Nếu rời trang bây giờ, những thay đổi này sẽ mất.';
  leaveOrigin = document.activeElement;
  pendingLeave = new Promise(function waitForLeaveChoice(resolve) {
    leaveChoice = resolve;
  });
  leaveDialog.returnValue = 'stay';
  leaveDialog.showModal();
  qs('[data-leave-stay]').focus();
  return pendingLeave;
}

/** Nếu lần lưu vừa dựng lại header, tìm link mới cùng đích hoặc avatar hiện tại thay vì focus nút đã bị tháo. */
function restoreLeaveFocus() {
  let target = leaveOrigin?.isConnected && !leaveOrigin.disabled ? leaveOrigin : null;
  if (!target && leaveOrigin?.tagName === 'A') {
    const header = qs('[data-component="header"]');
    target = qsa('a[href]', header).find(link => link.href === leaveOrigin.href && link.getClientRects().length);
  }
  const fallback = qs('[data-avatar-button]') || qs('[data-route="home"]');
  (target || fallback)?.focus({ preventScroll: true });
}

/** Chỉ lựa chọn bỏ thay đổi tắt beforeunload; đóng, Escape và nút Ở lại đều giữ guard hoạt động. */
function finishLeaveChoice() {
  // Chỉ xử lý một lần cho mỗi câu hỏi: nút bấm gọi trực tiếp, sự kiện close đến sau sẽ dừng ở đây.
  if (!leaveChoice) {
    return;
  }
  const allowed = leaveDialog.returnValue === 'discard';
  if (allowed) {
    leaving = true;
  } else {
    restoreLeaveFocus();
  }
  const resolve = leaveChoice;
  pendingLeave = null;
  leaveChoice = null;
  leaveOrigin = null;
  resolve?.(allowed);
}

/** Nút đóng và nút Ở lại dùng cùng kết quả, không để giá trị dialog của lần hỏi trước ảnh hưởng. */
function stayOnPage() {
  leaveDialog.close('stay');
  // Không chờ sự kiện close: có trình duyệt phát close trễ hoặc không phát khi tab không vẽ,
  // khiến Promise treo và nút Đăng xuất bị khoá; close vẫn được nghe làm đường dự phòng.
  finishLeaveChoice();
}

/** Escape dùng hành vi ở lại rõ ràng, để sự kiện close xử lý Promise và trả focus một lần. */
function cancelLeaveDialog(event) {
  event.preventDefault();
  stayOnPage();
}

/** Nút bỏ thay đổi chỉ đóng với kết quả cho phép; nơi gọi guard sẽ thực hiện điều hướng hoặc đăng xuất. */
function discardAndLeave() {
  leaveDialog.close('discard');
  // Trả kết quả ngay như nút Ở lại, không phụ thuộc thời điểm sự kiện close.
  finishLeaveChoice();
}

/** Bắt mọi link cùng nguồn ở pha capture; giữ nguyên thao tác mở tab mới, tải file và neo trong trang. */
async function guardNavigationClick(event) {
  const link = event.target.closest?.('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey
    || event.shiftKey || event.altKey || link.hasAttribute('download')
    || (link.target && link.target.toLowerCase() !== '_self') || leaving || !dirtySections().length) {
    return;
  }
  // Chuông desktop là nút mở panel tại chỗ; chỉ chuông mobile mới thực sự dẫn sang trang thông báo.
  if (link.getAttribute('role') === 'button' && link.hasAttribute('aria-haspopup')) {
    return;
  }
  let target;
  try {
    target = new URL(link.href, location.href);
  } catch {
    return;
  }
  if (target.origin !== location.origin || !['http:', 'https:'].includes(target.protocol)) {
    return;
  }
  if (target.pathname === location.pathname && target.search === location.search
    && (target.hash || location.hash || link.getAttribute('href').startsWith('#'))) {
    return;
  }
  event.preventDefault();
  event.stopImmediatePropagation();
  // Ghi nhận link kể cả khi chuột không tự focus nó trên một số trình duyệt.
  const confirmation = confirmLeave();
  leaveOrigin = link;
  if (await confirmation) {
    location.assign(target.href);
  }
}

/** Trình duyệt tự hiển thị lời hỏi khi tải lại, đóng tab hoặc gõ URL và vẫn còn dữ liệu chưa lưu. */
function guardBeforeUnload(event) {
  if (!leaving && dirtySections().length) {
    event.preventDefault();
    event.returnValue = '';
  }
}

/** Trang được khôi phục từ bộ nhớ điều hướng phải hỏi lại nếu người dùng tiếp tục sửa rồi rời đi. */
function restoreLeaveGuard() {
  leaving = false;
}

/** Thao tác trong modal không đóng menu avatar phía sau, để ở lại còn trả focus đúng link hoặc nút đăng xuất. */
function isolateLeaveDialogEvent(event) {
  event.stopPropagation();
}

/** Đăng ký chung cho header và link, cùng một dialog gốc; lựa chọn giao diện không tham gia trạng thái bẩn. */
function initializeLeaveGuard() {
  registerLeaveGuard(askToLeave);
  qs('[data-leave-close]').addEventListener('click', stayOnPage);
  qs('[data-leave-stay]').addEventListener('click', stayOnPage);
  qs('[data-leave-discard]').addEventListener('click', discardAndLeave);
  leaveDialog.addEventListener('cancel', cancelLeaveDialog);
  leaveDialog.addEventListener('close', finishLeaveChoice);
  leaveDialog.addEventListener('click', isolateLeaveDialogEvent);
  leaveDialog.addEventListener('keydown', isolateLeaveDialogEvent);
  document.addEventListener('click', guardNavigationClick, true);
  window.addEventListener('beforeunload', guardBeforeUnload);
  window.addEventListener('pageshow', restoreLeaveGuard);
}

/** Đồng bộ ngôn ngữ từ cùng storage mà header đang đọc, không đụng tới hồ sơ. */
function renderInterfaceLanguage(language) {
  // Gán checked cho radio thật để trạng thái hiển thị và bàn phím luôn thống nhất.
  for (const radio of qsa('[data-interface-language]')) {
    radio.checked = radio.value === language;
  }
}

/** Lưu ngôn ngữ ngay khi chọn; sự kiện chung cập nhật cả header và nhóm radio. */
function changeInterfaceLanguage(event) {
  setInterfaceLanguage(event.currentTarget.value);
}

/** Chỉ Sáng được chọn; FE chờ thiết kế bảng màu tối, đây không phải yêu cầu backend. */
function changeTheme(event) {
  if (event.currentTarget.value === 'light') {
    setThemePreference('light');
  }
}

/** Tuỳ chọn độc lập với tải hồ sơ, giá trị dark/system cũ vẫn hiển thị Sáng. */
function initializePreferences() {
  const storedTheme = getThemePreference();
  const displayedTheme = storedTheme === 'light' ? storedTheme : 'light';
  // Không ghi đè lựa chọn cũ khi tải trang, chỉ thể hiện chế độ FE hiện hỗ trợ.
  for (const radio of qsa('[data-theme]')) {
    radio.checked = radio.value === displayedTheme;
    // Nhấn Sáng vẫn ghi lựa chọn dù radio đã được chọn khi thay thế giá trị dark/system cũ.
    radio.addEventListener('click', changeTheme);
  }
  renderInterfaceLanguage(getInterfaceLanguage());
  onInterfaceLanguageChange(renderInterfaceLanguage);
  // Header và nhóm radio cùng ghi qua một API, không gọi PATCH /my cho tuỳ chọn này.
  for (const radio of qsa('[data-interface-language]')) {
    radio.addEventListener('change', changeInterfaceLanguage);
  }
}

/** Liên kết phiên cũ chuyển tới Giao diện mà không thêm lịch sử hoặc cuộn mượt. */
function redirectLegacySessionAnchor() {
  if (location.hash !== '#section-session') {
    return;
  }
  history.replaceState(history.state, '', location.pathname + location.search + '#section-appearance');
  navigationSection = 'section-appearance';
  activateSection(navigationSection);
  document.getElementById(navigationSection).scrollIntoView({ behavior: 'instant' });
}

/** Gắn sự kiện một lần; các mục tự lưu, guard điều hướng và cảnh báo tải lại dùng cùng trạng thái chưa lưu. */
function initialize() {
  mountHeader(qs('[data-component="header"]'), { active: null, searchForm: true });
  mountFooter();
  initializePreferences();
  // Chuẩn hoá handle trước listener của form để nháp, tóm tắt và trạng thái chưa lưu nhận đúng giá trị.
  bindUsernameInput(input('username'));
  buildPlaces();
  buildPresets();
  // Chỉ dùng routes chung cho các đường dẫn, giữ HTML có href dự phòng dễ hiểu.
  for (const link of qsa('[data-route="home"]')) {
    link.href = routes.home;
  }
  for (const button of qsa('[data-upload]')) {
    button.addEventListener('click', openFilePicker);
  }
  for (const button of qsa('[data-password-toggle]')) {
    button.addEventListener('click', togglePassword);
  }
  for (const link of qsa('[data-settings-link]')) {
    link.addEventListener('click', navigateSection);
  }
  // Chỉ nghe phần hồ sơ để tuỳ chọn giao diện không xoá lỗi hoặc đánh dấu chưa lưu.
  fields.addEventListener('input', profileChanged);
  fields.addEventListener('change', profileChanged);
  // Enter trong một ô chỉ lưu mục chứa ô đó, không biến thành lưu toàn bộ form.
  form.addEventListener('submit', submitCurrentSection);
  form.addEventListener('keydown', submitSectionOnEnter);
  for (const section of Object.keys(sections)) {
    document.getElementById('section-' + section).dataset.saveSection = section;
    qs('[data-section-save="' + section + '"]').addEventListener('click', function saveClickedSection() {
      void saveSection(section);
    });
    qs('[data-section-reset="' + section + '"]').addEventListener('click', function resetClickedSection() {
      resetSection(section);
    });
  }
  fileInput.addEventListener('change', uploadAvatar);
  presetsToggle.addEventListener('click', togglePresets);
  qs('[data-presets-close]').addEventListener('click', closePresets);
  qs('[data-remove-avatar]').addEventListener('click', removeAvatar);
  qs('[data-retry]').addEventListener('click', loadProfile);
  qs('[data-delete-open]').addEventListener('click', openDeleteDialog);
  qs('[data-delete-cancel]').addEventListener('click', closeDeleteDialog);
  deleteDialog.addEventListener('cancel', closeDeleteDialog);
  deleteDialog.addEventListener('close', resetDeleteDialog);
  deletePassword.addEventListener('input', deletePasswordChanged);
  // Gắn cả vùng lỗi riêng của dialog vào mật khẩu để trình đọc màn hình đọc đúng thông báo 401.
  deletePassword.setAttribute('aria-describedby', 'delete-password-hint delete-error');
  deleteForm.addEventListener('submit', submitDelete);
  document.addEventListener('keydown', handleEscape);
  window.addEventListener('scroll', updateActiveSection, { passive: true });
  window.addEventListener('resize', updateActiveSection);
  mobileLayout.addEventListener('change', arrangeSectionButtons);
  arrangeSectionButtons();
  initializeLeaveGuard();
  redirectLegacySessionAnchor();
  void loadProfile();
}

// Các hàm avatar và danh sách nơi ở bên dưới được dùng lại từ Register Advanced, giữ nguyên trang nguồn.


/** Lấy input theo name trong form để không phụ thuộc các lớp trình bày. */
function input(name) {
  return form.elements.namedItem(name);
}

/** Tạo hai nhóm select bằng DOM an toàn; tên lưu kèm quốc gia để tránh trùng tỉnh giữa hai nước. */
function buildPlaces() {
  // Mỗi nhóm có tên dễ đọc bằng trình đọc màn hình, không thay bằng dropdown tự chế.
  for (const [country, places] of [['Việt Nam', vietnamPlaces], ['Nhật Bản', japanPlaces]]) {
    const group = el('optgroup', { label: country });
    for (const place of places) {
      const label = place + ', ' + country;
      group.append(el('option', { value: label }, label));
    }
    input('address').append(group);
  }
  input('address').append(el('option', { value: 'Khác' }, 'Khác'));
}

/** Giữ được địa chỉ cũ hoặc địa chỉ tự do từ API khi nó chưa có trong danh sách chọn mới. */
function selectAddress(value) {
  if (value && !Array.from(input('address').options).some(option => option.value === value)) {
    input('address').append(el('option', { value }, value));
  }
  input('address').value = value;
}

/** Chỉ chấp nhận đường dẫn ảnh nội bộ, HTTP(S) hoặc data URL ảnh raster để hiển thị avatar. */
function safeAvatarSource(value) {
  if (/^data:image\/(?:jpeg|png);base64,[a-z0-9+/=]+$/i.test(value)) {
    return value;
  }
  try {
    const url = new URL(value, location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

/** Khi ảnh không tải được, vẫn hiển thị chữ viết tắt để vùng ảnh không bị trống. */
function showAvatarFallback() {
  avatarPreview.replaceChildren(initials(input('displayname').value) || 'E');
}

/** Chỉ thay ảnh khi nguồn đổi, tránh tải lại data URL ở mỗi lần gõ tên người dùng. */
function renderAvatar() {
  if (!avatarUrl) {
    previewSource = '';
    showAvatarFallback();
  } else if (previewSource !== avatarUrl) {
    previewSource = avatarUrl;
    const source = safeAvatarSource(avatarUrl);
    if (source) {
      const image = el('img', { src: source, alt: input('displayname').value || 'Ảnh đại diện của bạn', width: 90, height: 90 });
      image.addEventListener('error', showAvatarFallback, { once: true });
      avatarPreview.replaceChildren(image);
    } else {
      showAvatarFallback();
    }
  }
  const image = qs('img', avatarPreview);
  if (image) {
    image.alt = input('displayname').value || 'Ảnh đại diện của bạn';
  } else {
    showAvatarFallback();
  }
  qs('[data-remove-avatar]').disabled = busy || !ready || avatarProcessing || savingSections.has('avatar') || !avatarUrl;
  // Mẫu đang chọn có aria-pressed để trạng thái có ý nghĩa cả với bàn phím và trình đọc.
  for (const button of qsa('[data-preset]')) {
    button.setAttribute('aria-pressed', String(button.dataset.preset === avatarUrl));
  }
}

/** Mở hoặc đóng bảng mẫu tại chỗ, chuyển focus hợp lý mà không giả lập dialog có bẫy bàn phím. */
function setPresetsOpen(open, restoreFocus = false) {
  presetsPanel.hidden = !open;
  presetsToggle.setAttribute('aria-expanded', String(open));
  if (open) {
    qs('[data-preset]', presetsPanel)?.focus();
  } else if (restoreFocus) {
    presetsToggle.focus();
  }
}

/** Chọn mẫu đặt đường dẫn tĩnh vào avatar_url, không gửi ảnh lên một endpoint không tồn tại. */
function choosePreset(event) {
  avatarUrl = event.currentTarget.dataset.preset;
  qs('[data-avatar-hint]').hidden = true;
  fileInput.removeAttribute('aria-invalid');
  setPresetsOpen(false, true);
  profileChanged();
}

/** Dựng sáu nút ảnh có tên riêng và trạng thái nhấn; mỗi mẫu là SVG tự lưu trong repository. */
function buildPresets() {
  for (const [index, label] of presetLabels.entries()) {
    const path = '/assets/avatars/preset-' + (index + 1) + '.svg';
    const button = el('button', {
      type: 'button',
      className: 'profile-preset',
      'data-preset': path,
      'aria-label': 'Chọn ảnh ' + label,
      'aria-pressed': 'false',
    }, el('img', { src: path, alt: '', width: 80, height: 80 }));
    button.addEventListener('click', choosePreset);
    qs('[data-presets-grid]').append(button);
  }
}

/** Mở trình chọn file từ hai nút tải ảnh, đặt lại value để chọn lại cùng file sau khi báo lỗi. */
function openFilePicker() {
  fileInput.value = '';
  fileInput.click();
}

/** Đọc ảnh cục bộ bằng object URL; luôn thu hồi URL ở hàm gọi sau khi vẽ hoặc đọc lỗi. */
function decodeImage(url) {
  /** Chờ hai sự kiện tải ảnh, chuyển lỗi giải mã về Promise để vùng gọi luôn dọn object URL. */
  return new Promise(function waitForImage(resolve, reject) {
    const image = new Image();
    /** Trả ảnh đã giải mã để canvas dùng kích thước thật, không dựa trên phần mở rộng file. */
    function loaded() {
      resolve(image);
    }
    /** Báo lỗi tiếng Việt khi nội dung file không giải mã được thành ảnh. */
    function failed() {
      reject(new Error('Không đọc được ảnh này. Vui lòng chọn một ảnh JPG hoặc PNG khác.'));
    }
    image.onload = loaded;
    image.onerror = failed;
    image.src = url;
  });
}

/** Chặn định dạng hoặc dung lượng sai; ảnh đúng được cắt vuông giữa và thu về JPEG 256px chất lượng 0,85. */
async function uploadAvatar() {
  const file = fileInput.files[0];
  if (!file || busy || !ready || avatarProcessing || savingSections.has('avatar')) {
    return;
  }
  const hint = qs('[data-avatar-hint]');
  hint.hidden = true;
  fileInput.removeAttribute('aria-invalid');
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    hint.textContent = !['image/jpeg', 'image/png'].includes(file.type)
      ? 'Vui lòng chọn ảnh JPG hoặc PNG.'
      : 'Ảnh vượt quá 2MB. Vui lòng chọn ảnh nhỏ hơn.';
    hint.hidden = false;
    fileInput.setAttribute('aria-invalid', 'true');
    return;
  }
  avatarProcessing = true;
  renderSectionStates();
  const url = URL.createObjectURL(file);
  try {
    const image = await decodeImage(url);
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context || !side) {
      throw new Error('Không xử lý được ảnh này. Vui lòng thử một ảnh khác.');
    }
    // PNG trong suốt được ghép lên màu trắng có sẵn trong tokens trước khi xuất JPEG không hỗ trợ alpha.
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-white').trim();
    context.fillRect(0, 0, 256, 256);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    // Ảnh đại diện giữ dạng JPEG nhỏ trong avatar_url; nhóm đã bỏ yêu cầu endpoint upload.
    avatarUrl = canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    hint.textContent = error.message || 'Không xử lý được ảnh. Vui lòng thử lại.';
    hint.hidden = false;
    fileInput.setAttribute('aria-invalid', 'true');
  } finally {
    URL.revokeObjectURL(url);
    avatarProcessing = false;
    profileChanged();
  }
}

/** Xoá ảnh chỉ đổi trạng thái form, PATCH sau đó sẽ gửi avatar_url rỗng nếu ảnh gốc tồn tại. */
function removeAvatar() {
  avatarUrl = '';
  fileInput.value = '';
  fileInput.removeAttribute('aria-invalid');
  qs('[data-avatar-hint]').hidden = true;
  profileChanged();
}

/** Escape đóng bảng ảnh; chỉ trả focus khi người dùng đang ở trong bảng hoặc nút mở. */
function handleEscape(event) {
  if (event.key === 'Escape' && !presetsPanel.hidden) {
    const restoreFocus = presetsPanel.contains(document.activeElement) || document.activeElement === presetsToggle;
    setPresetsOpen(false, restoreFocus);
  }
}

/** Đảo trạng thái disclosure từ nút chọn ảnh, giữ cách dùng chuột và bàn phím thống nhất. */
function togglePresets() {
  setPresetsOpen(presetsPanel.hidden);
}

/** Đóng bằng nút trong disclosure và đưa focus về nút mở. */
function closePresets() {
  setPresetsOpen(false, true);
}

// Bắt đầu sau khi tất cả khai báo và hàm dùng lại đã sẵn sàng.
initialize();

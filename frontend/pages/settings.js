/** Cài đặt tái dùng trang Chỉnh sửa hồ sơ với DOM an toàn và các service chung, chỉ gửi dữ liệu sau khi bấm lưu. */
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { getMe, updateMe, changeMyPassword, deleteMyAccount, getProfileUpdatedAt } from '/services/api/users.js';
import { getToken, clearToken, readStorage, writeStorage } from '/services/api/client.js';
import { requireAuth, login, logout, fetchCurrentUser } from '/utils/auth.js';
import { toVietnameseMessage, fieldForError } from '/utils/errors.js';
import { initials } from '/utils/format.js';
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
const profileKeys = ['username', 'email', 'institute', 'address', 'bio', 'avatar_url', 'native'];
const passwordNames = ['current-password', 'new-password', 'confirm-password'];
const nativeLabels = { vi: 'Tiếng Việt', ja: '日本語', en: 'English' };
const presetLabels = ['Cổng torii', 'Hoa anh đào', 'Núi Phú Sĩ', 'Đèn lồng', 'Quạt giấy', 'Sóng biển'];
const savedKey = 'etsubi_profile_saved_at';
const form = qs('[data-profile-form]');
const fields = qs('[data-profile-fields]');
const submitButton = qs('[data-submit]');
const resetButton = qs('[data-reset]');
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
  username: 'Tên hiển thị trên bài viết và bình luận · tối thiểu 3 ký tự',
  email: 'Dùng để đăng nhập · đổi email áp dụng từ lần đăng nhập sau',
  bio: 'Hiển thị công khai trên trang hồ sơ của bạn',
  native: 'Hiển thị bằng lá cờ cạnh tên bạn trên bài viết và bình luận',
  'current-password': 'Bắt buộc khi đổi sang mật khẩu mới',
  'new-password': 'Tối thiểu 8 ký tự',
  'confirm-password': 'Nhập lại đúng mật khẩu mới',
};

/** Đọc dữ liệu hiện tại; trim văn bản hồ sơ nhưng giữ nguyên mọi ký tự của mật khẩu. */
function readValues() {
  return {
    username: input('username').value.trim(),
    email: input('email').value.trim(),
    institute: input('institute').value.trim(),
    address: input('address').value.trim(),
    bio: input('bio').value.trim(),
    avatar_url: avatarUrl,
    native: input('native').value,
  };
}

/** Đổi null thành chuỗi rỗng để việc so sánh không gửi lại các trường không thay đổi. */
function normalizeProfile(user) {
  const values = {};
  // Chỉ lấy đúng bảy trường được phép cập nhật, không đưa vai trò hay trạng thái vào PATCH.
  for (const key of profileKeys) {
    values[key] = typeof user[key] === 'string' ? user[key].trim() : '';
  }
  return values;
}

/** Tạo patch tối thiểu; chuỗi rỗng vẫn được gửi nếu người dùng chủ động xoá giá trị cũ. */
function changedFields() {
  const values = readValues();
  const patch = {};
  // So sánh từng trường với bản đã được API chấp nhận, không so sánh với dữ liệu mặc định giả.
  for (const key of profileKeys) {
    if (values[key] !== serverValues[key]) {
      patch[key] = values[key];
    }
  }
  return patch;
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

/** Điền đúng bản đã tải hoặc vừa lưu, bao gồm ngôn ngữ mẹ đẻ đã chọn từ trước. */
function fillValues(values) {
  // Trường văn bản được gán value, tuyệt đối không chèn chuỗi API bằng innerHTML.
  for (const key of ['username', 'email', 'institute', 'bio']) {
    input(key).value = values[key];
  }
  selectAddress(values.address);
  avatarUrl = values.avatar_url;
  // Bỏ chọn cả ba nếu API có giá trị lạ, để validate yêu cầu lựa chọn có nghĩa.
  for (const radio of qsa('[name="native"]', form)) {
    radio.checked = radio.value === values.native;
  }
  fileInput.value = '';
  fileInput.removeAttribute('aria-invalid');
  qs('[data-avatar-hint]').hidden = true;
  clearPasswords();
  clearErrors();
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

/** Khôi phục mọi gợi ý và bỏ lỗi form khi huỷ hoặc khi tải thành công. */
function clearErrors() {
  // Danh sách gợi ý bao phủ toàn bộ những trường có validation của trang.
  for (const name of Object.keys(defaultHints)) {
    setFieldError(name);
  }
  alertBox.hidden = true;
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

/** Đồng bộ phần trăm theo cùng sáu mục của Register Advanced và cập nhật tóm tắt khi nhập. */
function renderState() {
  const values = readValues();
  const complete = [Boolean(avatarUrl), validUsername(values.username), Boolean(values.institute), Boolean(values.address), Boolean(values.bio), Object.hasOwn(nativeLabels, values.native)];
  const percent = Math.round(complete.filter(Boolean).length / 6 * 100);
  const meter = qs('[data-progress]');
  meter.style.setProperty('--progress', percent + '%');
  meter.setAttribute('aria-valuenow', String(percent));
  qs('[data-percent]').textContent = String(percent);
  const summary = { ...values, address: values.address.split(',')[0], native: nativeLabels[values.native] || '' };
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
  // Chỉ hồ sơ và mật khẩu bật nút lưu/huỷ, tuỳ chọn giao diện không được tính vào đây.
  const unchanged = !Object.keys(changedFields()).length && !hasPasswordChanges();
  resetButton.disabled = busy || !ready || unchanged;
  submitButton.disabled = busy || !ready || unchanged;
  renderAvatar();
}

/** Khoá form khi tải hoặc ghi, mọi trạng thái chờ chỉ có chữ tĩnh. */
function setBusy(value, saving = false) {
  busy = value;
  fields.disabled = value || !ready;
  submitButton.disabled = value || !ready;
  qs('[data-delete-open]').disabled = value || !ready;
  form.setAttribute('aria-busy', String(value));
  submitButton.textContent = saving ? 'Đang lưu…' : 'Lưu thay đổi';
  if (serverValues) {
    renderState();
  } else {
    resetButton.disabled = true;
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
    fillValues(serverValues);
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

/** Validate cả hồ sơ và mật khẩu tự chọn, rồi chuyển focus tới lỗi đầu tiên theo thứ tự form. */
function validateForm() {
  const values = readValues();
  const errors = {
    username: validUsername(values.username) ? '' : 'Tên cần ít nhất 3 ký tự.',
    email: values.email && input('email').validity.valid ? '' : 'Vui lòng nhập địa chỉ email hợp lệ.',
    bio: input('bio').value.length <= 300 ? '' : 'Giới thiệu bản thân không được vượt quá 300 ký tự.',
    native: Object.hasOwn(nativeLabels, values.native) ? '' : 'Vui lòng chọn ngôn ngữ mẹ đẻ.',
  };
  const current = input('current-password').value;
  const next = input('new-password').value;
  const confirm = input('confirm-password').value;
  // Chỉ kiểm tra ba mật khẩu khi ít nhất một ô được nhập; không trim mật khẩu.
  errors['current-password'] = hasPasswordChanges() && !current ? 'Vui lòng nhập mật khẩu hiện tại.' : '';
  errors['new-password'] = !hasPasswordChanges() ? '' : !next ? 'Vui lòng nhập mật khẩu mới.'
    : Array.from(next).length < 8 ? 'Mật khẩu mới cần ít nhất 8 ký tự.'
    : next === current ? 'Mật khẩu mới phải khác mật khẩu hiện tại.' : '';
  errors['confirm-password'] = !hasPasswordChanges() ? '' : !confirm ? 'Vui lòng xác nhận mật khẩu mới.'
    : confirm !== next ? 'Mật khẩu xác nhận không khớp.' : '';
  let firstInvalid = null;
  // Mỗi lỗi có aria-invalid và aria-describedby, nhóm radio chuyển focus tới lựa chọn đầu.
  for (const [name, message] of Object.entries(errors)) {
    setFieldError(name, message);
    if (message && !firstInvalid) {
      firstInvalid = name === 'native' ? qs('[name="native"]', form) : input(name);
    }
  }
  firstInvalid?.focus();
  return !firstInvalid;
}

/** Nhận bản cập nhật thật, giữ baseline mới kể cả khi bước đổi mật khẩu kế tiếp thất bại. */
function acceptProfile(user, patch) {
  serverUser = { ...serverUser, ...patch, ...(user || {}) };
  serverValues = normalizeProfile(serverUser);
  markSaved();
}

/** Gửi hồ sơ trước, đổi mật khẩu sau và cấp lại JWT ngay vì endpoint mật khẩu huỷ token cũ. */
async function submitProfile(event) {
  event.preventDefault();
  if (!ready || busy || !validateForm()) {
    return;
  }
  const patch = changedFields();
  const changingPassword = hasPasswordChanges();
  if (!Object.keys(patch).length && !changingPassword) {
    showAlert('Không có thay đổi để lưu.', { success: true });
    return;
  }
  const remember = Boolean(readStorage('etsubi_token'));
  let stage = 'profile';
  let profileSaved = false;
  let passwordSaved = false;
  alertBox.hidden = true;
  setBusy(true, true);
  try {
    if (Object.keys(patch).length) {
      acceptProfile(await updateMe(patch), patch);
      profileSaved = true;
    }
    if (changingPassword) {
      stage = 'password';
      await changeMyPassword({ currentPassword: input('current-password').value, newPassword: input('new-password').value });
      passwordSaved = true;
      markSaved();
      stage = 'login';
      // Đăng nhập ngay, trước mọi lần GET /my tiếp theo, bằng email vừa được lưu và lựa chọn ghi nhớ cũ.
      await login(serverValues.email, input('new-password').value, { remember });
    } else {
      // Làm mới cache phiên để header nhận được tên và avatar mới sau PATCH /my.
      await fetchCurrentUser();
    }
    fillValues(serverValues);
    showAlert('Đã lưu thay đổi.', { success: true });
    mountHeader(qs('[data-component="header"]'), { active: null, searchForm: true });
  } catch (error) {
    if (passwordSaved && stage === 'login') {
      // Mật khẩu đã đổi thật dù đăng nhập lại lỗi, token cũ đã vô hiệu nên chuyển sang đăng nhập mới.
      clearPasswords();
      clearToken();
      location.assign(withRedirect(routes.login, routes.settings));
      return;
    }
    const name = fieldForError(error);
    if (stage === 'password' && error.status === 401) {
      setFieldError('current-password', 'Mật khẩu hiện tại không đúng.');
      input('current-password').focus();
    } else if (stage === 'profile' && ['username', 'email'].includes(name)) {
      setFieldError(name, toVietnameseMessage(error));
      input(name).focus();
    } else if (stage === 'password' && name === 'password') {
      setFieldError('new-password', toVietnameseMessage(error));
      input('new-password').focus();
    } else if (error.status !== 401) {
      showAlert(toVietnameseMessage(error));
    }
    if (profileSaved) {
      // Không báo thất bại toàn bộ khi PATCH hồ sơ đã thành công, người dùng chỉ cần sửa phần mật khẩu.
      showAlert('Thông tin hồ sơ đã được lưu. Phần đổi mật khẩu chưa hoàn tất. Vui lòng kiểm tra lại.');
    }
  } finally {
    setBusy(false);
  }
}

/** Huỷ thay đổi đưa cả avatar, radio và văn bản về baseline mới nhất, đồng thời xoá lỗi và mật khẩu. */
function resetProfile() {
  if (!ready || busy) {
    return;
  }
  fillValues(serverValues);
  setPresetsOpen(false);
  renderState();
}

/** Nhập liệu chỉ cập nhật tóm tắt và trạng thái nút huỷ, không tự lưu hoặc gọi API khi gõ. */
function profileChanged(event) {
  if (!ready || busy) {
    return;
  }
  const name = event?.target.name;
  if (Object.hasOwn(defaultHints, name)) {
    setFieldError(name);
  }
  alertBox.hidden = true;
  renderState();
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

/** Đổi thứ tự DOM của hai nút trên mobile để thứ tự Tab khớp thứ tự nhìn, nút lưu đứng đầu. */
function arrangeActions() {
  const saveActions = qs('[data-save-actions]');
  if (window.matchMedia('(max-width: 600px)').matches) {
    saveActions.prepend(submitButton);
  } else {
    saveActions.append(resetButton, submitButton);
  }
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

/** Gắn sự kiện một lần; không có beforeunload, autosave, hiệu ứng cuộn hoặc phụ thuộc thư viện. */
function initialize() {
  mountHeader(qs('[data-component="header"]'), { active: null, searchForm: true });
  mountFooter();
  initializePreferences();
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
  form.addEventListener('submit', submitProfile);
  fileInput.addEventListener('change', uploadAvatar);
  presetsToggle.addEventListener('click', togglePresets);
  qs('[data-presets-close]').addEventListener('click', closePresets);
  qs('[data-remove-avatar]').addEventListener('click', removeAvatar);
  resetButton.addEventListener('click', resetProfile);
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
  window.matchMedia('(max-width: 600px)').addEventListener('change', arrangeActions);
  arrangeActions();
  redirectLegacySessionAnchor();
  void loadProfile();
}

// Các hàm avatar và danh sách nơi ở bên dưới được dùng lại từ Register Advanced, giữ nguyên trang nguồn.


/** Lấy input theo name trong form để không phụ thuộc các lớp trình bày. */
function input(name) {
  return form.elements.namedItem(name);
}

/** Đo độ dài UTF-8 giống String::len của Rust; tên được trim trước khi kiểm tra và gửi. */
function validUsername(value) {
  return new TextEncoder().encode(value.trim()).length >= 3;
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
  avatarPreview.replaceChildren(initials(input('username').value) || 'E');
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
      const image = el('img', { src: source, alt: input('username').value || 'Ảnh đại diện của bạn', width: 90, height: 90 });
      image.addEventListener('error', showAvatarFallback, { once: true });
      avatarPreview.replaceChildren(image);
    } else {
      showAvatarFallback();
    }
  }
  const image = qs('img', avatarPreview);
  if (image) {
    image.alt = input('username').value || 'Ảnh đại diện của bạn';
  } else {
    showAvatarFallback();
  }
  qs('[data-remove-avatar]').disabled = busy || !avatarUrl;
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
  if (!file || busy || !ready) {
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
  setBusy(true);
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
    // CẦN BACKEND: Chưa có endpoint tải file; chỉ gửi chuỗi JPEG nhỏ trong trường avatar_url của PATCH /my.
    avatarUrl = canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    hint.textContent = error.message || 'Không xử lý được ảnh. Vui lòng thử lại.';
    hint.hidden = false;
    fileInput.setAttribute('aria-invalid', 'true');
  } finally {
    URL.revokeObjectURL(url);
    setBusy(false);
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

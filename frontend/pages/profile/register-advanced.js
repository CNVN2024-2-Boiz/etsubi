/** Hoàn thiện hồ sơ qua PATCH /my; mọi dữ liệu động được gán bằng DOM, không chèn HTML từ API. */
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { getMe, updateMe } from '/services/api/users.js';
import { getToken } from '/services/api/client.js';
import { requireAuth, safeRedirect } from '/utils/auth.js';
import { toVietnameseMessage, fieldForError } from '/utils/errors.js';
import { initials } from '/utils/format.js';
import { routes } from '/utils/routes.js';
import { el, qs, qsa } from '/utils/dom.js';
import { vietnamPlaces, japanPlaces } from '/utils/places.js';

// Chỉ các trường trong danh sách này được so sánh, lưu nháp và gửi lên API; không lưu JWT vào nháp.
const profileKeys = ['username', 'institute', 'address', 'bio', 'avatar_url', 'native'];
const nativeLabels = { vi: 'Tiếng Việt', ja: '日本語', en: 'English' };
const presetLabels = ['Cổng torii', 'Hoa anh đào', 'Núi Phú Sĩ', 'Đèn lồng', 'Quạt giấy', 'Sóng biển'];
const form = qs('[data-profile-form]');
const fields = qs('[data-profile-fields]');
const submitButton = qs('[data-submit]');
const draftButton = qs('[data-save-draft]');
const fileInput = qs('[data-avatar-file]');
const avatarPreview = qs('[data-avatar-preview]');
const presetsPanel = qs('[data-presets]');
const presetsToggle = qs('[data-presets-toggle]');
const alertBox = qs('[data-form-alert]');
let serverUser = null;
let serverValues = null;
let avatarUrl = '';
let draftTimer = null;
let ready = false;
let busy = true;
let finished = false;
let previewSource = null;
let usernameConflict = false;

/** Lấy input theo name trong form để không phụ thuộc các lớp trình bày. */
function input(name) {
  return form.elements.namedItem(name);
}

/** Đo độ dài UTF-8 giống String::len của Rust; tên được trim trước khi kiểm tra và gửi. */
function validUsername(value) {
  return new TextEncoder().encode(value.trim()).length >= 3;
}

/** Đọc giá trị hiện tại và trim các chuỗi sẽ gửi; avatar rỗng thể hiện yêu cầu xoá ảnh. */
function readValues() {
  return {
    username: input('username').value.trim(),
    institute: input('institute').value.trim(),
    address: input('address').value.trim(),
    bio: input('bio').value.trim(),
    avatar_url: avatarUrl,
    native: input('native').value,
  };
}

/** Chuẩn hoá null từ API thành chuỗi rỗng để không gửi các trường thực tế chưa thay đổi. */
function normalizeProfile(user) {
  const values = {};
  // Chỉ lấy các khoá cho phép, tránh đưa email hoặc thuộc tính phiên vào bản nháp.
  for (const key of profileKeys) {
    values[key] = typeof user[key] === 'string' ? user[key].trim() : '';
  }
  return values;
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

/** Điền các trường được phép từ server hoặc nháp, email luôn lấy duy nhất từ server. */
function fillValues(values, terms = false) {
  // Nháp hỏng từng trường được bỏ qua thay vì làm gián đoạn toàn bộ trang.
  for (const key of ['username', 'institute', 'bio']) {
    input(key).value = typeof values[key] === 'string' ? values[key] : '';
  }
  selectAddress(typeof values.address === 'string' ? values.address : '');
  avatarUrl = typeof values.avatar_url === 'string' ? values.avatar_url : '';
  // Gán checked cho từng radio vì RadioNodeList.value rỗng không tự bỏ chọn lựa chọn cũ.
  for (const radio of qsa('[name="native"]', form)) {
    radio.checked = radio.value === values.native;
  }
  input('terms').checked = terms === true;
}

/** Tạo khoá nháp theo id người dùng, tránh khôi phục dữ liệu nhầm tài khoản trên máy dùng chung. */
function draftKey() {
  return 'etsubi_profile_draft_' + serverUser.id;
}

/** Hiện thời gian lưu theo hh:mm sau khi localStorage đã ghi thành công. */
function showDraftTime(timestamp) {
  const time = new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  qs('[data-draft-label]').textContent = 'Đã lưu nháp · ' + time;
  qs('[data-draft-pill]').hidden = false;
}

/** Khôi phục nháp mới hơn updated_at; nếu API thiếu thời gian thì đối chiếu bản gốc đã lưu trong nháp. */
function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey()));
    if (!draft || draft.version !== 1 || draft.userId !== serverUser.id || !draft.values || !Number.isFinite(draft.timestamp)) {
      return;
    }
    const serverTime = Date.parse(serverUser.updated_at);
    const newer = Number.isFinite(serverTime)
      ? draft.timestamp > serverTime
      : draft.base === JSON.stringify(serverValues);
    if (!newer) {
      return;
    }
    fillValues(draft.values, draft.terms);
    showDraftTime(draft.timestamp);
  } catch {
    // JSON hỏng hoặc bộ nhớ bị chặn không ngăn người dùng sửa hồ sơ lấy từ server.
  }
}

/** Ghi nháp gồm đúng dữ liệu form và thời gian; lỗi ghi thủ công được báo rõ, tự lưu thì im lặng. */
function saveDraft(manual = false) {
  clearTimeout(draftTimer);
  if (!ready || busy || finished) {
    return;
  }
  // Tự lưu chỉ khi form khác dữ liệu trên máy chủ: nếu người dùng chưa sửa gì
  // thì không tạo nháp, để pill "Đã lưu nháp" không hiện sai ngay khi vừa mở trang.
  const current = readValues();
  const unchanged = Object.keys(current).every((key) => current[key] === serverValues[key]);
  if (!manual && unchanged) {
    return;
  }
  try {
    const timestamp = Date.now();
    localStorage.setItem(draftKey(), JSON.stringify({
      version: 1,
      userId: serverUser.id,
      timestamp,
      base: JSON.stringify(serverValues),
      values: readValues(),
      terms: input('terms').checked,
    }));
    showDraftTime(timestamp);
  } catch {
    if (manual) {
      showAlert('Không lưu được nháp trên trình duyệt này. Bạn vẫn có thể lưu hồ sơ lên máy chủ.');
    }
  }
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

/** Đồng bộ phần trăm, tóm tắt, ảnh và ba bước sau mỗi thay đổi mà không gửi yêu cầu mạng. */
function renderState() {
  const values = readValues();
  const usernameValid = validUsername(values.username);
  const nativeValid = Object.hasOwn(nativeLabels, values.native);
  const complete = [Boolean(avatarUrl), usernameValid, Boolean(values.institute), Boolean(values.address), Boolean(values.bio), nativeValid];
  const percent = Math.round(complete.filter(Boolean).length / 6 * 100);
  const meter = qs('[data-progress]');
  meter.style.setProperty('--progress', percent + '%');
  meter.setAttribute('aria-valuenow', String(percent));
  qs('[data-percent]').textContent = String(percent);
  const summary = {
    username: values.username,
    email: input('email').value,
    institute: values.institute,
    address: values.address.split(',')[0],
    native: nativeLabels[values.native] || '',
  };
  // textContent giữ API text ở dạng văn bản; title cung cấp giá trị đầy đủ khi nội dung bị ellipsis.
  for (const node of qsa('[data-summary]')) {
    const value = summary[node.dataset.summary];
    node.textContent = value || '–';
    node.title = value || 'Chưa nhập';
    node.classList.toggle('is-empty', !value);
    node.lang = node.dataset.summary === 'native' && values.native === 'ja' ? 'ja' : 'vi';
  }
  const stepsDone = [complete[0], usernameValid && complete[2] && complete[3], nativeValid];
  const currentIndex = stepsDone.indexOf(false);
  // Bước hiện tại là bước chưa xong đầu tiên; các bước hoàn thành độc lập vẫn giữ dấu check.
  for (const [index, item] of qsa('[data-step]').entries()) {
    const button = qs('[data-section-target]', item);
    const done = stepsDone[index];
    button.classList.toggle('is-done', done);
    qs('[data-step-dot]', item).textContent = done ? '' : String(index + 1);
    qs('[data-step-status]', item).textContent = done ? ' · Đã hoàn thành' : ' · Chưa hoàn thành';
    if (index === currentIndex) {
      button.setAttribute('aria-current', 'step');
    } else {
      button.removeAttribute('aria-current');
    }
  }
  const bioLength = input('bio').value.length;
  qs('[data-bio-counter]').textContent = bioLength + ' / 300';
  qs('[data-bio-counter]').classList.toggle('is-limit', bioLength >= 300);
  renderAvatar();
}

/** Hiện lỗi trường cùng aria-invalid; thông báo tên hợp lệ chỉ là kiểm tra cục bộ, không kiểm tra trùng qua API. */
function setFieldError(name, message = '') {
  const hint = qs('[data-' + name + '-hint]');
  const controls = name === 'native' ? qsa('[name="native"]', form) : [input(name)];
  // Radio cùng chung gợi ý, nên đánh dấu tất cả các lựa chọn khi nhóm chưa hợp lệ.
  for (const control of controls) {
    control.setAttribute('aria-invalid', String(Boolean(message)));
  }
  hint.classList.toggle('field__hint--error', Boolean(message));
  hint.classList.remove('field__hint--success');
  if (name === 'terms') {
    hint.hidden = !message;
    return;
  }
  const defaults = {
    username: 'Tên cần ít nhất 3 ký tự.',
    bio: 'Hiển thị công khai trên trang hồ sơ của bạn',
    native: 'Có thể thay đổi bất cứ lúc nào trong phần Cài đặt',
  };
  hint.textContent = message || defaults[name];
  if (name === 'username' && !message && validUsername(input(name).value)) {
    // Câu chữ theo Figma; trạng thái này chỉ xác nhận độ dài UTF-8, trùng tên được API kiểm tra khi gửi.
    hint.textContent = '✓ Tên người dùng khả dụng · tối thiểu 3 ký tự';
    hint.classList.add('field__hint--success');
  }
}

/** Hiện thông báo tiếng Việt tại form; nút thử lại chỉ xuất hiện khi việc tải hồ sơ thất bại. */
function showAlert(message, retry = false, info = false) {
  qs('[data-alert-message]').textContent = message;
  qs('[data-retry]').hidden = !retry;
  alertBox.classList.toggle('alert--error', !info);
  alertBox.classList.toggle('alert--info', info);
  alertBox.hidden = false;
}

/** Khoá dữ liệu và thao tác lưu khi xử lý, vẫn giữ nút quay lại và thử lại dùng được. */
function setBusy(value) {
  busy = value;
  fields.disabled = value || !ready;
  form.setAttribute('aria-busy', String(value));
  submitButton.disabled = value || !ready;
  draftButton.disabled = value || !ready;
  submitButton.textContent = value ? 'Đang xử lý…' : 'Tạo tài khoản ›';
  renderAvatar();
}

/** Đọc hồ sơ có xác thực; lỗi mạng nằm lại trang để thử lại thay vì bị requireAuth hiện tại coi là mất phiên. */
async function loadProfile() {
  if (busy && ready) {
    return;
  }
  // requireAuth dùng đúng luồng redirect chung khi không có token; GET /my xác minh token đã có.
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
    // Sau GET thành công, guard chung kiểm tra phiên và dùng hồ sơ đang được header nạp vào cache.
    if (!await requireAuth()) {
      return;
    }
    serverValues = normalizeProfile(serverUser);
    input('email').value = serverUser.email || '';
    fillValues(serverValues);
    restoreDraft();
    ready = true;
    usernameConflict = false;
    setFieldError('username');
    renderState();
  } catch (error) {
    if (error.status !== 401) {
      showAlert(toVietnameseMessage(error), true);
    }
  } finally {
    qs('[data-loading]').hidden = true;
    qs('[data-retry]').disabled = false;
    setBusy(false);
  }
}

/** Kiểm tra yêu cầu của API và điều khoản; trường không bắt buộc vẫn được để trống khi lưu. */
function validateForm() {
  const values = readValues();
  const errors = {
    username: validUsername(values.username) ? '' : 'Tên cần ít nhất 3 ký tự.',
    bio: input('bio').value.length <= 300 ? '' : 'Giới thiệu bản thân không được vượt quá 300 ký tự.',
    native: Object.hasOwn(nativeLabels, values.native) ? '' : 'Vui lòng chọn một ngôn ngữ mẹ đẻ.',
    terms: input('terms').checked ? '' : 'Vui lòng đồng ý với điều khoản và quy tắc cộng đồng.',
  };
  // Gửi lại tên đã báo trùng chỉ sau khi người dùng sửa, tránh xoá mất gợi ý 409.
  if (usernameConflict) {
    errors.username = 'Tên này đã có người dùng.';
  }
  let firstInvalid = null;
  for (const [name, message] of Object.entries(errors)) {
    setFieldError(name, message);
    if (message && !firstInvalid) {
      firstInvalid = name === 'native' ? qs('[name="native"]', form) : input(name);
    }
  }
  firstInvalid?.focus();
  return !firstInvalid;
}

/** Sau 600ms đọc thông báo thành công, chuyển tới trang cùng nguồn đã được kiểm tra an toàn. */
function goAfterSave() {
  const params = new URLSearchParams(location.search);
  location.assign(safeRedirect(params.get('redirect'), routes.home));
}

/** Gửi đúng các trường đổi bằng PATCH /my, xoá nháp khi server đã chấp nhận rồi mới chuyển trang. */
async function submitProfile(event) {
  event.preventDefault();
  if (!ready || busy || finished || !validateForm()) {
    return;
  }
  clearTimeout(draftTimer);
  alertBox.hidden = true;
  setBusy(true);
  const values = readValues();
  const patch = {};
  // Trường rỗng khác dữ liệu gốc vẫn được gửi để thao tác xoá có tác dụng, nhất là avatar_url.
  for (const key of profileKeys) {
    if (values[key] !== serverValues[key]) {
      patch[key] = values[key];
    }
  }
  try {
    if (Object.keys(patch).length) {
      await updateMe(patch);
    }
    finished = true;
    try {
      localStorage.removeItem(draftKey());
    } catch {
      // Bộ nhớ có thể bị chặn sau khi lưu; hồ sơ trên server vẫn đã được cập nhật thành công.
    }
    qs('[data-draft-pill]').hidden = true;
    showAlert('Đã lưu hồ sơ!', false, true);
    setTimeout(goAfterSave, 600);
  } catch (error) {
    if (error.status === 409 && fieldForError(error) === 'username') {
      usernameConflict = true;
      setFieldError('username', toVietnameseMessage(error));
      input('username').focus();
    } else if (error.status !== 401) {
      showAlert(toVietnameseMessage(error));
      alertBox.focus();
    }
  } finally {
    if (!finished) {
      setBusy(false);
      saveDraft();
    }
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

/** Thay đổi hồ sơ chỉ cập nhật DOM và hẹn tự lưu sau 1,5 giây, không gọi API khi đang gõ. */
function profileChanged(event) {
  if (!ready || busy || finished) {
    return;
  }
  if (event?.target.name === 'username') {
    usernameConflict = false;
    setFieldError('username', validUsername(input('username').value) ? '' : 'Tên cần ít nhất 3 ký tự.');
  }
  if (['bio', 'native', 'terms'].includes(event?.target.name)) {
    setFieldError(event.target.name);
  }
  renderState();
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 1500);
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
  clearTimeout(draftTimer);
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
    // Back end chưa có endpoint tải file: chỉ gửi chuỗi JPEG nhỏ trong trường avatar_url của PATCH /my.
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

/** Focus trực tiếp đề mục để trình duyệt cuộn mặc định, tuyệt đối không dùng cuộn mượt hoặc animation. */
function focusSection(event) {
  document.getElementById(event.currentTarget.dataset.sectionTarget)?.focus();
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

/** Lưu thủ công dùng cùng định dạng với tự lưu, chỉ khác việc báo lỗi bộ nhớ. */
function saveDraftManually() {
  saveDraft(true);
}

/** Quay lại trang trước trong cùng website, hoặc về Home khi mở trang trực tiếp. */
function goBack() {
  saveDraft();
  if (history.length > 1 && document.referrer.startsWith(location.origin + '/')) {
    history.back();
  } else {
    location.assign(routes.home);
  }
}

/** Chặn liên kết # đang chờ nội dung để không làm nhảy trang hoặc thay đổi checkbox ngoài ý muốn. */
function keepTermsPosition(event) {
  event.preventDefault();
}

/** Đổi thứ tự DOM của nút theo breakpoint để thứ tự Tab luôn trùng bố cục desktop hoặc mobile. */
function arrangeActions() {
  const actions = qs('[data-actions]');
  const saveActions = qs('[data-save-actions]');
  const backButton = qs('[data-back]');
  if (window.matchMedia('(max-width: 600px)').matches) {
    saveActions.prepend(submitButton);
    actions.append(backButton);
  } else {
    saveActions.append(draftButton, submitButton);
    actions.prepend(backButton);
  }
}

/** Gắn sự kiện một lần và khởi tạo mọi thành phần mà không tạo biến toàn cục. */
function initialize() {
  mountHeader();
  mountFooter();
  buildPlaces();
  buildPresets();
  // URL dùng routes chung; HTML vẫn giữ đường dẫn dự phòng có nghĩa nếu module chưa chạy.
  for (const link of qsa('[data-route]')) {
    link.href = routes[link.dataset.route];
  }
  for (const button of qsa('[data-upload]')) {
    button.addEventListener('click', openFilePicker);
  }
  for (const button of qsa('[data-section-target]')) {
    button.addEventListener('click', focusSection);
  }
  for (const link of qsa('[data-terms-link]')) {
    link.addEventListener('click', keepTermsPosition);
  }
  form.addEventListener('input', profileChanged);
  form.addEventListener('change', profileChanged);
  form.addEventListener('submit', submitProfile);
  fileInput.addEventListener('change', uploadAvatar);
  presetsToggle.addEventListener('click', togglePresets);
  qs('[data-presets-close]').addEventListener('click', closePresets);
  qs('[data-remove-avatar]').addEventListener('click', removeAvatar);
  draftButton.addEventListener('click', saveDraftManually);
  qs('[data-back]').addEventListener('click', goBack);
  qs('[data-retry]').addEventListener('click', loadProfile);
  document.addEventListener('keydown', handleEscape);
  // Khi rời trang, lưu nháp ở chế độ tự động: chỉ ghi nếu form đã khác dữ liệu máy chủ.
  window.addEventListener('pagehide', () => saveDraft());
  window.matchMedia('(max-width: 600px)').addEventListener('change', arrangeActions);
  arrangeActions();
  void loadProfile();
}

initialize();

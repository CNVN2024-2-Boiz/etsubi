/** Trang Quên mật khẩu: xin link đặt lại qua mail, rồi đặt mật khẩu mới từ link đó. */
import { mountAuthShell } from '/utils/auth-page.js';
import { forgotPassword, resetPassword } from '/services/api/auth.js';
import { routes } from '/utils/routes.js';
import { qs, el } from '/utils/dom.js';
import { t } from '/utils/i18n.js';
import { authFieldMessage } from '/utils/validation.js';
import { toVietnameseMessage } from '/utils/errors.js';

mountAuthShell({
  title: t('XIN CHÀO'),
  copyLines: [t('Cầu nối văn hoá Việt – Nhật'), t('cho sinh viên đại học.')],
});

const state = qs('[data-state]');
const params = new URLSearchParams(location.search);
const token = params.get('token');

/** Thay nội dung thẻ bằng tiêu đề, lời dẫn và phần thân (biểu mẫu hoặc nút). */
function show(title, lines, ...body) {
  state.replaceChildren(
    el('h1', { className: 't-display auth-card__title', id: 'auth-title' }, title),
    ...lines.map(line => el('p', { className: 'auth-card__subtitle' }, line)),
    ...body,
  );
}

/**
 * Một trường nhập theo cấu trúc chung của trang xác thực, có vùng gợi ý lỗi riêng.
 * @param {object} options name, type, label, autocomplete và giá trị ban đầu.
 * @returns {{ wrap: HTMLElement, input: HTMLInputElement, setError: Function }} Trường đã dựng.
 */
function field({ name, type, label, autocomplete, value = '' }) {
  const hint = el('p', { className: 'field__hint field__hint--error', id: name + '-hint', hidden: true });
  const input = el('input', { className: 'input', id: name, name, type, autocomplete, value, 'aria-describedby': name + '-hint', required: true });
  const wrap = el('div', { className: 'field' }, el('label', { className: 'field__label', for: name }, label), input, hint);
  /** Bật hoặc tắt lỗi của trường, đồng bộ aria-invalid cho trình đọc màn hình. */
  function setError(message) {
    input.classList.toggle('is-invalid', Boolean(message));
    wrap.classList.toggle('is-invalid', Boolean(message));
    input.setAttribute('aria-invalid', String(Boolean(message)));
    hint.textContent = message || '';
    hint.hidden = !message;
  }
  return { wrap, input, setError };
}

/** Khoá nút trong lúc gửi bằng chữ tĩnh, trả về hàm mở khoá. */
function busy(button, label) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  return () => {
    button.disabled = false;
    button.textContent = original;
  };
}

/** Bước 1: nhập email để nhận link đặt lại mật khẩu. */
function requestStep() {
  const email = field({ name: 'email', type: 'email', label: 'Email', autocomplete: 'email', value: params.get('email') ?? '' });
  const note = el('p', { className: 'alert alert--info auth-card__message', role: 'status', hidden: true });
  const submit = el('button', { className: 'btn btn--primary btn--block', type: 'submit' }, t('Gửi link đặt lại mật khẩu'));
  const form = el('form', { className: 'auth-card__done', novalidate: true }, email.wrap, submit, note);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const message = authFieldMessage('email', { value: email.input.value });
    email.setError(message);
    if (message) {
      email.input.focus();
      return;
    }
    const release = busy(submit, t('Đang gửi…'));
    try {
      await forgotPassword(email.input.value.trim());
      // Máy chủ không cho biết email có tồn tại hay không, nên câu trả lời luôn giống nhau.
      show(t('Kiểm tra hộp thư của bạn'), [
        t('Nếu {email} đã đăng ký Etsubi, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút. Link hết hạn sau 30 phút.', { email: email.input.value.trim() }),
        t('Không thấy mail? Hãy xem thư mục Spam hoặc Quảng cáo.'),
      ], el('a', { className: 'btn btn--secondary btn--block', href: routes.login }, t('Về trang đăng nhập')));
    } catch (error) {
      note.textContent = toVietnameseMessage(error);
      note.hidden = false;
      release();
    }
  });
  show(t('Quên mật khẩu'), [t('Nhập email bạn đã dùng để đăng ký. Etsubi sẽ gửi link để bạn đặt mật khẩu mới.')], form,
    el('p', { className: 'auth-card__switch' }, el('a', { href: routes.login }, t('Về trang đăng nhập'))));
  email.input.focus();
}

/** Bước 2: mở từ link trong mail, đặt mật khẩu mới. */
function resetStep() {
  // Xoá token khỏi thanh địa chỉ; token vẫn giữ trong biến để gửi khi bấm nút.
  history.replaceState(null, '', routes.resetPassword);
  const password = field({ name: 'password', type: 'password', label: t('Mật khẩu mới'), autocomplete: 'new-password' });
  const confirm = field({ name: 'confirm', type: 'password', label: t('Nhập lại mật khẩu mới'), autocomplete: 'new-password' });
  const alert = el('p', { className: 'alert alert--error auth-card__message', role: 'alert', hidden: true });
  const submit = el('button', { className: 'btn btn--primary btn--block', type: 'submit' }, t('Đổi mật khẩu'));
  const form = el('form', { className: 'auth-card__done', novalidate: true }, password.wrap, confirm.wrap, submit, alert);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const passwordError = authFieldMessage('password', { value: password.input.value, register: true });
    const confirmError = authFieldMessage('confirm', { value: confirm.input.value, password: password.input.value });
    password.setError(passwordError);
    confirm.setError(confirmError);
    if (passwordError || confirmError) {
      (passwordError ? password : confirm).input.focus();
      return;
    }
    alert.hidden = true;
    const release = busy(submit, t('Đang xử lý…'));
    try {
      await resetPassword(token, password.input.value);
      show(t('Đã đổi mật khẩu'), [t('Mọi phiên đăng nhập cũ đã bị đăng xuất. Hãy đăng nhập lại bằng mật khẩu mới.')],
        el('a', { className: 'btn btn--primary btn--block', href: routes.login }, t('Đăng nhập')));
    } catch (error) {
      if (error?.data?.code === 'invalid_link') {
        show(t('Link không hợp lệ hoặc đã hết hạn'), [t('Link đặt lại mật khẩu chỉ dùng được một lần trong 30 phút. Hãy xin link mới.')],
          el('a', { className: 'btn btn--primary btn--block', href: routes.resetPassword }, t('Xin link mới')));
        return;
      }
      alert.textContent = toVietnameseMessage(error);
      alert.hidden = false;
      release();
    }
  });
  show(t('Đặt mật khẩu mới'), [t('Mật khẩu cần ít nhất 8 ký tự.')], form);
  password.input.focus();
}

if (token) {
  resetStep();
} else {
  requestStep();
}

/** Tương tác biểu mẫu dùng chung cho login và register; mỗi trang tự xử lý bước gửi API. */
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { mountAuthScene } from '/components/auth-scene/auth-scene.js';
import { fetchCurrentUser, logout } from '/utils/auth.js';
import { qs, qsa, el } from '/utils/dom.js';
import { routes, withRedirect } from '/utils/routes.js';
import { fieldForError, toVietnameseMessage } from '/utils/errors.js';
import { authFieldMessage } from '/utils/validation.js';

/**
 * Khởi tạo header, footer, cảnh và kiểm tra biểu mẫu trên trang login hoặc register.
 * @param {object} options mode chọn trang; onSubmit xử lý API; copyLines là lời giới thiệu.
 * @returns {HTMLFormElement} Biểu mẫu đã gắn các bộ lắng nghe.
 */
export function initAuthPage({ mode, onSubmit, copyLines }) {
  mountHeader(undefined, { active: null, hideAuthLink: true });
  mountFooter();
  mountAuthScene(qs('[data-component="auth-scene"]'), { copyLines });
  const scene = qs('[data-auth-scene]');
  /** Co cảnh theo bề rộng màn hình; đây là cập nhật bố cục, không phải animation. */
  function sizeScene() {
    const scale = Math.min(1, Math.max(window.innerWidth / 1920, 0.6));
    scene.style.setProperty('--scene-scale', String(scale));
  }
  sizeScene();
  window.addEventListener('resize', sizeScene, { passive: true });

  // Giữ trang quay lại khi người dùng đổi qua lại giữa hai biểu mẫu xác thực.
  const form = qs('[data-auth-form]');
  const submit = qs('[data-submit]', form);
  const submitLabel = submit.textContent;
  const formAlert = qs('[data-form-alert]', form);
  const info = qs('[data-info-alert]', form);
  const redirect = new URLSearchParams(location.search).get('redirect');
  qs('[data-auth-switch]').href = withRedirect(mode === 'login' ? routes.register : routes.login, redirect);
  let submitted = false;
  let busy = false;
  const fields = qsa('[data-field]', form);

  /** Tìm điều khiển theo tên biểu mẫu thay vì dùng lớp trang trí CSS. */
  function inputFor(name) {
    return form.elements.namedItem(name);
  }

  /** Hiện thông báo phụ bằng văn bản an toàn, không chặn tương tác bằng alert. */
  function showInfo(message) {
    info.textContent = message;
    info.hidden = false;
  }

  /** Đồng bộ viền lỗi, gợi ý và aria-invalid để cả mắt và trình đọc đều nhận biết lỗi. */
  function markField(name, message) {
    const input = inputFor(name);
    const field = fields.find(node => node.dataset.field === name);
    if (!input || !field) {
      return;
    }
    const hint = document.getElementById(name + '-hint');
    input.classList.toggle('is-invalid', Boolean(message));
    field.classList.toggle('is-invalid', Boolean(message));
    input.setAttribute('aria-invalid', String(Boolean(message)));
    hint.textContent = message || '';
    hint.hidden = !message;
  }

  /** Kiểm tra một trường với cùng quy tắc trước khi gửi và khi người dùng rời trường. */
  function validate(name) {
    const input = inputFor(name);
    const message = authFieldMessage(name, {
      value: input.value,
      checked: input.checked,
      password: inputFor('password').value,
      register: mode === 'register',
    });
    markField(name, message);
    return !message;
  }

  // Chỉ nhắc lỗi sau lần gửi đầu tiên để không báo lỗi khi người dùng mới bắt đầu nhập.
  for (const field of fields) {
    const input = inputFor(field.dataset.field);
    input.addEventListener('blur', () => {
      if (submitted) {
        validate(input.name);
      }
    });
    if (input.type === 'checkbox') {
      input.addEventListener('change', () => {
        if (submitted) {
          validate(input.name);
        }
      });
    }
    // Khi đổi mật khẩu gốc, cần kiểm tra lại ô xác nhận đã nhập.
    if (input.name === 'password' && mode === 'register') {
      input.addEventListener('blur', () => {
        if (submitted && inputFor('confirm').value) {
          validate('confirm');
        }
      });
    }
  }

  // Giữ nút mắt và trạng thái hỗ trợ đọc màn hình đồng bộ với kiểu ô mật khẩu.
  for (const button of qsa('[data-password-toggle]')) {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(visible));
      button.setAttribute('aria-label', visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    });
  }

  // Các chức năng chưa có API dùng thông báo tĩnh để người dùng biết tình trạng.
  qs('[data-forgot]')?.addEventListener('click', event => {
    event.preventDefault();
    showInfo('Tính năng khôi phục mật khẩu sẽ sớm có.');
  });
  qs('[data-terms-link]')?.addEventListener('click', () => {
    showInfo('Điều khoản sử dụng sẽ được cập nhật tại trung tâm trợ giúp.');
  });

  // Nếu đã đăng nhập, cho phép đăng xuất ngay mà vẫn giữ biểu mẫu hiện tại.
  void fetchCurrentUser().then(user => {
    if (!user) {
      return;
    }
    const notice = qs('[data-session-notice]');
    const signOut = el('button', { type: 'button' }, 'đăng xuất');
    signOut.addEventListener('click', () => {
      signOut.disabled = true;
      void logout();
    });
    notice.replaceChildren('Bạn đang đăng nhập với tên ' + user.username + '. Tiếp tục hoặc ', signOut, '.');
    notice.hidden = false;
  });

  // Kiểm tra toàn bộ trường trước khi khoá nút, gửi API và trả lỗi về đúng chỗ.
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) {
      return;
    }
    submitted = true;
    formAlert.hidden = true;
    info.hidden = true;
    const invalid = fields.filter(field => !validate(field.dataset.field));
    if (invalid.length) {
      inputFor(invalid[0].dataset.field).focus();
      return;
    }
    // Trạng thái chờ là chữ tĩnh và nút mờ, không dùng spinner hoặc animation.
    busy = true;
    submit.disabled = true;
    submit.classList.add('is-loading');
    submit.textContent = 'Đang xử lý…';
    form.setAttribute('aria-busy', 'true');
    try {
      const values = Object.fromEntries(new FormData(form));
      values.email = values.email.trim();
      if (values.username) {
        values.username = values.username.trim();
      }
      await onSubmit(values, { redirect, showInfo });
    } catch (error) {
      const field = fieldForError(error);
      const message = toVietnameseMessage(error);
      if (field && inputFor(field)) {
        markField(field, message);
        inputFor(field).focus();
      } else {
        formAlert.textContent = message;
        formAlert.hidden = false;
      }
    } finally {
      // Phục hồi cả nhãn lẫn trạng thái để người dùng có thể sửa lỗi và gửi lại.
      busy = false;
      submit.disabled = false;
      submit.classList.remove('is-loading');
      submit.textContent = submitLabel;
      form.removeAttribute('aria-busy');
    }
  });
  return form;
}

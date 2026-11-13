/** Khởi tạo trang đăng ký, tự đăng nhập rồi chuyển sang bước bổ sung hồ sơ. */
import { initAuthPage } from '/utils/auth-page.js';
import { registerAndLogin, login, safeRedirect } from '/utils/auth.js';
import { readStorage } from '/services/api/client.js';
import { routes, withRedirect } from '/utils/routes.js';

// Ghi nhớ email đã tạo trong lần gửi này để lỗi đăng nhập không dẫn đến đăng ký trùng.
let createdEmail = null;

// Lời chào và thao tác gửi riêng; các trường và thông báo dùng chung với trang login.
initAuthPage({
  mode: 'register',
  copyLines: ['Cùng khám phá văn hoá Việt – Nhật', 'cùng cộng đồng sinh viên.'],
  /** Đăng ký với ngôn ngữ đã chọn; nếu tài khoản đã tạo thì chỉ thử đăng nhập lại. */
  async onSubmit(values, { redirect, showInfo }) {
    const storedLanguage = readStorage('etsubi_lang');
    const language = ['vi', 'ja', 'en'].includes(storedLanguage) ? storedLanguage : 'vi';
    try {
      if (createdEmail === values.email) {
        await login(values.email, values.password, { remember: true });
      } else {
        await registerAndLogin({
          username: values.username,
          email: values.email,
          password: values.password,
          native: 'vi',
          language,
        }, { remember: true });
      }
    } catch (error) {
      // API tạo tài khoản và API đăng nhập là hai bước, có thể chỉ bước đầu thành công.
      if (error.accountCreated) {
        createdEmail = values.email;
      }
      if (createdEmail === values.email) {
        showInfo('Tài khoản đã được tạo. Vui lòng thử đăng nhập lại hoặc chuyển sang trang Đăng nhập.');
      }
      throw error;
    }
    location.assign(withRedirect(routes.registerAdvanced, redirect ? safeRedirect(redirect) : null));
  },
});

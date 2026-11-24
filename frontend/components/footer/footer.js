/** Chân trang dùng chung: bản rút gọn cho xác thực và bản bốn cột cho trang nội dung. */
import { el, qs } from '/utils/dom.js';
import { routes } from '/utils/routes.js';
import { t } from '/utils/i18n.js';

/** Đánh dấu riêng chữ Nhật để dùng đúng phông có ký tự tiếng Nhật. */
function japan() {
  return el('span', { lang: 'ja' }, '越日');
}

/** Giữ nguyên chuỗi Etsubi để phông logo tạo đúng liên tự thương hiệu. */
function brand() {
  return el('span', { className: 'brand-word' }, 'Etsubi');
}

/**
 * Gắn chân trang vào mọi trang Etsubi mà không sao chép markup vào từng HTML.
 * @param {HTMLElement} target Vùng data-component="footer" của trang.
 * @param {object} options variant là slim cho xác thực hoặc full cho nội dung.
 * @returns {HTMLElement|null} Chân trang đã dựng hoặc null nếu không có vùng gắn.
 */
export function mountFooter(target = qs('[data-component="footer"]'), { variant = target?.dataset.variant || 'full' } = {}) {
  if (!target) {
    return null;
  }
  target.classList.add('site-footer');
  target.classList.toggle('site-footer--slim', variant === 'slim');
  target.classList.toggle('site-footer--full', variant === 'full');
  const mobile = el('p', { className: 'site-footer__mobile' }, '© 2026 ', brand());
  // Bản xác thực chỉ có dòng bản quyền, nhường không gian cho biểu mẫu.
  if (variant === 'slim') {
    const copy = el('p', { className: 'site-footer__slim-copy' },
      '© 2026 Etsubi · ', japan(), '  |  IE104 – UIT  |  ', t('Cầu nối văn hoá Việt – Nhật')
    );
    target.replaceChildren(copy, mobile);
    return target;
  }

  // Mỗi biểu tượng có tên truy cập trên liên kết, ảnh chỉ là phần trang trí.
  const socialLinks = ['facebook', 'x', 'instagram', 'youtube'].map(name => {
    const label = name === 'x' ? 'X' : name[0].toUpperCase() + name.slice(1);
    return el('a', { href: '#', 'aria-label': label },
      el('img', {
        src: '/assets/icons/social-' + name + '.svg',
        width: 34,
        height: 34,
        alt: '',
      })
    );
  });
  const socials = el('div', { className: 'site-footer__socials' }, socialLinks);
  const intro = el('div', { className: 'site-footer__column' },
    el('a', { className: 'site-footer__brand', href: routes.home }, brand(), ' · ', japan()),
    el('p', { className: 'site-footer__description' },
      t('Nền tảng kết nối sinh viên Việt – Nhật.'),
      el('br'),
      t('Chia sẻ kiến thức, xây dựng cộng đồng.')
    ),
    socials
  );

  /** Dựng một cột với tiêu đề và danh sách, cho phép dòng liên hệ không có liên kết. */
  function column(title, links) {
    const entries = links.map(([label, href]) => {
      return el('li', {}, href ? el('a', { href }, label) : label);
    });
    return el('div', { className: 'site-footer__column' },
      el('h2', { className: 'site-footer__title' }, title),
      el('ul', { className: 'site-footer__links' }, entries)
    );
  }

  // Các đường dẫn tập trung trong routes để footer luôn thống nhất với header.
  const grid = el('div', { className: 'site-footer__grid' },
    intro,
    column(t('Liên kết'), [
      [t('Trang chủ'), routes.home],
      [t('Diễn đàn'), routes.forum],
      [t('Bài viết'), routes.forum],
      [t('Cộng đồng'), routes.forum],
    ]),
    column(t('Tài nguyên'), [
      [t('Trung tâm trợ giúp'), routes.support],
      [t('Điều khoản sử dụng'), routes.terms],
      [t('Chính sách quyền riêng tư'), routes.privacy],
      [t('Phản hồi'), routes.support + '#feedback'],
    ]),
    column(t('Liên hệ'), [
      ['contact@etsubi.vn', 'mailto:contact@etsubi.vn'],
      ['+84 28 1234 5678', 'tel:+842812345678'],
      [t('TP. Hồ Chí Minh, Việt Nam'), null],
    ])
  );
  const content = el('div', { className: 'container site-footer__content' },
    grid,
    el('div', { className: 'site-footer__divider', 'aria-hidden': 'true' }),
    el('p', { className: 'site-footer__copyright' },
      '© 2026 Etsubi · ', japan(), ' – All rights reserved.'
    )
  );
  target.replaceChildren(content, mobile);
  return target;
}

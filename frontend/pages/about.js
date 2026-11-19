/** Trang Giới thiệu (Figma 1:1737): nội dung tĩnh trong HTML; module chỉ gắn header, footer và cánh hoa trang trí. */
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { el, qs, qsa } from '/utils/dom.js';

// Header có tab Giới thiệu đang chọn và ô tìm kiếm trong suốt như Figma; footer đầy đủ.
mountHeader(qs('[data-component="header"]'), { active: 'about', searchForm: true });
mountFooter();

/** Tạo một cánh hoa tĩnh; file SVG đã có đúng kích thước, vị trí và góc xoay nằm trong CSS. */
function petal(className, file) {
  return el('img', { className, src: '/assets/illustrations/sakura-' + file + '.svg', alt: '' });
}

/** Gắn cánh hoa cho banner (6), lề phần nội dung (7) và dải đỏ của từng thẻ thành viên (4 mỗi thẻ). */
function mountPetals() {
  // Số file sakura được chọn theo kích thước từng cánh trong Figma (đã đối chiếu khung bao).
  [1, 2, 3, 4, 5, 6].forEach((file, index) => {
    qs('[data-hero-petals]').append(petal('about-petal about-petal--hero-' + (index + 1), file));
  });
  [3, 5, 3, 2, 6, 4, 11].forEach((file, index) => {
    qs('[data-petals]').append(petal('about-petal about-petal--main-' + (index + 1), file));
  });
  for (const cover of qsa('[data-member-cover]')) {
    [1, 3, 5, 2].forEach((file, index) => {
      cover.append(petal('about-member__petal about-member__petal--' + (index + 1), file));
    });
  }
}

mountPetals();

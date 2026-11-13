/** Cảnh torii và lời chào dùng chung cho trang đăng nhập và đăng ký, không có animation. */
import { el } from '/utils/dom.js';

/** Tạo ảnh trang trí với alt rỗng; lớp cha đã được ẩn khỏi trình đọc màn hình. */
function sceneImage(className, fileName) {
  return el('img', {
    className,
    src: '/assets/illustrations/' + fileName + '.svg',
    alt: '',
  });
}

/**
 * Gắn cảnh và lời chào vào placeholder của trang login hoặc register.
 * @param {HTMLElement} container Vùng data-component="auth-scene" trong trang.
 * @param {object} options title là lời chào, copyLines là mảng các dòng giới thiệu.
 * @returns {HTMLElement|null} Vùng chứa đã gắn cảnh hoặc null khi không có vùng chứa.
 */
export function mountAuthScene(container, { title = container?.dataset.title || '', copyLines = [] } = {}) {
  if (!container) {
    return null;
  }
  // Tách ba lớp như markup gốc để thứ tự mặt trời, sóng và cổng không đổi.
  const backdrop = el('div', { className: 'auth-scene__stage' });
  backdrop.append(sceneImage('auth-scene__item auth-scene__sun', 'sun'));
  for (let index = 1; index <= 3; index++) {
    backdrop.append(sceneImage('auth-scene__item auth-scene__cloud-' + index, 'cloud-' + index));
  }
  const waves = el('div', { className: 'auth-scene__waves' });
  for (let index = 1; index <= 3; index++) {
    waves.append(sceneImage('auth-scene__wave auth-scene__wave--' + index, 'wave-' + index));
  }
  // Các khối màu của cổng vẫn dùng cùng lớp CSS và token như hai trang trước đây.
  const gate = el('div', { className: 'auth-scene__stage' });
  const gateParts = ['pillar-left', 'pillar-right', 'cap', 'kasagi', 'nuki', 'plaque'];
  for (const part of gateParts) {
    gate.append(el('div', { className: 'auth-scene__item auth-scene__' + part }));
  }
  gate.append(el('span', { className: 'auth-scene__item auth-scene__character', lang: 'ja' }, '越'));
  // Góc xoay và vị trí cánh hoa là bố trí tĩnh, không có bộ hẹn giờ di chuyển.
  for (let index = 1; index <= 14; index++) {
    gate.append(sceneImage('auth-scene__item auth-scene__petal-' + index, 'sakura-' + index));
  }
  const scene = el('div', { className: 'auth-scene', 'aria-hidden': 'true' }, backdrop, waves, gate);

  // Dựng từng dòng bằng text node để nội dung tuỳ chọn không trở thành mã HTML.
  const copy = el('p', { className: 'auth-hero__copy' });
  copyLines.forEach((line, index) => {
    if (index > 0) {
      copy.append(el('br'));
    }
    copy.append(document.createTextNode(String(line)));
  });
  const hero = el('div', { className: 'auth-hero' },
    el('div', { className: 'auth-hero__accent', 'aria-hidden': 'true' }),
    el('p', { className: 'auth-hero__title' }, title),
    el('p', { className: 'auth-hero__brand' },
      el('span', { lang: 'ja' }, '越日'),
      el('span', {}, '·'),
      el('span', { className: 'brand-word' }, 'Etsubi')
    ),
    copy
  );
  container.replaceChildren(scene, hero);
  return container;
}

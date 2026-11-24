/** Gắn khung pháp lý và điều hướng theo các mục có sẵn trong HTML. */
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { el, qs, qsa } from '/utils/dom.js';
import { currentLocale, t, translatePage } from '/utils/i18n.js';

// Dịch nội dung trước để mục lục dùng đúng tiêu đề và số theo ngôn ngữ hiện tại.
translatePage();
mountHeader(qs('[data-component="header"]'), { active: null, searchForm: true });
mountFooter();

const list = qs('[data-legal-toc]');
const toggle = qs('[data-legal-toc-toggle]');
const sections = qsa('[data-legal-section]');
const formatNumber = new Intl.NumberFormat(currentLocale());
const narrow = matchMedia('(max-width: 600px)');

// Dùng các tiêu đề trong thân trang làm mục lục để Quân và Phú chỉ cần khai báo mỗi mục một lần.
const links = sections.map((section, index) => {
  const number = formatNumber.format(index + 1);
  qs('[data-legal-number]', section).textContent = number + '. ';
  const link = el('a', { href: '#' + section.id, className: 'legal-toc__link' },
    el('span', { 'aria-hidden': 'true' }, number + '.'),
    el('span', {}, qs('[data-legal-heading]', section).textContent)
  );
  list.append(el('li', {}, link));
  return link;
});
qs('[data-legal-toc-label]').textContent = t('Mục lục · {count} mục', { count: formatNumber.format(sections.length) });

/** Chỉ đánh dấu một liên kết tương ứng với mục đang đọc. */
function markCurrent(index) {
  links.forEach((link, position) => {
    if (position === index) {
      link.setAttribute('aria-current', 'true');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

/** Trên điện thoại, cho phép đóng danh sách mà không ẩn mục lục desktop. */
function setExpanded(expanded) {
  toggle.setAttribute('aria-expanded', String(expanded));
  list.hidden = narrow.matches && !expanded;
}

// Mở hoặc đóng mục lục; liên kết vẫn dùng hành vi tìm fragment gốc của trình duyệt.
toggle.addEventListener('click', () => setExpanded(toggle.getAttribute('aria-expanded') !== 'true'));
narrow.addEventListener('change', () => setExpanded(false));
setExpanded(false);
list.addEventListener('click', event => {
  const link = event.target.closest('.legal-toc__link');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const index = links.indexOf(link);
  markCurrent(index);
  if (narrow.matches) {
    setExpanded(false);
    sections[index].focus({ preventScroll: true });
  }
});

/** Chọn mục mới nhất đã đi qua vùng đọc, kể cả khi giữa hai mục có khoảng trống. */
function markVisibleSection() {
  const line = window.innerHeight * .35;
  const index = sections.findLastIndex(section => section.getBoundingClientRect().top <= line);
  markCurrent(Math.max(0, index));
}

// Vùng quan sát hẹp cập nhật mục đang đọc khi cuộn mà không điều khiển vị trí cuộn.
let observer;

/** Dùng điểm ảnh để đường đọc luôn tính theo chiều cao, kể cả khi đổi kích thước màn hình. */
function observeSections() {
  observer?.disconnect();
  const bottomMargin = Math.round(window.innerHeight * .65);
  observer = new IntersectionObserver(markVisibleSection, { rootMargin: `0px 0px -${bottomMargin}px 0px` });
  sections.forEach(section => observer.observe(section));
  markVisibleSection();
}

window.addEventListener('resize', observeSections);
observeSections();

/** Gắn khung pháp lý và điều hướng theo các mục có sẵn trong HTML. */
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { el, qs, qsa } from '/utils/dom.js';
import { currentLocale, t } from '/utils/i18n.js';

// Các mô-đun đã dịch HTML; dùng header và footer chung như các trang nội dung.
mountHeader(qs('[data-component="header"]'), { active: null, searchForm: true });
mountFooter();

const list = qs('[data-legal-toc]');
const toggle = qs('[data-legal-toc-toggle]');
const sections = qsa('[data-legal-section]');
const formatNumber = new Intl.NumberFormat(currentLocale());
const formatTocNumber = new Intl.NumberFormat(currentLocale(), { minimumIntegerDigits: 2 });
const narrow = matchMedia('(max-width: 600px)');

// Dùng các tiêu đề trong thân trang làm mục lục để Quân và Phú chỉ cần khai báo mỗi mục một lần.
const links = sections.map((section, index) => {
  const number = formatNumber.format(index + 1);
  qs('[data-legal-number]', section).textContent = number + '. ';
  const link = el('a', { href: '#' + section.id, className: 'legal-toc__link' },
    el('span', { className: 'legal-toc__number', 'aria-hidden': 'true' }, formatTocNumber.format(index + 1)),
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

// Vùng quan sát hẹp cập nhật mục đang đọc mà không điều khiển vị trí cuộn.
let observer;
let readingLine;

/** Chọn mục đã đi qua vùng đọc, kể cả mục cuối không thể cuộn tới sát header. */
function markVisibleSection() {
  const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
  const index = atEnd
    ? sections.length - 1
    : sections.findLastIndex(section => section.getBoundingClientRect().top <= readingLine);
  markCurrent(Math.max(0, index));
}

/** Dùng điểm ảnh để đường đọc luôn tính theo chiều cao, kể cả khi đổi kích thước màn hình. */
function observeSections() {
  observer?.disconnect();
  const anchorOffset = Number.parseFloat(getComputedStyle(sections[0]).scrollMarginTop);
  const bottomMargin = Math.max(0, window.innerHeight - Math.ceil(anchorOffset) - 1);
  readingLine = window.innerHeight - bottomMargin;
  observer = new IntersectionObserver(markVisibleSection, { rootMargin: `0px 0px -${bottomMargin}px 0px` });
  sections.forEach(section => observer.observe(section));
}

window.addEventListener('resize', observeSections);
// Kiểm tra cuối trang dù mục cuối không cắt đường đọc khi người dùng dừng cuộn.
window.addEventListener('scrollend', markVisibleSection);
observeSections();

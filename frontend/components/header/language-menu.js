/** Dropdown chọn ngôn ngữ giao diện trên header; chỉ lưu lựa chọn trong trình duyệt, không gọi API. */
import { el } from '/utils/dom.js';
import { INTERFACE_LANGUAGES, getInterfaceLanguage, onInterfaceLanguageChange } from '/utils/preferences.js';
import { changeInterfaceLanguage, t } from '/utils/i18n.js';

// Tên ngôn ngữ giữ nguyên ở mọi giao diện để người đọc luôn nhận ra tiếng của mình. i18n-ignore
const languageNames = { vi: 'Tiếng Việt', ja: '日本語', en: 'English' };

/** Tạo icon Lucide theo màu chữ; đường nét là hằng số nội bộ, không chứa dữ liệu người dùng. */
function lineIcon(path, size) {
  const holder = document.createElement('template');
  holder.innerHTML = '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + path + '"/></svg>';
  return holder.content.firstElementChild;
}

/**
 * Dựng nút và danh sách ngôn ngữ theo Figma Đợt 13.
 * @param {object} options Mã vùng danh sách, tín hiệu huỷ và hàm đóng các menu khác trước khi mở.
 * @returns {object} Phần tử gắn vào header cùng các hàm mở, đóng, kiểm tra trạng thái.
 */
export function createLanguageMenu({ id, signal, beforeOpen }) {
  const code = el('span');
  const button = el('button', {
    type: 'button',
    className: 'site-header__language',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
    'aria-controls': id,
  }, code, lineIcon('m6 9 6 6 6-6', 14));

  // Mỗi dòng là radio trong menu để trình đọc màn hình đọc được mục đang chọn.
  const options = INTERFACE_LANGUAGES.map(language => el('button', {
    type: 'button',
    role: 'menuitemradio',
    className: 'site-header__language-option',
    lang: language,
    tabindex: '-1',
    'aria-checked': 'false',
    'data-language': language,
  }, el('span', {}, languageNames[language]), lineIcon('M20 6 9 17l-5-5', 16)));

  const menu = el('div', {
    id,
    className: 'site-header__language-menu',
    role: 'menu',
    'aria-label': t('Ngôn ngữ giao diện'),
    hidden: true,
  }, options);
  const element = el('div', { className: 'site-header__language-picker' }, button, menu);

  /** Đồng bộ mã trên nút, tên đọc cho trình đọc màn hình và dấu tick của mục đang chọn. */
  function render(language) {
    code.textContent = language.toUpperCase();
    button.setAttribute('aria-label', t('Ngôn ngữ giao diện: {name}', { name: languageNames[language] }));
    for (const option of options) {
      option.setAttribute('aria-checked', String(option.dataset.language === language));
    }
  }

  /** Cho header biết danh sách có đang mở để xử lý Esc và bấm ra ngoài. */
  function isOpen() {
    return !menu.hidden;
  }

  /** Đóng danh sách; khi cần thì trả focus về nút để bàn phím không bị lạc. */
  function close(restoreFocus = false) {
    if (!isOpen()) {
      return;
    }
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) {
      button.focus();
    }
  }

  /** Đóng menu khác rồi mở danh sách, focus vào đúng ngôn ngữ đang chọn. */
  function open() {
    beforeOpen();
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    options.find(option => option.getAttribute('aria-checked') === 'true')?.focus();
  }

  // Bấm nút để mở hoặc đóng; mũi tên trên nút cũng mở danh sách.
  button.addEventListener('click', () => {
    if (isOpen()) {
      close(true);
    } else {
      open();
    }
  }, { signal });
  button.addEventListener('keydown', event => {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !isOpen()) {
      event.preventDefault();
      open();
    }
  }, { signal });

  // Chọn một dòng thì lưu ngay rồi tải lại trang để toàn bộ chữ đổi theo ngôn ngữ mới.
  menu.addEventListener('click', event => {
    const option = event.target.closest('[data-language]');
    if (option) {
      close(true);
      changeInterfaceLanguage(option.dataset.language);
    }
  }, { signal });

  // Phím mũi tên đi vòng trong danh sách; Tab trả focus về nút để đi tiếp đúng thứ tự trang.
  menu.addEventListener('keydown', event => {
    const index = options.indexOf(document.activeElement);
    const targets = {
      ArrowDown: (index + 1) % options.length,
      ArrowUp: (index - 1 + options.length) % options.length,
      Home: 0,
      End: options.length - 1,
    };
    if (event.key === 'Tab') {
      close(true);
    } else if (Object.hasOwn(targets, event.key)) {
      event.preventDefault();
      options[targets[event.key]].focus();
    }
  }, { signal });

  render(getInterfaceLanguage());
  // Theo dõi cả thay đổi từ Cài đặt và từ tab khác để nút luôn đúng lựa chọn đã lưu.
  onInterfaceLanguageChange(render, signal);
  return { element, button, isOpen, close };
}

/** Thanh tìm kiếm chỉ quản lý bản nháp; chỉ gọi trang khi người dùng gửi biểu mẫu. */
import { el } from '/utils/dom.js';
import { createTagChip } from '/components/tag-chip/tag-chip.js';

// Mỗi thanh có id riêng để nhãn, lỗi và bảng chọn luôn liên kết đúng điều khiển.
let searchBarCount = 0;

/** Tạo biểu tượng ảnh có kích thước cố định, nhãn thao tác do nút chứa cung cấp. */
function icon(name, size = 16) {
  return el('img', { src: '/assets/icons/' + name + '.svg', alt: '', width: size, height: size });
}

/**
 * Tạo ô tìm kiếm cùng chip, bảng chọn tag và xử lý bàn phím, hoàn toàn không gọi API.
 * @param {object} options Danh mục thẻ, bản nháp ban đầu và hàm nhận lần gửi chủ động.
 * @returns {object} Phần tử và các thao tác đồng bộ bản nháp, danh mục, focus, trạng thái chờ.
 */
export function createSearchBar({ tags = [], initialQuery = '', initialTags = [], onSubmit }) {
  const id = 'search-bar-' + (++searchBarCount);
  let catalog = tags;
  let selected = [...new Set(initialTags)];
  let busy = false;
  const element = el('div', { className: 'search-bar', 'data-search-bar': '' });
  const form = el('form', { className: 'search-bar__form', role: 'search', 'aria-label': 'Tìm bài viết' });
  const field = el('div', { className: 'search-bar__field' });
  const chips = el('div', { className: 'search-bar__chips' });
  const input = el('input', {
    id: id + '-input',
    className: 'search-bar__input',
    type: 'search',
    maxlength: 200,
    enterkeyhint: 'search',
    'data-search-input': '',
    'aria-label': 'Tìm kiếm',
    'aria-describedby': id + '-error',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  input.value = initialQuery.slice(0, 200);
  const clear = el('button', {
    className: 'search-bar__clear', type: 'button', 'aria-label': 'Xoá nội dung',
  }, icon('clear-x'));
  const escape = el('kbd', { className: 'kbd search-bar__escape', 'aria-hidden': 'true' }, 'Esc');
  const tagIcon = icon('sliders');
  const badge = el('span', { className: 'search-bar__badge' });
  const tagButton = el('button', {
    type: 'button', className: 'search-bar__tag-button',
    'aria-expanded': 'false', 'aria-controls': id + '-picker',
  }, tagIcon, 'Tag', badge);
  const submitLabel = el('span', { className: 'search-bar__submit-label' }, 'Tìm kiếm');
  const submit = el('button', { type: 'submit', className: 'search-bar__submit' },
    icon('search-white'), submitLabel, el('span', { className: 'search-bar__mobile-label' }, 'Tìm')
  );
  const picker = el('section', {
    id: id + '-picker', className: 'search-bar__picker', hidden: true,
    'aria-labelledby': id + '-picker-title',
  });
  const pickerTags = el('div', { className: 'search-bar__picker-tags' });
  const error = el('p', {
    id: id + '-error', className: 'search-bar__error', role: 'alert', hidden: true,
  });
  picker.append(el('h2', { id: id + '-picker-title', className: 'search-bar__picker-title' }, 'Lọc theo tag'),
    pickerTags, el('p', { className: 'search-bar__picker-note' }, 'Khớp tất cả tag đã chọn'));
  field.append(el('span', { className: 'search-bar__leading-icon' }, icon('search', 20)),
    chips, el('label', { className: 'u-visually-hidden', for: input.id }, 'Tìm kiếm'),
    input, escape, clear, el('span', { className: 'search-bar__divider', 'aria-hidden': 'true' }), tagButton);
  form.append(field, submit);
  element.append(form, picker, error);

  /** Hiện hoặc xoá lỗi thẻ không tồn tại, đồng thời cập nhật trạng thái truy cập của ô nhập. */
  function showError(message = '') {
    error.textContent = message;
    error.hidden = !message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
  }

  /** Đóng bảng chọn và trả focus về nút mở khi người dùng chủ động kết thúc thao tác. */
  function closePicker(restoreFocus = true) {
    if (picker.hidden) {
      return;
    }
    picker.hidden = true;
    tagButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) {
      tagButton.focus();
    }
  }

  /** Cập nhật nút gửi, nút xoá và nhãn gợi ý từ bản nháp, không tải dữ liệu khi gõ. */
  function updateControls() {
    const hasContent = Boolean(input.value.trim() || selected.length);
    clear.hidden = !hasContent;
    escape.hidden = hasContent;
    badge.hidden = selected.length === 0;
    badge.textContent = String(selected.length);
    tagButton.classList.toggle('is-active', selected.length > 0);
    tagIcon.src = '/assets/icons/' + (selected.length ? 'sliders-active' : 'sliders') + '.svg';
    submit.disabled = busy || !hasContent;
    submit.classList.toggle('is-loading', busy);
    submitLabel.textContent = busy ? 'Đang xử lý…' : 'Tìm kiếm';
    submit.setAttribute('aria-label', busy ? 'Đang xử lý…' : 'Tìm kiếm');
    input.placeholder = selected.length ? '' : 'Tìm bài viết, chủ đề… hoặc gõ # để lọc theo tag';
  }

  /** Xoá một chip từ nút riêng, giữ con trỏ ở input để người dùng tiếp tục nhập. */
  function removeTag(name) {
    selected = withoutTag(name);
    showError();
    renderTags();
    input.focus();
  }

  /** Bật tắt thẻ trong bảng chọn chỉ thay bản nháp, giữ focus trên thẻ vừa thao tác. */
  function togglePickerTag(event, name) {
    selected = selected.includes(name) ? withoutTag(name) : [...selected, name];
    showError();
    renderTags();
    for (const button of pickerTags.children) {
      if (button.dataset.tagName === name) {
        button.focus();
      }
    }
  }

  /** Lấy danh sách tag ngoài tên cần gỡ, dùng chung cho nút xoá và bộ chọn. */
  function withoutTag(name) {
    const remaining = [];
    for (const tag of selected) {
      if (tag !== name) {
        remaining.push(tag);
      }
    }
    return remaining;
  }

  /** Dựng lại hai nhóm chip từ cùng một danh sách đã chọn để số đếm và bảng chọn luôn khớp. */
  function renderTags() {
    chips.replaceChildren();
    for (const name of selected) {
      chips.append(createTagChip({ name, state: 'removable', onRemove: removeTag }));
    }
    pickerTags.replaceChildren();
    for (const tag of catalog) {
      pickerTags.append(createTagChip({
        name: tag.name,
        state: selected.includes(tag.name) ? 'selected' : 'default',
        onClick: togglePickerTag,
      }));
    }
    updateControls();
  }

  /**
   * Chuyển các token #tên hợp lệ thành chip; token lạ giữ nguyên để người dùng sửa trước khi gửi.
   * @param {boolean} rejectUnknown Có báo lỗi và chặn gửi khi gặp token chưa có trong danh mục.
   * @returns {boolean} true nếu không có token lạ cần chặn.
   */
  function extractTags(rejectUnknown) {
    const unknown = [];
    /** So khớp chính xác tên thẻ không phân biệt hoa thường, không tìm gợi ý khi đang gõ. */
    function replaceToken(token, prefix, name) {
      /** So sánh một tên danh mục với token vừa kết thúc mà không dùng regex từ đầu vào. */
      function matchesName(tag) {
        return tag.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi');
      }
      const match = catalog.find(matchesName);
      if (!match) {
        unknown.push(name);
        return token;
      }
      if (!selected.includes(match.name)) {
        selected.push(match.name);
      }
      return prefix;
    }
    input.value = input.value.replace(/(^|\s)#([^\s#]+)/gu, replaceToken).replace(/\s+/gu, ' ').trim();
    renderTags();
    if (rejectUnknown && unknown.length) {
      showError('Không có tag #' + unknown[0]);
      return false;
    }
    showError();
    return true;
  }

  /** Gửi một bản sao trạng thái đã chuẩn hoá, chỉ khi người dùng nhấn Enter hoặc nút tìm. */
  function submitSearch(event) {
    event.preventDefault();
    if (busy || !extractTags(true) || submit.disabled) {
      return;
    }
    closePicker(false);
    onSubmit?.({ q: input.value.trim(), tags: [...selected] });
  }

  /** Khi nhập chỉ cập nhật trạng thái nút và xoá lỗi cũ; tuyệt đối không gọi API hay gửi tìm kiếm. */
  function editQuery() {
    showError();
    updateControls();
  }

  /** Xử lý phím ở input: đổi token khi Space, gỡ chip bằng Backspace và thoát bằng Escape. */
  function handleInputKey(event) {
    if (event.isComposing) {
      return;
    }
    if (event.key === ' ' && /(^|\s)#[^\s#]+$/u.test(input.value)) {
      // Chỉ đổi token khi dấu cách kết thúc tên; không có danh sách gợi ý hay yêu cầu mạng.
      const cursorAtEnd = input.selectionStart === input.value.length;
      if (cursorAtEnd) {
        event.preventDefault();
        extractTags(false);
        input.value += input.value ? ' ' : '';
        updateControls();
      }
    } else if (event.key === 'Backspace' && input.value === '' && selected.length) {
      event.preventDefault();
      removeTag(selected[selected.length - 1]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (!picker.hidden) {
        closePicker();
      } else {
        input.blur();
      }
    } else if (event.key === 'Enter') {
      // Gửi chủ động kể cả khi Enter vừa biến #tag thành chip trong cùng lần nhấn.
      submitSearch(event);
    }
  }

  /** Xoá cả chữ và chip mà không thay kết quả đã gửi; lần tìm tiếp theo vẫn do người dùng quyết định. */
  function clearDraft() {
    input.value = '';
    selected = [];
    showError();
    renderTags();
    input.focus();
  }

  /** Bật bảng chọn dưới ô nhập và đưa focus tới lựa chọn đầu để thao tác được bằng bàn phím. */
  function togglePicker() {
    if (!picker.hidden) {
      closePicker();
      return;
    }
    picker.hidden = false;
    tagButton.setAttribute('aria-expanded', 'true');
    pickerTags.querySelector('button')?.focus();
  }

  /** Đóng bảng chọn khi nhấn ngoài thanh tìm kiếm, trả focus theo quy tắc của bảng chọn. */
  function handleOutsideClick(event) {
    if (!element.contains(event.target)) {
      closePicker();
    }
  }

  /** Escape trong bảng chọn đóng bảng và trả focus mà không làm mất trạng thái chip. */
  function handlePickerKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePicker();
    }
  }

  /** Đồng bộ bản nháp khi URL thay đổi bằng nút quay lại hoặc bộ lọc chủ động của trang. */
  function setState({ q = '', tags: names = [] }) {
    input.value = String(q).slice(0, 200);
    selected = [...new Set(names)];
    closePicker(false);
    showError();
    renderTags();
  }

  /** Bổ sung danh mục sau khi tải xong mà không gắn lại các bộ lắng nghe của thanh tìm kiếm. */
  function setTags(nextTags) {
    catalog = nextTags;
    renderTags();
  }

  /** Khoá gửi lặp khi đang tìm; trạng thái chờ chỉ đổi nhãn, không thêm spinner. */
  function setBusy(value) {
    busy = value;
    updateControls();
  }

  /** Đưa con trỏ về input cho phím tắt chung và lần mở trang desktop. */
  function focus() {
    input.focus();
  }

  /** Lấy bản sao bản nháp; bộ lọc chủ động có thể yêu cầu kiểm tra token trước khi gửi tìm kiếm. */
  function getState({ validate = false } = {}) {
    if (validate && !extractTags(true)) {
      return null;
    }
    return { q: input.value.trim(), tags: [...selected] };
  }

  // Gắn sự kiện một lần cho vòng đời trang; không có lệnh mạng trong thành phần này.
  form.addEventListener('submit', submitSearch);
  input.addEventListener('input', editQuery);
  input.addEventListener('keydown', handleInputKey);
  clear.addEventListener('click', clearDraft);
  tagButton.addEventListener('click', togglePicker);
  picker.addEventListener('keydown', handlePickerKey);
  document.addEventListener('click', handleOutsideClick);
  renderTags();
  return { element, setState, setTags, setBusy, getState, focus };
}

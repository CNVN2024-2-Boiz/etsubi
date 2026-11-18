/** Editor nhỏ dùng lệnh trình duyệt; HTML chỉ được đọc qua bộ lọc dùng chung. */
import { el } from '/utils/dom.js';
import { sanitizeRichHtml, renderRichContent, richToPlainText, countWords, countChars, safeRichUrl, safeImageUrl, imageDimension } from '/utils/rich-text.js';
import { openImageDialog } from '/components/rich-editor/image-dialog.js';
import { mentionHint } from '/utils/mention.js';

// Các nét Lucide cố định, không chứa dữ liệu người dùng hoặc HTML API.
const PATHS = {
  pencil: '<path d="m16 3 5 5L8 21l-5 1 1-5Z M14 5l5 5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  lock: '<rect x="4" y="10" width="16" height="12" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>',
  maximize: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  minimize: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  bold: '<path d="M6 12h9a4 4 0 0 1 0 8H6V4h8a4 4 0 0 1 0 8"/>',
  italic: '<path d="M19 4h-9M14 20H5M15 4 9 20"/>',
  underline: '<path d="M6 3v7a6 6 0 0 0 12 0V3M4 21h16"/>',
  strikeThrough: '<path d="M16 4H9a4 4 0 0 0-4 4c0 2 2 4 5 4m-6 0h16m-1 4a4 4 0 0 1-4 4H6"/>',
  removeFormat: '<path d="M4 4h16M12 4 8 20M14 14l6 6m0-6-6 6"/>',
  link: '<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  emoji: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
};

/** Icon Lucide nội tuyến đúng kích thước, dùng màu chữ của nút. */
export function editorIcon(name, size = 18) {
  const holder = el('span', { className: 'rich-icon', 'aria-hidden': 'true' });
  // Chỉ các hằng SVG cục bộ ở trên được chèn, không nhận nội dung người dùng.
  holder.innerHTML = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (PATHS[name] || PATHS.pin) + '</svg>';
  return holder;
}

// Bộ đếm ID riêng nối mỗi vùng nhập với nhãn, tránh trùng ID.
let editorId = 0;
const LABELS = { bold: 'In đậm', italic: 'In nghiêng', underline: 'Gạch chân', strikeThrough: 'Gạch ngang',
  removeFormat: 'Xoá định dạng', emoji: 'Biểu tượng cảm xúc', link: 'Liên kết', image: 'Ảnh', pin: 'Gắn địa điểm' };

/** Tạo editor độc lập; form sở hữu xử lý callback ảnh và địa điểm. */
export function createRichEditor({ label = 'Nội dung', placeholder = 'Viết nội dung…', allowLinks = false,
  tools = ['bold', 'italic', 'underline', 'strikeThrough', '|', 'removeFormat'], counter = 'post', imageActions = true, onChange = () => {}, onTool = () => {} } = {}) {
  const id = 'rich-area-' + (++editorId);
  const area = el('div', { id, className: 'rich-editor__area', contenteditable: 'true', role: 'textbox',
    'aria-multiline': 'true', 'aria-label': label, 'data-placeholder': placeholder, 'data-rich-area': '', 'data-empty': 'true' });
  const toolbar = el('div', { className: 'rich-editor__toolbar', role: 'toolbar', 'aria-label': 'Định dạng ' + label });
  const media = el('div', { className: 'rich-media rich-editor__media', 'data-editor-media': '' });
  const count = el('p', { className: 'rich-editor__counter' });
  // Dòng gợi ý chỉ nhắc cú pháp @username; khi soạn, tên được nhắc vẫn là chữ thường.
  const mentionNote = el('p', { className: 'rich-editor__mention-hint', role: 'status' }, mentionHint('').text);
  const footer = el('div', { className: 'rich-editor__footer' }, mentionNote, count);
  const popover = el('div', { className: 'rich-editor__popover', hidden: true });
  const toolGroup = el('div', { className: 'rich-editor__tools' }, toolbar, popover);
  const body = el('div', { className: 'rich-editor__body' }, area, media);
  const root = el('div', { className: 'rich-editor', 'data-rich-editor': '' }, toolGroup, body, footer);
  const buttons = new Map();
  let savedRange = null;
  let activePopover = null;
  let selectedImage = null;
  const imageBar = el('div', { className: 'rich-editor__image-bar', hidden: true, role: 'group', 'aria-label': 'Thao tác ảnh' });
  const editImage = el('button', { type: 'button' }, editorIcon('pencil', 14), 'Sửa ảnh');
  const removeImage = el('button', { type: 'button', className: 'rich-editor__image-remove' }, editorIcon('trash', 14), 'Gỡ ảnh');
  imageBar.append(editImage, removeImage);
  root.append(imageBar);

  /** Ghi vùng chọn chỉ khi nó thuộc editor này, để công cụ không sửa nội dung editor khác. */
  function rememberSelection() {
    const selection = document.getSelection();
    if (selection.rangeCount && area.contains(selection.anchorNode) && area.contains(selection.focusNode)) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }
  }
  /** Khôi phục con trỏ sau khi dùng popover hoặc chọn ảnh. */
  function restoreSelection() {
    area.focus({ preventScroll: true });
    if (savedRange && area.contains(savedRange.commonAncestorContainer)) {
      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
  }
  /** Cập nhật bộ đếm trên chữ thật và báo thay đổi cho form sở hữu. */
  function changed() {
    const text = getPlainText();
    area.dataset.empty = String(!text.trim() && !area.querySelector('img'));
    count.textContent = counter === 'comment' ? countWords(text) + ' chữ' : countWords(text) + ' từ · ' + countChars(text) + ' ký tự';
    const hint = mentionHint(getHtml());
    mentionNote.textContent = hint.text;
    mentionNote.classList.toggle('is-warning', hint.warning);
    rememberSelection();
    updatePressed();
    onChange();
  }
  /** Chỉ phản ánh định dạng khi selection đang ở trong editor này. */
  function updatePressed() {
    const selected = area.contains(document.getSelection()?.anchorNode);
    for (const [name, button] of buttons) {
      if (['bold', 'italic', 'underline', 'strikeThrough'].includes(name)) {
        button.setAttribute('aria-pressed', String(Boolean(selected && document.queryCommandState(name))));
      } else if (name === 'link') {
        const anchor = document.getSelection()?.anchorNode;
        const parent = anchor?.nodeType === 1 ? anchor : anchor?.parentElement;
        button.setAttribute('aria-pressed', String(Boolean(selected && parent?.closest('a'))));
      }
    }
  }
  /** Thực hiện lệnh sau khi trả selection, dùng undo nguyên bản của trình duyệt. */
  function command(name, value = null) {
    closeImageBar();
    restoreSelection();
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand(name, false, value);
    if (name === 'removeFormat') document.execCommand('unlink', false);
    changed();
  }
  /** Đóng thanh ảnh và bỏ outline để việc gõ tiếp diễn ra bình thường. */
  function closeImageBar() {
    selectedImage?.classList.remove('is-selected');
    selectedImage = null;
    imageBar.hidden = true;
  }
  /** Áp dụng đúng thuộc tính đã kiểm tra, xoá kích thước cũ nếu người dùng để trống. */
  function applyImage(node, image) {
    // Chính sách tải phải có trước src, kể cả lần tạo node mới chưa gắn vào DOM.
    node.setAttribute('loading', 'lazy');
    node.setAttribute('decoding', 'async');
    node.setAttribute('referrerpolicy', 'no-referrer');
    node.setAttribute('alt', Array.from(String(image.alt || '')).slice(0, 300).join(''));
    for (const name of ['width', 'height']) {
      const value = imageDimension(image[name]);
      if (value) node.setAttribute(name, String(value)); else node.removeAttribute(name);
    }
    node.setAttribute('src', safeImageUrl(image.src));
    node.className = 'rich-content__image';
  }
  /** Chèn node ảnh tại caret đã lưu, tuyệt đối không đưa link người dùng vào insertHTML. */
  function insertImage(image) {
    if (!safeImageUrl(image?.src)) return;
    closeImageBar(); restoreSelection();
    const selection = document.getSelection();
    const range = savedRange && area.contains(savedRange.commonAncestorContainer) ? savedRange.cloneRange() : document.createRange();
    if (!savedRange || !area.contains(savedRange.commonAncestorContainer)) { range.selectNodeContents(area); range.collapse(false); }
    const node = document.createElement('img');
    applyImage(node, image);
    range.deleteContents(); range.insertNode(node); range.setStartAfter(node); range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range); savedRange = range.cloneRange();
    changed();
  }
  /** Click ảnh chọn node và neo thanh công cụ ngay phía trên, dùng biến CSS cho vị trí động. */
  function selectImage(event) {
    const node = event.target.closest('img');
    closeImageBar();
    if (!imageActions || !node || !area.contains(node) || area.contentEditable === 'false') return;
    selectedImage = node; node.classList.add('is-selected');
    const range = document.createRange(); range.selectNode(node);
    const selection = document.getSelection(); selection.removeAllRanges(); selection.addRange(range); savedRange = range.cloneRange();
    const imageRect = node.getBoundingClientRect(); const rootRect = root.getBoundingClientRect();
    // Theo Figma, thanh nằm bên trong mép trên của ảnh (cách 8px) để không đè lên thanh công cụ.
    root.style.setProperty('--image-bar-top', Math.max(0, imageRect.top - rootRect.top + 8) + 'px');
    imageBar.hidden = false;
    // Căn giữa theo ảnh nhưng vẫn nằm trong khung editor, kể cả ảnh nhỏ sát mép phải trên điện thoại.
    const centered = imageRect.left - rootRect.left + (imageRect.width - imageBar.offsetWidth) / 2;
    const left = Math.min(centered, root.clientWidth - imageBar.offsetWidth);
    root.style.setProperty('--image-bar-left', Math.max(0, left) + 'px');
  }
  // Sửa giữ đúng node ảnh, Huỷ giữ nguyên ảnh; gỡ luôn báo thay đổi và cập nhật đếm.
  editImage.addEventListener('click', async () => {
    const node = selectedImage;
    if (!node) return;
    const image = await openImageDialog({ src: node.getAttribute('src'), alt: node.getAttribute('alt'), width: node.getAttribute('width'), height: node.getAttribute('height') });
    if (image && area.contains(node)) { applyImage(node, image); closeImageBar(); changed(); }
  });
  removeImage.addEventListener('click', () => { selectedImage?.remove(); closeImageBar(); changed(); area.focus(); });
  area.addEventListener('click', selectImage);
  /** Đóng popover và cập nhật aria-expanded, tuỳ chọn trả focus về nút mở. */
  function closePopover(restoreFocus = false) {
    const previous = activePopover;
    popover.hidden = true;
    popover.replaceChildren();
    activePopover = null;
    if (previous) {
      buttons.get(previous)?.setAttribute('aria-expanded', 'false');
      if (restoreFocus) buttons.get(previous)?.focus();
    }
  }
  /** Bảng emoji nhỏ không cần thư viện; selection được giữ trước khi bấm nút. */
  function showEmoji() {
    popover.className = 'rich-editor__popover rich-editor__emoji';
    for (const emoji of ['😀', '😊', '😂', '🥰', '😍', '🤔', '😢', '😭', '😮', '😎', '🙏', '👍', '👎', '👏', '🙌', '💪', '❤️', '💖', '🎉', '✨', '🌸', '🍵', '🍁', '🇯🇵']) {
      const button = el('button', { type: 'button', className: 'rich-editor__tool', 'aria-label': 'Chèn ' + emoji }, emoji);
      // Chèn tại con trỏ đã lưu và đóng bảng để tiếp tục gõ ngay.
      button.addEventListener('click', () => { command('insertText', emoji); closePopover(); });
      popover.append(button);
    }
    popover.firstElementChild.focus();
  }
  /** Hộp URL có label và lỗi riêng, chỉ tạo liên kết http/https đã chuẩn hoá. */
  function showLink() {
    popover.className = 'rich-editor__popover rich-editor__link';
    const input = el('input', { id: id + '-url', className: 'input', type: 'text', placeholder: 'https://…', 'aria-describedby': id + '-url-error' });
    const apply = el('button', { type: 'button', className: 'btn btn--primary btn--sm' }, 'Áp dụng');
    const error = el('p', { id: id + '-url-error', className: 'field__hint field__hint--error', role: 'alert' });
    /** Giữ vùng chọn khi tạo link; không có selection thì chèn URL bằng nút DOM an toàn. */
    function applyLink() {
      const typed = input.value.trim();
      const href = safeRichUrl(/^[a-z][a-z\d+.-]*:/i.test(typed) || typed.startsWith('//') ? typed : 'https://' + typed);
      if (!href) { input.setAttribute('aria-invalid', 'true'); error.textContent = 'Vui lòng nhập liên kết http hoặc https hợp lệ.'; return; }
      restoreSelection();
      const selection = document.getSelection();
      if (selection.isCollapsed) {
        command('insertText', href);
        const range = document.getSelection().getRangeAt(0);
        range.setStart(range.endContainer, Math.max(0, range.endOffset - href.length));
        savedRange = range.cloneRange();
      }
      command('createLink', href);
      // Thu con trỏ về cuối liên kết, để emoji hoặc chữ gõ tiếp không thay mất chữ vừa gắn link.
      const linked = document.getSelection();
      if (linked.rangeCount) {
        linked.collapseToEnd();
        savedRange = linked.getRangeAt(0).cloneRange();
      }
      closePopover();
    }
    apply.addEventListener('click', applyLink);
    // Enter chỉ áp dụng link, không gửi toàn bộ form bao ngoài.
    input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); applyLink(); } });
    popover.append(el('label', { for: id + '-url' }, 'Liên kết'), input, apply, error);
    input.focus();
  }
  /** Mở một popover duy nhất, bấm lại nút sẽ đóng. */
  function togglePopover(name) {
    const same = activePopover === name;
    closePopover();
    if (same) return;
    activePopover = name;
    buttons.get(name).setAttribute('aria-expanded', 'true');
    popover.hidden = false;
    if (name === 'emoji') showEmoji(); else showLink();
  }
  // Thanh công cụ gồm nút thật, separator tĩnh và icon Lucide; không có handler nội tuyến.
  for (const tool of tools) {
    if (tool === '|') { toolbar.append(el('span', { className: 'rich-editor__separator', role: 'separator' })); continue; }
    const button = el('button', { type: 'button', className: 'rich-editor__tool', 'data-rich-tool': tool,
      'aria-label': LABELS[tool], title: LABELS[tool], 'aria-pressed': 'false' }, editorIcon(tool));
    buttons.set(tool, button);
    if (['emoji', 'link'].includes(tool)) button.setAttribute('aria-expanded', 'false');
    // Không để pointer làm mất selection trước khi trình duyệt thực hiện lệnh.
    button.addEventListener('mousedown', event => { rememberSelection(); event.preventDefault(); });
    button.addEventListener('click', () => {
      if (tool === 'emoji' || tool === 'link') togglePopover(tool);
      else if (tool === 'image' || tool === 'pin') { closePopover(); onTool(tool); }
      else { closePopover(); command(tool); }
    });
    toolbar.append(button);
  }
  // Dán và kéo văn bản chỉ nhận text/plain, không cho HTML bên ngoài vào contenteditable.
  area.addEventListener('paste', event => { event.preventDefault(); command('insertText', event.clipboardData.getData('text/plain')); });
  area.addEventListener('drop', event => { event.preventDefault(); });
  area.addEventListener('input', () => { closeImageBar(); changed(); });
  area.addEventListener('keyup', rememberSelection);
  area.addEventListener('mouseup', rememberSelection);
  area.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
  // Giữ shortcut B/I/U nhất quán và để Ctrl+Z dùng undo của trình duyệt.
  area.addEventListener('keydown', event => {
    if (selectedImage) {
      closeImageBar();
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); return; }
    }
    const shortcut = { b: 'bold', i: 'italic', u: 'underline' }[event.key.toLowerCase()];
    if ((event.ctrlKey || event.metaKey) && shortcut) { event.preventDefault(); command(shortcut); }
    if (event.key === 'Escape' && activePopover) { event.preventDefault(); event.stopPropagation(); closePopover(true); }
  });
  /** Chỉ cập nhật selection khi editor còn tồn tại để không lưu vùng chọn trang khác. */
  function selectionChanged() { if (root.isConnected) { rememberSelection(); updatePressed(); } }
  /** Bấm bên ngoài đóng bảng công cụ; Escape ở input link cũng chỉ đóng popover. */
  function outside(event) {
    if (selectedImage && ((event.type === 'pointerdown' && !imageBar.contains(event.target) && event.target !== selectedImage)
      || (event.type === 'keydown' && event.key === 'Escape'))) {
      closeImageBar();
      if (event.type === 'keydown') { event.preventDefault(); event.stopPropagation(); area.focus(); }
    }
    if (activePopover && ((event.type === 'pointerdown' && !popover.contains(event.target) && !buttons.get(activePopover)?.contains(event.target)) || (event.type === 'keydown' && event.key === 'Escape'))) {
      if (event.type === 'keydown') { event.preventDefault(); event.stopPropagation(); }
      closePopover(event.type === 'keydown');
    }
  }
  document.addEventListener('selectionchange', selectionChanged);
  document.addEventListener('pointerdown', outside);
  // Resize đóng thanh nổi để toạ độ cũ không đẩy nó ra ngoài editor sau khi đổi viewport.
  window.addEventListener('resize', closeImageBar);
  root.addEventListener('keydown', outside);
  /** Đọc HTML nhưng không tin HTML do trình duyệt tạo; luôn lọc trước khi gửi/lưu nháp. */
  function getHtml() { return sanitizeRichHtml(area.innerHTML, { allowLinks }); }
  /** Focus vào editor; nếu con trỏ chưa nằm trong vùng soạn (vừa mở sửa) thì đặt ở cuối nội dung để gõ tiếp. */
  function focusEnd() {
    area.focus({ preventScroll: true });
    // Đã có vị trí con trỏ người dùng chọn trước đó thì trả lại đúng chỗ đó.
    if (savedRange && area.contains(savedRange.startContainer)) { restoreSelection(); return; }
    const selection = document.getSelection();
    const range = document.createRange();
    range.selectNodeContents(area);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
  }
  /** Chữ thuần dùng đếm và quyết định trạng thái nút gửi. */
  function getPlainText() { return richToPlainText(getHtml()); }
  /** Nạp nội dung đã lọc bằng DOM, giữ editor rỗng thật để placeholder hiện được. */
  function setHtml(html) {
    renderRichContent(area, sanitizeRichHtml(html, { allowLinks }), { allowLinks });
    if (!getPlainText() && !area.querySelector('img')) area.replaceChildren();
    closeImageBar();
    savedRange = null;
    changed();
  }
  /** Dọn listener toàn cục khi form sửa bài bị tháo khỏi trang. */
  function destroy() {
    document.removeEventListener('selectionchange', selectionChanged);
    document.removeEventListener('pointerdown', outside);
    window.removeEventListener('resize', closeImageBar);
    closePopover();
    closeImageBar();
  }
  // Khởi tạo bộ đếm mà chưa phát callback khi caller chưa nhận được editor.
  count.textContent = counter === 'comment' ? '0 chữ' : '0 từ · 0 ký tự';
  return { root, area, toolbar, media, getHtml, getPlainText, setHtml, destroy, insertImage, rememberSelection,
    clear: () => setHtml(''), focus: focusEnd, isEmpty: () => !getPlainText().trim() && !area.querySelector('img'),
    setToolPressed: (name, pressed) => buttons.get(name)?.setAttribute('aria-pressed', String(pressed)) };
}

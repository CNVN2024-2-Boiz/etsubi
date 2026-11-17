/** Trang Hỗ trợ (Figma 1:1966): tìm trong câu hỏi thường gặp, lọc theo chủ đề và hộp thoại gửi yêu cầu. */
import { mountHeader } from '/components/header/header.js';
import { mountFooter } from '/components/footer/footer.js';
import { createSupportTicket, createReport } from '/services/api/support.js';
import { fetchCurrentUser } from '/utils/auth.js';
import { el, qs, qsa } from '/utils/dom.js';
import { wrapJapanese } from '/utils/text.js';
import { toVietnameseMessage } from '/utils/errors.js';
import { searchUrl } from '/utils/routes.js';
import { topics, faqs, rules, popularQueries } from '/pages/support-content.js';

// Header có tab Hỗ trợ đang chọn và ô tìm kiếm trong suốt như Figma; footer đầy đủ.
mountHeader(qs('[data-component="header"]'), { active: 'support', searchForm: true });
mountFooter();

// Biểu tượng Lucide (24px, nét 2px, theo màu chữ) cho thẻ chủ đề; chuỗi cố định, không chứa dữ liệu người dùng.
const ICONS = {
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  pen: '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
  languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  'map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
};

const faqList = qs('[data-faq-list]');
const queryInput = qs('[data-help-query]');
const dialog = qs('[data-dialog]');
let user = null;
let dialogMode = 'ticket';

/* ===== Tiện ích ===== */

/** Tạo một biểu tượng SVG từ bảng ICONS với kích thước cho trước; chỉ dùng chuỗi cố định ở trên. */
function icon(name, size, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (className) {
    svg.setAttribute('class', className);
  }
  svg.innerHTML = ICONS[name];
  return svg;
}

/** Bỏ dấu tiếng Việt và viết thường để "dich" vẫn tìm ra "Dịch". */
function normalize(text) {
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
}

/** Mười bốn cánh hoa tĩnh: tám trong hero, sáu bên lề phần nội dung (file SVG có sẵn kích thước đúng). */
function mountPetals() {
  const heroFiles = [1, 2, 3, 4, 5, 6, 1, 11];
  const mainFiles = [3, 5, 3, 2, 6, 4];
  heroFiles.forEach((file, index) => qs('[data-hero-art]').append(el('img', {
    className: 'support-petal support-petal--hero-' + (index + 1), src: '/assets/illustrations/sakura-' + file + '.svg', alt: '',
  })));
  mainFiles.forEach((file, index) => qs('[data-petals]').append(el('img', {
    className: 'support-petal support-petal--main-' + (index + 1), src: '/assets/illustrations/sakura-' + file + '.svg', alt: '',
  })));
}

/* ===== Chủ đề và câu hỏi ===== */

/** Dựng tám thẻ chủ đề; số câu hỏi là số câu thật có trong nội dung của trang. */
function renderTopics(activeTopic = null) {
  qs('[data-topics]').replaceChildren(...topics.map(topic => {
    const count = faqs.filter(item => item.topic === topic.id).length;
    const card = el('button', {
      type: 'button',
      className: 'support-topic',
      'aria-pressed': String(topic.id === activeTopic),
      'data-topic': topic.id,
    },
    el('span', { className: 'support-topic__icon' }, icon(topic.icon, 24)),
    el('span', { className: 'support-topic__title' }, topic.title),
    el('span', { className: 'support-topic__desc' }, topic.desc),
    el('span', { className: 'support-topic__count' }, count + ' câu hỏi  →'));
    return card;
  }));
}

/** Một câu hỏi dạng details/summary: trình duyệt tự đóng/mở, bàn phím dùng Enter hoặc Space. */
function createFaqItem(item, open = false, showTopic = false) {
  const topic = topics.find(entry => entry.id === item.topic);
  const details = el('details', { className: 'support-faq__item', open },
    el('summary', { className: 'support-faq__question' },
      el('span', { className: 'support-faq__question-text' }, item.q),
      icon('chevron', 20, 'support-faq__chevron')),
    el('div', { className: 'support-faq__answer' },
      el('p', {}, wrapJapanese(item.a)),
      showTopic && topic ? el('span', { className: 'support-faq__topic' }, 'Chủ đề: ' + topic.title) : null));
  return details;
}

/** Hiện danh sách câu hỏi và dòng trạng thái lọc (nếu có). */
function showFaqs(items, { title, desc, status = '', openFirst = true, showTopic = false, emptyQuery = '' }) {
  qs('[data-faq-title]').textContent = title;
  qs('[data-faq-desc]').textContent = desc;
  qs('[data-faq-filter]').hidden = !status;
  qs('[data-faq-status]').textContent = status;
  if (!items.length) {
    // Không tìm thấy: gợi ý tìm trong Diễn đàn với cùng từ khoá, hoặc gửi yêu cầu hỗ trợ.
    const forumLink = el('a', { className: 'btn btn--secondary btn--sm', href: searchUrl({ q: emptyQuery }) }, 'Tìm trong Diễn đàn');
    const ask = el('button', { type: 'button', className: 'btn btn--primary btn--sm', 'data-open-dialog': 'ticket' }, 'Gửi yêu cầu hỗ trợ');
    faqList.replaceChildren(el('div', { className: 'support-faq__empty' },
      el('p', {}, 'Chưa có câu trả lời phù hợp với "' + emptyQuery + '".'), el('div', { className: 'support-dialog__actions' }, forumLink, ask)));
    return;
  }
  faqList.replaceChildren(...items.map((item, index) => createFaqItem(item, openFirst && index === 0, showTopic)));
}

/** Mặc định: sáu câu hỏi phổ biến theo thứ tự trong Figma, câu đầu mở sẵn. */
function showPopular() {
  const popular = faqs.filter(item => item.popular).sort((a, b) => a.popular - b.popular);
  renderTopics();
  showFaqs(popular, { title: 'Câu hỏi thường gặp', desc: 'Những thắc mắc được cộng đồng Etsubi hỏi nhiều nhất.' });
  updateUrl({});
}

/** Lọc câu hỏi theo một chủ đề (bấm thẻ chủ đề hoặc liên kết "Đọc đầy đủ quy tắc"). */
function showTopic(topicId) {
  const topic = topics.find(entry => entry.id === topicId);
  if (!topic) {
    showPopular();
    return;
  }
  const items = faqs.filter(item => item.topic === topicId);
  renderTopics(topicId);
  showFaqs(items, { title: topic.title, desc: topic.desc, status: items.length + ' câu hỏi trong chủ đề này.' });
  updateUrl({ topic: topicId });
}

/** Tìm trong câu hỏi và câu trả lời: mọi từ của truy vấn (không dấu) phải xuất hiện. */
function runSearch(query) {
  const words = normalize(query).split(/\s+/u).filter(Boolean);
  if (!words.length) {
    showPopular();
    return;
  }
  const items = faqs.filter(item => {
    const text = normalize(item.q + ' ' + item.a);
    return words.every(word => text.includes(word));
  });
  renderTopics();
  showFaqs(items, {
    title: 'Kết quả tìm kiếm',
    desc: 'Câu hỏi khớp với "' + query + '".',
    status: items.length ? items.length + ' câu hỏi phù hợp.' : '0 câu hỏi phù hợp.',
    showTopic: true,
    emptyQuery: query,
  });
  updateUrl({ q: query });
}

/** Lưu trạng thái tìm kiếm/chủ đề vào URL để chia sẻ được, không tạo thêm lịch sử trình duyệt. */
function updateUrl({ q, topic }) {
  const params = new URLSearchParams();
  if (q) {
    params.set('q', q);
  }
  if (topic) {
    params.set('topic', topic);
  }
  history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
}

/** Đưa người dùng tới khu FAQ (nhảy thẳng, không cuộn mượt) và chuyển focus cho trình đọc màn hình. */
function jumpToFaq() {
  const section = qs('#faq');
  section.scrollIntoView({ block: 'start' });
  section.focus({ preventScroll: true });
}

/* ===== Hero ===== */

/** Nút Tìm kiếm chỉ bật khi ô nhập có chữ (cùng quy tắc với trang Tìm kiếm). */
function syncSearchButton() {
  qs('[data-help-submit]').disabled = !queryInput.value.trim();
}

/** Gửi biểu mẫu tìm kiếm của hero: lọc câu hỏi rồi nhảy tới kết quả. */
function submitSearch(event) {
  event.preventDefault();
  const query = queryInput.value.trim();
  if (!query) {
    return;
  }
  runSearch(query);
  jumpToFaq();
}

/** Dựng các chip từ khoá phổ biến; bấm chip thì điền vào ô và tìm ngay. */
function renderPopularQueries() {
  qs('[data-popular-queries]').replaceChildren(...popularQueries.map(text => {
    const chip = el('button', { type: 'button', className: 'support-chip' }, text);
    chip.addEventListener('click', () => {
      // Điền từ khoá giống như người dùng tự gõ, rồi chạy cùng luồng tìm kiếm.
      queryInput.value = text;
      syncSearchButton();
      runSearch(text);
      jumpToFaq();
    });
    return chip;
  }));
}

/** Bốn quy tắc cộng đồng, mỗi dòng có icon khiên đỏ. */
function renderRules() {
  qs('[data-rules]').replaceChildren(...rules.map(rule => el('li', { className: 'support-rules__item' },
    icon('shield', 18, 'support-rules__icon'), el('span', {}, rule))));
}

/* ===== Hộp thoại gửi yêu cầu ===== */

/** Mở hộp thoại ở chế độ "ticket" (yêu cầu hỗ trợ) hoặc "report" (báo cáo vi phạm). */
function openDialog(mode) {
  dialogMode = mode;
  const isReport = mode === 'report';
  qs('[data-dialog-title]').textContent = isReport ? 'Báo cáo vi phạm' : 'Gửi yêu cầu hỗ trợ';
  qs('[data-field="link"]').hidden = !isReport;
  qs('[data-field="topic"]').hidden = isReport;
  qs('[data-dialog-status]').hidden = true;
  const topicSelect = qs('[data-dialog-topic]');
  topicSelect.replaceChildren(...topics.map(topic => el('option', { value: topic.id }, topic.title)));
  const email = qs('[data-dialog-email]');
  // Điền sẵn email của người đang đăng nhập để họ không phải gõ lại.
  if (user?.email && !email.value) {
    email.value = user.email;
  }
  syncDialogSubmit();
  dialog.showModal();
}

/** Nút Gửi của hộp thoại chỉ bật khi đã đủ các trường bắt buộc. */
function syncDialogSubmit() {
  const message = qs('[data-dialog-message]').value.trim();
  const email = qs('[data-dialog-email]').value.trim();
  const link = qs('[data-dialog-link]').value.trim();
  const ready = message && email && (dialogMode !== 'report' || link);
  qs('[data-dialog-submit]').disabled = !ready;
}

/** Hiện thông báo trong hộp thoại; content có thể chứa liên kết (đã tạo bằng DOM). */
function setDialogStatus(content, kind = 'info') {
  const status = qs('[data-dialog-status]');
  status.className = 'alert alert--' + kind;
  status.replaceChildren(...[].concat(content));
  status.hidden = false;
}

/** Gửi yêu cầu hoặc báo cáo; khi backend chưa hỗ trợ thì không gửi gì và đề nghị gửi qua email. */
async function submitDialog(event) {
  event.preventDefault();
  const email = qs('[data-dialog-email]').value.trim();
  const message = qs('[data-dialog-message]').value.trim();
  const link = qs('[data-dialog-link]').value.trim();
  const topic = qs('[data-dialog-topic]').value;
  const button = qs('[data-dialog-submit]');
  button.disabled = true;
  button.textContent = 'Đang gửi…';
  try {
    const result = dialogMode === 'report'
      ? await createReport({ target_url: link, reason: 'other', message })
      : await createSupportTicket({ topic, email, message });
    if (result) {
      setDialogStatus('Đã gửi. Đội ngũ Etsubi sẽ trả lời qua email ' + email + '.', 'success');
      return;
    }
    // Backend chưa có endpoint: soạn sẵn email để người dùng tự gửi bằng ứng dụng thư của họ.
    const subject = dialogMode === 'report' ? 'Báo cáo vi phạm' : 'Yêu cầu hỗ trợ: ' + (topics.find(entry => entry.id === topic)?.title || '');
    const body = (dialogMode === 'report' ? 'Đường dẫn: ' + link + '\n\n' : '') + message + '\n\nEmail nhận phản hồi: ' + email;
    const mailto = 'mailto:contact@etsubi.vn?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    setDialogStatus(['Gửi trực tuyến sẽ có khi máy chủ hỗ trợ. Bạn có thể ', el('a', { href: mailto }, 'gửi nội dung này qua email'), ' tới contact@etsubi.vn.']);
  } catch (error) {
    setDialogStatus(toVietnameseMessage(error), 'error');
  } finally {
    button.textContent = 'Gửi';
    syncDialogSubmit();
  }
}

/** Đóng hộp thoại và trả focus về nút đã mở nó (trình duyệt tự làm khi dùng dialog). */
function closeDialog() {
  dialog.close();
}

/** Mọi nút có data-open-dialog (kể cả nút trong ô "không có kết quả") mở hộp thoại tương ứng. */
function handleDialogTrigger(event) {
  const trigger = event.target.closest('[data-open-dialog]');
  if (trigger) {
    openDialog(trigger.dataset.openDialog);
  }
}

/** Bấm thẻ chủ đề hoặc liên kết có data-topic-link: lọc câu hỏi và nhảy tới FAQ. */
function handleTopicClick(event) {
  const trigger = event.target.closest('[data-topic], [data-topic-link]');
  if (!trigger) {
    return;
  }
  event.preventDefault();
  const topicId = trigger.dataset.topic || trigger.dataset.topicLink;
  queryInput.value = '';
  syncSearchButton();
  showTopic(topicId);
  jumpToFaq();
}

/* ===== Khởi tạo ===== */

/** Dựng nội dung tĩnh trước, đọc ?q= hoặc ?topic= từ URL, sau đó mới tải phiên (chỉ dùng để điền email). */
async function initialize() {
  mountPetals();
  renderPopularQueries();
  renderRules();
  const params = new URLSearchParams(location.search);
  if (params.get('q')) {
    queryInput.value = params.get('q');
    syncSearchButton();
    runSearch(params.get('q'));
  } else if (params.get('topic')) {
    showTopic(params.get('topic'));
  } else {
    showPopular();
  }
  user = await fetchCurrentUser();
}

// Gắn sự kiện một lần cho các điều khiển tĩnh trong HTML.
queryInput.addEventListener('input', syncSearchButton);
qs('[data-help-search]').addEventListener('submit', submitSearch);
qs('[data-faq-reset]').addEventListener('click', () => {
  // Xoá truy vấn và lọc, quay về sáu câu hỏi phổ biến.
  queryInput.value = '';
  syncSearchButton();
  showPopular();
});
document.addEventListener('click', handleDialogTrigger);
qs('[data-topics]').addEventListener('click', handleTopicClick);
qs('[data-topic-link]').addEventListener('click', handleTopicClick);
for (const field of qsa('[data-dialog-email], [data-dialog-message], [data-dialog-link]')) {
  field.addEventListener('input', syncDialogSubmit);
}
qs('[data-dialog-form]').addEventListener('submit', submitDialog);
qs('[data-dialog-close]').addEventListener('click', closeDialog);
void initialize();

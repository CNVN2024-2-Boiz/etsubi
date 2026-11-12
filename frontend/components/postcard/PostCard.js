/** Thẻ kết quả có liên kết phủ thẻ, còn liên kết tag vẫn thao tác độc lập được. */
import { el } from '/utils/dom.js';
import { routes, searchUrl } from '/utils/routes.js';
import { initials, relativeTime } from '/utils/format.js';
import { highlight, wrapJapanese, makeExcerpt } from '/utils/text.js';
import { createTagChip } from '/components/tag-chip/tag-chip.js';

/** Tạo văn bản có đánh dấu khớp và gắn ngôn ngữ Nhật cho cả chữ trong mark. */
function markedText(text, query, variant) {
  const fragment = highlight(text, query);
  for (const mark of fragment.querySelectorAll('mark')) {
    mark.classList.add('hl--' + variant);
  }
  return wrapJapanese(fragment);
}

/**
 * Tạo bài viết từ dữ liệu hiện có; không tải thêm tác giả hoặc thống kê trong component.
 * @param {object} post Bài viết trả về từ API.
 * @param {object} options Từ khoá, tác giả, tag và hàm tạo liên kết tag tuỳ trang.
 * @returns {HTMLElement} Article có hook dữ liệu để bổ sung tác giả và tag tại chỗ.
 */
export function createPostCard(post, { query = '', author, tags = [], onTagHref } = {}) {
  const article = el('article', { className: 'postcard postcard--result', 'data-post-id': post.id });
  const authorRow = el('div', { className: 'postcard__author', 'data-post-author': '' });
  if (author) {
    const name = author.username || 'Thành viên';
    const avatar = el('span', { className: 'postcard__avatar', 'aria-hidden': 'true' }, initials(name));
    if (author.avatar_url) {
      const image = el('img', { src: author.avatar_url, alt: name, width: 24, height: 24, loading: 'lazy' });
      /** Trả về chữ viết tắt khi ảnh lỗi để không hiển thị biểu tượng ảnh hỏng. */
      function useInitials() {
        avatar.replaceChildren(initials(name));
      }
      image.addEventListener('error', useInitials, { once: true });
      avatar.removeAttribute('aria-hidden');
      avatar.replaceChildren(image);
    }
    authorRow.append(avatar, el('span', { className: 'postcard__author-name' }, wrapJapanese(name)));
  } else {
    authorRow.append(el('span', {
      className: 'postcard__author-placeholder', 'aria-label': 'Đang tải tác giả',
    }));
  }
  const relative = relativeTime(post.created_at);
  if (relative) {
    authorRow.append(el('span', { 'aria-hidden': 'true' }, '·'),
      el('time', { datetime: post.created_at, className: 'postcard__time' }, relative));
  }
  const title = el('h2', { className: 'postcard__title' },
    el('a', { className: 'postcard__link', href: routes.post(post.id) }, markedText(post.title, query, 'title'))
  );
  const excerpt = el('p', { className: 'postcard__excerpt' }, markedText(makeExcerpt(post.content, query), query, 'body'));
  const tagList = el('div', { className: 'postcard__tags', 'data-post-tags': '' });
  for (const tag of tags) {
    const name = typeof tag === 'string' ? tag : tag.name;
    if (name) {
      tagList.append(createTagChip({ name, href: onTagHref ? onTagHref(name) : searchUrl({ tags: [name] }) }));
    }
  }
  const stats = el('div', { className: 'postcard__stats' });
  // Chỉ hiện số thực do dữ liệu cung cấp; API hiện tại không có nên tuyệt đối không tạo số giả.
  const numbers = [
    ['message-circle', post.comment_count, 'bình luận'],
    ['heart', post.like_count ?? post.reaction_count, 'lượt thích'],
  ];
  for (const [icon, count, label] of numbers) {
    if (typeof count === 'number' && Number.isFinite(count)) {
      stats.append(el('span', { className: 'postcard__stat', 'aria-label': count + ' ' + label },
        el('img', { src: '/assets/icons/' + icon + '.svg', alt: '', width: 16, height: 16 }), count));
    }
  }
  if (post.comments_locked) {
    const lock = el('span', { className: 'postcard__stat postcard__lock' });
    // SVG cố định dùng currentColor để cùng màu chữ, không nhận dữ liệu HTML từ API.
    lock.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    lock.append('Đã khoá bình luận');
    stats.append(lock);
  }
  article.append(authorRow, title, excerpt, el('div', { className: 'postcard__footer' }, tagList, stats));
  return article;
}

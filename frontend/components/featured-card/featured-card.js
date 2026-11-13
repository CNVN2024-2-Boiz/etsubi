/** Thẻ nổi bật chỉ dựng DOM từ dữ liệu thật hoặc thanh chờ, không tự gọi API. */
import { el } from '/utils/dom.js';
import { routes, searchUrl } from '/utils/routes.js';
import { initials, relativeTime } from '/utils/format.js';
import { makeExcerpt, wrapJapanese } from '/utils/text.js';
import { getAuthorDisplayName } from '/services/api/posts.js';

/** Tạo icon cố định đúng kích thước thật; tên thao tác do phần tử cha cung cấp. */
function icon(name) {
  return el('img', { src: '/assets/icons/' + name + '.svg', alt: '', width: 18, height: 18 });
}

/** Giữ dải đỏ và thứ hạng giống nhau ở cả thẻ thật lẫn thẻ chờ. */
function createBand(rank) {
  return el('div', { className: 'featured-card__band' },
    el('span', { className: 'featured-card__badge' }, '★ Nổi bật'),
    el('span', { className: 'featured-card__rank', 'aria-label': 'Hạng ' + rank }, String(rank).padStart(2, '0')));
}

/** Tạo nút chi tiết bằng liên kết thật hoặc nút khoá khi chưa có mã bài viết. */
function createDetail(postId) {
  return el(postId ? 'a' : 'button', {
    className: 'btn btn--primary featured-card__detail',
    href: postId ? routes.post(postId) : null,
    type: postId ? null : 'button',
    disabled: !postId,
    'aria-disabled': postId ? null : 'true',
  }, 'Xem chi tiết', icon('arrow-right'));
}

/** Hiển thị avatar thật, dự phòng chữ đầu khi ảnh hỏng để không có ô ảnh lỗi. */
function createAvatar(author) {
  const name = getAuthorDisplayName(author) || '';
  const avatar = el('span', { className: 'avatar featured-card__avatar' }, initials(name));
  if (author?.avatar_url) {
    const image = el('img', { src: author.avatar_url, alt: name, loading: 'lazy', width: 28, height: 28 });
    /** Dùng tên viết tắt thật khi máy chủ ảnh không cung cấp được avatar. */
    function useInitials() {
      avatar.replaceChildren(initials(name));
    }
    image.addEventListener('error', useInitials, { once: true });
    avatar.replaceChildren(image);
  }
  return avatar;
}

/**
 * Dựng thẻ nổi bật đủ tiêu đề, tag, tác giả, thống kê và liên kết chi tiết.
 * @param {object} options Bài viết, thứ hạng và thông tin nhúng do backend cung cấp.
 * @returns {HTMLElement} Thẻ độc lập có cấu trúc article và h3 đúng ngữ nghĩa.
 */
export function createFeaturedCard({ post, rank, author = post.author, tags = post.tags || [], commentCount = post.comment_count }) {
  const title = el('h3', { className: 'featured-card__title' },
    el('a', { href: routes.post(post.id) }, wrapJapanese(post.title)));
  const tagRow = el('div', { className: 'featured-card__tags' });
  // Tag dẫn tới tìm kiếm theo tên thật, không tạo trang tag riêng.
  for (const tag of tags) {
    tagRow.append(el('a', { className: 'featured-card__chip', href: searchUrl({ tags: [tag.name] }) }, wrapJapanese(tag.name)));
  }
  const name = getAuthorDisplayName(author);
  const meta = el('div', { className: 'featured-card__meta' }, createAvatar(author),
    name ? el('span', { className: 'featured-card__name' }, wrapJapanese(name))
      : el('span', { className: 'u-placeholder-bar u-placeholder-bar--short', 'aria-label': 'Chưa có tác giả' }),
    el('time', { datetime: post.created_at }, '· ' + relativeTime(post.created_at)));
  const actions = el('div', { className: 'featured-card__actions' },
    el('span', { className: 'featured-card__comments' }, icon('comment'),
      (Number.isFinite(commentCount) ? commentCount : '–') + ' bình luận'), createDetail(post.id));
  return el('article', { className: 'featured-card' }, createBand(rank),
    el('div', { className: 'featured-card__body' }, title,
      el('p', { className: 'featured-card__excerpt' }, wrapJapanese(makeExcerpt(post.content, '', 220))),
      tagRow, el('div', { className: 'featured-card__spacer' }), meta, actions));
}

/** Giữ khung Figma bằng thanh xám tĩnh khi chưa có API xếp hạng, không dùng bài mới làm bài nổi bật. */
export function createFeaturedPlaceholder(rank) {
  const body = el('div', { className: 'featured-card__body' });
  // Hai dòng tiêu đề và ba dòng mô tả chỉ là hình giữ chỗ, không đọc như dữ liệu.
  for (let index = 0; index < 5; index += 1) {
    body.append(el('span', {
      className: 'u-placeholder-bar' + (index < 2 ? ' u-placeholder-bar--title' : '')
        + (index === 1 || index === 4 ? ' u-placeholder-bar--short' : ''),
      'aria-hidden': 'true',
    }));
  }
  body.append(el('div', { className: 'featured-card__tags', 'aria-hidden': 'true' },
    el('span', { className: 'u-placeholder-bar featured-card__pill-placeholder' }),
    el('span', { className: 'u-placeholder-bar featured-card__pill-placeholder' })),
  el('div', { className: 'featured-card__spacer' }),
  el('div', { className: 'featured-card__meta', 'aria-hidden': 'true' },
    el('span', { className: 'featured-card__avatar featured-card__avatar--placeholder' }),
    el('span', { className: 'u-placeholder-bar u-placeholder-bar--short' })),
  el('div', { className: 'featured-card__actions' },
    el('span', { className: 'featured-card__comments' }, icon('comment'), '– bình luận'), createDetail()),
  el('span', { className: 'u-visually-hidden' }, 'Đang chờ dữ liệu bài nổi bật'));
  return el('article', { className: 'featured-card featured-card--placeholder' }, createBand(rank), body);
}

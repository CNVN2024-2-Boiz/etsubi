/** Nhãn dùng cùng một nguồn cho tooltip và trình đọc màn hình, không tạo số khi API thiếu dữ liệu. */
import { t } from '/utils/i18n.js';

/**
 * Tạo nhãn cho một chỉ số của bài viết.
 * @param {number|null} count Số thật từ API, thiếu thì báo chưa có dữ liệu.
 * @param {'comments'|'likes'|'views'} kind Loại chỉ số.
 * @returns {string} Nhãn theo ngôn ngữ giao diện.
 */
export function statLabel(count, kind) {
  const known = Number.isFinite(count);
  if (kind === 'likes') {
    return known ? t('{count} lượt thích', { count }) : t('Số lượt thích · chưa có dữ liệu');
  }
  if (kind === 'views') {
    return known ? t('{count} lượt xem', { count }) : t('Số lượt xem · chưa có dữ liệu');
  }
  return known ? t('{count} bình luận', { count }) : t('Số bình luận · chưa có dữ liệu');
}

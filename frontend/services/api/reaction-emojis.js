/**
 * Danh sách cảm xúc được phép, khớp ràng buộc reactions_emoji_check của backend.
 * Muốn thêm emoji thì thêm ở cả migration backend lẫn mảng dưới đây, rồi làm hiệu ứng hover chọn emoji.
 */

// Tim đỏ gồm hai mã U+2764 U+FE0F, đúng chuỗi backend chấp nhận; gõ lại bằng tay dễ thiếu U+FE0F.
export const LIKE_EMOJI = '❤️';

// Hiện chỉ thử một cảm xúc; mảng đóng băng để không nơi nào sửa được lúc chạy.
export const REACTION_EMOJIS = Object.freeze([LIKE_EMOJI]);

/**
 * Kiểm tra một chuỗi có đúng là cảm xúc được phép hay không, so khớp tuyệt đối sau khi bỏ khoảng trắng.
 * @param {unknown} emoji Giá trị cần kiểm tra.
 * @returns {boolean} true khi nằm trong danh sách cho phép.
 */
export function isAllowedReaction(emoji) {
  return typeof emoji === 'string' && REACTION_EMOJIS.includes(emoji.trim());
}

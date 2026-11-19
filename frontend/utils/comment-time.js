/** Chỉ hiện nhãn đã sửa nếu máy chủ trả thời điểm cập nhật muộn hơn tạo quá một giây. */
export function isCommentEdited(createdAt, updatedAt) {
  if (typeof createdAt !== 'string' || typeof updatedAt !== 'string') return false;
  const created = Date.parse(createdAt);
  const updated = Date.parse(updatedAt);
  return Number.isFinite(created) && Number.isFinite(updated) && updated - created > 1000;
}

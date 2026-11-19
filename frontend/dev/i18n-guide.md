# Hướng dẫn dịch giao diện Etsubi (VI, JA, EN)

Khoá dịch là **câu tiếng Việt gốc**. Thiếu bản dịch thì trang vẫn hiện tiếng Việt. Từ điển nằm ở `frontend/i18n/<nhóm>.js`, mỗi mục có đủ `ja` và `en`:

```js
export default {
  // Nút đăng nhập ở header và trang xác thực.
  'Đăng nhập': { ja: 'ログイン', en: 'Sign in' },
  '{count} bình luận': { ja: '{count}件のコメント', en: { one: '{count} comment', other: '{count} comments' } },
};
```

## Cách đánh dấu chữ

| Chỗ có chữ | Cách làm |
|---|---|
| Chữ trong JS | `import { t } from '/utils/i18n.js';` rồi viết `t('Đăng nhập')` |
| Câu có giá trị động | `t('Xin chào {name}', { name })`. Không ghép chuỗi bằng dấu `+` và không dùng `${}` trong khoá |
| Chữ thuần trong HTML | Thêm `data-i18n` vào phần tử chỉ chứa chữ: `<h2 data-i18n>Liên hệ</h2>` |
| Câu có thẻ định dạng | Thêm `data-i18n-html`. Khoá là phần HTML bên trong sau khi gộp khoảng trắng. Chỉ dùng `a, b, br, code, em, kbd, small, span, strong` |
| Thuộc tính HTML | `data-i18n-attr="placeholder,aria-label"` |
| Tiêu đề và mô tả trang | `<title data-i18n>Đăng nhập · Etsubi</title>`, `<meta name="description" content="..." data-i18n-attr="content">` |
| Ngày giờ, số | Dùng `currentLocale()` từ `/utils/i18n.js`, không viết cố định `'vi-VN'` |

## Không được dịch

- Nội dung người dùng: bài viết, bình luận, tên, tiểu sử, tên địa điểm từ API.
- Tên thương hiệu `Etsubi`, chữ `越日`, email, số điện thoại, mã VI/JA/EN.
- Tên ngôn ngữ tự gọi: `Tiếng Việt`, `日本語`, `English`. Thêm comment `// i18n-ignore` trên dòng đó hoặc dòng ngay trên.
- Chuỗi dùng làm giá trị logic (mã, tên route, tên tag gửi API). Nếu có dấu tiếng Việt thì thêm `// i18n-ignore`.
- Chuỗi trong comment. Giữ nguyên comment tiếng Việt.

## Bẫy thường gặp

- Hằng số ở cấp module vẫn gọi được `t()` vì ngôn ngữ đã có sẵn khi trang tải.
- Code đọc lại chữ trên giao diện để so sánh phải so với `t('...')` hoặc chuyển sang `data-*`.
- Câu tiếng Nhật không dùng khoảng trắng giữa các từ. Dấu câu dùng `。`, `、`.
- Giữ giọng lịch sự, ngắn gọn. Tiếng Nhật dùng thể です・ます. Tiếng Anh dùng sentence case, ví dụ `Sign in`, `Save changes`.
- Giữ nguyên mọi biến `{ten}` trong bản dịch, được đổi vị trí theo ngữ pháp.
- Không dùng em dash (U+2014) ở bất kỳ đâu.

## Bảng thuật ngữ bắt buộc

| Tiếng Việt | 日本語 | English |
|---|---|---|
| Trang chủ | ホーム | Home |
| Diễn đàn | フォーラム | Forum |
| Hỗ trợ | サポート | Support |
| Giới thiệu | 概要 | About |
| Tìm kiếm | 検索 | Search |
| Bài viết | 投稿 | Post |
| Đăng bài | 投稿する | Post |
| Bình luận | コメント | Comment |
| Trả lời | 返信 | Reply |
| Chủ đề | トピック | Topic |
| Thẻ / tag | タグ | Tag |
| Hồ sơ | プロフィール | Profile |
| Cài đặt | 設定 | Settings |
| Thông báo | 通知 | Notifications |
| Đăng nhập | ログイン | Sign in |
| Đăng ký | 新規登録 | Sign up |
| Đăng xuất | ログアウト | Sign out |
| Tài khoản | アカウント | Account |
| Mật khẩu | パスワード | Password |
| Tên hiển thị | 表示名 | Display name |
| Tên người dùng | ユーザー名 | Username |
| Ngôn ngữ mẹ đẻ | 母語 | Native language |
| Ngôn ngữ giao diện | 表示言語 | Interface language |
| Theo dõi | フォロー | Follow |
| Đang theo dõi | フォロー中 | Following |
| Người theo dõi | フォロワー | Followers |
| Phổ biến | 人気 | Popular |
| Mới nhất | 新着 | Latest |
| Hỏi đáp | Q&A | Q&A |
| Nổi bật | 注目 | Featured |
| Lưu | 保存 | Save |
| Huỷ | キャンセル | Cancel |
| Xoá | 削除 | Delete |
| Sửa | 編集 | Edit |
| Gửi | 送信 | Send |
| Chia sẻ | 共有 | Share |
| Dịch | 翻訳 | Translate |
| Xem bản gốc | 原文を見る | View original |
| Địa điểm | 場所 | Place |
| Trường | 学校 | School |
| Nơi ở | 居住地 | Location |
| Văn hoá Việt – Nhật | 日越文化 | Vietnam–Japan culture |
| Sinh viên | 学生 | Student |
| Quản trị viên | 管理者 | Administrator |
| Điều hành viên | モデレーター | Moderator |

## Kiểm tra

```bash
node frontend/dev/tests/i18n.mjs pages/ten-trang
```

Lệnh in từng chữ còn thiếu kèm số dòng. Xong phần việc khi lệnh báo đạt.

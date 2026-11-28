# HANDOFF.md – Etsubi front end

> **Read [`AGENTS.md`](AGENTS.md) first and follow it.** It holds the binding rules: pure HTML/CSS/JS, tokens, header/footer reuse, minimal animation, Vietnamese comments on every block, no em dash, back-end contract.

Last update: 2026-11-24 · branch `feat/fe-terms`.

## Đợt 15 · Điều khoản sử dụng và khung pháp lý

- `/terms/` có 15 mục, giao diện và nội dung VI/JA/EN, mục lục bám dưới header trên desktop, nút mở mục lục trên mobile và bố cục in. Hai liên kết ở cột Tài nguyên của footer dùng `routes.terms` và `routes.privacy`.
- Phú có thể tách từ commit khung chung `5c37e5b` và xem cấu trúc trong `frontend/terms/index.html` để dùng lại CSS, module mục lục và từ điển pháp lý. `/privacy/`, bảng dữ liệu, nội dung quyền riêng tư và hai ô đồng ý khi đăng ký thuộc phần của Phú. Các liên kết Quyền riêng tư mở được sau khi phần đó có trên nhánh tích hợp.
- Đối chiếu frame Điều khoản desktop `274:5589` và mobile `274:6315` trong bản Figma `wZygwGTGuvsyB0h99RRm6e`. Giữ header/footer chung, ghi chú ngôn ngữ đầy đủ và nội dung thật nên chiều dài trang khác khung mẫu. Mobile vào thẳng nội dung sau ghi chú và giữ nút chuyển văn bản ở cuối, theo frame mobile.
- Đã kiểm tra trên Edge ở 1920×1080, 1280×800 và 375×812, gồm menu mục lục, liên kết trực tiếp, mục cuối trang, thao tác bàn phím, ba ngôn ngữ, bản in và các đích liên kết Hỗ trợ. Trạng thái đăng nhập của header dùng phản hồi API mô phỏng. Chín bộ kiểm thử frontend đạt. Nội dung pháp lý là HTML tĩnh.
- Các chỗ trong ngoặc vuông giữ nguyên để nhóm chốt, gồm ngày hiệu lực, phiên bản, ngày cập nhật, tên nhóm, đầu mối pháp lý, địa chỉ và quy trình giám hộ. Nhóm cần xác nhận quy trình tiếp nhận khiếu nại và khả năng đáp ứng thời hạn trước khi công bố. Việc cần backend đã được ghi trong mục 7 của tài liệu bàn giao pháp lý.

## Đợt 14 · Góp ý sau triển khai

Figma canva `489:3791`, bảng general `259:3043`.

- Các trang dùng URL thư mục như `/forum/`. HTML chuyển sang `index.html` ở thư mục tương ứng, module vẫn ở `frontend/pages/`. Liên kết cũ chuyển hướng giữ query và hash. Bảng ánh xạ nginx ở `frontend/dev/nginx-clean-urls.md`.
- Thẻ bảng tin có tiêu đề và liên kết hồ sơ tác giả. Bản xem trước giữ chữ trước cụm ảnh đầu, tối đa 260 ký tự và 4 ảnh; chung cho Trang chủ, Diễn đàn và Hồ sơ.
- Trang chủ có nút và phím mũi tên chuyển bài nổi bật theo bố cục 3/2/1. Bỏ nhóm Bài viết gợi ý; gợi ý theo dõi dùng tác giả từ bài có sẵn và danh sách đang theo dõi.
- Bình luận hiện đủ năm, liên kết tới hồ sơ và có khung trả lời tại chỗ. Trả lời nhiều cấp cùng hiển thị trong một cột, vẫn gửi đúng `parent_id`.
- Hồ sơ có thẻ Bài viết bên dưới Kết nối, mỗi lần hiện thêm 10 bài. Chỉ chủ hồ sơ thấy tab Đã lưu; bỏ lưu cập nhật danh sách và số đếm. Hỗ trợ bỏ nhóm Quyền riêng tư & Bảo mật cùng hai FAQ và liên kết chân trang tương ứng.

Đã đối chiếu hai bảng Figma và kiểm tra trên Edge với máy chủ tĩnh Python cùng phản hồi API mô phỏng. API Rust trên máy chưa chạy trong lượt kiểm tra.

## 1. What is done (batch 1)

| Page / part | Files | Figma frame (personal file `LukhEp2hUOnbb9SYkv80ks`) |
|---|---|---|
| Design tokens, base styles, shared components (button, input, checkbox, radio card, card, alert, avatar, kbd) | `frontend/styles/tokens.css`, `base.css`, `components.css`, `main.css` | Button set `125:81`, Radio Card `125:47` |
| Shared header (4 tabs, logo with white ring, lang badge, bell + avatar menu, mobile menu, search-bar slot, `/` shortcut) | `frontend/components/header/` | Navbar `140:200`, search header in `168:1084` |
| Shared footer (`slim` for auth pages, `full` for content pages, mobile one-liner) | `frontend/components/footer/` | Footer `140:276`, `168:1084` |
| Auth illustration (sun, clouds, torii, petals, waves) | `frontend/components/auth-scene/`, `styles/pages/auth.css` | `256:2242` |
| API client (base URL override, Bearer token, request queue for the 4 req/s rate limit, 429 retry) + services | `frontend/services/api/` | – |
| Session, routes, errors (VI messages), DOM/format helpers | `frontend/utils/` | – |
| **Login** | `frontend/pages/profile/login.html` + `login.js` | Login 3a `256:2242` |
| **Register** | `frontend/pages/profile/register.html` + `register.js` | Register 1a `256:2355` |
| **Register Advanced** (profile completion, native language single choice) | `frontend/pages/profile/register-advanced.html` + `.js`, `styles/pages/register-advanced.css`, `assets/avatars/` | Register Advanced 2 `159:524` (and `126:2`) |
| **Search** (empty + results, tag chips, tag filter, mobile) | `frontend/pages/search.html` + `search.js`, `styles/pages/search.css`, `components/search-bar/`, `components/tag-chip/`, `components/postcard/` | `267:2576`, `168:1084`, `204:1448`, states `168:869` |
| **Home (Trang chủ), implementation done**: hero, featured placeholders/pagination, recommendations, real latest/question feed, tabs, bookmark/follow, opt-in header search | `frontend/pages/index.html` + `index.js`, `styles/pages/home.css`, `components/featured-card/`, feed export in `components/postcard/`, capability-gated API services | Home 4 `140:135`, Navbar `140:200`, PostCard `139:157` |
| **Reading page (Đọc bài), batch 2**: author row with flag, translate button, paragraphs + quote blocks, like/save/share pills, discussion (sort, replies, own-comment delete, per-comment translate, locked/muted states), sidebar (Về tác giả with real post/follower counts and follow, Địa điểm văn hoá, Bài viết liên quan, Chủ đề liên quan), petals, not-found state | `frontend/pages/post.html` + `post.js`, `styles/pages/post.css`, `services/api/comment.js`, additions in `posts.js`, `reactions.js`, `bookmarks.js`, `follows.js`, `capabilities.js`, `utils/errors.js`, assets `icons/flag-vn.svg`, `icons/flag-jp.svg`, `icons/external-link.svg`, `illustrations/culture-map.svg` | shared file Reading Page `1:1337` (personal `234:1679`) |
| **Diễn đàn (forum), batch 2**: heading, 4 feed tabs (Mới nhất, Phổ biến, Đang theo dõi, Hỏi đáp), compose box (batch 10: rich editor, ảnh link HTTPS, map picker and topic chips; posts via `POST /posts` then `POST /posts/{id}/tags/{tag}`), shared feed PostCard, "Tải thêm bài viết" paging, `?compose=1` opens the compose box | `frontend/pages/forum.html` + `forum.js`, `styles/pages/forum.css`, `createPost`/`addPostTag` in `services/api/posts.js`, post error messages in `utils/errors.js`, icon Lucide image (poll service còn hoãn) | shared file Diễn đàn `1:1587` (personal `236:1725`); topic chips `394:3090` / `397:3355` |
| **Hỗ trợ (support), batch 2**: hero with sun, clouds, faint torii and petals; help search over the FAQ (accent-insensitive, `?q=`), popular query chips, 8 topic cards that filter the FAQ (`?topic=`), FAQ accordion (`<details>`), "Vẫn cần trợ giúp?" card (support email dialog, mailto), "Quy tắc cộng đồng" card | `frontend/pages/support.html` + `support.js` + `support-content.js` (static help copy), `styles/pages/support.css`, `utils/support-mailto.js`, `illustrations/torii-faint.svg` | shared file Hỗ trợ 2 `1:1966` (personal `247:2088`) |
| **Giới thiệu (about), batch 2**: photo banner, name story with the 越 + 日 = Etsubi equation, 4 feature cards linking to the forum or the matching help topic, "Công nghệ phía sau" card, 5 team member cards, CTA linking to the team repo and its docs | `frontend/pages/about.html` + `about.js`, `styles/pages/about.css`, `assets/images/about-hero.jpg` (Figma photo resized to 1920px, ~0.6 MB) | shared file Giới thiệu `1:1737` (personal `245:1956`) |
| **Hồ sơ (profile), batch 2**: own profile (no `id`, needs login) or someone else's (`?id=`), `?tab=followers\|following`; profile card (avatar, camera badge to Chỉnh sửa hồ sơ on your own profile, name, role chip, bio, institute/address/native, real follower counts, follow button on other profiles); "Kết nối" card with two tabs, name filter (match in red, empty and no-result states), user rows with Theo dõi / Theo dõi lại / Đang theo dõi (hover "Bỏ theo dõi") and a "Bạn" label on your own row | `frontend/pages/profile/index.html` + `index.js`, `styles/pages/profile.css`, `listFollowing`/`listMyFollowers`/`listMyFollowing` in `services/api/follows.js` | shared file Profile `1:3896` (desktop `1:3900`, mobile `1:4066`, states `1:4140`; personal board `226:1544`) |
| **Batch 3: header search button** (Figma `HeaderSearchSubmit` `292:2401`): cream "Tìm kiếm" pill inside every header search pill (Home, Diễn đàn, Đọc bài, Hỗ trợ, Giới thiệu, Hồ sơ, Chỉnh sửa hồ sơ), disabled with opacity .4 while the input is empty; `autocomplete="off"` on header and Search inputs | `frontend/components/header/`, `components/search-bar/search-bar.js` | `292:2401`, pills `140:212` … `285:2546` |
| **Batch 3: notifications** – bell red dot (only when unread > 0; hidden at 0, signed out, or on error), desktop panel 400px with kind badges, unread/read/hover states, mark one/all read, delete, "Xem thêm thông báo", loading/empty/error; mobile ≤600px opens the full page `/pages/notifications.html` with a "…" menu per item | `components/notification-menu/`, `services/api/notifications.js`, `pages/notifications.html` + `.js`, `styles/pages/notifications.css` | Components `299:2433`, panel `299:2518`, states `300:2518` (shared: `101:2062`, `101:2135`, `101:2222`) |
| **Batch 3: notification side effects** – the back end does not create notifications by itself, so the service layer sends the second request after follow, reaction, comment, reply, new post (`notify-followers`) and staff actions (mute, ban, lock comments, hide/delete a post). Failures are swallowed and never undo the action | `services/api/notify-actions.js` (table at the top), `follows.js`, `reactions.js`, `comment.js`, `posts.js`, `manage.js` | – |
| **Batch 3: Chỉnh sửa hồ sơ** (`/pages/profile/edit.html`): settings nav, avatar (presets or 256px upload), account info (username, editable email, school, place, bio), native language preselected, optional password change (`PATCH /my/password`, then automatic re-login because the server invalidates old tokens), "Huỷ thay đổi", "Lưu thay đổi", danger zone with password-confirmed `DELETE /my`, summary + "Xem hồ sơ công khai". Reached from the avatar menu and the camera badge on your Profile | `pages/profile/edit.html` + `edit.js`, `styles/pages/profile-edit.css`, `services/api/users.js` | `285:2323` (shared `99:13346`) |
| **Batch 3: Register Advanced fixes** – "CHƯA MUỐN ĐIỀN NGAY?" + "Bỏ qua, hoàn thiện sau" replaces "Liên hệ quản trị viên"; no native language preselected (register always sends `vi`), step 3 ticks only after a choice, inline error "Vui lòng chọn ngôn ngữ mẹ đẻ." | `pages/profile/register-advanced.*` | `159:524` (shared `99:13065`) |
| **Batch 3: Home/Diễn đàn tabs on the new endpoints** – Phổ biến → `GET /posts/popular`, Hỏi đáp → `GET /posts/qa` (real). Đang theo dõi stays a neutral message because `GET /my/following/posts` currently returns 404 (route bug, §5) | `pages/index.js`, `pages/forum.js`, `services/api/posts.js`, `capabilities.js` | – |
| **Batch 4: heart-only reaction** – the like button sends only ❤️ (U+2764 U+FE0F), matching the back end's `reactions_emoji_check`; `reactToPost` rejects any other emoji before calling the API | `services/api/reaction-emojis.js`, `reactions.js`, `notifications.js` | – |
| **Batch 4: Đang theo dõi tab is real** – flag `followingFeed: true` after merging upstream 8fee464 (route order fixed); Home and Diễn đàn load `GET /my/following/posts` | `services/api/capabilities.js` | – |
| **Batch 4: avatar menu** – 280px panel: avatar 44, username + native flag (EN shows a text badge, no flag yet), email, then "Hồ sơ của tôi", "Cài đặt", "Đăng xuất" (red). Hover/focus sakura + brand red; 48px glow ring on the avatar while open; aria-expanded, Escape returns focus, outside click closes, one menu at a time; fits 375px | `components/header/header.js` + `.css` | screen `319:2589`, panel `319:2684`, `ProfileMenuItem` `318:2623` |
| **Batch 4: Cài đặt** (`/pages/settings.html`, `routes.settings`) merges Chỉnh sửa hồ sơ + Giao diện + Phiên đăng nhập. All batch 3 edit features kept (PATCH /my, password change + re-login, DELETE /my dialog). Giao diện applies at once: theme Sáng/Tối/Theo máy (only Sáng enabled, choice saved in `localStorage.etsubi_theme`) and interface language VI/JA/EN (shared `etsubi_lang`, kept in sync with the header badge through `utils/preferences.js`). Phiên đăng nhập: "Đăng xuất" → Home. 7 anchors in the left nav with the current section highlighted. `/pages/profile/edit.html` stays as a redirect (keeps `#section-…`); every old link points to Cài đặt | `pages/settings.html` + `settings.js`, `styles/pages/settings.css` (+ `profile-edit.css`), `utils/preferences.js`, `pages/profile/edit.*` (redirect) | `323:2611` |
| **Batch 4: Google buttons** on Login and Register ("hoặc" divider + white "Đăng nhập/Đăng ký với Google" button, card +100px). No OAuth on the back end yet: a click shows "… bằng Google sắp có." and sends no request | `pages/profile/login.*`, `register.*`, `styles/pages/auth.css`, `assets/icons/google-g.svg` | Login 3a `256:2242`, Register 1a `256:2355` |
| **Batch 5: Home "Bài viết mới" shows 3 posts per tab** (Figma Home 4) – `HOME_LATEST_LIMIT = 3` in `pages/index.js`, client-side `slice` on all four tabs; every Home feed URL lives in `HOME_FEED_ENDPOINTS` / `listHomeFeed()` in `services/api/posts.js`, so the coming Home-only endpoint is a one-place change. Diễn đàn keeps the other service functions and shows what the API returns (Mới nhất = paged `GET /posts`) | `pages/index.js`, `services/api/posts.js` | Home 4 `140:135` |
| **Batch 5: Cài đặt without "Phiên đăng nhập"** (Figma `323:2611`, now 1920×2546): 6 nav items, one divider before Xoá tài khoản, description "Cập nhật hồ sơ, mật khẩu và giao diện của bạn tại một nơi."; sign-out stays in the avatar menu; old `#section-session` links (also via `edit.html`) land on Giao diện | `pages/settings.*`, `styles/pages/settings.css` | `323:2611` |
| **Batch 5: username is a display name** – hint under Tên người dùng (Cài đặt, Register Advanced) is now "Tên hiển thị trên bài viết và bình luận · tối thiểu 3 ký tự" in muted colour; no more "✓ … khả dụng". The 409 mapping in `utils/errors.js` stays because the back end still rejects duplicates | `pages/settings.*`, `pages/profile/register-advanced.*` | – |
| **Diễn đàn: nút "Đăng bài" nổi + hộp thoại Viết bài mới** (user request 2026-11-16) – once the inline composer scrolls above the sticky header, a sakura pill "Đăng bài" (sakura-100 fill, pink-border, red-dark text, 52px, 40px from the bottom-right; mobile: 56px circle, 16px gutter, icon only) appears; it hides again when the composer is back in view, while the dialog is open, or when the account is muted. Click → signed out: Login (`?compose=1`); signed in: native `<dialog>` "Viết bài mới" that receives the **same** form node (moved, not cloned, so ids, draft and tools stay intact), the page does not scroll, Escape/× keep the draft, Huỷ clears it, a successful post closes the dialog | `pages/forum.html`, `forum.js`, `styles/pages/forum.css`, `tokens.css` | components `344:2710` (set `ForumComposeFab` `344:2712`), screens `344:2714` (scrolled) / `344:2918` (dialog) |
| **Cài đặt: no "‹ Về trang hồ sơ", no divider above the save bar** (user request 2026-11-16, Figma `323:2611` updated) – Huỷ/Lưu aligned right, 40px below Đổi mật khẩu like the other section gaps | `pages/settings.*`, `styles/pages/settings.css` | `323:2611` |
| **Batch 6: Cài đặt saves per section** (Figma `323:2611` 1920×2493, `SectionSaveBar` `354:2961`, dialog `354:2972`) – Ảnh đại diện, Thông tin tài khoản, Ngôn ngữ mẹ đẻ and Đổi mật khẩu each compare against their own saved snapshot and show their own save bar only when different (typing back the old value hides it). Huỷ restores that section only; Lưu sends only that section (`PATCH /my` with its own fields, or `PATCH /my/password` with the existing re-login), validates only that section, shows "Đang lưu mục này…" with both buttons locked, then updates the snapshot, "Đã lưu lần cuối", header and summary card and announces "Đã lưu mục “…”." in an aria-live region; errors stay inside the section. Saves are queued so a password change and a profile save never race on the token. The left nav shows a red 8px dot + hidden text "có thay đổi chưa lưu" for dirty sections. The old shared save bar is gone | `pages/settings.*`, `styles/pages/settings.css`, `tokens.css` | `323:2611`, `354:2961`, `354:2972` |
| **Batch 6: leave guard** – while any section is dirty: same-origin link clicks (header, avatar menu, breadcrumb, "Xem hồ sơ công khai", footer…) open the "Bạn có thay đổi chưa lưu" dialog naming the dirty sections (focus on "Ở lại trang"; Esc/× stay; "Rời trang, bỏ thay đổi" continues); in-page `#section-…` anchors, Ctrl/Cmd/Shift/Alt/middle clicks, `target`/`download` links are not intercepted; Đăng xuất in the avatar menu asks through `utils/leave-guard.js` (`registerLeaveGuard()` in the page, `confirmLeave()` in the header, so the header never imports a page module); closing the tab, reloading or typing a URL uses `beforeunload` only when dirty | `utils/leave-guard.js`, `components/header/header.js`, `pages/settings.js`, test `frontend/dev/tests/leave-guard.mjs` | `354:2972` |
| **Batch 7: Tên hiển thị + @tên người dùng** (upstream 65c7acd) – Register (256:2425): "Tên hiển thị" + "Tên người dùng" with a fixed "@" prefix in one row (stacked on mobile); the handle is lower-cased and spaces removed while typing, validated `^[a-z0-9._]{3,30}$`; 409 → message on the right field. Register Advanced (159:524) and Cài đặt (323:2611): Tên hiển thị + Tên người dùng row, Email + Trường, Nơi ở full width; summaries show both. Everywhere a person is shown (post cards, reading page, comments, profile, avatar menu "Minh Anh / @minhanh / email"), the name is `displayname` and the second line `@username` | `utils/username.js`, `pages/profile/register.*`, `register-advanced.*`, `pages/settings.*`, `services/api/posts.js` (`getAuthorDisplayName`, `getAuthorHandle`), `components/*`, tests `username.mjs`, `profile-identity.mjs` | 256:2425, 159:524 (372:3046), 323:2611 (375:3046) |
| Demo data script | `frontend/dev/seed-demo.sh` | – |
| Figma reference renders | `design-ref/*.png` | – |
| **Batch 9: rich composer** – collapsed pill becomes the title; Chủ đề fieldset with shared Tag chips before the B/I/U/S/clear editor, counters, up to four 96×72 image previews and place chip. Inline and floating dialog share the same form node and draft; posts send sanitized HTML + optional coordinates | `pages/forum.*`, `styles/pages/forum.css`, `components/tag-chip/`, `components/rich-editor/media-preview.js`, `services/api/posts.js` | shared `176:11687`, `176:11951`, `176:12801`; personal `397:3074`, `397:3355`, components `394:3090` |
| **Batch 9: place picker** – native stacked dialog, Nominatim search with changed query + 800ms debounce/Enter, global 1s queue, memory cache, draggable red pin, map click, geolocation, reverse lookup and cancel cleanup | `components/place-picker/`, `services/geo/nominatim.js`, external JSON helper in `services/api/client.js` | shared `176:12345`, `176:12801`; personal `397:3789`, `394:3052` |
| **Batch 9: rich comment editor and Reading map** – compact input expands to emoji/B/I/U/S/link/image/place/clear toolbar, counter, spoiler checkbox and send footer; sanitized body/comment translations, rich post edit, noninteractive Leaflet side map with cached reverse name/address | `pages/post.*`, `styles/pages/post.css`, `services/api/comment.js` | shared `176:13062`, `176:12801`; personal `397:4237`, `394:3052` |
| **Batch 9: safe rich text** – pure allow-list parser, safe DOM renderer, legacy paragraphs/Japanese runs, plain excerpts across shared cards/search/Home/profile, reading/share/notification text and UTF-8 byte validation | `utils/rich-text.js`, `utils/html-entities.js`, `utils/text.js`, `components/rich-editor/`, `services/api/notifications.js`, `dev/tests/rich-text.mjs` | shared components `176:12801`; personal `394:3052` |
| **Batch 9: vendored map library** – existing unmodified Leaflet 1.9.4 is used through lazy ES import, page-specific CSS and visible © OpenStreetMap attribution; no package or vendor changes | `vendor/leaflet/`, rules in `AGENTS.md` | shared map reference `176:12345`; personal `397:3789` |

| **Batch 10: ảnh HTTPS, menu/sửa bình luận, sửa bài, địa điểm và tooltip** | `components/rich-editor/`, `components/place-picker/`, `pages/forum.*`, `pages/post.js`, `components/postcard/`, `utils/` | shared components `204:11906`, composer `204:12481`, forum `204:12845`, compose dialog `204:13110`, place dialog `204:13538`, Reading `198:11518` |
| **Batch 10: Hỗ trợ qua email, bỏ báo cáo và phiếu hỗ trợ** | `pages/support.*`, `pages/support-content.js`, `utils/support-mailto.js`; xoá service hỗ trợ | shared Hỗ trợ 2 `195:4885` |
| **Đợt 14: dịch giao diện VI/JA/EN** – mọi trang đọc `etsubi_lang`; khoá dịch là câu tiếng Việt, đổi ngôn ngữ thì tải lại trang. Nội dung người dùng không dịch ở đây, bài viết và bình luận vẫn dùng nút Dịch theo ngôn ngữ mẹ đẻ. Nhóm đã thống nhất không thêm trang mới | `utils/i18n.js`, `i18n/*.js`, `dev/i18n-guide.md`, `dev/tests/i18n.mjs` | dropdown canva `466:3644`, shared `239:4071` |

## 2. What is left (next batches)

Frame IDs below are in the personal file. The shared team file (source of truth) has its own IDs, listed in AGENTS.md §7.

| Page | Figma frame | Notes |
|---|---|---|
| Mod/Admin views | board `260:1891` | `/manage/*` endpoints; staff badge colour `--color-staff`. RBAC summary in AGENTS.md §8. |
| Dark theme | – | Cài đặt › Giao diện shows Tối and Theo máy disabled ("sắp có"). Waiting for a dark palette in Figma (front-end/design work, not back end). When it exists: add dark tokens, apply `etsubi_theme` on every page, enable the two options. |

Sau môn học: ảnh dạng lưới kiểu Facebook, bấm xem full

## 3. How to run locally

```bash
# API + database (Docker). First build compiles Rust, takes several minutes.
docker compose --profile full up -d --build postgres backend
# Demo users and posts (password for all demo users is in the script header)
bash frontend/dev/seed-demo.sh
# Static front end on the CORS-allowed port 12321
cd frontend && python -m http.server 12321      # or: npx live-server --port=12321 .
```

Later restarts (containers already built, data kept):

```bash
docker compose --profile full start postgres backend   # stop: docker compose --profile full stop
cd frontend && python -m http.server 12321
```

Always open the site through `http://localhost:12321`. Other origins (VS Code Live Server on 5500, `file://`) are blocked by the back end's CORS and show "Không kết nối được máy chủ".

Open `http://localhost:12321/pages/profile/login.html?api=http://localhost:21432/api/v1` once: the `?api=` value is saved in `localStorage` so every page talks to the Docker API (port 21432). `?api=reset` goes back to the default `http://localhost:11432/api/v1` (back end run with `cargo run`).

Pages: `/pages/profile/login.html`, `/pages/profile/register.html`, `/pages/profile/register-advanced.html` (needs login), `/pages/search.html`, e.g. `/pages/search.html?q=onsen&tag=question&tag=general`.

Tests (no dependencies). They load the front-end modules with `vm.SourceTextModule`/`vm.SyntheticModule`, so Node 24 needs the `--experimental-vm-modules` flag (without it: "vm.SyntheticModule is not a constructor"):

```bash
node --experimental-vm-modules frontend/dev/tests/auth-foundation.mjs
node --experimental-vm-modules frontend/dev/tests/leave-guard.mjs
node --experimental-vm-modules frontend/dev/tests/notification-actions.mjs
node --experimental-vm-modules frontend/dev/tests/profile-identity.mjs
node --experimental-vm-modules frontend/dev/tests/username.mjs
node --experimental-vm-modules frontend/dev/tests/rich-text.mjs
node --experimental-vm-modules frontend/dev/tests/backend-integration.mjs
```

## 4. Known issues and decisions

- **Search has no socket (deferred by the team).** The back-end dev has not implemented the socket yet, so it is skipped for now; the back end only has `GET /api/v1/posts?q=&tags=`. `services/api/posts.js#searchPosts` is the single transport point to swap later.
- **Search data gaps:** the API returns no author name, tags, comment/like/view counts, or total. Cards fetch author and tags progressively (rate limit 4 req/s); counts are not shown; the result count is the number loaded ("10+" when another page may exist); sort is "Mới nhất" only (server order) plus a client-side "Cũ nhất".
- **Login is by email only** (back end `LoginRequest { email, password }`); username login is not supported.
- **Register "Họ và tên" is stored as `username`** (unique, ≥ 3 bytes). Native language is set to `vi` at register and chosen on Register Advanced. Side effect, open for the Register Advanced owner: Register Advanced loads that `vi` from `GET /my`, so "Tiếng Việt" is already selected and step 3 "Ngôn ngữ mẹ đẻ" shows a green tick before the user picks anything. The saved value is real, so this works. If the team wants the user to choose on purpose, the page could leave the radios empty until the first save, or the back end could make `native` optional at register.
- **No avatar upload endpoint:** Register Advanced stores a preset path or a small 256×256 JPEG data URL in `avatar_url`.
- **No email verification (skipped for now by the team)** – the back end has none, so the 4th step "Xác thực email" of frame `126:2` is not built; the 3-step frame `159:524` is the implemented version.
- **"Quên mật khẩu?"** has no back-end endpoint: shows an info message.
- **Back end on Windows:** `backend/docker/entrypoint.sh` is checked out with CRLF when `core.autocrlf=true`, and the container then fails with `exec /entrypoint.sh failed: No such file or directory`. Convert it to LF before `docker compose build` (`sed -i 's/\r$//' backend/docker/entrypoint.sh`), or add a `.gitattributes` rule `*.sh text eol=lf` in a back-end PR.
- A failed login (`401`) or a taken email (`409`) logs a network error line in the browser console. That is the browser's own request log, not a JS error – expected.
- `python -m http.server` lets the browser cache ES modules. After editing a `.js` file, hard-reload (Ctrl+Shift+R) or disable cache in DevTools, otherwise you may test old code.
- Search tag counts in "Tag phổ biến" come from one capped search per tag (max 50, shown as "50+").
- Fixed after review (2026-11-13): on mobile the search heading now takes its own row above the sort/"Viết bài" buttons. The password eye icon was squashed by the Figma export, so it was replaced with the Lucide original, and Edge's own reveal button is hidden (`::-ms-reveal`).
- Search result cards now always show the comment, like and view slots as in Figma `1:2927`, with "–" until `GET /posts` returns the counts (see §5). The result total still shows "10+" when there may be more pages, until the API returns a total.

- **Home and `services/api/capabilities.js`:** every Home feature the API lacks (featured posts, post stats, popular sort, following feed, bookmark state, feed translation, display name, unread notifications) is behind a flag in `backendSupports`. A `false` flag means no request is sent and the UI shows neutral placeholders ("–", grey bars). When the back end ships an endpoint from §5, flip its flag to `true` and test.
- **Home decisions:** the Figma "Bài viết mới" header has a "Xem thêm →" link; it is left out because the team agreed on "no Xem thêm bài viết". The hero photo from Figma (2400px, 1.35 MB) was resized to 1920px JPEG (`assets/images/home-hero.jpg`, ~0.6 MB).

- **Figma review, 2026-11-13** (shared file `HFYjrrtGqo86EpOX1Bdg88`, following AGENTS.md §7 "Final review procedure"):
  - Home feed card: the "Xem chi tiết" row sat too close to the divider. Its top padding is now 18px, so the button is 19px below the line as in Figma. Detail buttons are now exactly 34px tall.
  - Home header search: now the translucent pill from Figma instead of a cream pill. The square focus box inside it was removed, and the whole pill shows the focus state instead.
  - Home hero: height reduced from 480 to 336px on the team's request, so the three featured cards fit in the first screen at 1920×947. This is an intentional difference from Figma.
  - Home "Bài viết mới": added the "Xem thêm →" link to the forum page, as in Figma.
  - Header: the right side is now in Figma order, bell → language badge → avatar. Login/Register no longer show the search icon.
  - Search result cards: comment, like and view slots restored with "–" placeholders.
  - Checked and matching Figma within a few px: Login (signed out), Register, Register Advanced 2, and both Search states.
  - Intentional differences:
    - The terms checkbox starts unchecked (Figma draws it checked), because consent must be the user's own action.
    - The Figma sun "theme toggle" is not built, because there is no dark theme yet.
    - Register Advanced shows the bell and avatar, because the user is already signed in at that step.

- **Reading page (2026-11-14)**, checked against shared file frame `1:1337` with the AGENTS.md §7 procedure (backend in Docker, demo data, signed out, signed in as a reader and as the author, 1920×1080 and 375×812):
  - Measured in the browser: article card top 156px, author row 56px, title 50px, translate button 41px, action pills 42px, "Thảo luận" heading 31px, comment send/follow buttons 50px, sidebar 403px with 20px gaps. These match Figma. Buttons on this page use 19-20px line-heights instead of the shared 1.5/1.4, so their heights match Figma.
  - Everything shown is real API data:
    - Likes are the total of `GET /posts/{id}/reactions/summary`. The like button sends the ❤️ reaction (U+2764 U+FE0F). The only allowed emojis live in `services/api/reaction-emojis.js`, matching the back end's `reactions_emoji_check`; `reactToPost` rejects anything else before calling the API, and the notification text drops an emoji that is not on the list.
    - Comment count is the number of visible comments.
    - The author's post count is the length of `GET /users/{id}/posts`. Follower count is the length of `GET /users/{id}/followers`.
    - Reading time is computed from the content (200 words/min, 500 Japanese characters/min).
  - Fixed during the check:
    - The follow button lost its reference after `await`.
    - Comment dates showed "14-11" instead of "14/11".
    - The sidebar ignored `hidden`.
    - Locked posts invited people to write the first comment.
  - Intentional differences from Figma:
    - **Content:** the post body has no image, because posts have no image field and there is no upload endpoint. A paragraph whose lines all start with `>` becomes the pink quote block.
    - **Địa điểm văn hoá card:**
      - Shown only when the post has `latitude`/`longitude`.
      - The map is a static illustration made from the Figma vectors, without the sample place labels. The label chip shows the real coordinates. "Mở trong Maps" and "Xem trên Google Maps" open Google Maps at those coordinates.
      - Place name, address and opening hours show grey bars until the back end sends `place`.
    - **Bài viết liên quan:** until `GET /posts/{id}/related` exists, it lists real posts that share the post's first tag. The comment count shows "–".
    - **Extra comment features (not in the frame):**
      - Replies (`parent_id`) are indented under their parent.
      - The comment author sees "Xoá", with a second click to confirm.
      - A locked post or a muted viewer gets an info message instead of the form.
    - **Gửi button:** stays at opacity .4 while the input is empty, the same rule as the search Submit. Figma draws it enabled.
    - **Not built:**
      - The sun "theme toggle", as on other pages.
      - Post status and lock toggles. They belong to the Mod/Admin batch.
    - **Fonts:** the page's Google Fonts link adds Be Vietnam Pro italic 400 for the quote block.
  - Back-end behaviour seen while testing:
    - `POST /posts/{id}/translate` returns 503 when no translation provider is configured. The page shows "Dịch vụ dịch chưa sẵn sàng".
    - Comments are stored with the author's UI language, so translating returns `translated: false` and the page says the comment is already in the viewer's language.
  - Shared code touched, all additive: new exported functions in the services listed in §1, three new flags in `capabilities.js` (`relatedPosts`, `postPlace`, `commentAuthors`), `translationErrorMessage()` in `utils/errors.js`, and a new reading-page token block in `tokens.css`. Header, footer, postcard, featured-card, tag-chip and search-bar are unchanged.
- **Diễn đàn (2026-11-14)**, checked against shared file frame `1:1587` with the AGENTS.md §7 procedure (signed out, signed in as Kenji, 1920×1080 and 375×812):
  - Measured in the browser: heading top 125px and 71px high, tabs top 216px and 38px high, compose box top 274px and 155px high (divider 83px from its top, action row 40px), first card top 449px, 20px between cards. These match Figma.
  - The feed cards are the shared `createFeedPostCard` from Home, so the Home review of the card applies. Comment and share counts show "–" until `GET /posts` returns them. The like count is the total of the reaction summary.
  - Tested:
    - Tabs: Phổ biến shows "sẽ có khi máy chủ hỗ trợ". Đang theo dõi asks signed-out users to sign in, and tells signed-in users it is not supported yet. Hỏi đáp only lists posts tagged `question`.
    - Compose box: clicking it while signed out goes to Login with `redirect=/pages/forum.html?compose=1`. Signed in, it expands. Đăng stays disabled until both title and content are filled. Posting with a topic puts the new post at the top of Mới nhất with a "Xem bài" link. Huỷ clears the draft.
    - Superseded in batch 9: only Ảnh (local preview, no upload) and Bản đồ (real coordinates) remain in the composer; legacy upload/poll service functions stay deferred.
    - Bookmarking from a card works. "Tải thêm bài viết" appends the 11th post and then hides itself.
  - Fixed during the check:
    - The Huỷ button and the "Tải thêm" row ignored `hidden`.
    - The loading card had a square avatar.
    - `?compose=1` did not expand the box when the browser window was not focused.
    - The signed-out placeholder wrapped onto two lines on mobile.
  - Intentional differences from Figma:
    - The compose box expands to add a required **Tiêu đề** field and topic chips, because `POST /posts` requires a title and posts are tagged after creation. Figma only shows the collapsed box.
    - Huỷ appears only while the box is open.
    - **"Tải thêm bài viết"** (10 posts per page) is not in the frame. It was added so older posts can still be reached. The Home "no Xem thêm" decision applies only to Home.
    - A signed-out user sees a grey avatar and "Đăng nhập để chia sẻ…" instead of a name.
    - The sun theme toggle is not built.
  - Home has the same square loading avatar bug in `createFeedPlaceholder()` in `pages/index.js`: the placeholder span is missing the `avatar` class. It is not changed on this branch.
  - Shared code touched, all additive: new functions in `services/api/posts.js`, two new flags in `capabilities.js`, new messages in `utils/errors.js`, and a forum token block in `tokens.css`. The petal rotation tokens of the reading page are reused. Header, footer, postcard, featured-card, tag-chip and search-bar are unchanged.
- **Hỗ trợ (2026-11-14)**, checked against shared file frame `1:1966` with the AGENTS.md §7 procedure (signed out and signed in, 1920×1080 and 375×812):
  - Measured in the browser, all within 1px of Figma:
    - Hero: top 77px, 450px high; search box 760×60 at y 338; popular chips at y 416.
    - Content: topic heading at y 600; topic cards 336×217 with a 32px gap; FAQ heading at y 1237; FAQ card at y 1336.
    - Sidebar cards 427px and 287px high; contact rows 66px; "Gửi yêu cầu" button 50px; footer at y 2166.
  - The page needs no API data. The help content is static copy in `pages/support-content.js` (8 topics, 19 questions, 4 rules), written by the team for features that exist today.
  - Tested:
    - Search: "dich" finds the translate questions, so it ignores accents. The URL keeps `?q=`, and opening such a link runs the search. "No results" offers "Tìm trong Diễn đàn" (`searchUrl({q})`) and "Gửi yêu cầu hỗ trợ".
    - Popular chips search straight away. Topic cards filter the FAQ, mark the selected card and keep `?topic=`. "Đọc đầy đủ quy tắc" opens the Quy tắc & Báo cáo questions. "Xem câu hỏi phổ biến" goes back to the 6 default questions.
    - Dialog:
      - The support dialog pre-fills the signed-in user's email. The report dialog adds a required link field.
      - Gửi is disabled until the required fields are filled.
      - Until the back end exists, sending shows a notice and a pre-filled `mailto:contact@etsubi.vn` link. No request is sent.
  - Intentional differences from Figma:
    - **Topic cards:** they show the real number of questions on the page ("3 câu hỏi →") instead of invented article counts ("12 bài viết").
    - **Copy that described features Etsubi does not have:**
      - The FAQ "chế độ song ngữ (Đối chiếu)" became "Làm sao để dịch một bài viết?".
      - The topic "Dịch tự động & Song ngữ" became "Dịch & Ngôn ngữ".
      - The search placeholder and the popular chip now say "dịch bài viết".
      - Topic descriptions no longer mention image attachments or setting a map location.
    - **Not in the frame:** the support/report dialog (Figma has no design for it), the search result and filter status rows, and the empty state.
    - **Not built:** the sun theme toggle.
    - **Narrow screens:** clouds, torii and side petals are hidden at 960px and below.
  - Shared code touched, all additive: `services/api/support.js`, two flags in `capabilities.js`, a support token block in `tokens.css`, and the new asset `illustrations/torii-faint.svg`. The hero reuses `sun.svg` and `cloud-1/2/3.svg` from the auth scene unchanged.
- **Giới thiệu (2026-11-14)**, checked against shared file frame `1:1737` with the AGENTS.md §7 procedure (signed out and signed in, 1920×1080 and 375×812):
  - Measured in the browser, all within 1px of Figma:
    - Banner: top 77px, 440px high.
    - Name story: top 597px; equation 708×220 with 180×208 glyph cards and a 220px result circle.
    - Feature cards 336×238. Tech card 202px high with 95px columns.
    - Member cards 268×229, avatar ring 18px from the card top.
    - CTA: 161px high; buttons 253×48 and 186×50.
    - Footer at y 2373.
  - The page is static. It needs no API data, and the header is the only part that changes when signed in.
  - Intentional differences from Figma:
    - **Feature card copy:** Etsubi has no side-by-side translation mode. "Dịch song ngữ tự động / Thử chế độ song ngữ" became "Dịch bài viết tự động / Xem cách dịch bài", linking to the Hỗ trợ translate topic. The Địa điểm card links to the Hỗ trợ places topic ("Xem hướng dẫn") instead of an example post, and its text says what the reading page really shows. "Quy tắc cộng đồng" opens the Hỗ trợ rules topic.
    - **CTA links:** "Mã nguồn trên GitHub" opens `CNVN2024-2-Boiz/etsubi`. "Tài liệu dự án" opens its `docs/src` folder. Both open in a new tab.
    - **Narrow screens:** below 1280px the equation moves under the text and the CTA buttons wrap. Below 960px the petals are hidden. At 375px everything is one column.
  - The team member names, roles and student IDs come from the Figma frame. Confirm with the team that publishing the MSSV is fine before the site goes public.
- **Hồ sơ (2026-11-14)**, checked against shared file frame `1:3896` with the AGENTS.md §7 procedure (signed in as Kenji on his own and on Minh Anh's profile, signed out, 1920×1080 and 375×812):
  - Measured in the browser, matching Figma:
    - Profile card: 960×256 at y 133. Cover 96px high. Avatar ring 112px at 40px from the card top. Camera badge 30px.
    - "Kết nối" card at y 413. Tabs 32px high, filter 44px, rows 68px, row buttons 32px.
    - Mobile: avatar ring 82px, full-width 36px follow button, two equal-width tabs.
  - Fixed during the check:
    - Japanese bios made the lines 1px taller than Figma. The Japanese text is now aligned to the top of the line.
    - An unknown user id showed grey placeholder cards. The cards are now hidden and only the error stays.
  - All data is real:
    - Profile: `GET /my` for your own profile, `GET /users/{id}` for someone else's.
    - Lists: `GET /my/followers`, `GET /my/following`, `GET /users/{id}/followers`, `GET /users/{id}/following`.
    - Button states use one `GET /my/following` and one `GET /my/followers` for the viewer, with no request per row.
    - Counts are the list lengths.
  - Tested:
    - Following back changes the row to "Đang theo dõi" and does not show "Bỏ theo dõi" until the mouse leaves the button. Unfollowing from your own "Đang theo dõi" tab removes the row and updates both counts. The follow button on another profile updates their follower count and list.
    - The filter is case-insensitive, shows the match in red, has a clear button, and shows "Không tìm thấy" when nothing matches.
    - Opening a profile without `id` while signed out goes to Login with `redirect`. An unknown `id` shows "Không tìm thấy người dùng này".
  - Intentional differences from Figma:
    - The header has Trang chủ active as in the frame, because Hồ sơ has no tab of its own.
    - The camera badge links to Register Advanced, because Etsubi has no inline avatar editor or upload endpoint.
    - On other people's profiles on desktop, the follow button sits at the right of the info row, because the desktop frame only shows your own profile.
    - Empty-state copy for other people's profiles ("<tên> chưa theo dõi ai") and for your own followers list was written by the team, because Figma only draws "Bạn chưa theo dõi ai".
  - Shared code touched, all additive: three new functions in `services/api/follows.js` and a profile token block in `tokens.css`.
- **Mod/Admin (2026-11-14, checked)**, shared file board `1:2435`. Added `components/moderation/` (status badges, the "Chỉ Mod/Admin thấy" tag, the dashed staff box, dropdown menu, confirm dialogs for mute, ban and role changes) and `services/api/manage.js`. Used on two pages:
  - **Hồ sơ:** "Quản trị" button and menu (Tắt tiếng / Gia hạn / Gỡ tắt tiếng, Cấm / Gỡ cấm, Đổi vai trò only for Admin). The button is locked with a reason for users of the same or a higher role. Muted badge and staff box, and a grey profile when banned.
  - **Đọc bài:**
    - Staff post menu: hide or show, lock comments, delete and restore.
    - Author menu: edit inline, lock comments, delete.
    - Staff comment menu: hide or show, delete and restore, mute the writer.
    - Notices: amber notice for muted users (input and like disabled), grey notice and "Đã khoá bình luận" badge for locked comments.
  - **Checked in the browser** with test accounts `admin@demo.etsubi.vn` and `mod@demo.etsubi.vn` (same password as the seed). Their roles were set in the local DB with SQL. Every flow above was run against the real API. A public `GET /posts/{id}` returns 404 after a delete and 200 after a restore.
  - **Measured against Figma (`1:2435`):** line-heights in the menu and dialogs were set to the Figma values. The ban name input is 46px tall and the role cards have an 18px gap.
    - Menu: 272 wide, header 27, items 36 and 52 (with a sub line).
    - Mute dialog: 400 tall (Figma 401). The head, chips, "until" line and footer sit at the Figma offsets.
    - Chip and until line: 36. Cancel and confirm: 40. Badge: 25. Staff tag: 20. Staff buttons and the "Quản trị" trigger: 36.
  - **Mobile 375×812:** no horizontal scroll on the profile or the reading page. The dialogs fit at 337 wide. The menu is anchored to the right edge of its button. If that would push it off screen, JS shifts it sideways by exactly the overflow (8px margin) through `--mod-menu-shift`. This matters for the comment ⋯ button, which sits mid-line on phones.
  - **Intentional differences:**
    - Unmute and unban also go through a confirm dialog, because Figma says every admin action is confirmed.
    - The post edit form is not designed in Figma.
    - When a dialog opens, focus goes to its first field: the name input when banning, the 24h chip when muting, the current role when changing roles. With no field, it goes to Cancel. It never goes to ×, so Enter cannot close the dialog by accident.
    - The "Điều hành viên" role description wraps to two lines (card 93px instead of 77). Figma keeps it on one line and lets it overflow the card.
    - On phones the dialog buttons wrap to two lines (56px).
  - **Fix after user testing:** the "Quản trị" menu on a profile was cut off at the bottom edge of the profile card, because `.profile-card` had `overflow: hidden`. The card no longer clips its content. The red cover rounds its own top corners instead.
- **Docker on Windows without editing `backend/`:** besides converting `entrypoint.sh` to LF, you can mount an LF copy over it with an extra compose file that has `services.backend.volumes: ["<path>/entrypoint.sh:/entrypoint.sh:ro"]` and run `docker compose -f docker-compose.yml -f <that file> --profile full up -d --build postgres backend`.

- **Batch 3 (2026-11-15), branch `feat/fe-backend-integration`** (from `origin/feat/fe-admin` + `origin/main`; the merge had no conflicts, `main` only changed `backend/`):
  - Final review run against the real API (Docker): red dot cases (signed out: no request; unread 2 → dot; read-all/delete → dot gone; failed request → dot hidden), follow/reaction/comment from the UI created the expected notification for the other user, a moderator locking comments created `post_locked`, Edit Profile save + password change + re-login + restore, delete dialog with a wrong password, Register Advanced empty native choice. All pages at 1920×1080 and 375×812, signed in and out: no horizontal scroll, no failed requests except the known `reactions/me` 404 below.
  - Not exercised for real: actually deleting an account (only the dialog and the wrong-password path), new-post fan-out, reply, mute/ban/hide notifications (covered by the 63 mocked cases in `frontend/dev/tests/notification-actions.mjs`).
  - The notification text is built on the front end from the English server message (`formatNotification`): the actor name is parsed from the message; reaction/comment messages carry no post title, so none is shown. See §5.
  - Notification ↔ link mapping: server links are `/posts/{id}` and `/users/{id}`; `notificationHref()` maps them to `routes.post(id)` and `routes.userProfile(id)`.
  - The Home "Bài viết mới" header keeps "Xem thêm →" (re-added from the shared Figma in `c23698f`).
  - Reading page keeps taivka's "Dịch bài viết" toggle (Figma TranslateButton).

- **Batch 4 (2026-11-15), same branch** (merged `upstream/main` 2206266 = PR #60 first):
  - **Local DB patched by hand.** PR #60 edited old migrations instead of adding new ones (`notifications.actor_id` + index, emoji CHECK on `reactions`). An existing Docker volume never re-runs old migrations, so `GET /my/notifications` returned `500 "column notifications.actor_id does not exist"`. Fixed without losing demo data: `docker exec etsubi-postgres-1 psql -U etsubi -d etsubi -c "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id) ON DELETE SET NULL;" -c "CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications (actor_id);"`. The old emoji constraint (length 1–32) was left as is; the front end only sends ❤️. **Everyone in the team who keeps an old volume gets the same 500** until they run the same command (or recreate the volume, which loses data). See the §5 row "Migrations".
  - Checked against the real API: `GET /my/following/posts` 200 (Home + Diễn đàn tab Đang theo dõi show 2 posts), `GET /posts/{id}/reactions/me` 200 `null` (no more console 404), `GET /my/notifications` 200 after the patch.
  - Login/Register measured at 1920×1080: card top 192 / 117 and height 684 / 866, Google button 398×53 at x 761: same as Figma. The "sắp có" notice grows the card while shown (same as the error alert).
  - Avatar menu measured: panel 280×228, items 44px, icons 20×20, avatar ring 38px + 5px = 48px.
  - Cài đặt vs `323:2611`: sections within ~11px of Figma down to the save bar. Giao diện and the rest sit ~45px lower than Figma because of the two intentional hint lines ("Chế độ Tối và Theo máy sắp có.", "Bản dịch JA/EN của giao diện sắp có.").
  - Real flows: save bio + restore, header badge ↔ Giao diện language sync both ways (and across tabs via the `storage` event), Phiên đăng nhập "Đăng xuất" → Home signed out, old `edit.html#section-password` → `settings.html#section-password`, Google buttons send no request.
  - All pages at 1920 and 375, signed in and out: no horizontal scroll, no JS errors, no failed requests (one 429 seen only while the reviewer loaded 24 pages in a row; the client retried).
  - Not re-run this batch: password change and real account deletion (logic moved unchanged from `edit.js`; covered in batch 3).

- **Batch 5 (2026-11-16), same branch** (merged `upstream/main` 60276e0 = PR #61 + #62 first):
  - PR #61 caps `GET /posts/newest`, `/posts/popular`, `/posts/qa`, `/my/following/posts` at 3 posts (`truncate(3)`). The back-end dev (Phong) confirmed this is temporary: Home will get its own limited endpoint, and these four routes will serve Diễn đàn with the full list (no paging). So the front end does no workaround on Diễn đàn and only limits Home on the client.
  - PR #62 drops `UNIQUE` on `users.username` by editing the old migration, but `auth/service.rs` (register) and `user/service.rs` (update) still call `find_by_username` and return `409 UsernameAlreadyTaken`, so duplicates are still rejected through the API. Old Docker volumes also keep the `users_username_key` constraint. No DB patch this time (not needed while the service still blocks duplicates).
  - Checked against the real API at 1920 and 375, signed in and out: Home tabs Mới nhất 3 / Phổ biến 2 (API has 2) / Đang theo dõi 2 (signed in; signed out shows the login prompt) / Hỏi đáp 3; Diễn đàn Mới nhất 6 (all posts through paged `GET /posts`), other tabs = what the API returns; Cài đặt 6 sections, `#section-session` → `#section-appearance`; no h-scroll, no JS errors, no failed requests. Tests: 65/65 notification + auth-foundation PASS.
  - Cài đặt page is 2612px tall at 1920 vs 2546 in Figma: the two intentional "sắp có" hint lines under Giao diện and the error/hint lines keep it ~45–65px longer.

- **Floating compose button (2026-11-16):** designed by the user's choice (floating button over a sticky full composer, which would take ~155px of every screen). Figma was edited in the personal file only, for the user to copy into the shared file: components frame `344:2710`, screens `344:2714` and `344:2918`; the dialog title uses Be Vietnam Pro Bold there because Etsubi Display cannot be set through MCP (the user swaps the font with a plugin). Checked at 1920 and 375 signed in: button appears only after the composer leaves the view (IntersectionObserver; it only fires while the browser tab renders), dialog keeps the scroll position, Escape keeps the draft and returns focus to the button, Huỷ clears it, no h-scroll, dialog 343px wide on mobile. Not exercised: a real post submitted from the dialog, the muted state.

- **Batch 6 (2026-11-16):** checked against the real API at 1920 and 375 with the demo account (all values restored afterwards: name, native `ja`, avatar preset-1, password `etsubi-demo-123`):
  - each section saved alone sends only its own fields (`{"username":…}`, `{"native":"vi"}`, `{"avatar_url":…}`); editing Thông tin tài khoản and Ngôn ngữ mẹ đẻ together, saving one keeps the other dirty and untouched; typing the old value back hides the bar; Huỷ restores only that section;
  - password: mismatch error stays in the section with no request; change and change back both re-login;
  - leave dialog from a header link, the breadcrumb, "Xem hồ sơ công khai" and Đăng xuất; the text lists one or two sections correctly; Esc/×/Ở lại keep the page; "Rời trang, bỏ thay đổi" navigates without saving; Ctrl+click and `#section-` anchors open no dialog; `beforeunload` is prevented only while dirty;
  - 1920: save bar 916×60 like Figma (buttons 54px tall, the project's default button height, vs 52/50 in Figma); dialog 560×223 (Figma 560×222). 375: bar wraps (message, then "Lưu thay đổi" above "Huỷ thay đổi", full width), dialog 343px with "Ở lại trang" first; no horizontal scroll.
  - **Fix during review:** the dialog result waited only for the `<dialog>` `close` event, which the browser did not fire in a tab that was not rendering, so after "Ở lại" the logout button stayed disabled and a second ask returned the stale Promise. The buttons now resolve the choice directly (the `close` listener stays as an idempotent fallback). The Diễn đàn compose dialog got the same hardening (`restoreCompose()` runs directly and is idempotent).
  - Checked by the user on 2026-11-16: the real browser `beforeunload` prompt appears when reloading with an unsaved section ("Reload site? Changes you made may not be saved."), and Reload discards the edits; a real middle click on a link opens a new tab with no dialog; the 54px save-bar buttons (project default vs 52px in Figma) are accepted.
  - Local DB note: `lanhuong@demo.etsubi.vn` is now an admin in the local DB (the user tests moderation with it).

- **Batch 7 (2026-11-16):** merged `upstream/main` fafe280 (PR #63, no conflicts).
  - **Local DB patched by hand again** (PR #63 edited the old users migration): after checking there were no duplicate usernames (also case-insensitive), in one transaction: `ADD COLUMN displayname TEXT`, `UPDATE … SET displayname = username`, `SET NOT NULL`, `password DROP NOT NULL` (`users_username_key` already existed). Then, approved by the user, handles by email: `minhanh`, `kenji.tanaka`, `lanhuong` (displayname "Lan Hương"), `qa.dangky`, `shirotrang` (vunhan443@gmail.com), `vunhan` (vunhangaming@gmail.com). `frontend/dev/seed-demo.sh` now registers handles + displayname. Team members with an old volume need the same patch.
  - Checked with the real API at 1920 and 375: Register card at y 117, 504×888 like Figma (fixed: height token 866 → 888, +2px top padding, +8px offset like Login); fields within 2px. Duplicate `@minhanh` → error on the username field, one request only. New account `@qa.batch7` (qa-batch7@demo.etsubi.vn / etsubi-demo-123, then renamed to `@qabatch7b` in Cài đặt) registered and reached Register Advanced; its displayname became the handle (back-end gap). Register Advanced rows matched Figma after fixing the row rhythm (row gap 20, hint 15px). Cài đặt: displayname save shows "Máy chủ chưa lưu được tên hiển thị.", username change saved, duplicate handle error inline. Home cards, reading page, comments, profile and avatar menu show displayname + @handle. 22-page sweep (1920/375, signed in): no h-scroll, no JS errors, no failed requests. All 5 node tests pass.

- **Batch 8 (2026-11-17):** merged `upstream/main` 9f484ae (PR #64, #65, no conflicts). The back end now stores `displayname` at register and on `PATCH /my` / `update_user` (trim, max 50, empty → 400 on PATCH, username fallback on register) and saves `language` correctly at register.
  - FE: `validateDisplayName` limit 60 → 50; the two 400s ("Display name too long (max 50 characters)", "Display name cannot be empty") are mapped to Vietnamese in `utils/errors.js` and land on the Tên hiển thị field (Register via `auth-page.js`, Register Advanced, Cài đặt); `// CẦN BACKEND:` notes about displayname removed from `services/api/auth.js`, `settings.js`, `register-advanced.js`; the "Máy chủ chưa lưu được tên hiển thị." note stays only as a fallback.
  - **Local DB patched by hand again** (PR #64 edited `2026-09-23-113645-0000_users` in place), approved by the user, in one transaction: `ADD COLUMN IF NOT EXISTS oauth_provider TEXT, oauth_subject TEXT, profile_completed_at TIMESTAMPTZ` + `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth ON users (oauth_provider, oauth_subject) WHERE oauth_provider IS NOT NULL`. Without it every users query fails on an old volume. Team members with an old volume need the same patch.
  - Checked with the real API: new account `@qa.batch8` (qa-batch8@demo.etsubi.vn, demo password) registered with displayname "  Kiểm Thử Tám  " → stored "Kiểm Thử Tám"; Cài đặt rename to "Tám Đã Đổi Tên" saved without the fallback note and survived a reload (field, summary, header). Direct API calls return the two 400 messages above. All 5 node tests pass.

- **Batch 9 (2026-11-17), implementation and independent source review** (lịch sử; ảnh preview đã được thay bằng ảnh link ở batch 10):
  - Shared Figma metadata `176:12801` and small-node design context `176:12834` checked: toolbar 43px, tools 30px, post body minimum 150px, editor 225px, thumbnails 96×72, place dialog 560px and map 182px. Attached full screenshots are the visual references. Figma was read only.
  - Sanitizer uses a quote-aware linear scanner rather than a regex with overlapping repetition; it drops blocked contents, validates only absolute http/https URLs, decodes HTML5 entities once, bounds nesting and creates DOM nodes without assigning content to `innerHTML`. Independent reviewer ran 10,000 malformed-input idempotence cases; a 100,000-space unclosed tag completes in about 1ms.
  - Review fixes: comment Huỷ/Escape focus no longer immediately reopens the editor; server errors retain `aria-invalid` until content changes; clicking outside emoji/link popovers closes them; Leaflet keyboard pan is explicitly nonanimated; queued/stale geocoding is ignored after cancel; reverse cache keeps the original pin coordinates.
  - Intentional differences: Huỷ remains available to clear the draft. Leaflet shows real OSM tiles and mandatory attribution instead of Figma's illustrative map. Real place results replace the sample venues. Post images remain preview-only and show the explicit server limitation before/after posting. Comment image/place/spoiler values remain local and are never sent as if supported. Post body image UI awaits uploads/attachments. Mobile toolbars/chips/actions wrap through the existing ≤600px breakpoint.
  - Six Node suites pass: `auth-foundation`, `leave-guard`, `notification-actions`, `profile-identity`, `username`, `rich-text`. Rich-text checks also exercise the DOM renderer with a minimal fake DOM that rejects `innerHTML`. All 59 authored frontend JS modules pass syntax parsing; root import paths, HTML no-inline rules, the fetch boundary, new CSS tokens and the em-dash check (excluding vendor) pass. External JSON tests verify no token/cookie forwarding; geo tests verify queue spacing, abort and cache. Vendor code remains untouched.
  - Visual QA: done by the orchestrator in the preview pane, see "Batch 9 review" below.

- **Batch 9 follow-up (2026-11-17), hàng Chủ đề theo Figma:**
  - Chủ đề là một phần thiết kế tại component board `394:3090` và dialog `397:3355`; overlay địa điểm `397:3789`. Đã đọc metadata dialog và design context + screenshot của nhóm `403:3526`: nhãn 14px SemiBold, màu `--color-text-secondary`, cao 18px, cách chip 8px; hàng chip wrap với khe 8px. Ảnh tham chiếu: `design-ref/batch9-compose-dialog-topics-397-3355.png`. Chỉ đọc Figma.
  - Cả inline và dialog dùng một form theo thứ tự: Tiêu đề → fieldset/legend Chủ đề → rich editor → ảnh/địa điểm → divider và thanh thao tác. Chip từ `GET /tags` tái sử dụng `createTagChip`, không có số bài; nút thật `aria-pressed` chọn nhiều bằng chuột/Space/Enter, giữ focus và gửi mã qua `createPost(..., { tagIds })` để giữ luồng Hỏi đáp.
  - Chủ đề ẩn khi thu gọn, xoá lựa chọn khi Huỷ/đăng thành công; nháp chỉ mới chọn chủ đề không bị tự thu gọn. Danh mục tải xong cập nhật cả form đã mở trong khi chờ API. CSS giữ hàng wrap và lề mobile hiện có, không thêm breakpoint, inline style hay animation. Không có yêu cầu backend mới.
  - Đã chạy lại đủ sáu suite bằng `node --experimental-vm-modules frontend/dev/tests/<name>.mjs`: `auth-foundation`, `leave-guard`, `notification-actions`, `profile-identity`, `username`, `rich-text` đều đạt. Kiểm tra bổ sung bằng DOM tối thiểu chạy component Tag chip thật và hàm render của trang: chọn nhiều/bỏ chọn, dấu check, giữ nguyên nút, reset, thứ tự composer và quy tắc wrap đều đạt. `git diff --check` và kiểm tra ký tự U+2014 (trừ vendor) đạt.
  - Đã kiểm tra trực quan ở 1920 và 375: xem mục "Batch 9 review" bên dưới.

- **Batch 9 review (2026-11-17, orchestrator, real browser + Docker API):**
  - Checked at 1920×1080 and 375×812 (signed in as `@qa.batch8`): collapsed composer has only Ảnh + Bản đồ; expanded order Tiêu đề → Chủ đề → editor → media/place → bar; Ctrl+B and the counter work; place dialog search "Ben Thanh Market" → result, pin, coordinates, ✓, chip, pink Bản đồ; a real post was created with `latitude/longitude` and tag `question`, injected `style`/`onclick`/`javascript:` link/`span` were stripped before sending. Reading page shows the rich body, a live Leaflet map and the reverse-geocoded name. The comment editor expands, link (auto `https://`), emoji and "Đăng bình luận" work; the link renders with `rel="noopener noreferrer nofollow ugc"` and `target="_blank"`. No horizontal scroll at 375 (Reading and Diễn đàn, place dialog 343px wide).
  - XSS check: a comment created straight through the API with `<img onerror>`, `<script>`, `<svg onload>`, `javascript:` link and `on*` attributes renders as plain "js **bold** ok" with no `img/svg/script` and no `on*` attribute; nothing executed. That test comment stays in the local DB.
  - Fixed during review: (1) inline text and tags at the top level of rich content are now wrapped in one implicit paragraph, because `.post-body` is a flex column and every bold/Japanese run was rendered on its own line; (2) punctuation-only tokens are not counted as words ("京都." was 3 words); (3) the place dialog focuses the search box on open (focus was on ×, so typing + Enter closed it); (4) after "Liên kết" the caret collapses to the end of the link, so the next emoji no longer replaces the linked text; (5) Leaflet +/− moved to the bottom-left so the "Kéo ghim…" hint no longer covers it. Tests added for (1) and (2).
  - Known limits: the place name shown on Reading comes from reverse geocoding (e.g. "Đường Phan Bội Châu" instead of the chosen "Chợ Bến Thành") until the back end stores `place_name`. After editing CSS tokens, hard-reload: `tokens.css` is imported through `main.css` and stays cached.

- **Batch 10 (2026-11-18), triển khai và review mã độc lập:**
  - Ảnh nằm trực tiếp trong HTML đã lọc, cả bài và bình luận: chỉ HTTPS tuyệt đối; alt tối đa 300 ký tự, width/height nguyên 1..4000, bỏ thuộc tính còn lại. Native dialog Chèn/Sửa ảnh kiểm tra preview load thật, giữ tỉ lệ và báo lỗi tiếng Việt. Editor chèn DOM tại caret, chọn ảnh để Sửa/Gỡ, cập nhật counter và byte limits. Đã bỏ file picker, blob preview, thumbnail strip và hợp đồng uploads/attachments.
  - Một kebab dọc/bình luận gộp dịch, sửa/xoá của tác giả và các quyền staff; giữ confirm xoá, bàn phím và Danger. Sửa tại chỗ dùng toolbar/comment footer chung, PATCH chỉ content; mốc dirty lấy sau chuẩn hoá editor, nhãn đã sửa chỉ khi updated_at muộn hơn created_at quá 1 giây. Địa điểm/spoiler chưa lưu có thông báo rõ.
  - Comment có toạ độ API thật mới có chip mở rộng, map không tương tác và reverse/cache chỉ tải khi mở lần đầu. Sửa bài có ảnh/chip/map và thanh thao tác chung, PATCH bỏ hai toạ độ khi gỡ; thành công vẽ lại body/sidebar.
  - Place dialog 720px, map 420px (mobile 60vh), hint trái, fullscreen/zoom phải, wheel zoom tương tác. Fullscreen giữ ghim/input/toạ độ; Escape lần đầu thu nhỏ, lần sau đóng, invalidateSize không animation khi resize.
  - Feed hiển thị ảnh nội dung theo cột; thống kê feed/Search/featured có tooltip CSS tĩnh và nhãn thiếu dữ liệu trung tính, không thêm request. Hỗ trợ chỉ mở mailto đã mã hoá; bỏ reports/tickets và hướng dẫn báo cáo cũ, FAQ không hứa reset qua email.
  - Review độc lập phát hiện và đã sửa: dirty do p wrapper, submit ảnh không chữ, FAQ trỏ nút đã bỏ, hàng nút fullscreen mobile, thanh ảnh sát mép phải, link phủ thẻ Search chặn hover, khung map comment cắt attribution, Tab thoát menu và thông báo spoiler chưa lưu.
  - Chênh lệch có chủ đích: dùng tile OSM thật và attribution thay bản đồ minh hoạ; nội dung/tên/số liệu theo API thật. Ảnh preview của dialog có chú thích kích thước riêng phía dưới để đọc trên mọi ảnh. Theme sun vẫn không xây theo quy tắc dự án.
  - Kiểm thử: đủ sáu suite Node đều đạt; rich-text bổ sung HTTPS/scheme/entities/attributes/dimensions/alt/void/idempotence và DOM không innerHTML, helper đã sửa/stat/mailto. Lần chạy cuối: auth-foundation, leave-guard, notification-actions (71 ca), profile-identity, username, rich-text đều PASS. Dialog chạy qua DOM giả kiểm tra chặn trước load, ảnh lỗi, load cũ, tỉ lệ khoá, badInput và Huỷ. 63 module JS đạt kiểm tra cú pháp/import gốc/fetch boundary; không inline HTML style/handler, không animation, git diff --check và kiểm tra U+2014 đều sạch.
  - **QA trình duyệt (orchestrator, 2026-11-18, Docker API thật, tài khoản `@qa.batch8`):** 1920 và 375. Diễn đàn: icon Ảnh mới, hộp Chèn ảnh (lỗi `ftp://`, nút chỉ bật khi ảnh tải được, khoá tỉ lệ 800×600 → 400×300, alt có dấu nháy/`<b>` được escape), ảnh chèn vào editor, đăng bài lưu `<img src https alt width height>` đã lọc, ảnh hiện trên thẻ feed và trang đọc (cả 375). Tooltip số liệu hiện khi focus, nhãn "Số bình luận · chưa có dữ liệu" / "0 lượt thích". Reading: menu ⋮ (Dịch, Sửa, kẻ, Xoá đỏ), sửa tại chỗ + "· đã sửa", nút ghim bình luận bật nền sakura/icon đỏ khi có địa điểm, form sửa bài đúng mục 5, hộp địa điểm 720×(bản đồ 420), toàn màn hình 1920×1080 và Esc thu nhỏ rồi mới đóng. Hỗ trợ: không còn Báo cáo vi phạm, quy tắc 4 và thẻ "Quy tắc cộng đồng" đúng, FAQ không hứa reset qua email, mailto mã hoá. Đăng nhập giữ "Quên mật khẩu?". Không cuộn ngang ở 375 trên Diễn đàn, Reading (2 bài), Hỗ trợ, Đăng nhập; console không lỗi.
  - Sửa trong lúc QA: (1) thanh "Sửa ảnh · Gỡ ảnh" nằm phía trên ảnh và đè thanh công cụ khi ảnh ở dòng đầu, nay nằm trong mép trên ảnh, căn giữa như Figma; (2) mở Sửa bình luận/Sửa bài thì con trỏ ở đầu nội dung, nay `focus()` của editor đặt con trỏ ở cuối khi chưa có vị trí đã lưu; (3) PATCH /posts/{id} của backend bỏ qua toạ độ (xem §5), FE nay báo "Đã lưu bài. Địa điểm chưa được cập nhật…" khi toạ độ trả về khác lựa chọn.
  - Chưa kiểm được bằng dữ liệu thật: chip địa điểm của bình luận đã đăng (API chưa trả toạ độ bình luận, nên hiện tại không hiện gì là đúng). Lần Esc đầu trong ô tìm của hộp địa điểm xoá chữ trong ô (hành vi gốc của `input type=search`), các lần sau mới thu nhỏ/đóng.

- **Batch 11 (2026-11-18), nối backend mới của Phong (upstream/frontend, HEAD 45f3189):** nổi bật dùng `/posts/highlight`, tab Phổ biến ghép highlight + popular, số bình luận thật trên thẻ (Home, Diễn đàn, Tìm kiếm), thông báo đọc `actor_*` và kind `mention`, nhảy tới `#comment-{uuid}` (kể cả chỉ đổi hash), gửi toạ độ bình luận, sửa bài giữ địa điểm. Thẻ nổi bật không có ô cảm xúc trong Figma nên không tải reaction cho thẻ này. Trả lời nhiều cấp nay được gom dưới bình luận gốc để không bị mất. Test mới: `frontend/dev/tests/backend-integration.mjs`.
  - **Đợt 12, nhắc tên bằng @username:** `utils/mention.js` nhận diện tên (bỏ qua email, liên kết, tên có dấu chấm), `notifyMentions()` gửi tối đa 10 tên sau khi đăng hoặc sửa bài, bình luận. Khung soạn có dòng gợi ý và giữ chữ thường; nội dung đã đăng, thẻ bài và thẻ nổi bật tô tên bằng `.rich-content__mention`.
  - Đã merge PR 70 (username không có dấu chấm), PR 71 (rate limit 20 request/giây, burst 50) và PR 72 (mention cuối câu, câu lỗi username).
  - Đã merge PR 69 của Phong (7e79d1f, lúc merge PR còn mở): bình luận trả và sửa được toạ độ, xếp hạng `/posts/highlight` và `/posts/popular` chỉ theo số reaction, username bị kiểm tra định dạng, mention so khớp nguyên từ. FE bỏ các thông báo tạm về địa điểm bình luận, thêm nút Chia sẻ không số trên thẻ bài, và cho cả hàng đợi API tạm dừng khi gặp 429. Migration `users_username_format` được sửa tại chỗ nên volume cũ không có ràng buộc này; service vẫn kiểm tra nên không cần vá DB.

## 5. Yêu cầu cho backend (requests for the back-end dev)

The back end will be adjusted to the front end. Every agent adds a row here when a screen needs data the API does not return yet. Status: `cần làm` → `đã có` once the back end ships it.

| Needed by | Endpoint / change | Fields or behaviour the front end expects | Status |
|---|---|---|---|
| Search results, Home, Forum | `GET /posts` và `GET /posts/{id}` | Nhúng author (có displayname), tags và số đếm sau; Phong đưa comment_count/reaction counts cho PostCard vào todo. FE giữ placeholder, không thêm request tooltip | BE todo |
| Thẻ bài ở Trang chủ, Diễn đàn (ô "Số lượt chia sẻ") | Không làm API | Phong chốt (2026-11-18): dự án không có tính năng repost, chỉ chia sẻ bằng link. Thẻ bài đổi ô số thành nút Chia sẻ không có số, bấm để mở bảng chia sẻ hoặc sao chép link, giống nút ở trang đọc bài | đã đóng |
| Search results | `GET /posts?q=&tags=` | total match count, e.g. `{ items: [...], total }` or header `X-Total-Count` | cần làm |
| Search results | `GET /posts?sort=` | `sort=relevance`, `newest`, `oldest`, `popular` ("Liên quan nhất" in Figma); Home `listPosts({ sort: 'popular' })` gated by `popularSort` | cần làm (Home tab Phổ biến now uses the separate `GET /posts/popular`, đã có) |
| Search "Tag phổ biến" | `GET /tags` | `post_count` per tag | cần làm |
| Home "Bài viết nổi bật" | `GET /posts/highlight` | Đã nối đợt 11: top 12, đợt 14 hiện 3/2/1 thẻ mỗi trang theo chiều rộng. Tác giả, tag và số bình luận chỉ tải cho thẻ đang hiện. Chờ BE nhúng `author`, `tags`, số đếm để bớt request từng thẻ | đã có (nhúng dữ liệu: chờ BE) |
| Trang chủ "Có thể bạn quan tâm" | `GET /tags`, `GET /my/following`, dữ liệu bài đã tải | Chủ đề từ danh mục tag; thành viên từ tác giả bài mới và bài nổi bật/phổ biến, bỏ chính mình và người đã theo dõi. Đề xuất bài viết theo sở thích hoãn đến sau môn học | đã có, đề xuất bài viết hoãn |
| Home / Diễn đàn tab Đang theo dõi | `GET /my/following/posts` (JWT) | Shipped, but **always returns 404 "UUID parsing failed: found `p`"**: `GET /my/following/{user_id}` is registered first and captures "posts". Register `/my/following/posts` before the parameterised route (or rename it). Also add `limit`/`offset`. Fixed in upstream 8fee464 (route moved before `/my/following/{user_id}`), merged here; flag `followingFeed: true` since batch 4. Paging still missing (see the feeds row) | đã có |
| Home bookmark icon | `GET /posts` for signed-in viewer | `is_bookmarked: boolean` per post, read by `getBookmarkState(post)` behind `bookmarkState`; do not add a request per post. Existing POST/DELETE /posts/{id}/bookmark are already used for real saves | cần làm |
| Home feed translation | `GET /posts?lang=vi` | translated `title`/`content`, `original_language`, `is_translated`; `listPosts({lang})` behind `autoTranslateFeed`. Until supported, show source language and link to post detail with `&translate=1` | cần làm |
| Home author name and handle | users and embedded `author` in `GET /posts` | Done in batch 7 (upstream 65c7acd): `username` is the unique @handle, `displayname` is the editable full name; `getAuthorDisplayName()` shows `displayname` (falls back to `username`), `getAuthorHandle()` shows `@username`. Embedding `author` in `GET /posts`/comments is still wanted to cut requests (first row) | đã có |
| Header bell | `GET /my/notifications/unread-count` and the notification list | wired: red dot, panel and mobile page use the real API | đã có |
| Login "Quên mật khẩu?" | Không có reset bằng email | Khôi phục mật khẩu đang phát triển; liên hệ contact@etsubi.vn từ email đăng ký. Giữ link Login hiện tại | đã đóng yêu cầu reset email |
| Register Advanced avatar | `PATCH /my.avatar_url` | Bỏ yêu cầu upload; giữ preset hoặc JPEG data URL nhỏ hiện tại | đã đóng |
| Reading page "Bài viết liên quan" | `GET /posts/{id}/related?limit=3` | ranked related posts, each with `comment_count` and `tags: [{ id, name }]`; read by `getRelatedPosts()` behind flag `relatedPosts` (until then: real posts with the same first tag, count "–") | cần làm |
| Reading page "Địa điểm văn hoá" | POST/PATCH/GET posts | place_name đã được Phong đồng ý thêm; hiện chỉ gửi toạ độ, dùng reverse/cache cho tên/địa chỉ | BE đã đồng ý |
| Reading page comments | `GET /posts/{id}/comments` | embed `author: { id, username, avatar_url, native }` in each comment, so the page does not call `GET /users/{id}` per commenter; read by `getEmbeddedAuthor()` behind flag `commentAuthors` | cần làm |
| Reading page author card | `GET /users/{id}` | `post_count` and `follower_count`, so the page does not download the full post and follower lists just to count them | cần làm |
| Reading page translate | POST post/comment translate | Target là language của người đọc. Theo Phong (2026-11-18), không đổi backend: FE gửi `language` cùng giá trị với `native` khi đăng ký và khi đổi Ngôn ngữ mẹ đẻ. Cờ cạnh tên vẫn đọc `native`; nút ngôn ngữ trên header và Ngôn ngữ giao diện chỉ lưu `etsubi_lang` trong trình duyệt. Tài khoản cũ bị lệch sẽ hết khi reset DB hoặc đổi lại ngôn ngữ mẹ đẻ | đã có |
| Diễn đàn compose: Ảnh (uploads/attachments) | Không cần endpoint upload/attachments | Batch 10 chèn ảnh bằng HTTPS link trực tiếp trong content đã lọc | đã đóng |
| Legacy poll contract (no current composer UI) | poll on posts | `POST /posts` accepts `poll: { question, options: [string], closes_at? }`; `GET /posts/{id}` returns the poll with per-option votes and the viewer's choice; `POST /posts/{id}/poll/votes { option_index }`; `supportsPolls()` behind flag `postPolls` | cần làm |
| Diễn đàn feed paging | `GET /posts` | total count (same request as Search) so "Tải thêm bài viết" can hide exactly at the end instead of guessing from a short page | cần làm |
| Hỗ trợ "Gửi yêu cầu hỗ trợ" | Không có support tickets | Form mở mailto:contact@etsubi.vn, không gửi API | đã đóng |
| Hỗ trợ "Báo cáo vi phạm" | Không có reports | Bỏ chip/contact row/report dialog; gặp vi phạm gửi email kèm đường link | đã đóng |
| Đọc bài, bình luận, Hồ sơ: Báo cáo vi phạm | `POST /reports` (nhánh `feat/report-email`, đã viết sẵn phần backend để Phong xem) | Body `{ target_type, target_id, reasons, details? }`, người báo cáo lấy từ JWT, trả `204` sau khi gửi email tới `REPORT_EMAIL`; lỗi `code` như AGENTS.md §8; cooldown 10 phút/nội dung, 10 báo cáo/giờ, trả 409. Thiết kế: file Figma riêng `PxM4NiL156U27RE5oGo9De`, board `3:2` (menu, 4 trạng thái hộp thoại, email), chờ Vũ chép vào file chung | chờ Phong duyệt |
| Hồ sơ (privacy) | `GET /users/{id}` | Phong sẽ bỏ email/language/muted_until khỏi response công khai, chỉ GET /my giữ dữ liệu riêng | BE đã đồng ý |
| Hồ sơ lists | followers/following công khai và /my | Đã có displayname; chưa phân trang limit/offset và tổng số. FE còn đếm độ dài danh sách | cần phân trang |
| Mod/Admin reading page | `GET /manage/posts/{id}` (staff) | return a post in any state (hidden, soft-deleted with `deleted_at`), so staff can reopen hidden or deleted posts; `getPostForStaff()` behind flag `manageGetPost` | cần làm |
| Notification panel | `GET /my/notifications` | Đã nối đợt 11: đọc `actor_id`, `actor_username`, `actor_displayname`, `actor_avatar_url` phẳng; kind `mention` có câu tiếng Việt và icon @; link `/posts/{id}#comment-{uuid}` mở đúng bình luận. Giao diện gõ @ chưa làm (chưa có Figma và API tìm user) | đã có |
| Notifications (design note) | server-side creation | the back end creates no notification on follow/reaction/comment/reply/post/staff actions; the front end sends a second request (`POST /notifications`, `POST /posts/{id}/notify-followers`). The back-end dev chose to keep the two requests (2026-11-15) | giữ nguyên |
| Notifications (security) | `POST /notifications` | verify on the server that the action really happened before creating the notification (follow exists, reaction/comment by the actor on the post in `link`, target is the post or parent comment author, staff kinds match the real user/post state), check `context.emoji` against the allowed list, and rate-limit or dedupe per (actor, target, kind, link). Today any signed-in user can send fake follow/reaction/comment/reply notifications to anyone, and `context.emoji` is free text. Back-end reply (2026-11-15): by design the link and content are defined by the front end and the request body is the notification itself, so the server does not check them. The risk was reported; the front end keeps its own guards (`notificationHref` allowlist, emoji allowlist, text nodes only) | rủi ro đã báo |
| Home / Diễn đàn feeds | `GET /posts`, `/posts/highlight`, `/posts/popular`, `/posts/qa`, `/my/following/posts` | Số bình luận đã lấy từ `GET /posts/{id}/comments/count` cho từng thẻ đã hiện (cache 30 giây trong bộ nhớ). Chờ BE nhúng `author`, `tags`, số đếm vào danh sách để bớt request | chờ BE |
| Home: endpoint riêng có limit | Home feed nhận limit | `/posts/newest`, `/posts/qa`, `/my/following/posts` vẫn `truncate(3)`, chưa nhận limit; Home tiếp tục slice(0,3). Tab Phổ biến không còn phụ thuộc dòng này | chờ BE |
| Diễn đàn tabs Hỏi đáp / Đang theo dõi | `/posts/qa`, `/my/following/posts` | Vẫn `truncate(3)`, chờ trả đầy đủ. Tab Phổ biến đã xong đợt 11: ghép `/posts/highlight` (hạng 1-12) với `/posts/popular` (hạng 13-15, rỗng khi tổng số bài không quá 12), bỏ trùng, tối đa 15 bài; Trang chủ lấy 3 bài cuối | chờ BE (Hỏi đáp, Theo dõi) |
| Tên người dùng không còn duy nhất | `POST /auth/register`, `PATCH /my` | Superseded by upstream 65c7acd: `username` is UNIQUE again and acts as the @handle; the full name moved to `displayname`. Nothing left to do here | đã đóng |
| Cài đặt "Đã lưu lần cuối" | `GET /my` | `updated_at` (today the pill shows the time of the last save made in this browser, or "–") | cần làm |
| Đọc bài (signed in) | `GET /posts/{id}/reactions/me` | return `200` with `null` (or `{ emoji: null }`) when the viewer has not reacted; today it returns `404`, which shows as a failed request in the console on every post the viewer has not liked. Fixed upstream in 8fee464 (`200 null`), merged here in batch 4 | đã có |
| Login / Register "… với Google" | Google OAuth, e.g. `GET /auth/google` (redirect to Google) + callback that returns `{ user_id, token }` like `POST /auth/login` (and creates the account on first sign-in) | today the button only shows "sắp có" and sends no request (`// CẦN BACKEND:` in `login.js` / `register.js`) | cần làm |
| Migrations | `backend/migrations/` | Phong xác nhận được sửa migration tại chỗ vì chưa triển khai. Volume cũ vẫn cần vá tay các cột/index như §4 batch 4/7/8 hoặc tạo lại DB | đã thống nhất |
| Đăng ký: tên hiển thị | `POST /auth/register` | Done in upstream PR #64 (9f484ae, batch 8): the handler passes `body.displayname`; the service trims it, falls back to `username` when empty and returns 400 "Display name too long (max 50 characters)" above 50 characters. FE limit is 50 too (`validateDisplayName`), the 400 is shown on the Tên hiển thị field | đã có |
| Cài đặt / Register Advanced: tên hiển thị | `PATCH /my` | Done in upstream PR #65 (9f484ae, batch 8): `PATCH /my` and `update_user` store the trimmed `displayname`; empty → 400 "Display name cannot be empty", above 50 → 400 "Display name too long (max 50 characters)"; the first update also sets `profile_completed_at`. Both 400s are mapped to Vietnamese on the Tên hiển thị field. The "Máy chủ chưa lưu được tên hiển thị." note stays only as a fallback if a response ever returns another name | đã có |
| Đăng ký: ngôn ngữ dịch | `POST /auth/register` | Backend lưu riêng `native` và `language` từ PR #64. FE gửi hai trường cùng giá trị (mặc định `vi`), không lấy theo ngôn ngữ giao diện | đã có |
| Tên người dùng (@handle) | register và PATCH /my | PR 70: username mới theo ^[a-z0-9_]{3,30}$ ở cả FE, service và ràng buộc `users_username_format`; tài khoản cũ có dấu chấm vẫn giữ tên và lưu được các mục khác. Migration sửa tại chỗ nên DB cũ không có ràng buộc này, không thêm tay vì dữ liệu cũ có dấu chấm. | đã có |
| Hồ sơ lists, comments | follow lists / comments | FollowUserResponse đã có displayname, chưa paging; nhúng author/tags/counts làm sau. Thông báo đã có actor_* (đợt 11) | chờ BE phần còn lại |
| Search | socket transport | deferred by team, HTTP stays for now | hoãn |
| Register | email verification | deferred by team | hoãn |
| Batch 10: sửa địa điểm bài viết | `PATCH /posts/{id}` | BE đã lưu toạ độ; không gửi toạ độ nghĩa là xoá địa điểm. FE dùng `buildPostEdit()`: mặc định gửi lại toạ độ hiện có, chỉ bỏ khi người dùng bấm gỡ. Đã bỏ cảnh báo tạm | đã có |
| Batch 9: tên địa điểm bài viết | POST/PATCH/GET posts | place_name cùng latitude/longitude; Phong đồng ý thêm. FE chỉ gửi toạ độ cho đến khi có hợp đồng | BE đã đồng ý |
| Batch 9: ảnh bài viết | content HTML | Upload/attachments đã bỏ; batch 10 chèn img HTTPS trong nội dung, không thumbnail strip | đã đóng |
| Batch 9: ảnh bình luận | content HTML | Upload/attachments đã bỏ; bình luận dùng cùng img HTTPS đã lọc | đã đóng |
| Batch 9: địa điểm bình luận | POST/PATCH/GET comments | Đã có từ PR 69: `CommentResponse` trả `latitude`, `longitude`; PATCH đổi được toạ độ, không gửi toạ độ là gỡ địa điểm. Còn `place_name` nếu muốn lưu tên địa điểm | đã có (`place_name`: để sau) |
| Mention cuối câu | `POST /notifications/mention` | PR 72: dấu chấm sau tên được coi là dấu câu, nội dung `Chào @bobby.` đã tạo được thông báo | đã có |
| Giao diện gõ @username | FE, `POST /notifications/mention` | Đã làm đợt 12 theo Figma canva `452:3617`, general `231:3604`. Phong chốt: không có danh sách gợi ý người dùng; khi soạn là chữ thường, đăng xong mới tô. Tên chưa bấm được vì chưa có API tìm hồ sơ theo username | đã có |
| Nhận diện ngôn ngữ bài viết và bình luận | Phát hiện ngôn ngữ gốc từ `content` | Phong thống nhất 2026-11-22: chỉ dùng nội dung, loại tiêu đề, thẻ HTML, URL ảnh và tên được nhắc dạng @username trước khi nhận diện. Tiêu đề vẫn được dịch cùng bài | đã thống nhất với BE |
| Tên được nhắc trong bài và bình luận | `GET /users/by-username/{username}` | Trả mã người dùng để nối nhãn @username tới hồ sơ. Giao diện tiếp tục tô tên được nhắc | hoãn đến sau môn học |
| Hồ sơ · Bài viết / Đã lưu | `GET /users/{id}/posts`, `GET /my/bookmarks` | Hai endpoint trả danh sách PostResponse; tab Đã lưu dùng JWT và chỉ hiện trên hồ sơ của người xem | đã có |
| Toạ độ bình luận sai phạm vi | POST/PATCH comments | Vĩ độ ngoài -90..90 trả `500` vì lỗi ràng buộc DB; nên trả `400`. FE không gửi giá trị này vì toạ độ lấy từ bản đồ | nên sửa |
| Batch 9: spoiler bình luận | POST/GET comments | `is_spoiler: boolean`; khi backend có dữ liệu, FE che/blur nội dung mặc định và cung cấp nút "Hiện spoiler" truy cập được bằng bàn phím. Hiện checkbox chỉ ở nháp, không gửi | cần làm |
| Batch 9: nội dung HTML an toàn | content posts/comments và API dịch | FE lọc b,strong,i,em,u,s,p,br,img (HTTPS, alt, width/height); comment thêm a http/https. Giữ UTF-8 limits 100000/10000 và title 255. Server-side sanitizing không bắt buộc theo Phong | không bắt buộc |

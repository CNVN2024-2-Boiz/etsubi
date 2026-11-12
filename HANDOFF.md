# HANDOFF.md – Etsubi front end

> **Read [`AGENTS.md`](AGENTS.md) first and follow it.** It holds the binding rules: pure HTML/CSS/JS, tokens, header/footer reuse, minimal animation, Vietnamese comments on every block, no em dash, back-end contract.

Last update: 2026-11-13 · branch `feat/fe-auth-search` (fork `ShiroTrang/IE104`).

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
| Demo data script | `frontend/dev/seed-demo.sh` | – |
| Figma reference renders | `design-ref/*.png` | – |

## 2. What is left (next batches)

| Page | Figma frame | Notes |
|---|---|---|
| Home (Trang chủ) | Home 4 `140:135` | Header `active: 'home'`, footer `full`. Post list can reuse `components/postcard` (add a `postcard--feed` variant from PostCard `139:157`). `pages/index.html` is the team's old placeholder (wrong paths, `/assets/banner.png`, no header/footer): **rewrite it completely** from the AGENTS.md page skeleton. Agreed Home 4 content: banner with a single "Đăng bài →" button, red "Xem chi tiết →" button on each post card, no "Xem thêm bài viết", no "Xem tất cả →" in "Bài viết nổi bật". Featured posts and counts have no API yet: follow AGENTS.md §8 "Front end first". |
| Reading page (post detail) | `234:1679` | Route `routes.post(id)` → `/pages/post.html?id=`. Comments, reactions, bookmark, translate button (`POST /posts/{id}/translate`), `comments_locked`. |
| Diễn đàn (forum) | `236:1725` | `/pages/forum.html`; "Viết bài" goes to `routes.newPost` (`/pages/forum.html?compose=1`). |
| Hỗ trợ | `243:1848` / `247:2088` | `/pages/support.html`; red icon set + StatusBadge in `242:1843`. |
| Giới thiệu | `245:1956` | `/pages/about.html`; Flag set `256:2489`. |
| Profile | board `226:1544` | `/pages/profile/index.html` (file exists, empty). Uses `GET /my`, `GET /users/{id}`, follows, bookmarks. |
| Mod/Admin views | board `260:1891` | `/manage/*` endpoints; staff badge colour `--color-staff`. RBAC summary in AGENTS.md §8. |
| i18n (VI/JA/EN) | – | Header language badge only stores `localStorage.etsubi_lang`; no dictionaries yet. |

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

Contract test (no dependencies): `node frontend/dev/tests/auth-foundation.mjs`.

## 4. Known issues and decisions

- **Search has no socket (deferred by the team).** The back-end dev has not implemented the socket yet, so it is skipped for now; the back end only has `GET /api/v1/posts?q=&tags=`. `services/api/posts.js#searchPosts` is the single transport point to swap later.
- **Search data gaps:** the API returns no author name, tags, comment/like/view counts, or total. Cards fetch author and tags progressively (rate limit 4 req/s); counts are not shown; the result count is the number loaded ("10+" when another page may exist); sort is "Mới nhất" only (server order) plus a client-side "Cũ nhất".
- **Login is by email only** (back end `LoginRequest { email, password }`); username login is not supported.
- **Register "Họ và tên" is stored as `username`** (unique, ≥ 3 bytes). Native language is set to `vi` at register and chosen on Register Advanced.
- **No avatar upload endpoint:** Register Advanced stores a preset path or a small 256×256 JPEG data URL in `avatar_url`.
- **No email verification (skipped for now by the team)** – the back end has none, so the 4th step "Xác thực email" of frame `126:2` is not built; the 3-step frame `159:524` is the implemented version.
- **"Quên mật khẩu?"** has no back-end endpoint: shows an info message.
- **Back end on Windows:** `backend/docker/entrypoint.sh` is checked out with CRLF when `core.autocrlf=true`, and the container then fails with `exec /entrypoint.sh failed: No such file or directory`. Convert it to LF before `docker compose build` (`sed -i 's/\r$//' backend/docker/entrypoint.sh`), or add a `.gitattributes` rule `*.sh text eol=lf` in a back-end PR.
- A failed login (`401`) or a taken email (`409`) logs a network error line in the browser console. That is the browser's own request log, not a JS error – expected.
- `python -m http.server` lets the browser cache ES modules. After editing a `.js` file, hard-reload (Ctrl+Shift+R) or disable cache in DevTools, otherwise you may test old code.
- Search tag counts in "Tag phổ biến" come from one capped search per tag (max 50, shown as "50+").
- Fixed after review (2026-11-13): on mobile the search heading now takes its own row above the sort/"Viết bài" buttons. The password eye icon was squashed by the Figma export, so it was replaced with the Lucide original, and Edge's own reveal button is hidden (`::-ms-reveal`).
- **Pending, aligned with the new "Front end first" rule (AGENTS.md §8):** search result cards currently hide comment/like/view counts and show "10+" instead of a real total. Restore those slots as in Figma `168:1084` with "–" placeholders and request the fields below. This has not been done yet; the team will schedule it.

## 5. Yêu cầu cho backend (requests for the back-end dev)

The back end will be adjusted to the front end. Every agent adds a row here when a screen needs data the API does not return yet. Status: `cần làm` → `đã có` once the back end ships it.

| Needed by | Endpoint / change | Fields or behaviour the front end expects | Status |
|---|---|---|---|
| Search results, Home, Forum | `GET /posts` (and `GET /posts/{id}`) | add `author: { id, username, avatar_url, native }`, `tags: [{ id, name }]`, `comment_count`, `like_count`, `view_count` to each post, so cards need no extra requests | cần làm |
| Search results | `GET /posts?q=&tags=` | total match count, e.g. `{ items: [...], total }` or header `X-Total-Count` | cần làm |
| Search results | `GET /posts?sort=` | `sort=relevance`, `newest`, `oldest`, `popular` ("Liên quan nhất" in Figma) | cần làm |
| Search "Tag phổ biến" | `GET /tags` | `post_count` per tag | cần làm |
| Home "Bài viết nổi bật" | new, e.g. `GET /posts/featured?limit=` | which posts are featured (staff pick or most reactions); same post shape as above | cần làm |
| Login "Quên mật khẩu?" | new password-reset endpoints | request reset by email, set new password with a token | cần làm |
| Register Advanced avatar | new upload endpoint | upload an image, return a URL for `avatar_url` (today: preset path or small data URL) | cần làm |
| Search | socket transport | deferred by team, HTTP stays for now | hoãn |
| Register | email verification | deferred by team | hoãn |

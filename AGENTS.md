# AGENTS.md – Etsubi front end rules

Read this whole file before you touch `frontend/`. These rules bind every agent (Claude, Codex, Copilot…) and every human working on the Etsubi front end. If a rule here conflicts with a habit, the rule wins. If a rule seems wrong, ask the team; do not silently diverge.

Etsubi (越日) is a Vietnam–Japan student forum, the IE104 (UIT) course project. The back end is a Rust/Actix API in `backend/`. The front end is in `frontend/`.

---

## 1. Tech constraints (hard rules)

- **Plain HTML + CSS + vanilla JavaScript only.**
  - Allowed: ES modules (`<script type="module">`), `fetch`, native `WebSocket`, `URLSearchParams`, `FormData`, `<template>`, CSS custom properties, CSS grid/flex, `@font-face`.
  - Forbidden: React/Vue/Svelte/Lit/Alpine/jQuery or any UI framework, Tailwind/Bootstrap or any CSS framework, TypeScript, Sass/Less, bundlers (Vite/Webpack/esbuild), transpilers, any build step, npm runtime dependencies.
  - `frontend/package.json` only holds the dev server (`live-server`). Do not add packages.
- Every page must work when the `frontend/` folder is served as static files from its root (`/` = `frontend/`). Use **root-absolute paths** (`/styles/…`, `/assets/…`, `/services/…`).
- No inline `style="…"` attributes and no `<style>` blocks in pages. The only exceptions: a CSS custom property set from JS for a dynamic value (e.g. `el.style.setProperty('--progress', '67%')`).
- No inline event handlers (`onclick="…"`). Attach listeners in the page module.
- Do not commit secrets, tokens, `.env` files or real user data.
- **Keep animation to a minimum.** No `@keyframes`, no JS-driven animation, no scroll effects, parallax, animated loaders/skeleton shimmer, or page transitions. Allowed: hover/focus highlight (colour, background, border, underline, shadow change on `:hover` / `:focus-visible`), optionally with one short simple `transition` on those properties. Loading states are static (text "Đang tải…", disabled button, grey placeholder bars). Reason: the team must be able to explain every line to the lecturer; animation code adds complexity for no grade.
- **Comment every code block in Vietnamese.** Every HTML section, every CSS rule group and every JS function/block gets a comment explaining *what it does and why*, in plain language the team can present (e.g. `/* Thẻ đăng nhập: nền kem, viền đỏ 2px, căn giữa màn hình */`). Prefer simple, readable code over clever code.
- **Figma generated code is a starting point only.** You may start from Figma's design-to-code / Figma-to-HTML output (e.g. MCP `get_design_context`), but rewrite it to these rules: plain HTML/CSS/JS, tokens, the shared header/footer, semantic markup, flex/grid layout instead of absolute-positioned soup, no inline styles, no Tailwind/React that the generator emits, no temporary Figma asset URLs.
- **Never use the em dash (Unicode U+2014, the long dash)** anywhere: UI copy, HTML, CSS/JS comments, docs, commit messages. Use the en dash (U+2013, `–`) or a hyphen (`-`) instead. This overrides Figma text that contains an em dash (e.g. footer "IE104 – UIT"). Check before committing: `git grep -nP "\x{2014}" -- frontend AGENTS.md HANDOFF.md` must return nothing (older team files such as README.md and docs/ are out of scope).

## 2. Folder layout and naming

```
frontend/
├── index.html                    # redirects to /pages/index.html
├── pages/                        # one HTML file per screen (+ its page module next to it)
│   ├── index.html                # Home (placeholder, to be built)
│   ├── search.html  search.js    # Search (empty + results states)
│   └── profile/
│       ├── login.html            login.js
│       ├── register.html         register.js
│       └── register-advanced.html register-advanced.js
├── components/                   # reusable UI rendered by JS (one folder per component)
│   ├── header/header.js  header.css
│   ├── footer/footer.js  footer.css
│   ├── tag-chip/tag-chip.js  tag-chip.css
│   └── postcard/PostCard.js  PostCard.css
├── services/api/                 # talking to the back end, nothing else
│   ├── client.js                 # API_BASE, request(), token storage, ApiError, rate limit queue
│   ├── auth.js  users.js  posts.js  tags.js
├── utils/                        # pure helpers + session
│   ├── auth.js                   # session: login/logout/currentUser/requireAuth/safeRedirect
│   ├── dom.js                    # escapeHtml, el(), qs()
│   ├── format.js                 # relative time, initials, highlight
│   └── routes.js                 # every page URL + searchUrl({q, tags})
├── styles/
│   ├── tokens.css                # ALL design tokens (colors, fonts, spacing, radius, shadows)
│   ├── base.css                  # @font-face, reset, body, typography, focus ring, utilities
│   ├── components.css            # buttons, inputs, checkbox, radio card, card, kbd, alerts
│   ├── main.css                  # @imports tokens/base/components (link this on every page)
│   └── pages/<page>.css          # page-only layout (auth.css, register-advanced.css, search.css)
├── assets/
│   ├── fonts/                    # Etsubi Display / Etsubi Logo woff2 (+ OFL.txt)
│   ├── icons/                    # single-colour UI icons exported from Figma (SVG)
│   ├── illustrations/            # sun, clouds, waves, sakura petals (SVG)
│   └── avatars/                  # preset avatars
└── public/                       # favicon etc.
```

- File names: `kebab-case` for pages, CSS, icons and utils. (`components/postcard/PostCard.*` keeps its legacy name.)
- A page's module lives next to the HTML file and has the same base name (`login.html` → `login.js`).
- New page checklist: HTML in `pages/…`, module next to it, page CSS in `styles/pages/`, route in `utils/routes.js`, Figma frame ID noted in `HANDOFF.md`.

### Page skeleton (copy this)

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tên trang · Etsubi</title>
    <link rel="icon" type="image/svg+xml" href="/assets/icons/etsubi-logo.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Noto+Sans+JP:wght@350;400;500;700&display=swap" />
    <link rel="stylesheet" href="/styles/main.css" />
    <link rel="stylesheet" href="/components/header/header.css" />
    <link rel="stylesheet" href="/components/footer/footer.css" />
    <link rel="stylesheet" href="/styles/pages/<page>.css" />
    <script type="module" src="/pages/<area>/<page>.js"></script>
  </head>
  <body class="page page--<page>">
    <a class="skip-link" href="#main">Bỏ qua điều hướng</a>
    <header class="site-header" data-component="header" data-active="home"></header>
    <main id="main" class="…">…</main>
    <footer class="site-footer" data-component="footer" data-variant="full"></footer>
  </body>
</html>
```

The page module calls `mountHeader()` / `mountFooter()` from the components. Never copy header/footer markup into a page.

## 3. CSS conventions

- **Tokens only.** Every colour, font family, radius, shadow and spacing value comes from `styles/tokens.css` (`var(--color-red)` etc.). Hard-coded hex values are allowed only inside `tokens.css` and inside SVG files. One-off illustration colours (the torii on Login/Register) are tokens too (`--torii-*`).
- **BEM-like class names:** `block`, `block__element`, `block--modifier`, state classes `is-active`, `is-open`, `is-invalid`, `is-loading`, `is-disabled`. Prefix utilities with `u-` (`u-visually-hidden`). Never style by ID; IDs are for JS hooks and labels.
- **JS hooks:** select elements with `data-*` attributes or IDs, not with styling classes (`[data-search-input]`).
- **Breakpoints (desktop-first, matching the 1920 design):**
  - `> 1280px` desktop: the Figma layout.
  - `≤ 1280px` laptop: side columns shrink/stack, decorative art scales down.
  - `≤ 960px` tablet: single column, header nav collapses into a menu button.
  - `≤ 600px` mobile: 16px side gutters, full-width cards, no horizontal scroll.
  Write breakpoints as `@media (max-width: 1280px)`, `(max-width: 960px)`, `(max-width: 600px)` – no other values.
- Content width: `--container-width: 1440px` with `--page-gutter` padding (48px desktop → 16px mobile). Search/content pages use the 1096 + 24 + 320 grid inside it.
- Units: `px` for borders/radius/icons, `rem` allowed for type; spacing from the 4px scale.
- No `!important` except in `u-` utilities.

## 4. UI rules (from Figma)

### Palette (`styles/tokens.css`)

| Token | Value | Use |
|---|---|---|
| `--color-red` | `#C2454F` | brand red: navbar, primary buttons, card borders, links |
| `--color-red-dark` | `#A8343F` | footer, tag text, pressed states |
| `--color-red-accent` | `#C43A56` | accent bar, `#` in tag chips |
| `--color-cream` | `#FFFCF7` | cards, inputs on cards |
| `--color-page` | `#FAF7F5` | page background |
| `--color-sakura` | `#FCECF0` | soft highlight, selected option, tag chip bg |
| `--color-sakura-100` | `#FAD6E1` | removable chip, avatar fallback bg |
| `--color-pink-border` | `#F5C0D0` | tag chip border, progress fill |
| `--color-text` | `#1F1A17` | main text |
| `--color-text-secondary` | `#4A403B` | secondary text |
| `--color-text-body` | `#59544D` | paragraph / excerpt text |
| `--color-muted` | `#80736B` | hints, captions, placeholders on light bg |
| `--color-border` | `#E0D9CC` | dividers, light borders |
| `--color-input-border` | `#D1C7B8` | input / secondary button border |
| `--color-input-bg` | `#FAF7F0` | input background |
| `--color-success` | `#2E965A` | success hint, completed step |
| `--color-danger` | `#D63C3C` | required `*`, error text |
| `--color-staff` | `#0F1729` | staff/mod/admin badges (slate) |

The old red `#8C1C1C` is **retired**. Do not use it. The torii illustration on Login/Register keeps its own darker reds (`--torii-*` tokens).

### Fonts

- Body: **Be Vietnam Pro** 400/500/600/700 (Google Fonts) → `--font-body`.
- Japanese: **Noto Sans JP** (Google Fonts). Wrap Japanese runs in `<span lang="ja">`; `:lang(ja)` switches to `--font-jp` automatically.
- Headings (≥ 20px and ≥ SemiBold in Figma): **Etsubi Display** Bold → `--font-display`, class `.t-display`.
- The brand word "Etsubi": **Etsubi Logo** Bold → `--font-logo`, class `.brand-word` (the font turns the exact string `Etsubi` into the leaf-E/flower-i ligature; keep `font-variant-ligatures: common-ligatures`).
- Etsubi fonts are self-hosted in `assets/fonts/` (woff2, OFL). They have no Japanese glyphs.

### Spacing, radius, shadows

- Spacing scale `--space-1..10` = 4, 8, 12, 16, 20, 24, 32, 40, 48, 72 px.
- Radius: `--radius-sm 4px` (cards with 2px red border), `--radius-md 6px` (inputs, buttons, result cards), `--radius-pill 999px` (chips, search bar, pills).
- Shadows: `--shadow-card` `0 12px 40px rgba(0,0,0,.16)`, `--shadow-card-strong` `0 12px 40px rgba(0,0,0,.2)`, `--shadow-sidebar` `0 10px 28px rgba(0,0,0,.1)`, `--shadow-result` `0 6px 12px rgba(0,0,0,.08)`, `--shadow-button` `0 6px 8px rgba(194,69,79,.25)`, `--shadow-navbar` `0 2px 8px rgba(0,0,0,.1)`.
- Focus ring (Figma style "Etsubi/Focus Ring"): `box-shadow: 0 0 0 4px rgba(220,58,72,.18)` → `--focus-ring`. Every interactive element must show it on `:focus-visible`.

### Shared header (`components/header`)

- Red bar (`--color-red`), height 77px, 48px side padding, shadow `--shadow-navbar`.
- Left: circular Etsubi logo with white ring (`assets/icons/etsubi-logo.svg`) + "Etsubi" in Etsubi Logo, white. Links to Home.
- Tabs, in this order: **Trang chủ · Diễn đàn · Hỗ trợ · Giới thiệu** (17px, Medium, white 85%). Every tab has the same box (label + 3px underline slot), so labels always line up vertically. The active tab gets white text + visible pink underline. On the search page **no tab is active**.
- Right: language badge (VI/JA/EN), and when signed in: notification bell + gradient avatar with initials (38px, 2px white 70% ring). When signed out on content pages: "Đăng nhập" link.
- Variant `search` puts the search bar (660 × 48) right after the logo. On other pages the search shows as an icon button that opens `/pages/search.html`.
- `≤ 960px`: tabs move into a menu button (hamburger) panel; `≤ 600px` matches Figma "Mobile · Header" (logo + search icon + avatar).
- Keyboard: `/` anywhere (outside inputs) focuses the search bar or opens the search page.

### Shared footer (`components/footer`)

- `data-variant="slim"` (auth pages): 57.6px bar `--color-red-dark`, centred line "© 2025 Etsubi · 越日 | IE104 – UIT | Cầu nối văn hoá Việt – Nhật".
- `data-variant="full"` (content pages): 4 columns (brand + social icons, Liên kết, Tài nguyên, Liên hệ), divider, copyright "© 2026 Etsubi · 越日 – All rights reserved.".
- Mobile: single centred line "© 2026 Etsubi".

### Components and their states

| Component | Where | States |
|---|---|---|
| Button | `components.css` `.btn` | `--primary` (red, white bold, shadow), `--secondary` (white, input border), `--danger-outline` (white, red 40% border, red text), `--ghost` (no bg, muted text), sizes `--sm` (10/18 padding) / default (15/28) / `--block`; `:hover` (darken 6%), `:active`, `:focus-visible`, `[disabled]`/`.is-loading` (opacity .4 + static text such as "Đang gửi…", no spinner) |
| Text input | `.field`, `.field__label`, `.input`, `.field__hint` | default, focus (red border + focus ring), `.is-invalid` (danger border + error hint), `.is-valid` (success hint), disabled/readonly (muted bg) |
| Password input | `.input-group` + eye button | hidden/visible (button has `aria-pressed`) |
| Checkbox | `.checkbox` (real `<input type=checkbox>` visually styled) | unchecked (white, input border), checked (red box + white check), focus |
| Radio card | `.radio-card` (real `<input type=radio>`) | unchecked (white, input border), checked (sakura bg, 1.5px red border, red radio dot), focus, hover |
| Card | `.card` | cream bg, 2px red border, radius 4, `--shadow-card`; `.card__band` red top band with torii |
| Tag chip | `components/tag-chip` | `default` (sakura bg, pink border, `#` red-accent + name red-dark, optional count muted), `selected` (red bg, check icon, cream text), `removable` (sakura-100 bg, radius 6, × button) |
| Search bar | header variant `search` | empty-focused (placeholder, `Esc` kbd, Tag button neutral, **Submit opacity .4 + disabled**), has-query (clear ×, Tag button pink with count badge, Submit enabled) |
| Result card / PostCard | `components/postcard` | default (cream, 1.2px red border, radius 6, `--shadow-result`), hover (border turns `--color-red-dark` + `--shadow-sidebar`; no movement), query highlight (red, title) / bold (excerpt) |
| Kbd | `.kbd` | static |
| Alert | `.alert` `--error` / `--info` / `--success` | with `role="alert"` or `role="status"` |

### Icons

- UI icons are Lucide-style line icons. Use the SVGs in `assets/icons/` (exported from Figma) through `<img src alt="">` when the colour is fixed, or **inline Lucide SVG** (`stroke="currentColor"`, 24 viewBox, stroke-width 2) when the icon must follow text colour. Never use icon fonts. Decorative icons get `alt=""`/`aria-hidden="true"`.
- **Check every Figma-exported SVG before use.** Figma exports carry `preserveAspectRatio="none"` and sometimes a squashed path (the old `eye.svg` was flattened vertically). If an icon looks thinner or wider than the Lucide original, replace the file with the original Lucide SVG (24 viewBox, stroke-width 2, round caps/joins) in the needed colour, and compare at real size in the browser.
- Native browser controls must not duplicate ours: password inputs hide Edge's own reveal button (`::-ms-reveal`, `::-ms-clear` in `components.css`). Do the same for any input where the browser adds its own control (e.g. `input[type=search]` clear button).

## 5. JavaScript conventions

- ES modules only, `type="module"`, no globals except optional `window.ETSUBI_API_BASE`.
- One module per page. It imports from `services/`, `utils/`, `components/`; it never calls `fetch` directly.
- `services/api/client.js` is the only file that calls `fetch`:
  - `API_BASE` defaults to `http://localhost:11432/api/v1`; override with `window.ETSUBI_API_BASE` or `localStorage['etsubi_api_base']`. (The front-end Dockerfile rewrites this default URL with `sed`, so keep the literal string.)
  - `request(path, { method, body, query, auth })` → parsed JSON or `null`; throws `ApiError { status, message, data }`. `status 0` = network/CORS error.
  - Adds `Authorization: Bearer <token>` when a token exists.
  - The back end rate-limits **4 requests/s per IP (burst 7)**. `client.js` queues requests (max 3 in flight, ~250 ms spacing) and retries `429` up to 2 times with back-off. Do not fire unbounded parallel requests; enrich lists progressively.
- **Token storage:** key `etsubi_token`. "Ghi nhớ đăng nhập" checked → `localStorage`; unchecked → `sessionStorage`. `getToken()` reads both. There is no refresh token: the JWT lives `JWT_EXPIRY_HOURS` (24h). Any `401` from a protected call clears the token and sends the user to Login with `?redirect=`.
- **Error handling:** catch `ApiError` in the page module and show a Vietnamese message in the page's alert/field hint. Map known back-end messages (`Invalid credentials`, `Email already exists`, `Username already taken`, `Username too short`, `Account is banned`…) to Vietnamese in one place (`utils/errors.js`). Never `alert()`.
- Build DOM with `document.createElement` / `<template>` or with template strings **only after** `escapeHtml()` on every dynamic value. Never inject API text with `innerHTML` unescaped.
- Redirects after login use `safeRedirect()` (same-origin paths only).
- Keep state in the URL when it is shareable (search `q`, `tag`).

## 6. Accessibility basics

- Every input has a `<label>`; errors use `aria-invalid="true"` + `aria-describedby` to the hint; form-level errors go in a `role="alert"` region.
- Custom controls wrap real inputs (checkbox, radio, file). Radio cards are a `<fieldset>` with `<legend>`.
- Visible `:focus-visible` ring on everything interactive; tab order follows the visual order.
- Colour contrast ≥ 4.5:1 for body text (muted `#80736B` on cream is the minimum – do not go lighter).
- `lang="vi"` on `<html>`, `lang="ja"` on Japanese runs.
- Respect `prefers-reduced-motion` (no petal animation, no transitions).
- Decorative art (`sun`, `clouds`, `waves`, `sakura`, torii) is `aria-hidden="true"`.
- Images: meaningful `alt`; avatars use the user's name.

## 7. Checking work against Figma

- **Source of truth:** shared team file `HFYjrrtGqo86EpOX1Bdg88` (limited MCP quota – read sparingly).
- **Reference (free to read):** personal file `LukhEp2hUOnbb9SYkv80ks`.
- Exported reference screenshots of finished screens live in `design-ref/` (1024px wide renders of the 1920 frames).
- Procedure for every screen: open the frame, compare at **1920×1080** (desktop) and **390×844** (mobile) in a real browser, check spacing/typography/colour, check every state (hover, focus, error, empty, loading), check the console is clean.

| Screen / item | Frame ID (personal file) |
|---|---|
| Login 3a (no Google) | `256:2242` |
| Register 1a (no Google) | `256:2355` |
| Register Advanced (4-step, superseded language block) | `126:2` |
| Register Advanced 2 (3-step, native single choice) | `159:524` |
| Search – empty, not submitted | `267:2576` |
| Search – results with tags | `168:1084` |
| Search flow / state board | `168:869` |
| Mobile search + mobile header | `204:1448` |
| Button set | `125:81` |
| Radio Card | `125:47` |
| PostCard | `139:157` |
| Search bar set | `168:744` |
| Tag chip set | `168:717` |
| Support/About components (icons, Flag set `256:2489`, StatusBadge) | `242:1843` |
| Navbar (in Home 4) | `140:200` |
| Footer (in Home 4) | `140:276` |
| Home 4 | `140:135` |
| Reading Page | `234:1679` |
| Diễn đàn | `236:1725` |
| Hỗ trợ / Hỗ trợ 2 | `243:1848` / `247:2088` |
| Giới thiệu | `245:1956` |
| Profile board | `226:1544` |
| Mod/Admin board | `260:1891` |

Figma MCP note: Etsubi Display/Logo are local fonts, so MCP cannot edit those text layers. This front end is read-only towards Figma – never edit the Figma files.

## 8. Back-end contract (as of `upstream/main`, Nov 2026)

### Front end first: the back end follows the front end

The back-end dev has agreed to **adjust the back end to match the front-end code** (confirmed 2026-11-13). So:

- **Build every screen completely as in Figma.** Do not drop or hide a UI element (counts, featured posts, author name, badges…) just because the current API does not return that data yet.
- **The front end defines the contract.** For each missing piece, write the service function in `services/api/` with the request and response shape the UI needs (endpoint, query params, JSON field names in `snake_case` like the existing API). Add a comment above it starting with `// CẦN BACKEND:` explaining in Vietnamese what is missing.
- **Until the back end has it,** the service returns what it can, and the UI shows a neutral placeholder in that slot ("–" for a number, a grey bar for text). Never show invented numbers or text as if they were real data.
- **Record every request** in the "Yêu cầu cho backend" table in `HANDOFF.md` (endpoint, fields, which page needs it, status). That table is what the team sends to the back-end dev.
- **Do not edit `backend/`** from a front-end branch. Back-end changes are the back-end dev's job.
- Agreed exceptions that stay deferred (do not build UI for them): search over socket (HTTP is used, see Search) and email verification.

Base URL: `http://localhost:11432/api/v1` (local `cargo run`) or `http://localhost:21432/api/v1` (Docker `--profile full`). Swagger UI: `/swagger-ui/`. Errors are JSON `{ "error": "<English message>" }` (some framework errors are plain text).

### Auth (JWT, Bearer header – no cookies, no refresh)

| Call | Body | Success | Errors |
|---|---|---|---|
| `POST /auth/register` | `{ username, email, password, native, language }` | `201 { user_id }` (no token) | `400` username < 3 bytes / password < 8 / bad language; `409` email or username taken |
| `POST /auth/login` | `{ email, password }` (**email only**, no username login) | `200 { user_id, token }` | `401` invalid credentials; `403` banned |
| `POST /auth/logout` 🔒 | – | `204`, bumps `token_version` (all tokens die) | `401` |
| `GET /my` 🔒 | – | user profile | `401`, `403` banned |
| `PATCH /my` 🔒 | any of `{ username, email, institute, address, bio, avatar_url, native, language }` | `200` updated profile | `400`, `409` |

🔒 = `Authorization: Bearer <token>`. Write calls from a muted user return `403 "Your account is muted until …"`.

No email verification exists yet (team decision: skipped for now), so registration is active immediately.

Flow used by the front end: Register → (auto) Login with the same email/password → store token → Register Advanced (`PATCH /my`) → Home.

### Users

`users`: `id, username (unique), email (unique), institute?, address?, native ∈ {vi, en, ja} (default vi), language ∈ {vi, en, ja} (UI language, default vi), avatar_url?, bio?, role ∈ {user, moderator, admin}, status ∈ {active, banned}, muted_until?`. `GET /users/{id}` is public. There is **no file upload endpoint**: `avatar_url` is a string (the front end stores a preset path or a small resized data URL).

### Search

- `GET /posts?q=&tags=<uuid,uuid>&limit=&offset=` – published, not deleted posts; `q` matches title or content (ILIKE, max 200 chars); `tags` = **all** listed tags must match; newest first. Returns `PostResponse[]` (`id, author_id, title, content, language, status, comments_locked, created_at, …`) – no author name, tags, counts or total.
- `GET /tags` – fixed set (`general, question, discussion, announcement, showcase`). The UI uses tag **names**; `services/api/tags.js` maps name ↔ UUID.
- `GET /posts/{id}/tags`, `GET /users/{id}`, `GET /posts/{id}/reactions/summary` for enrichment (mind the rate limit).
- **Socket (deferred):** search was planned over a socket, but the back-end dev has not implemented it yet, so the team decided to skip it for now (confirmed 2026-11-12). The back end has **no WebSocket endpoint**. `services/api/posts.js` exposes `searchPosts()` over HTTP behind one function so a socket transport can replace it later without touching pages.
- Search UX rules (agreed): **no live suggestions, no results while typing**. Results load only on Enter or the "Tìm kiếm" button. Submit is `opacity .4` + disabled while there is no query and no tag.
- **Tag → search:** clicking a tag anywhere navigates to `/pages/search.html?tag=<name>` (repeat `tag` for several). The search page treats `q`/`tag` in the URL as a submitted search. There is **no separate tag page**.

### RBAC summary

- Roles: `admin > moderator > user`. Staff = moderator or admin. Nobody can act on an equal or higher role; nobody can assign `admin`.
- Mute: `PATCH /manage/users/{id}/mute { muted_until }` – muted users can read but every write (POST/PATCH/PUT/DELETE) returns `403`. Show a banner from `GET /my.muted_until`.
- Ban: `PATCH /manage/users/{id}/status { status: "banned" }` – login returns `403`, existing tokens fail with `403`.
- Posts: `status ∈ {published, hidden}` (staff via `/manage/posts/{id}/status`), soft delete (`deleted_at`, restore via `/manage/posts/{id}/restore`), `comments_locked` (`PATCH /posts/{id}/comments/lock`; authors can lock their own post, staff can lock any).
- Comments: `status ∈ {visible, hidden}` (staff), soft delete + restore.

## 9. Running locally

```bash
# 1) database + API in Docker (first build takes a while)
docker compose --profile full up -d --build postgres backend   # API on http://localhost:21432/api/v1
# 2) static front end
cd frontend && npx live-server --port=12321 --no-browser .      # or: python -m http.server 12321
```

The back end only allows CORS from `http://localhost:12321`, `http://127.0.0.1:12321` (and 22321). With the Docker API on port 21432, open the site once with `?api=http://localhost:21432/api/v1` – `client.js` saves it to `localStorage['etsubi_api_base']` (`?api=reset` clears it).

## 10. Git workflow

- Branch from `main`: `feat/fe-<area>` (e.g. `feat/fe-forum`). One branch per page group.
- Small, logical commits in English, imperative mood: `feat(fe): add search page results state`.
- Never commit `.env`, tokens, `node_modules`, screenshots of real users.
- Before pushing: open every page you touched at desktop + mobile, console clean, links not broken.
- Do not push or open a PR without the user's go-ahead. PRs target the team repo `CNVN2024-2-Boiz/etsubi` from a fork.
